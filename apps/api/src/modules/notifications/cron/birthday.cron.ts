import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { NotificationLog } from '@/database/entities/notification-log.entity';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { NotificationsService } from '../notifications.service';
import { birthdayAlertTemplate } from '../telegram/telegram.templates';
import { formatDateRu } from '@sardoba/shared';

/**
 * Birthday alerts cron job.
 *
 * Runs at 02:00 UTC = 07:00 Tashkent (Asia/Tashkent is UTC+5).
 * Finds guests whose birthday is in 3 days and sends a Telegram
 * notification to the property owner.
 */
@Injectable()
export class BirthdayCron {
  private readonly logger = new Logger(BirthdayCron.name);

  constructor(
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Birthday alerts cron — 07:00 Tashkent = 02:00 UTC.
   */
  @Cron('0 2 * * *')
  async handleBirthdayAlerts(): Promise<void> {
    this.logger.log('Starting birthday alerts cron job');

    try {
      // Calculate the date 3 days from now in Tashkent timezone
      const targetDate = this.getDatePlusDaysTashkent(3);
      const targetMonth = targetDate.getMonth() + 1; // 1-based
      const targetDay = targetDate.getDate();

      // Find all guests with birthday on the target date
      // Uses EXTRACT to match month and day regardless of year
      const guests = await this.guestRepository
        .createQueryBuilder('guest')
        .where('guest.dateOfBirth IS NOT NULL')
        .andWhere(
          'EXTRACT(MONTH FROM guest.date_of_birth) = :month AND EXTRACT(DAY FROM guest.date_of_birth) = :day',
          { month: targetMonth, day: targetDay },
        )
        .getMany();

      if (guests.length === 0) {
        this.logger.log('No guest birthdays in 3 days');
        return;
      }

      let sentCount = 0;

      for (const guest of guests) {
        try {
          const sent = await this.processGuest(guest);
          if (sent) sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send birthday alert for guest #${guest.id}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      this.logger.log(
        `Birthday alerts completed: sent ${sentCount}/${guests.length} notifications`,
      );
    } catch (error) {
      this.logger.error(
        'Birthday alerts cron job failed',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Process a single guest for birthday alert notification.
   * Returns true if a notification was sent.
   */
  private async processGuest(guest: Guest): Promise<boolean> {
    // Build a unique dedup key for this year's birthday
    const year = new Date().getFullYear();
    const dedupKey = `birthday_${year}`;

    // Dedup: check if birthday alert already sent for this guest this year
    const existing = await this.notificationLogRepository.findOne({
      where: {
        guestId: guest.id,
        eventType: 'birthday_alert',
        metadata: { dedupKey } as any,
      },
    });

    if (existing) {
      this.logger.debug(
        `Birthday alert already sent for guest #${guest.id} this year`,
      );
      return false;
    }

    // Check if property has birthday notifications enabled
    const settings = await this.settingsRepository.findOne({
      where: { propertyId: guest.propertyId },
    });

    if (!settings?.eventBirthday) {
      this.logger.debug(
        `Birthday notifications disabled for property #${guest.propertyId}`,
      );
      return false;
    }

    // Get guest's last visit info
    const lastBooking = await this.bookingRepository.findOne({
      where: { guestId: guest.id },
      order: { checkOut: 'DESC' },
    });

    const lastVisit = lastBooking
      ? formatDateRu(lastBooking.checkOut)
      : 'нет данных';

    // Build Telegram message
    const message = birthdayAlertTemplate({
      firstName: guest.firstName,
      lastName: guest.lastName,
      birthday: guest.dateOfBirth ? formatDateRu(guest.dateOfBirth) : '—',
      phone: guest.phone,
      visitCount: guest.visitCount,
      lastVisit,
    });

    const sentCount = await this.notificationsService.sendToTelegramRecipients(
      guest.propertyId,
      message,
    );

    const sent = sentCount > 0;

    // Log notification
    await this.notificationLogRepository.save(
      this.notificationLogRepository.create({
        propertyId: guest.propertyId,
        bookingId: null,
        guestId: guest.id,
        eventType: 'birthday_alert',
        channel: 'telegram',
        status: sent ? 'sent' : 'failed',
        metadata: {
          dedupKey,
          guestName: `${guest.firstName} ${guest.lastName}`,
          birthday: guest.dateOfBirth,
        },
      }),
    );

    return sent;
  }

  /**
   * Get a Date object for N days from now in Tashkent timezone.
   */
  private getDatePlusDaysTashkent(days: number): Date {
    const now = new Date();
    const tashkent = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
    );
    tashkent.setDate(tashkent.getDate() + days);
    return tashkent;
  }
}
