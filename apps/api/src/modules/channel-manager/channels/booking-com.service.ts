import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac } from 'crypto';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { Channel } from '@/database/entities/channel.entity';
import { Guest } from '@/database/entities/guest.entity';
import { ChannelManagerService } from '../channel-manager.service';

/**
 * Shape of the Booking.com webhook request body.
 */
export interface BookingComWebhookPayload {
  event: 'new_reservation' | 'modification' | 'cancellation';
  hotel_id: string;
  reservation_id: string;
  room_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  total_price?: number;
  currency?: string;
  notes?: string;
}

@Injectable()
export class BookingComService {
  private readonly logger = new Logger(BookingComService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly channelManagerService: ChannelManagerService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── verifySignature ──────────────────────────────────────────────────────

  /**
   * Verify HMAC-SHA256 webhook signature.
   * Booking.com sends the signature in the X-Booking-Signature header.
   * The signature is HMAC-SHA256(webhook_secret, rawBody).
   */
  verifySignature(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret: string,
  ): boolean {
    const bodyStr =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const expected = createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex');

    // Constant-time comparison
    if (expected.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return result === 0;
  }

  // ── processWebhook ───────────────────────────────────────────────────────

  /**
   * Handle incoming Booking.com webhook.
   * 1. Find the channel by hotel_id
   * 2. Verify HMAC signature
   * 3. Dispatch to handler based on event type
   * 4. Log sync result
   */
  async processWebhook(
    body: BookingComWebhookPayload,
    rawBody: string | Buffer,
    signatureHeader: string,
  ) {
    // 1. Find the channel by hotel_id
    const channel = await this.findChannelByHotelId(body.hotel_id);

    if (!channel) {
      this.logger.warn(
        `Webhook received for unknown hotel_id: ${body.hotel_id}`,
      );
      throw new SardobaException(
        ErrorCode.CHANNEL_NOT_FOUND,
        { hotel_id: body.hotel_id },
        'No channel configured for this hotel_id',
      );
    }

    // 2. Verify signature
    let credentials: Record<string, unknown> = {};
    try {
      credentials = JSON.parse(channel.credentials.toString('utf-8'));
    } catch {
      throw new SardobaException(
        ErrorCode.CHANNEL_AUTH_FAILED,
        { channel_id: channel.id },
        'Channel credentials are corrupted',
      );
    }

    const webhookSecret = credentials.webhook_secret as string;
    if (!webhookSecret) {
      throw new SardobaException(
        ErrorCode.CHANNEL_NOT_CONFIGURED,
        { channel_id: channel.id },
        'Webhook secret not configured for this channel',
      );
    }

    if (!this.verifySignature(rawBody, signatureHeader, webhookSecret)) {
      this.logger.warn(
        `Invalid webhook signature for channelId=${channel.id}`,
      );

      await this.channelManagerService.createSyncLog(
        channel.id,
        body.event,
        'error',
        { hotel_id: body.hotel_id, reservation_id: body.reservation_id },
        'Invalid HMAC signature',
      );

      throw new SardobaException(
        ErrorCode.WEBHOOK_SIGNATURE_INVALID,
        { channel_id: channel.id },
        'Webhook signature verification failed',
      );
    }

    // 3. Dispatch based on event type
    try {
      let result: Record<string, unknown>;

      switch (body.event) {
        case 'new_reservation':
          result = await this.handleNewReservation(channel, body);
          break;
        case 'modification':
          result = await this.handleModification(channel, body);
          break;
        case 'cancellation':
          result = await this.handleCancellation(channel, body);
          break;
        default:
          throw new SardobaException(
            ErrorCode.VALIDATION_ERROR,
            { event: body.event },
            `Unknown webhook event type: ${body.event}`,
          );
      }

      // 4. Log success
      await this.channelManagerService.createSyncLog(
        channel.id,
        body.event,
        'success',
        {
          reservation_id: body.reservation_id,
          ...result,
        },
      );

      await this.channelManagerService.updateLastSyncAt(channel.id);

      return { status: 'ok', ...result };
    } catch (error) {
      // Log failure (unless it's a signature error, already logged)
      if (
        error instanceof SardobaException &&
        error.code === ErrorCode.WEBHOOK_SIGNATURE_INVALID
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.channelManagerService.createSyncLog(
        channel.id,
        body.event,
        'error',
        {
          reservation_id: body.reservation_id,
          hotel_id: body.hotel_id,
        },
        errorMessage,
      );

      // Emit sync error event
      this.eventEmitter.emit('sync.error', {
        channelId: channel.id,
        channelType: 'booking_com',
        eventType: body.event,
        reservationId: body.reservation_id,
        error: errorMessage,
      });

      if (error instanceof SardobaException) {
        throw error;
      }

      throw new SardobaException(
        ErrorCode.CHANNEL_SYNC_FAILED,
        {
          channel_id: channel.id,
          reservation_id: body.reservation_id,
        },
        `Booking.com sync failed: ${errorMessage}`,
      );
    }
  }

  // ── handleNewReservation ─────────────────────────────────────────────────

  /**
   * Create a new booking from a Booking.com reservation.
   */
  private async handleNewReservation(
    channel: Channel,
    payload: BookingComWebhookPayload,
  ): Promise<Record<string, unknown>> {
    // Check for duplicate reservation
    const existing = await this.bookingRepository.findOne({
      where: {
        sourceReference: payload.reservation_id,
        source: 'booking_com',
      },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate reservation ignored: ${payload.reservation_id}`,
      );
      return {
        action: 'duplicate_ignored',
        booking_id: existing.id,
        booking_number: existing.bookingNumber,
      };
    }

    // Resolve room mapping
    const mapping = await this.channelManagerService.resolveRoomByExternalId(
      channel.id,
      payload.room_id,
    );

    if (!mapping) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        {
          external_room_id: payload.room_id,
          channel_id: channel.id,
        },
        `No room mapping found for external room ID: ${payload.room_id}`,
      );
    }

    // Parse guest name
    const nameParts = payload.guest_name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || 'Booking.com';

    // Find or create guest
    const guest = await this.findOrCreateGuest(
      channel.propertyId,
      firstName,
      lastName,
      payload.guest_phone ?? '',
      payload.guest_email ?? null,
    );

    // Calculate nights
    const checkIn = payload.check_in;
    const checkOut = payload.check_out;
    const nights = differenceInCalendarDays(
      parseISO(checkOut),
      parseISO(checkIn),
    );

    // Convert price to tiyin (assuming price comes in som)
    const totalAmount = payload.total_price
      ? Math.round(payload.total_price * 100)
      : 0;

    // Generate a booking number
    const bookingNumber = await this.generateOtaBookingNumber();

    // Create the booking
    const booking = await this.dataSource.transaction(async (manager) => {
      const newBooking = manager.create(Booking, {
        bookingNumber,
        propertyId: channel.propertyId,
        roomId: mapping.roomId,
        guestId: guest.id,
        rateId: null,
        checkIn,
        checkOut,
        nights,
        adults: payload.adults ?? 1,
        children: payload.children ?? 0,
        totalAmount,
        paidAmount: 0,
        status: 'confirmed' as BookingStatus,
        source: 'booking_com',
        sourceReference: payload.reservation_id,
        notes: payload.notes ?? null,
        createdBy: 0, // System user (OTA sync)
      });

      return manager.save(Booking, newBooking);
    });

    this.logger.log(
      `New reservation created: bookingId=${booking.id}, ` +
        `reservationId=${payload.reservation_id}`,
    );

    // Emit booking.created event
    this.eventEmitter.emit('booking.created', {
      bookingId: booking.id,
      propertyId: booking.propertyId,
      roomId: booking.roomId,
      guestId: booking.guestId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalAmount: booking.totalAmount,
      bookingNumber: booking.bookingNumber,
      createdBy: 0,
    });

    return {
      action: 'booking_created',
      booking_id: booking.id,
      booking_number: booking.bookingNumber,
    };
  }

  // ── handleModification ───────────────────────────────────────────────────

  /**
   * Update an existing booking from a Booking.com modification.
   */
  private async handleModification(
    channel: Channel,
    payload: BookingComWebhookPayload,
  ): Promise<Record<string, unknown>> {
    const booking = await this.bookingRepository.findOne({
      where: {
        sourceReference: payload.reservation_id,
        source: 'booking_com',
      },
    });

    if (!booking) {
      // If no existing booking found, treat as new reservation
      this.logger.warn(
        `Modification for unknown reservation ${payload.reservation_id}, creating new booking`,
      );
      return this.handleNewReservation(channel, payload);
    }

    // Resolve room mapping if room changed
    let newRoomId = booking.roomId;
    if (payload.room_id) {
      const mapping = await this.channelManagerService.resolveRoomByExternalId(
        channel.id,
        payload.room_id,
      );
      if (mapping) {
        newRoomId = mapping.roomId;
      }
    }

    // Update booking fields
    const checkIn = payload.check_in || booking.checkIn;
    const checkOut = payload.check_out || booking.checkOut;
    const nights = differenceInCalendarDays(
      parseISO(checkOut),
      parseISO(checkIn),
    );
    const totalAmount = payload.total_price
      ? Math.round(payload.total_price * 100)
      : booking.totalAmount;

    booking.roomId = newRoomId;
    booking.checkIn = checkIn;
    booking.checkOut = checkOut;
    booking.nights = nights;
    booking.adults = payload.adults ?? booking.adults;
    booking.children = payload.children ?? booking.children;
    booking.totalAmount = totalAmount;

    await this.bookingRepository.save(booking);

    this.logger.log(
      `Reservation modified: bookingId=${booking.id}, ` +
        `reservationId=${payload.reservation_id}`,
    );

    return {
      action: 'booking_modified',
      booking_id: booking.id,
      booking_number: booking.bookingNumber,
    };
  }

  // ── handleCancellation ───────────────────────────────────────────────────

  /**
   * Cancel an existing booking from a Booking.com cancellation.
   */
  private async handleCancellation(
    channel: Channel,
    payload: BookingComWebhookPayload,
  ): Promise<Record<string, unknown>> {
    const booking = await this.bookingRepository.findOne({
      where: {
        sourceReference: payload.reservation_id,
        source: 'booking_com',
      },
    });

    if (!booking) {
      this.logger.warn(
        `Cancellation for unknown reservation: ${payload.reservation_id}`,
      );
      return {
        action: 'cancellation_ignored',
        reason: 'booking_not_found',
        reservation_id: payload.reservation_id,
      };
    }

    if (booking.status === 'cancelled') {
      return {
        action: 'already_cancelled',
        booking_id: booking.id,
        booking_number: booking.bookingNumber,
      };
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = 'Cancelled via Booking.com';

    await this.bookingRepository.save(booking);

    this.logger.log(
      `Reservation cancelled: bookingId=${booking.id}, ` +
        `reservationId=${payload.reservation_id}`,
    );

    // Emit booking.cancelled event to free the room in other channels
    this.eventEmitter.emit('booking.cancelled', {
      bookingId: booking.id,
      propertyId: booking.propertyId,
      roomId: booking.roomId,
      guestId: booking.guestId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      bookingNumber: booking.bookingNumber,
      cancelReason: booking.cancelReason,
      cancelledBy: 0,
    });

    return {
      action: 'booking_cancelled',
      booking_id: booking.id,
      booking_number: booking.bookingNumber,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Find a Booking.com channel by its hotel_id credential.
   */
  private async findChannelByHotelId(
    hotelId: string,
  ): Promise<Channel | null> {
    const channels = await this.channelRepository.find({
      where: { type: 'booking_com', isActive: true },
    });

    for (const channel of channels) {
      try {
        const creds = JSON.parse(channel.credentials.toString('utf-8'));
        if (creds.hotel_id === hotelId) {
          return channel;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Find or create a guest record for OTA bookings.
   */
  private async findOrCreateGuest(
    propertyId: number,
    firstName: string,
    lastName: string,
    phone: string,
    email: string | null,
  ): Promise<Guest> {
    // Try to find by phone first (if provided)
    if (phone) {
      const existing = await this.guestRepository.findOne({
        where: { propertyId, phone },
      });
      if (existing) {
        return existing;
      }
    }

    // Create new guest
    const guest = this.guestRepository.create({
      propertyId,
      firstName,
      lastName,
      phone: phone || `ota-${Date.now()}`,
      email,
      nationality: null,
      documentType: null,
      documentNumber: null,
      dateOfBirth: null,
      isVip: false,
      notes: 'Created from Booking.com reservation',
    });

    return this.guestRepository.save(guest);
  }

  /**
   * Generate a booking number for OTA bookings.
   * Format: OTA-YYYYMMDD-XXXX (random 4-digit suffix)
   */
  private async generateOtaBookingNumber(): Promise<string> {
    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const randomSuffix = String(
      Math.floor(1000 + Math.random() * 9000),
    );

    const bookingNumber = `OTA-${dateStr}-${randomSuffix}`;

    // Ensure uniqueness
    const existing = await this.bookingRepository.findOne({
      where: { bookingNumber },
    });

    if (existing) {
      return this.generateOtaBookingNumber();
    }

    return bookingNumber;
  }
}
