import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot, GrammyError, HttpError } from 'grammy';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { todayInTashkent } from '@sardoba/shared';

/**
 * Telegram bot service using Grammy.js.
 *
 * Initializes the bot only when TELEGRAM_BOT_TOKEN is provided.
 * Provides sendMessage for outgoing notifications and bot commands
 * (/start, /today, /status) for interactive use.
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;
  private readonly token: string;

  /**
   * In-memory map of one-time connection tokens.
   * Key: token string, Value: { propertyId, expiresAt }
   */
  private readonly connectTokens = new Map<
    string,
    { propertyId: number; expiresAt: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {
    this.token = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    if (!this.token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not set. Telegram bot will not be started.',
      );
      return;
    }

    try {
      this.bot = new Bot(this.token);
      this.registerCommands();
      await this.startBot();
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot', error);
      this.bot = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      try {
        this.bot.stop();
        this.logger.log('Telegram bot stopped');
      } catch {
        // Ignore errors on shutdown
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Send a message to a specific chat ID.
   * Returns true if sent successfully, false otherwise.
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    parseMode: 'HTML' | 'MarkdownV2' = 'HTML',
  ): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn(
        `Cannot send message: Telegram bot is not initialized (chatId=${chatId})`,
      );
      return false;
    }

    try {
      await this.bot.api.sendMessage(chatId, text, {
        parse_mode: parseMode,
      });
      return true;
    } catch (error) {
      if (error instanceof GrammyError) {
        this.logger.error(
          `Telegram API error [${error.error_code}]: ${error.description} (chatId=${chatId})`,
        );
      } else if (error instanceof HttpError) {
        this.logger.error(
          `Telegram HTTP error: ${error.message} (chatId=${chatId})`,
        );
      } else {
        this.logger.error(
          `Failed to send Telegram message to chatId=${chatId}`,
          error,
        );
      }
      return false;
    }
  }

  /**
   * Check if the bot is initialized and ready to send messages.
   */
  isReady(): boolean {
    return this.bot !== null;
  }

  /**
   * Store a one-time connection token for linking Telegram chat to a property.
   * Token expires after 15 minutes.
   */
  storeConnectToken(token: string, propertyId: number): void {
    const TTL_MS = 15 * 60 * 1000; // 15 minutes
    this.connectTokens.set(token, {
      propertyId,
      expiresAt: Date.now() + TTL_MS,
    });

    // Schedule cleanup
    setTimeout(() => {
      this.connectTokens.delete(token);
    }, TTL_MS);
  }

  /**
   * Validate and consume a connection token. Returns propertyId if valid.
   */
  consumeConnectToken(token: string): number | null {
    const entry = this.connectTokens.get(token);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.connectTokens.delete(token);
      return null;
    }

    this.connectTokens.delete(token);
    return entry.propertyId;
  }

  // ── Bot commands ─────────────────────────────────────────────────────────

  private registerCommands(): void {
    if (!this.bot) return;

    // /start {token} — link this chat to a property
    this.bot.command('start', async (ctx) => {
      const token = ctx.match?.trim();
      if (!token) {
        await ctx.reply(
          'Добро пожаловать в Sardoba PMS!\n\n' +
            'Для подключения уведомлений используйте команду из панели управления.\n' +
            'Она сгенерирует ссылку вида /start <token>.',
        );
        return;
      }

      const propertyId = this.consumeConnectToken(token);
      if (!propertyId) {
        await ctx.reply(
          'Токен недействителен или истёк.\nСгенерируйте новый в панели управления.',
        );
        return;
      }

      const chatId = String(ctx.chat.id);
      const userName =
        ctx.from?.first_name ??
        ctx.from?.username ??
        `Chat ${chatId}`;

      // Find or create notification settings for this property
      let settings = await this.settingsRepository.findOne({
        where: { propertyId },
      });

      if (!settings) {
        settings = this.settingsRepository.create({
          propertyId,
          telegramRecipients: [],
        });
      }

      // Check if this chatId is already registered
      const existing = settings.telegramRecipients.find(
        (r) => r.chatId === chatId,
      );
      if (existing) {
        existing.isActive = true;
        existing.name = userName;
      } else {
        settings.telegramRecipients.push({
          name: userName,
          chatId,
          isActive: true,
        });
      }

      await this.settingsRepository.save(settings);

      await ctx.reply(
        `Подключено! Вы будете получать уведомления от Sardoba PMS.\n\n` +
          `Имя: ${userName}\nChat ID: ${chatId}\n\n` +
          `Доступные команды:\n` +
          `/today — сводка на сегодня\n` +
          `/status — статус подключения`,
      );

      this.logger.log(
        `Telegram chat ${chatId} (${userName}) linked to property #${propertyId}`,
      );
    });

    // /today — today's summary
    this.bot.command('today', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const propertyId = await this.findPropertyByChatId(chatId);

      if (!propertyId) {
        await ctx.reply(
          'Ваш чат не привязан к отелю.\nИспользуйте /start <token> для подключения.',
        );
        return;
      }

      const today = todayInTashkent();

      // Get today's check-ins
      const checkIns = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.guest', 'guest')
        .leftJoinAndSelect('booking.room', 'room')
        .where('booking.propertyId = :propertyId', { propertyId })
        .andWhere('booking.checkIn = :today', { today })
        .andWhere('booking.status NOT IN (:...excluded)', {
          excluded: ['cancelled', 'no_show'],
        })
        .getMany();

      // Get today's check-outs
      const checkOuts = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.guest', 'guest')
        .leftJoinAndSelect('booking.room', 'room')
        .where('booking.propertyId = :propertyId', { propertyId })
        .andWhere('booking.checkOut = :today', { today })
        .andWhere('booking.status NOT IN (:...excluded)', {
          excluded: ['cancelled', 'no_show'],
        })
        .getMany();

      // Get occupied rooms count
      const occupiedCount = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.propertyId = :propertyId', { propertyId })
        .andWhere('booking.checkIn <= :today', { today })
        .andWhere('booking.checkOut > :today', { today })
        .andWhere('booking.status IN (:...active)', {
          active: ['confirmed', 'checked_in'],
        })
        .getCount();

      const totalRooms = await this.roomRepository.count({
        where: { propertyId, status: 'active' },
      });

      const occupancy =
        totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

      const lines: string[] = [
        `<b>Сводка на ${today}</b>`,
        ``,
        `<b>Загрузка:</b> ${occupiedCount}/${totalRooms} (${occupancy}%)`,
      ];

      if (checkIns.length > 0) {
        lines.push(``, `<b>Заезды (${checkIns.length}):</b>`);
        for (const b of checkIns) {
          const gName = b.guest
            ? `${b.guest.firstName} ${b.guest.lastName}`
            : '—';
          const rName = b.room ? b.room.name : '—';
          lines.push(`  ${b.bookingNumber} — ${gName}, ${rName}`);
        }
      }

      if (checkOuts.length > 0) {
        lines.push(``, `<b>Выезды (${checkOuts.length}):</b>`);
        for (const b of checkOuts) {
          const gName = b.guest
            ? `${b.guest.firstName} ${b.guest.lastName}`
            : '—';
          const rName = b.room ? b.room.name : '—';
          lines.push(`  ${b.bookingNumber} — ${gName}, ${rName}`);
        }
      }

      if (checkIns.length === 0 && checkOuts.length === 0) {
        lines.push(``, `<i>Сегодня нет запланированных заездов и выездов.</i>`);
      }

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    });

    // /status — connection status
    this.bot.command('status', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const propertyId = await this.findPropertyByChatId(chatId);

      if (!propertyId) {
        await ctx.reply(
          'Статус: не подключен\n\nИспользуйте /start <token> для подключения.',
        );
        return;
      }

      const settings = await this.settingsRepository.findOne({
        where: { propertyId },
        relations: ['property'],
      });

      if (!settings) {
        await ctx.reply('Статус: настройки не найдены');
        return;
      }

      const recipient = settings.telegramRecipients.find(
        (r) => r.chatId === chatId,
      );
      const propertyName = settings.property?.name ?? `ID ${propertyId}`;

      await ctx.reply(
        `<b>Статус подключения</b>\n\n` +
          `<b>Отель:</b> ${propertyName}\n` +
          `<b>Chat ID:</b> ${chatId}\n` +
          `<b>Имя:</b> ${recipient?.name ?? '—'}\n` +
          `<b>Активен:</b> ${recipient?.isActive ? 'Да' : 'Нет'}\n\n` +
          `<b>Уведомления:</b>\n` +
          `  Новые брони: ${settings.eventNewBooking ? 'Вкл' : 'Выкл'}\n` +
          `  Отмены: ${settings.eventCancellation ? 'Вкл' : 'Выкл'}\n` +
          `  Оплаты: ${settings.eventPayment ? 'Вкл' : 'Выкл'}\n` +
          `  Дайджест: ${settings.eventDailyDigest ? 'Вкл' : 'Выкл'} (${settings.dailyDigestTime})\n` +
          `  Ошибки синхронизации: ${settings.eventSyncError ? 'Вкл' : 'Выкл'}`,
        { parse_mode: 'HTML' },
      );
    });

    // Handle errors
    this.bot.catch((err) => {
      this.logger.error('Telegram bot error:', err.error);
    });
  }

  /**
   * Start the bot using long polling.
   */
  private async startBot(): Promise<void> {
    if (!this.bot) return;

    try {
      // Delete any existing webhook so long polling works
      await this.bot.api.deleteWebhook();

      // Start long polling in the background (non-blocking)
      this.bot.start({
        onStart: (botInfo) => {
          this.logger.log(
            `Telegram bot @${botInfo.username} started (long polling)`,
          );
        },
      });
    } catch (error) {
      this.logger.error('Failed to start Telegram bot', error);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Find the property ID for a given Telegram chat ID.
   */
  private async findPropertyByChatId(
    chatId: string,
  ): Promise<number | null> {
    const allSettings = await this.settingsRepository.find();

    for (const settings of allSettings) {
      const recipient = settings.telegramRecipients.find(
        (r) => r.chatId === chatId && r.isActive,
      );
      if (recipient) {
        return settings.propertyId;
      }
    }

    return null;
  }
}
