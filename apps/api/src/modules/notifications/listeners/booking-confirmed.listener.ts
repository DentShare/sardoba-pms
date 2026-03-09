import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '@/database/entities/booking.entity';
import { Property } from '@/database/entities/property.entity';
import { NotificationLog } from '@/database/entities/notification-log.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications.service';
import { bookingConfirmedFallbackTemplate } from '../telegram/telegram.templates';
import { BookingStatusChangedEvent } from '../../bookings/events/booking-status-changed.event';
import { formatDateRu } from '@sardoba/shared';

/**
 * Listener for booking.confirmed event.
 *
 * When a booking status changes to 'confirmed', sends a WhatsApp message
 * to the guest with booking details. Falls back to Telegram notification
 * to the property owner if WhatsApp fails or is not configured.
 */
@Injectable()
export class BookingConfirmedListener {
  private readonly logger = new Logger(BookingConfirmedListener.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('booking.status_changed')
  async handleBookingConfirmed(event: BookingStatusChangedEvent): Promise<void> {
    if (event.newStatus !== 'confirmed') {
      return;
    }

    try {
      // Dedup: check if we already sent this notification
      const existing = await this.notificationLogRepository.findOne({
        where: {
          bookingId: event.bookingId,
          eventType: 'booking_confirmed',
        },
      });

      if (existing) {
        this.logger.debug(
          `Booking confirmed notification already sent for booking #${event.bookingId}`,
        );
        return;
      }

      // Fetch full booking with relations
      const booking = await this.bookingRepository.findOne({
        where: { id: event.bookingId },
        relations: ['room', 'guest'],
      });

      if (!booking || !booking.guest || !booking.room) {
        this.logger.warn(
          `Cannot send booking confirmed notification: missing data for booking #${event.bookingId}`,
        );
        return;
      }

      const property = await this.propertyRepository.findOne({
        where: { id: event.propertyId },
      });

      if (!property) {
        this.logger.warn(
          `Property #${event.propertyId} not found for booking confirmed notification`,
        );
        return;
      }

      // Build WhatsApp message
      const whatsappMessage = this.buildWhatsAppMessage(booking, property);

      let channel = 'whatsapp';
      let sent = false;

      // Try WhatsApp first
      if (booking.guest.phone && this.whatsAppService.isConfigured()) {
        sent = await this.whatsAppService.sendTextMessage(
          booking.guest.phone,
          whatsappMessage,
        );
      }

      // Fallback to Telegram if WhatsApp failed or not configured
      if (!sent) {
        channel = 'telegram';
        const telegramMessage = bookingConfirmedFallbackTemplate({
          bookingNumber: booking.bookingNumber,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          guestPhone: booking.guest.phone,
          roomName: booking.room.name,
          checkIn: formatDateRu(booking.checkIn),
          checkOut: formatDateRu(booking.checkOut),
          checkinTime: property.checkinTime,
          checkoutTime: property.checkoutTime,
          propertyName: property.name,
        });

        const sentCount = await this.notificationsService.sendToTelegramRecipients(
          event.propertyId,
          telegramMessage,
        );
        sent = sentCount > 0;
      }

      // Log the notification
      await this.notificationLogRepository.save(
        this.notificationLogRepository.create({
          propertyId: event.propertyId,
          bookingId: event.bookingId,
          guestId: booking.guestId,
          eventType: 'booking_confirmed',
          channel,
          status: sent ? 'sent' : 'failed',
          metadata: {
            bookingNumber: booking.bookingNumber,
            guestPhone: booking.guest.phone,
          },
        }),
      );

      if (sent) {
        this.logger.log(
          `Booking confirmed notification sent via ${channel} for #${booking.bookingNumber}`,
        );
      } else {
        this.logger.warn(
          `Failed to send booking confirmed notification for #${booking.bookingNumber} via any channel`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.confirmed for booking #${event.bookingId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Build the WhatsApp confirmation message for the guest.
   */
  private buildWhatsAppMessage(booking: Booking, property: Property): string {
    return [
      `✅ Ваша бронь подтверждена!`,
      ``,
      `🏨 ${property.name}`,
      `📅 Заезд: ${formatDateRu(booking.checkIn)} (с ${property.checkinTime})`,
      `📅 Выезд: ${formatDateRu(booking.checkOut)} (до ${property.checkoutTime})`,
      `🛏 ${booking.room.name}`,
      ``,
      `📌 Адрес: ${property.address}`,
      `📞 Вопросы: ${property.phone}`,
      ``,
      `Ждём вас!`,
    ].join('\n');
  }
}
