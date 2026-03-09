import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '@/database/entities/booking.entity';
import { Property } from '@/database/entities/property.entity';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { NotificationLog } from '@/database/entities/notification-log.entity';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications.service';
import { upsellPreArrivalFallbackTemplate } from '../telegram/telegram.templates';
import { formatMoney } from '@sardoba/shared';

/**
 * Upsell pre-arrival cron job.
 *
 * Runs at 10:00 UTC = 15:00 Tashkent (Asia/Tashkent is UTC+5).
 * Finds confirmed bookings where check_in is tomorrow and sends
 * a WhatsApp message to the guest with available property extras.
 */
@Injectable()
export class UpsellPreArrivalCron {
  private readonly logger = new Logger(UpsellPreArrivalCron.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyExtra)
    private readonly propertyExtraRepository: Repository<PropertyExtra>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Upsell pre-arrival cron — 15:00 Tashkent = 10:00 UTC.
   */
  @Cron('0 10 * * *')
  async handleUpsellPreArrival(): Promise<void> {
    this.logger.log('Starting upsell pre-arrival cron job');

    try {
      // Calculate tomorrow's date in Tashkent timezone
      const tomorrow = this.getTomorrowTashkent();

      // Find all confirmed bookings checking in tomorrow
      const bookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.guest', 'guest')
        .leftJoinAndSelect('booking.room', 'room')
        .where('booking.status = :status', { status: 'confirmed' })
        .andWhere('booking.checkIn = :tomorrow', { tomorrow })
        .getMany();

      if (bookings.length === 0) {
        this.logger.log('No confirmed bookings for tomorrow, skipping upsell');
        return;
      }

      let sentCount = 0;

      for (const booking of bookings) {
        try {
          await this.processBooking(booking);
          sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send upsell for booking #${booking.bookingNumber}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      this.logger.log(
        `Upsell pre-arrival completed: processed ${sentCount}/${bookings.length} bookings`,
      );
    } catch (error) {
      this.logger.error(
        'Upsell pre-arrival cron job failed',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Process a single booking for upsell notification.
   */
  private async processBooking(booking: Booking): Promise<void> {
    // Dedup: check if upsell already sent for this booking
    const existing = await this.notificationLogRepository.findOne({
      where: {
        bookingId: booking.id,
        eventType: 'upsell_pre_arrival',
      },
    });

    if (existing) {
      this.logger.debug(
        `Upsell already sent for booking #${booking.bookingNumber}`,
      );
      return;
    }

    if (!booking.guest) {
      this.logger.warn(
        `No guest data for booking #${booking.bookingNumber}, skipping upsell`,
      );
      return;
    }

    // Get property extras
    const extras = await this.propertyExtraRepository.find({
      where: { propertyId: booking.propertyId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    if (extras.length === 0) {
      this.logger.debug(
        `No active extras for property #${booking.propertyId}, skipping upsell`,
      );
      return;
    }

    const property = await this.propertyRepository.findOne({
      where: { id: booking.propertyId },
    });

    if (!property) {
      return;
    }

    // Build extras list
    const extrasList = extras
      .map((extra, index) => {
        const price = Number(extra.price) > 0
          ? ` — ${formatMoney(Number(extra.price))}`
          : ' — бесплатно';
        return `${index + 1}. ${extra.name}${price}`;
      })
      .join('\n');

    // Build WhatsApp message
    const whatsappMessage = this.buildWhatsAppMessage(
      booking.guest.firstName,
      property.checkinTime,
      extrasList,
    );

    let channel = 'whatsapp';
    let sent = false;

    // Try WhatsApp first
    if (booking.guest.phone && this.whatsAppService.isConfigured()) {
      sent = await this.whatsAppService.sendTextMessage(
        booking.guest.phone,
        whatsappMessage,
      );
    }

    // Fallback to Telegram notification to owner
    if (!sent) {
      channel = 'telegram';
      const telegramMessage = upsellPreArrivalFallbackTemplate({
        bookingNumber: booking.bookingNumber,
        guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        guestPhone: booking.guest.phone,
        roomName: booking.room?.name ?? '—',
        checkinTime: property.checkinTime,
        extrasList,
        propertyName: property.name,
      });

      const sentCount = await this.notificationsService.sendToTelegramRecipients(
        booking.propertyId,
        telegramMessage,
      );
      sent = sentCount > 0;
    }

    // Log notification
    await this.notificationLogRepository.save(
      this.notificationLogRepository.create({
        propertyId: booking.propertyId,
        bookingId: booking.id,
        guestId: booking.guestId,
        eventType: 'upsell_pre_arrival',
        channel,
        status: sent ? 'sent' : 'failed',
        metadata: {
          bookingNumber: booking.bookingNumber,
          extrasCount: extras.length,
        },
      }),
    );
  }

  /**
   * Build the WhatsApp upsell message for the guest.
   */
  private buildWhatsAppMessage(
    firstName: string,
    checkinTime: string,
    extrasList: string,
  ): string {
    return [
      `Добро пожаловать, ${firstName}! 🌟`,
      `Ваш заезд завтра в ${checkinTime}.`,
      ``,
      `Хотите добавить к бронированию?`,
      extrasList,
      ``,
      `Ответьте цифрой для заказа`,
    ].join('\n');
  }

  /**
   * Get tomorrow's date string in Tashkent timezone (YYYY-MM-DD).
   */
  private getTomorrowTashkent(): string {
    const now = new Date();
    // Convert to Tashkent time
    const tashkent = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
    );
    tashkent.setDate(tashkent.getDate() + 1);
    const year = tashkent.getFullYear();
    const month = String(tashkent.getMonth() + 1).padStart(2, '0');
    const day = String(tashkent.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
