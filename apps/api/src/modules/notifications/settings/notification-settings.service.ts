import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Property } from '@/database/entities/property.entity';
import { TelegramService } from '../telegram/telegram.service';
import { UpdateNotificationSettingsDto } from '../dto/update-settings.dto';
import { testMessageTemplate } from '../telegram/telegram.templates';

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly telegramService: TelegramService,
  ) {}

  // ── Get settings ─────────────────────────────────────────────────────────

  /**
   * Get notification settings for a property.
   * Creates default settings if none exist.
   */
  async getSettings(propertyId: number): Promise<Record<string, unknown>> {
    const settings = await this.findOrCreate(propertyId);
    return this.toResponseFormat(settings);
  }

  // ── Update settings ──────────────────────────────────────────────────────

  /**
   * Update notification settings for a property.
   */
  async updateSettings(
    propertyId: number,
    dto: UpdateNotificationSettingsDto,
  ): Promise<Record<string, unknown>> {
    const settings = await this.findOrCreate(propertyId);

    if (dto.telegram_recipients !== undefined) {
      settings.telegramRecipients = dto.telegram_recipients.map((r) => ({
        name: r.name,
        chatId: r.chat_id,
        isActive: r.is_active,
      }));
    }

    if (dto.event_new_booking !== undefined) {
      settings.eventNewBooking = dto.event_new_booking;
    }

    if (dto.event_cancellation !== undefined) {
      settings.eventCancellation = dto.event_cancellation;
    }

    if (dto.event_daily_digest !== undefined) {
      settings.eventDailyDigest = dto.event_daily_digest;
    }

    if (dto.daily_digest_time !== undefined) {
      settings.dailyDigestTime = dto.daily_digest_time;
    }

    if (dto.event_payment !== undefined) {
      settings.eventPayment = dto.event_payment;
    }

    if (dto.event_sync_error !== undefined) {
      settings.eventSyncError = dto.event_sync_error;
    }

    const saved = await this.settingsRepository.save(settings);
    this.logger.log(`Notification settings updated for property #${propertyId}`);

    return this.toResponseFormat(saved);
  }

  // ── Test message ─────────────────────────────────────────────────────────

  /**
   * Send a test notification to all active Telegram recipients.
   * Returns send results per recipient.
   */
  async sendTestMessage(
    propertyId: number,
  ): Promise<{ results: Array<{ chat_id: string; name: string; sent: boolean }> }> {
    const settings = await this.findOrCreate(propertyId);

    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });
    const propertyName = property?.name ?? `Property #${propertyId}`;

    const activeRecipients = settings.telegramRecipients.filter(
      (r) => r.isActive,
    );

    if (activeRecipients.length === 0) {
      return { results: [] };
    }

    const message = testMessageTemplate(propertyName);
    const results: Array<{ chat_id: string; name: string; sent: boolean }> = [];

    for (const recipient of activeRecipients) {
      const sent = await this.telegramService.sendMessage(
        recipient.chatId,
        message,
      );
      results.push({
        chat_id: recipient.chatId,
        name: recipient.name,
        sent,
      });
    }

    this.logger.log(
      `Test message sent to ${results.filter((r) => r.sent).length}/${results.length} recipients for property #${propertyId}`,
    );

    return { results };
  }

  // ── Telegram connect token ──────────────────────────────────────────────

  /**
   * Generate a one-time token for linking a Telegram chat to a property.
   * Returns the token and a deep link for Telegram.
   */
  async generateConnectToken(
    propertyId: number,
  ): Promise<{ token: string; link: string; expires_in: number }> {
    // Verify property exists
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id: propertyId,
      });
    }

    // Generate random token
    const token = randomBytes(16).toString('hex');
    const TTL_SECONDS = 900; // 15 minutes

    // Store in TelegramService in-memory map
    this.telegramService.storeConnectToken(token, propertyId);

    // Build deep link (uses the bot username)
    // Users will get the actual link when they open it in Telegram
    const link = `https://t.me/?start=${token}`;

    this.logger.log(
      `Telegram connect token generated for property #${propertyId} (expires in ${TTL_SECONDS}s)`,
    );

    return {
      token,
      link,
      expires_in: TTL_SECONDS,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Find existing settings or create default ones for a property.
   */
  private async findOrCreate(
    propertyId: number,
  ): Promise<NotificationSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { propertyId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        propertyId,
        telegramRecipients: [],
        eventNewBooking: true,
        eventCancellation: true,
        eventDailyDigest: true,
        dailyDigestTime: '08:00',
        eventPayment: true,
        eventSyncError: true,
      });
      settings = await this.settingsRepository.save(settings);
      this.logger.log(
        `Created default notification settings for property #${propertyId}`,
      );
    }

    return settings;
  }

  /**
   * Transform settings entity to snake_case API response format.
   */
  private toResponseFormat(
    settings: NotificationSettings,
  ): Record<string, unknown> {
    return {
      id: settings.id,
      property_id: settings.propertyId,
      telegram_recipients: settings.telegramRecipients.map((r) => ({
        name: r.name,
        chat_id: r.chatId,
        is_active: r.isActive,
      })),
      event_new_booking: settings.eventNewBooking,
      event_cancellation: settings.eventCancellation,
      event_daily_digest: settings.eventDailyDigest,
      daily_digest_time: settings.dailyDigestTime,
      event_payment: settings.eventPayment,
      event_sync_error: settings.eventSyncError,
      updated_at: settings.updatedAt,
    };
  }
}
