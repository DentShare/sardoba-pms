import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot, GrammyError, HttpError } from 'grammy';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { CleaningTask } from '@/database/entities/cleaning-task.entity';
import { RoomCleaningStatus } from '@/database/entities/room-cleaning-status.entity';
import { CacheService } from '../../cache/cache.service';
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

  /** Cache key prefix for Telegram connection tokens */
  private static readonly TOKEN_PREFIX = 'tg:connect:';
  private static readonly TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(CleaningTask)
    private readonly taskRepository: Repository<CleaningTask>,
    @InjectRepository(RoomCleaningStatus)
    private readonly roomStatusRepository: Repository<RoomCleaningStatus>,
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
   * Token expires after 15 minutes. Stored in Redis via CacheService.
   */
  async storeConnectToken(token: string, propertyId: number): Promise<void> {
    await this.cacheService.set(
      `${TelegramService.TOKEN_PREFIX}${token}`,
      { propertyId },
      TelegramService.TOKEN_TTL_SECONDS,
    );
  }

  /**
   * Validate and consume a connection token. Returns propertyId if valid.
   */
  async consumeConnectToken(token: string): Promise<number | null> {
    const key = `${TelegramService.TOKEN_PREFIX}${token}`;
    const entry = await this.cacheService.get<{ propertyId: number }>(key);
    if (!entry) {
      return null;
    }

    // Delete token so it can only be used once
    await this.cacheService.del(key);
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

      const propertyId = await this.consumeConnectToken(token);
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

    // /tasks — today's cleaning tasks summary
    this.bot.command('tasks', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const propertyId = await this.findPropertyByChatId(chatId);

      if (!propertyId) {
        await ctx.reply(
          'Ваш чат не привязан к отелю.\nИспользуйте /start <token> для подключения.',
        );
        return;
      }

      const today = todayInTashkent();
      const tasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.room', 'room')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .where('task.propertyId = :propertyId', { propertyId })
        .andWhere('task.createdAt >= :today', { today })
        .getMany();

      if (tasks.length === 0) {
        await ctx.reply(
          `<b>Задачи уборки на ${today}</b>\n\n<i>Нет задач на сегодня.</i>`,
          { parse_mode: 'HTML' },
        );
        return;
      }

      const pending = tasks.filter((t) => t.taskStatus === 'pending' || t.taskStatus === 'assigned');
      const inProgress = tasks.filter((t) => t.taskStatus === 'in_progress');
      const completed = tasks.filter((t) => t.taskStatus === 'completed' || t.taskStatus === 'verified');

      const lines: string[] = [
        `<b>🧹 Задачи уборки на ${today}</b>`,
        ``,
        `<b>Итого:</b> ${tasks.length} | ⏳ ${pending.length} | 🔄 ${inProgress.length} | ✅ ${completed.length}`,
      ];

      if (pending.length > 0) {
        lines.push(``, `<b>⏳ Ожидают (${pending.length}):</b>`);
        for (const t of pending) {
          const roomName = t.room?.name ?? `#${t.roomId}`;
          const assignee = t.assignee ? ` → ${t.assignee.name}` : '';
          lines.push(`  ${roomName}${assignee}`);
        }
      }

      if (inProgress.length > 0) {
        lines.push(``, `<b>🔄 В процессе (${inProgress.length}):</b>`);
        for (const t of inProgress) {
          const roomName = t.room?.name ?? `#${t.roomId}`;
          const assignee = t.assignee ? ` — ${t.assignee.name}` : '';
          lines.push(`  ${roomName}${assignee}`);
        }
      }

      if (completed.length > 0) {
        lines.push(``, `<b>✅ Завершены (${completed.length}):</b>`);
        for (const t of completed) {
          const roomName = t.room?.name ?? `#${t.roomId}`;
          const assignee = t.assignee ? ` — ${t.assignee.name}` : '';
          lines.push(`  ${roomName}${assignee}`);
        }
      }

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    });

    // /room {number} — room cleaning status
    this.bot.command('room', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const roomName = ctx.match?.trim();

      if (!roomName) {
        await ctx.reply('Укажите номер комнаты.\nПример: /room 101');
        return;
      }

      const propertyId = await this.findPropertyByChatId(chatId);
      if (!propertyId) {
        await ctx.reply(
          'Ваш чат не привязан к отелю.\nИспользуйте /start <token> для подключения.',
        );
        return;
      }

      const room = await this.roomRepository.findOne({
        where: { propertyId, name: roomName },
      });

      if (!room) {
        await ctx.reply(`Номер «${roomName}» не найден.`);
        return;
      }

      const roomStatus = await this.roomStatusRepository.findOne({
        where: { propertyId, roomId: room.id },
      });

      const activeTask = await this.taskRepository.findOne({
        where: { propertyId, roomId: room.id },
        relations: ['assignee'],
        order: { createdAt: 'DESC' },
      });

      const statusLabels: Record<string, string> = {
        clean: '✅ Чисто',
        dirty: '❌ Грязно',
        cleaning: '🧹 Уборка',
        inspection: '🔍 Проверка',
        do_not_disturb: '🔕 Не беспокоить',
        out_of_order: '🚫 Не в работе',
      };

      const cleaningStatus = roomStatus?.cleaningStatus ?? 'clean';
      const statusLabel = statusLabels[cleaningStatus] ?? cleaningStatus;

      const lines: string[] = [
        `<b>🚪 Номер ${room.name}</b>`,
        ``,
        `<b>Тип:</b> ${room.roomType}`,
        `<b>Этаж:</b> ${room.floor ?? '—'}`,
        `<b>Статус уборки:</b> ${statusLabel}`,
      ];

      if (roomStatus?.lastCleanedAt) {
        const cleanedAt = new Date(roomStatus.lastCleanedAt).toLocaleString('ru-RU', {
          timeZone: 'Asia/Tashkent',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        lines.push(`<b>Последняя уборка:</b> ${cleanedAt}`);
      }

      if (activeTask && activeTask.taskStatus !== 'completed' && activeTask.taskStatus !== 'verified') {
        lines.push(
          ``,
          `<b>Активная задача:</b>`,
          `  Статус: ${activeTask.taskStatus}`,
          `  Тип: ${activeTask.taskType}`,
        );
        if (activeTask.assignee) {
          lines.push(`  Горничная: ${activeTask.assignee.name}`);
        }
      }

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    });

    // /done {room_number} — mark room cleaning as completed
    this.bot.command('done', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const roomName = ctx.match?.trim();

      if (!roomName) {
        await ctx.reply('Укажите номер комнаты.\nПример: /done 101');
        return;
      }

      const propertyId = await this.findPropertyByChatId(chatId);
      if (!propertyId) {
        await ctx.reply(
          'Ваш чат не привязан к отелю.\nИспользуйте /start <token> для подключения.',
        );
        return;
      }

      const room = await this.roomRepository.findOne({
        where: { propertyId, name: roomName },
      });

      if (!room) {
        await ctx.reply(`Номер «${roomName}» не найден.`);
        return;
      }

      const activeTask = await this.taskRepository.findOne({
        where: {
          propertyId,
          roomId: room.id,
        },
        relations: ['assignee'],
        order: { createdAt: 'DESC' },
      });

      if (!activeTask || activeTask.taskStatus === 'completed' || activeTask.taskStatus === 'verified') {
        await ctx.reply(`Нет активной задачи уборки для номера ${roomName}.`);
        return;
      }

      activeTask.taskStatus = 'completed';
      activeTask.completedAt = new Date();
      activeTask.cleaningStatus = 'clean';

      if (activeTask.startedAt) {
        const diffMs = activeTask.completedAt.getTime() - activeTask.startedAt.getTime();
        activeTask.durationMinutes = Math.round(diffMs / 60000);
      }

      await this.taskRepository.save(activeTask);

      let roomStatus = await this.roomStatusRepository.findOne({
        where: { propertyId, roomId: room.id },
      });

      if (!roomStatus) {
        roomStatus = this.roomStatusRepository.create({
          propertyId,
          roomId: room.id,
          cleaningStatus: 'clean' as RoomCleaningStatus['cleaningStatus'],
        });
      } else {
        roomStatus.cleaningStatus = 'clean' as RoomCleaningStatus['cleaningStatus'];
      }
      roomStatus.lastCleanedAt = new Date();
      await this.roomStatusRepository.save(roomStatus);

      const durationText = activeTask.durationMinutes
        ? ` за ${activeTask.durationMinutes} мин`
        : '';
      const assigneeText = activeTask.assignee
        ? `\n<b>Горничная:</b> ${activeTask.assignee.name}`
        : '';

      await ctx.reply(
        `<b>✅ Уборка завершена</b>\n\n` +
          `<b>Номер:</b> ${room.name}${durationText}` +
          assigneeText +
          `\n\n<i>Статус номера обновлён: Чисто</i>`,
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
   * Uses JSONB containment query instead of loading all settings.
   */
  private async findPropertyByChatId(
    chatId: string,
  ): Promise<number | null> {
    const settings = await this.settingsRepository
      .createQueryBuilder('s')
      .where(`s.telegram_recipients @> :filter::jsonb`, {
        filter: JSON.stringify([{ chatId }]),
      })
      .getOne();

    return settings?.propertyId ?? null;
  }
}
