import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository, DataSource } from 'typeorm';
import { Queue } from 'bull';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Channel } from '@/database/entities/channel.entity';
import { RoomMapping } from '@/database/entities/room-mapping.entity';
import { SyncLog } from '@/database/entities/sync-log.entity';
import { Room } from '@/database/entities/room.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { RoomMappingItemDto } from './dto/update-mappings.dto';

@Injectable()
export class ChannelManagerService {
  private readonly logger = new Logger(ChannelManagerService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(RoomMapping)
    private readonly mappingRepository: Repository<RoomMapping>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepository: Repository<SyncLog>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectQueue('channel-sync')
    private readonly syncQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  // ── findAll ──────────────────────────────────────────────────────────────

  /**
   * List all channels for a property.
   */
  async findAll(propertyId: number) {
    const channels = await this.channelRepository.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
    });

    return {
      data: channels.map((ch) => this.toResponseFormat(ch)),
    };
  }

  // ── findOne ──────────────────────────────────────────────────────────────

  /**
   * Get a single channel by id, scoped to a property.
   */
  async findOne(channelId: number, propertyId: number) {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, propertyId },
    });

    if (!channel) {
      throw new SardobaException(ErrorCode.CHANNEL_NOT_FOUND, {
        resource: 'channel',
        id: channelId,
      });
    }

    return this.toResponseFormat(channel);
  }

  // ── create ───────────────────────────────────────────────────────────────

  /**
   * Create a new channel for a property.
   * Credentials are stored as encrypted bytea via entity transform.
   */
  async create(propertyId: number, dto: CreateChannelDto) {
    // Check for duplicate channel type
    const existing = await this.channelRepository.findOne({
      where: { propertyId, type: dto.type },
    });

    if (existing) {
      throw new SardobaException(ErrorCode.ALREADY_EXISTS, {
        resource: 'channel',
        type: dto.type,
        property_id: propertyId,
      });
    }

    const channel = this.channelRepository.create({
      propertyId,
      type: dto.type,
      isActive: dto.is_active ?? true,
      credentials: Buffer.from(JSON.stringify(dto.credentials)),
    });

    const saved = await this.channelRepository.save(channel);

    this.logger.log(
      `Channel created: type=${dto.type}, propertyId=${propertyId}, channelId=${saved.id}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── update ───────────────────────────────────────────────────────────────

  /**
   * Update channel settings (active status, credentials).
   */
  async update(channelId: number, propertyId: number, dto: UpdateChannelDto) {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, propertyId },
    });

    if (!channel) {
      throw new SardobaException(ErrorCode.CHANNEL_NOT_FOUND, {
        resource: 'channel',
        id: channelId,
      });
    }

    if (dto.is_active !== undefined) {
      channel.isActive = dto.is_active;
    }

    if (dto.credentials !== undefined) {
      channel.credentials = Buffer.from(JSON.stringify(dto.credentials));
    }

    const saved = await this.channelRepository.save(channel);

    this.logger.log(
      `Channel updated: channelId=${channelId}, propertyId=${propertyId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── remove (deactivate) ──────────────────────────────────────────────────

  /**
   * Soft-deactivate a channel (set isActive=false).
   */
  async remove(channelId: number, propertyId: number) {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, propertyId },
    });

    if (!channel) {
      throw new SardobaException(ErrorCode.CHANNEL_NOT_FOUND, {
        resource: 'channel',
        id: channelId,
      });
    }

    channel.isActive = false;
    const saved = await this.channelRepository.save(channel);

    this.logger.log(
      `Channel deactivated: channelId=${channelId}, propertyId=${propertyId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── forceSync ────────────────────────────────────────────────────────────

  /**
   * Trigger a manual sync for a specific channel.
   * Enqueues a job onto the channel-sync Bull queue.
   */
  async forceSync(channelId: number, propertyId: number) {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, propertyId },
    });

    if (!channel) {
      throw new SardobaException(ErrorCode.CHANNEL_NOT_FOUND, {
        resource: 'channel',
        id: channelId,
      });
    }

    if (!channel.isActive) {
      throw new SardobaException(
        ErrorCode.CHANNEL_NOT_CONFIGURED,
        { channel_id: channelId },
        'Channel is deactivated. Activate it before syncing.',
      );
    }

    // Log the sync attempt
    const syncLog = this.syncLogRepository.create({
      channelId,
      eventType: 'manual_sync',
      status: 'pending',
      payload: { triggered_by: 'user', property_id: propertyId },
    });
    await this.syncLogRepository.save(syncLog);

    // Enqueue the sync job
    await this.syncQueue.add('sync-channel', {
      channelId,
      propertyId,
      channelType: channel.type,
      syncLogId: syncLog.id,
    });

    this.logger.log(
      `Manual sync queued: channelId=${channelId}, type=${channel.type}`,
    );

    // Update lastSyncAt
    channel.lastSyncAt = new Date();
    await this.channelRepository.save(channel);

    return {
      message: 'Sync job queued successfully',
      sync_log_id: syncLog.id,
      channel_id: channelId,
      channel_type: channel.type,
    };
  }

  // ── getLogs ──────────────────────────────────────────────────────────────

  /**
   * Get sync log entries for a channel.
   */
  async getLogs(channelId: number, limit = 100) {
    const logs = await this.syncLogRepository.find({
      where: { channelId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      data: logs.map((log) => ({
        id: log.id,
        channel_id: log.channelId,
        event_type: log.eventType,
        status: log.status,
        payload: log.payload,
        error_message: log.errorMessage,
        created_at: log.createdAt,
      })),
    };
  }

  // ── getMappings ──────────────────────────────────────────────────────────

  /**
   * Get room mappings for a channel.
   */
  async getMappings(channelId: number) {
    const mappings = await this.mappingRepository.find({
      where: { channelId },
      relations: ['room'],
    });

    return {
      data: mappings.map((m) => ({
        id: m.id,
        room_id: m.roomId,
        room_name: m.room?.name ?? null,
        channel_id: m.channelId,
        external_id: m.externalId,
      })),
    };
  }

  // ── updateMappings ───────────────────────────────────────────────────────

  /**
   * Replace all room mappings for a channel.
   * Validates that all room_ids belong to the channel's property.
   */
  async updateMappings(channelId: number, mappings: RoomMappingItemDto[]) {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new SardobaException(ErrorCode.CHANNEL_NOT_FOUND, {
        resource: 'channel',
        id: channelId,
      });
    }

    // Validate all rooms exist and belong to the same property
    if (mappings.length > 0) {
      const roomIds = mappings.map((m) => m.room_id);
      const rooms = await this.roomRepository
        .createQueryBuilder('room')
        .where('room.id IN (:...roomIds)', { roomIds })
        .andWhere('room.propertyId = :propertyId', {
          propertyId: channel.propertyId,
        })
        .getMany();

      const foundIds = new Set(rooms.map((r) => r.id));
      const missingIds = roomIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        throw new SardobaException(ErrorCode.NOT_FOUND, {
          resource: 'rooms',
          missing_ids: missingIds,
        });
      }
    }

    // Replace all mappings in a transaction
    await this.dataSource.transaction(async (manager) => {
      // Delete existing mappings for this channel
      await manager.delete(RoomMapping, { channelId });

      // Insert new mappings
      if (mappings.length > 0) {
        const newMappings = mappings.map((m) =>
          manager.create(RoomMapping, {
            channelId,
            roomId: m.room_id,
            externalId: m.external_id,
          }),
        );
        await manager.save(RoomMapping, newMappings);
      }
    });

    this.logger.log(
      `Mappings updated: channelId=${channelId}, count=${mappings.length}`,
    );

    return this.getMappings(channelId);
  }

  // ── resolveRoomByExternalId ──────────────────────────────────────────────

  /**
   * Resolve an internal room ID from an OTA external ID.
   * Used by webhook processors.
   */
  async resolveRoomByExternalId(
    channelId: number,
    externalId: string,
  ): Promise<RoomMapping | null> {
    return this.mappingRepository.findOne({
      where: { channelId, externalId },
      relations: ['room'],
    });
  }

  // ── getChannelEntity ─────────────────────────────────────────────────────

  /**
   * Get raw channel entity (used internally by webhook processors).
   */
  async getChannelEntity(channelId: number): Promise<Channel | null> {
    return this.channelRepository.findOne({ where: { id: channelId } });
  }

  // ── getActiveChannelByType ───────────────────────────────────────────────

  /**
   * Find an active channel by type for a property.
   */
  async getActiveChannelByType(
    propertyId: number,
    type: string,
  ): Promise<Channel | null> {
    return this.channelRepository.findOne({
      where: { propertyId, type: type as any, isActive: true },
    });
  }

  // ── getActiveChannelsByType ──────────────────────────────────────────────

  /**
   * Find all active channels of a specific type (across all properties).
   * Used by iCal polling to gather all Airbnb channels.
   */
  async getActiveChannelsByType(type: string): Promise<Channel[]> {
    return this.channelRepository.find({
      where: { type: type as any, isActive: true },
    });
  }

  // ── createSyncLog ────────────────────────────────────────────────────────

  /**
   * Create a sync log entry. Used by webhook processors and cron jobs.
   */
  async createSyncLog(
    channelId: number,
    eventType: string,
    status: 'success' | 'error' | 'pending',
    payload?: Record<string, unknown>,
    errorMessage?: string,
  ): Promise<SyncLog> {
    const log = this.syncLogRepository.create({
      channelId,
      eventType,
      status,
      payload: payload ?? null,
      errorMessage: errorMessage ?? null,
    });
    return this.syncLogRepository.save(log);
  }

  // ── updateLastSyncAt ─────────────────────────────────────────────────────

  /**
   * Update the lastSyncAt timestamp on a channel.
   */
  async updateLastSyncAt(channelId: number): Promise<void> {
    await this.channelRepository.update(channelId, {
      lastSyncAt: new Date(),
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Transform channel entity to snake_case API response format.
   * Credentials are masked for security.
   */
  private toResponseFormat(channel: Channel): Record<string, unknown> {
    let credentials: Record<string, unknown> = {};
    try {
      credentials = JSON.parse(channel.credentials.toString('utf-8'));
    } catch {
      credentials = {};
    }

    // Mask sensitive values in credentials
    const maskedCredentials: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (
        typeof value === 'string' &&
        (key.includes('key') ||
          key.includes('secret') ||
          key.includes('password') ||
          key.includes('token'))
      ) {
        maskedCredentials[key] =
          value.length > 6
            ? value.substring(0, 3) + '***' + value.substring(value.length - 3)
            : '***';
      } else {
        maskedCredentials[key] = value;
      }
    }

    return {
      id: channel.id,
      property_id: channel.propertyId,
      type: channel.type,
      is_active: channel.isActive,
      credentials: maskedCredentials,
      last_sync_at: channel.lastSyncAt,
      created_at: channel.createdAt,
    };
  }
}
