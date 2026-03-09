import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '@/database/entities/channel.entity';
import { RoomMapping } from '@/database/entities/room-mapping.entity';
import { Booking } from '@/database/entities/booking.entity';
import { ChannelManagerService } from './channel-manager.service';

/* ── Job payload interfaces ─────────────────────────────────────────────── */

interface SyncChannelJob {
  channelId: number;
  propertyId: number;
  channelType: string;
  syncLogId: number;
}

interface CloseRoomJob {
  channelId: number;
  channelType: string;
  propertyId: number;
  roomId: number;
  externalRoomId: string;
  checkIn: string;
  checkOut: string;
  bookingId: number;
  bookingNumber: string;
}

interface OpenRoomJob {
  channelId: number;
  channelType: string;
  propertyId: number;
  roomId: number;
  externalRoomId: string;
  checkIn: string;
  checkOut: string;
  bookingId: number;
  bookingNumber: string;
  cancelReason?: string;
}

/* ── Processor ──────────────────────────────────────────────────────────── */

@Processor('channel-sync')
export class ChannelSyncProcessor {
  private readonly logger = new Logger(ChannelSyncProcessor.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(RoomMapping)
    private readonly mappingRepository: Repository<RoomMapping>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly channelManagerService: ChannelManagerService,
  ) {}

  /* ── sync-channel: full availability push ────────────────────────────── */

  @Process('sync-channel')
  async handleSyncChannel(job: Job<SyncChannelJob>): Promise<void> {
    const { channelId, propertyId, channelType, syncLogId } = job.data;

    this.logger.log(
      `Processing sync-channel: channelId=${channelId}, type=${channelType}`,
    );

    try {
      const channel = await this.channelRepository.findOne({
        where: { id: channelId },
      });
      if (!channel || !channel.isActive) {
        this.logger.warn(`Channel ${channelId} not found or inactive, skipping`);
        await this.channelManagerService.createSyncLog(
          channelId,
          'manual_sync',
          'error',
          { sync_log_id: syncLogId },
          'Channel not found or deactivated',
        );
        return;
      }

      const credentials = this.parseCredentials(channel);

      const mappings = await this.mappingRepository.find({
        where: { channelId },
        relations: ['room'],
      });

      if (mappings.length === 0) {
        this.logger.warn(`No room mappings for channel ${channelId}`);
        await this.channelManagerService.createSyncLog(
          channelId,
          'manual_sync',
          'error',
          { sync_log_id: syncLogId },
          'No room mappings configured',
        );
        return;
      }

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);

      const bookings = await this.bookingRepository
        .createQueryBuilder('b')
        .where('b.propertyId = :propertyId', { propertyId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: ['confirmed', 'checked_in'],
        })
        .andWhere('b.checkOut >= :today', {
          today: today.toISOString().split('T')[0],
        })
        .getMany();

      const availabilityUpdates = mappings.map((mapping) => {
        const roomBookings = bookings.filter(
          (b) => b.roomId === mapping.roomId,
        );

        const blockedDates = roomBookings.map((b) => ({
          check_in: b.checkIn,
          check_out: b.checkOut,
          booking_number: b.bookingNumber,
        }));

        return {
          external_room_id: mapping.externalId,
          room_id: mapping.roomId,
          room_name: mapping.room?.name ?? `Room ${mapping.roomId}`,
          blocked_dates: blockedDates,
        };
      });

      switch (channelType) {
        case 'booking_com':
          await this.syncBookingCom(credentials, availabilityUpdates);
          break;
        case 'airbnb':
          this.logger.log(
            'Airbnb uses iCal polling; availability sync is read-only from PMS side',
          );
          break;
        case 'expedia':
          await this.syncGenericOTA(
            channelType,
            credentials,
            availabilityUpdates,
          );
          break;
        case 'hotels_com':
          await this.syncGenericOTA(
            channelType,
            credentials,
            availabilityUpdates,
          );
          break;
        case 'ostrovok':
          await this.syncGenericOTA(
            channelType,
            credentials,
            availabilityUpdates,
          );
          break;
        default:
          this.logger.warn(`Unknown channel type: ${channelType}`);
      }

      await this.channelManagerService.createSyncLog(
        channelId,
        'full_sync',
        'success',
        {
          sync_log_id: syncLogId,
          rooms_synced: mappings.length,
          bookings_found: bookings.length,
        },
      );

      await this.channelManagerService.updateLastSyncAt(channelId);

      this.logger.log(
        `Sync completed: channelId=${channelId}, rooms=${mappings.length}, bookings=${bookings.length}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Sync failed: channelId=${channelId}, error=${errorMessage}`,
      );

      await this.channelManagerService.createSyncLog(
        channelId,
        'full_sync',
        'error',
        { sync_log_id: syncLogId },
        errorMessage,
      );
    }
  }

  /* ── close-room: block availability on OTA ───────────────────────────── */

  @Process('close-room')
  async handleCloseRoom(job: Job<CloseRoomJob>): Promise<void> {
    const {
      channelId,
      channelType,
      externalRoomId,
      checkIn,
      checkOut,
      bookingNumber,
    } = job.data;

    this.logger.log(
      `Processing close-room: channelId=${channelId}, ` +
        `externalRoom=${externalRoomId}, dates=${checkIn}..${checkOut}`,
    );

    try {
      const channel = await this.channelRepository.findOne({
        where: { id: channelId },
      });
      if (!channel || !channel.isActive) return;

      const credentials = this.parseCredentials(channel);

      switch (channelType) {
        case 'booking_com':
          await this.closeRoomBookingCom(
            credentials,
            externalRoomId,
            checkIn,
            checkOut,
          );
          break;
        case 'expedia':
        case 'hotels_com':
        case 'ostrovok':
          await this.closeRoomGenericOTA(
            channelType,
            credentials,
            externalRoomId,
            checkIn,
            checkOut,
          );
          break;
        case 'airbnb':
          this.logger.debug(
            'Airbnb uses iCal; close-room is handled by iCal export',
          );
          break;
      }

      await this.channelManagerService.createSyncLog(
        channelId,
        'close_room',
        'success',
        {
          external_room_id: externalRoomId,
          check_in: checkIn,
          check_out: checkOut,
          booking_number: bookingNumber,
        },
      );

      await this.channelManagerService.updateLastSyncAt(channelId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Close-room failed: channelId=${channelId}, error=${errorMessage}`,
      );

      await this.channelManagerService.createSyncLog(
        channelId,
        'close_room',
        'error',
        {
          external_room_id: externalRoomId,
          check_in: checkIn,
          check_out: checkOut,
        },
        errorMessage,
      );
    }
  }

  /* ── open-room: restore availability on OTA ──────────────────────────── */

  @Process('open-room')
  async handleOpenRoom(job: Job<OpenRoomJob>): Promise<void> {
    const {
      channelId,
      channelType,
      externalRoomId,
      checkIn,
      checkOut,
      bookingNumber,
    } = job.data;

    this.logger.log(
      `Processing open-room: channelId=${channelId}, ` +
        `externalRoom=${externalRoomId}, dates=${checkIn}..${checkOut}`,
    );

    try {
      const channel = await this.channelRepository.findOne({
        where: { id: channelId },
      });
      if (!channel || !channel.isActive) return;

      const credentials = this.parseCredentials(channel);

      switch (channelType) {
        case 'booking_com':
          await this.openRoomBookingCom(
            credentials,
            externalRoomId,
            checkIn,
            checkOut,
          );
          break;
        case 'expedia':
        case 'hotels_com':
        case 'ostrovok':
          await this.openRoomGenericOTA(
            channelType,
            credentials,
            externalRoomId,
            checkIn,
            checkOut,
          );
          break;
        case 'airbnb':
          this.logger.debug(
            'Airbnb uses iCal; open-room is handled by iCal export',
          );
          break;
      }

      await this.channelManagerService.createSyncLog(
        channelId,
        'open_room',
        'success',
        {
          external_room_id: externalRoomId,
          check_in: checkIn,
          check_out: checkOut,
          booking_number: bookingNumber,
        },
      );

      await this.channelManagerService.updateLastSyncAt(channelId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Open-room failed: channelId=${channelId}, error=${errorMessage}`,
      );

      await this.channelManagerService.createSyncLog(
        channelId,
        'open_room',
        'error',
        {
          external_room_id: externalRoomId,
          check_in: checkIn,
          check_out: checkOut,
        },
        errorMessage,
      );
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     OTA-SPECIFIC SYNC METHODS
     ═══════════════════════════════════════════════════════════════════════ */

  private async syncBookingCom(
    credentials: Record<string, string>,
    updates: AvailabilityUpdate[],
  ): Promise<void> {
    const { api_key, hotel_id } = credentials;

    if (!api_key || !hotel_id) {
      throw new Error('Booking.com credentials missing: api_key or hotel_id');
    }

    /*
     * Booking.com Connectivity API: POST /availability
     *
     * In production, this calls the Booking.com OTA API to push availability.
     * The API uses XML or JSON depending on the hotel's connectivity setup.
     *
     * Reference: https://connect.booking.com/user_guide/site/en-US/
     *
     * For now we log the intended call. Replace with actual HTTP request
     * when Booking.com API credentials are obtained.
     */
    for (const update of updates) {
      this.logger.log(
        `[Booking.com] Sync room ${update.external_room_id}: ` +
          `${update.blocked_dates.length} blocked periods`,
      );
    }
  }

  private async closeRoomBookingCom(
    credentials: Record<string, string>,
    externalRoomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    const { api_key, hotel_id } = credentials;

    this.logger.log(
      `[Booking.com] Close room ${externalRoomId} for hotel ${hotel_id}: ` +
        `${checkIn} → ${checkOut}`,
    );

    /*
     * POST to Booking.com availability endpoint to set count=0
     * for the date range. Actual HTTP call goes here.
     */
  }

  private async openRoomBookingCom(
    credentials: Record<string, string>,
    externalRoomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    const { api_key, hotel_id } = credentials;

    this.logger.log(
      `[Booking.com] Open room ${externalRoomId} for hotel ${hotel_id}: ` +
        `${checkIn} → ${checkOut}`,
    );

    /*
     * POST to Booking.com availability endpoint to set count=1
     * for the date range. Actual HTTP call goes here.
     */
  }

  private async syncGenericOTA(
    channelType: string,
    credentials: Record<string, string>,
    updates: AvailabilityUpdate[],
  ): Promise<void> {
    this.logger.log(
      `[${channelType}] Full sync: ${updates.length} rooms`,
    );

    for (const update of updates) {
      this.logger.log(
        `[${channelType}] Room ${update.external_room_id}: ` +
          `${update.blocked_dates.length} blocked periods`,
      );
    }
  }

  private async closeRoomGenericOTA(
    channelType: string,
    credentials: Record<string, string>,
    externalRoomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    this.logger.log(
      `[${channelType}] Close room ${externalRoomId}: ${checkIn} → ${checkOut}`,
    );
  }

  private async openRoomGenericOTA(
    channelType: string,
    credentials: Record<string, string>,
    externalRoomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    this.logger.log(
      `[${channelType}] Open room ${externalRoomId}: ${checkIn} → ${checkOut}`,
    );
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  private parseCredentials(channel: Channel): Record<string, string> {
    try {
      return JSON.parse(channel.credentials.toString('utf-8'));
    } catch {
      throw new Error(`Failed to parse credentials for channel ${channel.id}`);
    }
  }
}

/* ── Types ───────────────────────────────────────────────────────────────── */

interface AvailabilityUpdate {
  external_room_id: string;
  room_id: number;
  room_name: string;
  blocked_dates: Array<{
    check_in: string;
    check_out: string;
    booking_number: string;
  }>;
}
