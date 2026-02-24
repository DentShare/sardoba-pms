import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Room } from '@/database/entities/room.entity';
import { Payment } from '@/database/entities/payment.entity';
import { TelegramService } from './telegram/telegram.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import {
  newBookingTemplate,
  cancellationTemplate,
  paymentReceivedTemplate,
  syncErrorTemplate,
} from './telegram/telegram.templates';
import { BookingCreatedEvent } from '../bookings/events/booking-created.event';
import { BookingCancelledEvent } from '../bookings/events/booking-cancelled.event';
import { PaymentCreatedEvent } from '../payments/events/payment-created.event';

/**
 * Core notifications service.
 *
 * Listens to domain events (booking.created, booking.cancelled, payment.created,
 * channel.sync.error) and dispatches notifications to configured channels
 * (Telegram, WhatsApp) based on each property's notification settings.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly telegramService: TelegramService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Send a Telegram message to all active recipients for a property.
   * Returns the number of successfully sent messages.
   */
  async sendToTelegramRecipients(
    propertyId: number,
    message: string,
  ): Promise<number> {
    const settings = await this.settingsRepository.findOne({
      where: { propertyId },
    });

    if (!settings) {
      this.logger.debug(
        `No notification settings found for property #${propertyId}`,
      );
      return 0;
    }

    const activeRecipients = settings.telegramRecipients.filter(
      (r) => r.isActive,
    );

    if (activeRecipients.length === 0) {
      this.logger.debug(
        `No active Telegram recipients for property #${propertyId}`,
      );
      return 0;
    }

    let sentCount = 0;

    for (const recipient of activeRecipients) {
      const sent = await this.telegramService.sendMessage(
        recipient.chatId,
        message,
      );
      if (sent) {
        sentCount++;
      }
    }

    this.logger.log(
      `Sent Telegram notification to ${sentCount}/${activeRecipients.length} recipients for property #${propertyId}`,
    );

    return sentCount;
  }

  // ── Event Handlers ──────────────────────────────────────────────────────

  /**
   * Handle new booking event.
   * Sends Telegram notification + WhatsApp confirmation to guest.
   */
  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { propertyId: event.propertyId },
      });

      if (!settings?.eventNewBooking) {
        return;
      }

      // Fetch full booking with relations
      const booking = await this.bookingRepository.findOne({
        where: { id: event.bookingId },
        relations: ['room', 'guest'],
      });

      if (!booking || !booking.guest || !booking.room) {
        this.logger.warn(
          `Cannot send new booking notification: missing data for booking #${event.bookingId}`,
        );
        return;
      }

      // Send Telegram notification
      const message = newBookingTemplate(booking, booking.guest, booking.room);
      await this.sendToTelegramRecipients(event.propertyId, message);

      // Send WhatsApp confirmation to guest
      if (booking.guest.phone) {
        await this.whatsAppService.sendConfirmation(
          booking.guest.phone,
          booking,
        );
      }

      this.logger.log(
        `New booking notification sent for #${booking.bookingNumber} (property #${event.propertyId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.created event for booking #${event.bookingId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle booking cancellation event.
   */
  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: BookingCancelledEvent): Promise<void> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { propertyId: event.propertyId },
      });

      if (!settings?.eventCancellation) {
        return;
      }

      // Fetch booking for template data
      const booking = await this.bookingRepository.findOne({
        where: { id: event.bookingId },
      });

      if (!booking) {
        return;
      }

      const message = cancellationTemplate(booking);
      await this.sendToTelegramRecipients(event.propertyId, message);

      this.logger.log(
        `Cancellation notification sent for #${event.bookingNumber} (property #${event.propertyId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.cancelled event for booking #${event.bookingId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle payment created event.
   */
  @OnEvent('payment.created')
  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { propertyId: event.propertyId },
      });

      if (!settings?.eventPayment) {
        return;
      }

      // Fetch booking and payment with full data
      const booking = await this.bookingRepository.findOne({
        where: { id: event.bookingId },
      });

      if (!booking) {
        return;
      }

      // Build a partial Payment object from event data for the template
      const payment = {
        amount: event.amount,
        method: event.method,
        reference: null,
      } as Payment;

      const message = paymentReceivedTemplate(booking, payment);
      await this.sendToTelegramRecipients(event.propertyId, message);

      this.logger.log(
        `Payment notification sent for booking #${event.bookingId} (property #${event.propertyId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment.created event for booking #${event.bookingId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle channel sync error event.
   * Event payload: { propertyId: number, channelType: string, error: string }
   */
  @OnEvent('channel.sync.error')
  async handleSyncError(event: {
    propertyId: number;
    channelType: string;
    error: string;
  }): Promise<void> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { propertyId: event.propertyId },
      });

      if (!settings?.eventSyncError) {
        return;
      }

      const message = syncErrorTemplate(event.channelType, event.error);
      await this.sendToTelegramRecipients(event.propertyId, message);

      this.logger.log(
        `Sync error notification sent for channel ${event.channelType} (property #${event.propertyId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle channel.sync.error event for property #${event.propertyId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
