import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Booking } from '@/database/entities/booking.entity';
import { PaymeTransaction } from '@/database/entities/payme-transaction.entity';

/**
 * Service for generating Payme checkout URLs for QR code payments.
 *
 * The Payme checkout URL format:
 *   https://checkout.paycom.uz/{base64_encoded_params}
 *
 * Where base64_encoded_params is base64 of:
 *   m={merchant_id};ac.booking_id={booking_id};a={amount_in_tiyin}
 *
 * The frontend renders a QR code from the returned URL.
 */
@Injectable()
export class PaymeQrService {
  private readonly logger = new Logger(PaymeQrService.name);
  private readonly merchantId: string;
  private readonly checkoutBaseUrl: string;

  /** QR checkout link expires after 12 hours */
  private static readonly CHECKOUT_EXPIRY_HOURS = 12;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(PaymeTransaction)
    private readonly transactionRepo: Repository<PaymeTransaction>,
  ) {
    this.merchantId = this.configService.get<string>('PAYME_MERCHANT_ID', '');
    this.checkoutBaseUrl = this.configService.get<string>(
      'PAYME_CHECKOUT_URL',
      'https://checkout.paycom.uz',
    );
  }

  // ── generateCheckoutUrl ───────────────────────────────────────────────────

  /**
   * Generate a Payme checkout URL for a given booking.
   *
   * @param bookingId - ID of the booking to pay for
   * @param propertyId - Property ID for access control
   * @param amount - Optional amount in tiyin; defaults to remaining balance
   * @returns Checkout URL, amount, and expiration time
   */
  async generateCheckoutUrl(
    bookingId: number,
    propertyId: number,
    amount?: number,
  ): Promise<{
    checkout_url: string;
    amount: number;
    booking_id: number;
    expires_at: string;
  }> {
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

    // Validate booking is in a payable state
    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { status: booking.status },
        `Cannot generate payment link for booking with status '${booking.status}'`,
      );
    }

    // Calculate remaining balance
    const total = Number(booking.totalAmount);
    const paid = Number(booking.paidAmount);
    const remaining = total - paid;

    if (remaining <= 0) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { total_amount: total, paid_amount: paid },
        'Booking is already fully paid',
      );
    }

    // Use provided amount or default to remaining balance
    const paymentAmount = amount ?? remaining;

    if (paymentAmount <= 0) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { amount: paymentAmount },
        'Payment amount must be positive',
      );
    }

    if (paymentAmount > remaining) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { amount: paymentAmount, remaining },
        'Payment amount exceeds remaining balance',
      );
    }

    // Build checkout params: m={merchant_id};ac.booking_id={booking_id};a={amount}
    const params = `m=${this.merchantId};ac.booking_id=${bookingId};a=${paymentAmount}`;
    const encoded = Buffer.from(params, 'utf-8').toString('base64');
    const checkoutUrl = `${this.checkoutBaseUrl}/${encoded}`;

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PaymeQrService.CHECKOUT_EXPIRY_HOURS);

    this.logger.log(
      `Generated Payme checkout URL for booking #${bookingId}, amount=${paymentAmount} tiyin`,
    );

    return {
      checkout_url: checkoutUrl,
      amount: paymentAmount,
      booking_id: bookingId,
      expires_at: expiresAt.toISOString(),
    };
  }

  // ── getPaymentStatus ──────────────────────────────────────────────────────

  /**
   * Check the Payme payment status for a booking by looking at PaymeTransaction records.
   *
   * States:
   *   - 'pending': no completed transaction found
   *   - 'paid': at least one performed transaction (state=2) exists
   *   - 'cancelled': most recent transaction was cancelled (state=-1 or -2)
   *
   * @param bookingId - ID of the booking
   * @param propertyId - Property ID for access control
   */
  async getPaymentStatus(
    bookingId: number,
    propertyId: number,
  ): Promise<{
    status: 'pending' | 'paid' | 'cancelled';
    paid_at?: string;
    amount?: number;
    booking_id: number;
    total_amount: number;
    paid_amount: number;
    remaining: number;
  }> {
    // Verify the booking belongs to this property
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

    const total = Number(booking.totalAmount);
    const paid = Number(booking.paidAmount);
    const remaining = total - paid;

    // Find the most recent Payme transaction for this booking
    const latestTransaction = await this.transactionRepo.findOne({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });

    if (!latestTransaction) {
      return {
        status: 'pending',
        booking_id: bookingId,
        total_amount: total,
        paid_amount: paid,
        remaining,
      };
    }

    // State 2 = completed (performed)
    if (latestTransaction.state === 2) {
      return {
        status: 'paid',
        paid_at: latestTransaction.performTime
          ? new Date(Number(latestTransaction.performTime)).toISOString()
          : undefined,
        amount: Number(latestTransaction.amount),
        booking_id: bookingId,
        total_amount: total,
        paid_amount: paid,
        remaining,
      };
    }

    // State -1 or -2 = cancelled
    if (latestTransaction.state === -1 || latestTransaction.state === -2) {
      return {
        status: 'cancelled',
        amount: Number(latestTransaction.amount),
        booking_id: bookingId,
        total_amount: total,
        paid_amount: paid,
        remaining,
      };
    }

    // State 1 = created but not yet performed
    return {
      status: 'pending',
      amount: Number(latestTransaction.amount),
      booking_id: bookingId,
      total_amount: total,
      paid_amount: paid,
      remaining,
    };
  }
}
