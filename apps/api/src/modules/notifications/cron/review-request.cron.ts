import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking } from '@/database/entities/booking.entity';
import { Property } from '@/database/entities/property.entity';
import { NotificationLog } from '@/database/entities/notification-log.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications.service';
import { reviewRequestFallbackTemplate } from '../telegram/telegram.templates';

/**
 * Review request cron job.
 *
 * Runs every hour. Finds bookings where status = 'checked_out' and
 * updated_at is 2-3 hours ago, then sends a WhatsApp message to the guest
 * asking for a review. Only sends if the property has at least one review URL.
 */
@Injectable()
export class ReviewRequestCron {
  private readonly logger = new Logger(ReviewRequestCron.name);

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

  /**
   * Review request cron — runs every hour.
   */
  @Cron('0 */1 * * *')
  async handleReviewRequest(): Promise<void> {
    this.logger.log('Starting review request cron job');

    try {
      // Find bookings checked out 2-3 hours ago
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const bookings = await this.bookingRepository.find({
        where: {
          status: 'checked_out',
          updatedAt: Between(threeHoursAgo, twoHoursAgo),
        },
        relations: ['guest'],
      });

      if (bookings.length === 0) {
        this.logger.debug('No recently checked-out bookings for review request');
        return;
      }

      let sentCount = 0;

      for (const booking of bookings) {
        try {
          const sent = await this.processBooking(booking);
          if (sent) sentCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send review request for booking #${booking.bookingNumber}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      this.logger.log(
        `Review request completed: sent ${sentCount}/${bookings.length} notifications`,
      );
    } catch (error) {
      this.logger.error(
        'Review request cron job failed',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Process a single booking for review request notification.
   * Returns true if a notification was sent.
   */
  private async processBooking(booking: Booking): Promise<boolean> {
    // Dedup: check if review request already sent for this booking
    const existing = await this.notificationLogRepository.findOne({
      where: {
        bookingId: booking.id,
        eventType: 'review_request',
      },
    });

    if (existing) {
      this.logger.debug(
        `Review request already sent for booking #${booking.bookingNumber}`,
      );
      return false;
    }

    if (!booking.guest) {
      this.logger.warn(
        `No guest data for booking #${booking.bookingNumber}, skipping review request`,
      );
      return false;
    }

    // Get property with review URLs
    const property = await this.propertyRepository.findOne({
      where: { id: booking.propertyId },
    });

    if (!property) {
      return false;
    }

    // Build review links — only send if at least one URL is configured
    const reviewLinks = this.buildReviewLinks(property);
    if (!reviewLinks) {
      this.logger.debug(
        `No review URLs configured for property #${property.id}, skipping`,
      );
      return false;
    }

    // Build WhatsApp message
    const whatsappMessage = this.buildWhatsAppMessage(
      booking.guest.firstName,
      property.name,
      reviewLinks,
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
      const telegramMessage = reviewRequestFallbackTemplate({
        bookingNumber: booking.bookingNumber,
        guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        guestPhone: booking.guest.phone,
        propertyName: property.name,
        reviewLinks,
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
        eventType: 'review_request',
        channel,
        status: sent ? 'sent' : 'failed',
        metadata: {
          bookingNumber: booking.bookingNumber,
          guestPhone: booking.guest.phone,
        },
      }),
    );

    return sent;
  }

  /**
   * Build formatted review links string from property review URLs.
   * Returns null if no review URLs are configured.
   */
  private buildReviewLinks(property: Property): string | null {
    const links: string[] = [];

    if (property.googleReviewUrl) {
      links.push(`⭐ Google: ${property.googleReviewUrl}`);
    }
    if (property.tripadvisorUrl) {
      links.push(`🌐 TripAdvisor: ${property.tripadvisorUrl}`);
    }
    if (property.bookingComReviewUrl) {
      links.push(`🏨 Booking.com: ${property.bookingComReviewUrl}`);
    }

    return links.length > 0 ? links.join('\n') : null;
  }

  /**
   * Build the WhatsApp review request message for the guest.
   */
  private buildWhatsAppMessage(
    firstName: string,
    propertyName: string,
    reviewLinks: string,
  ): string {
    return [
      `Спасибо за визит, ${firstName}! 🙏`,
      ``,
      `Надеемся вам всё понравилось в ${propertyName}.`,
      `Будем благодарны за отзыв:`,
      ``,
      reviewLinks,
      ``,
      `До встречи!`,
    ].join('\n');
  }
}
