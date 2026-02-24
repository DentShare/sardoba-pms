import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Payment, PaymentMethod } from '@/database/entities/payment.entity';
import { Booking } from '@/database/entities/booking.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentCreatedEvent } from './events/payment-created.event';

/** Booking statuses that block payment operations */
const PAYMENT_BLOCKED_STATUSES = ['cancelled', 'no_show'] as const;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── findByBooking ──────────────────────────────────────────────────────────

  /**
   * List all payments for a booking.
   * Validates that the booking belongs to the given property.
   */
  async findByBooking(bookingId: number, propertyId: number) {
    const booking = await this.getBookingOrThrow(bookingId, propertyId);

    const payments = await this.paymentRepository.find({
      where: { bookingId: booking.id },
      order: { paidAt: 'DESC' },
    });

    return {
      data: payments.map((p) => this.toResponseFormat(p)),
      booking_id: booking.id,
      total_amount: Number(booking.totalAmount),
      paid_amount: Number(booking.paidAmount),
      balance: Number(booking.totalAmount) - Number(booking.paidAmount),
    };
  }

  // ── create ─────────────────────────────────────────────────────────────────

  /**
   * Create a new payment for a booking.
   *
   * Validations:
   * 1. Booking exists and belongs to the property
   * 2. Booking is not in a blocked status (cancelled, no_show)
   * 3. Payment amount + existing paidAmount <= totalAmount (no overpayment)
   *
   * After saving, updates the booking's paidAmount and emits PaymentCreatedEvent.
   */
  async create(
    bookingId: number,
    propertyId: number,
    userId: number,
    dto: CreatePaymentDto,
  ) {
    const booking = await this.getBookingOrThrow(bookingId, propertyId);

    // Validate booking status
    if (PAYMENT_BLOCKED_STATUSES.includes(booking.status as any)) {
      throw new SardobaException(
        ErrorCode.BOOKING_CANCELLED,
        { status: booking.status },
        `Cannot add payment to booking with status '${booking.status}'`,
      );
    }

    // Validate amount does not exceed remaining balance
    const currentPaid = Number(booking.paidAmount);
    const total = Number(booking.totalAmount);
    const newAmount = dto.amount;

    if (currentPaid + newAmount > total) {
      throw new SardobaException(
        ErrorCode.OVERPAYMENT,
        {
          total_amount: total,
          paid_amount: currentPaid,
          payment_amount: newAmount,
          remaining: total - currentPaid,
        },
        `Payment of ${newAmount} tiyin exceeds remaining balance of ${total - currentPaid} tiyin`,
      );
    }

    // Create payment
    const payment = this.paymentRepository.create({
      bookingId: booking.id,
      amount: newAmount,
      method: dto.method as PaymentMethod,
      paidAt: dto.paid_at ? new Date(dto.paid_at) : new Date(),
      notes: dto.notes ?? null,
      reference: dto.reference ?? null,
      createdBy: userId,
    });

    const saved = await this.paymentRepository.save(payment);

    // Update booking paidAmount
    const updatedPaid = currentPaid + newAmount;
    await this.bookingRepository.update(booking.id, {
      paidAmount: updatedPaid,
    });

    this.logger.log(
      `Payment #${saved.id} created: ${newAmount} tiyin (${dto.method}) for booking #${booking.id}`,
    );

    // Emit event
    this.eventEmitter.emit(
      'payment.created',
      new PaymentCreatedEvent(
        saved.id,
        booking.id,
        booking.propertyId,
        newAmount,
        dto.method,
        updatedPaid,
        total,
        userId,
      ),
    );

    return this.toResponseFormat(saved);
  }

  // ── remove ─────────────────────────────────────────────────────────────────

  /**
   * Delete a payment. Updates the booking's paidAmount accordingly.
   * Only owner/admin should call this (enforced at the controller level).
   */
  async remove(paymentId: number, userId: number) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking'],
    });

    if (!payment) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'payment', id: paymentId },
        'Payment not found',
      );
    }

    const booking = payment.booking;

    // Subtract payment amount from booking paidAmount
    const updatedPaid = Number(booking.paidAmount) - Number(payment.amount);
    await this.bookingRepository.update(booking.id, {
      paidAmount: Math.max(0, updatedPaid),
    });

    await this.paymentRepository.remove(payment);

    this.logger.log(
      `Payment #${paymentId} deleted by user #${userId} for booking #${booking.id}`,
    );

    return { deleted: true, id: paymentId };
  }

  // ── getBalance ─────────────────────────────────────────────────────────────

  /**
   * Returns payment balance for a booking: total, paid, remaining balance.
   */
  async getBalance(bookingId: number, propertyId: number) {
    const booking = await this.getBookingOrThrow(bookingId, propertyId);

    const total = Number(booking.totalAmount);
    const paid = Number(booking.paidAmount);

    return {
      booking_id: booking.id,
      total,
      paid,
      balance: total - paid,
    };
  }

  // ── createFromWebhook ──────────────────────────────────────────────────────

  /**
   * Create a payment from a payment gateway webhook (Payme, Click).
   * This method is used internally by PaymeService and ClickService.
   * It bypasses user authentication (createdBy can be 0 for system).
   */
  async createFromWebhook(
    bookingId: number,
    amount: number,
    method: PaymentMethod,
    reference: string,
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      return null;
    }

    // Validate amount
    const currentPaid = Number(booking.paidAmount);
    const total = Number(booking.totalAmount);

    if (currentPaid + amount > total) {
      return null;
    }

    const payment = this.paymentRepository.create({
      bookingId: booking.id,
      amount,
      method,
      paidAt: new Date(),
      notes: `Auto-created via ${method} webhook`,
      reference,
      createdBy: 0, // system
    });

    const saved = await this.paymentRepository.save(payment);

    // Update booking paidAmount
    const updatedPaid = currentPaid + amount;
    await this.bookingRepository.update(booking.id, {
      paidAmount: updatedPaid,
    });

    this.logger.log(
      `Webhook payment #${saved.id}: ${amount} tiyin (${method}) for booking #${booking.id}, ref=${reference}`,
    );

    // Emit event
    this.eventEmitter.emit(
      'payment.created',
      new PaymentCreatedEvent(
        saved.id,
        booking.id,
        booking.propertyId,
        amount,
        method,
        updatedPaid,
        total,
        null,
      ),
    );

    return saved;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Fetch booking by ID + propertyId or throw NOT_FOUND.
   */
  private async getBookingOrThrow(bookingId: number, propertyId: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, propertyId },
    });

    if (!booking) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'booking', id: bookingId },
        'Booking not found',
      );
    }

    return booking;
  }

  /**
   * Transform payment entity to snake_case response format.
   */
  private toResponseFormat(payment: Payment): Record<string, unknown> {
    return {
      id: payment.id,
      booking_id: payment.bookingId,
      amount: Number(payment.amount),
      method: payment.method,
      paid_at: payment.paidAt,
      notes: payment.notes,
      reference: payment.reference,
      created_by: payment.createdBy,
      created_at: payment.createdAt,
    };
  }
}
