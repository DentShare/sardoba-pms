import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '@/database/entities/channel.entity';
import { RoomMapping } from '@/database/entities/room-mapping.entity';
import { ChannelManagerService } from './channel-manager.service';
import { BookingCreatedEvent } from '../bookings/events/booking-created.event';
import { BookingCancelledEvent } from '../bookings/events/booking-cancelled.event';

/**
 * SyncErrorEvent emitted when a channel sync operation fails.
 */
export interface SyncErrorEvent {
  channelId: number;
  channelType: string;
  eventType: string;
  reservationId?: string;
  error: string;
}

@Injectable()
export class ChannelManagerListener {
  private readonly logger = new Logger(ChannelManagerListener.name);

  constructor(
    @InjectQueue('channel-sync')
    private readonly syncQueue: Queue,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(RoomMapping)
    private readonly mappingRepository: Repository<RoomMapping>,
    private readonly channelManagerService: ChannelManagerService,
  ) {}

  // ── booking.created ─────────────────────────────────────────────────────

  /**
   * When a booking is created (from any source), queue jobs to close/block
   * the room on all OTHER active OTA channels for this property.
   *
   * This prevents double-bookings across channels.
   */
  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    this.logger.debug(
      `Handling booking.created: bookingId=${event.bookingId}, ` +
        `roomId=${event.roomId}, propertyId=${event.propertyId}`,
    );

    try {
      // Find all active channels for this property that have this room mapped
      const affectedChannels = await this.findAffectedChannels(
        event.propertyId,
        event.roomId,
      );

      if (affectedChannels.length === 0) {
        this.logger.debug(
          `No OTA channels to notify for roomId=${event.roomId}`,
        );
        return;
      }

      // Queue a "close-room" job for each affected channel
      for (const { channel, mapping } of affectedChannels) {
        await this.syncQueue.add('close-room', {
          channelId: channel.id,
          channelType: channel.type,
          propertyId: event.propertyId,
          roomId: event.roomId,
          externalRoomId: mapping.externalId,
          checkIn: event.checkIn,
          checkOut: event.checkOut,
          bookingId: event.bookingId,
          bookingNumber: event.bookingNumber,
        });

        this.logger.log(
          `Queued close-room job: channelId=${channel.id}, ` +
            `type=${channel.type}, roomId=${event.roomId}, ` +
            `dates=${event.checkIn}..${event.checkOut}`,
        );

        // Log the sync attempt
        await this.channelManagerService.createSyncLog(
          channel.id,
          'close_room',
          'pending',
          {
            booking_id: event.bookingId,
            room_id: event.roomId,
            external_room_id: mapping.externalId,
            check_in: event.checkIn,
            check_out: event.checkOut,
          },
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to handle booking.created for bookingId=${event.bookingId}: ${errorMessage}`,
      );
    }
  }

  // ── booking.cancelled ───────────────────────────────────────────────────

  /**
   * When a booking is cancelled, queue jobs to open/unblock the room
   * on all active OTA channels for this property.
   *
   * This re-opens availability on other channels.
   */
  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: BookingCancelledEvent): Promise<void> {
    this.logger.debug(
      `Handling booking.cancelled: bookingId=${event.bookingId}, ` +
        `roomId=${event.roomId}, propertyId=${event.propertyId}`,
    );

    try {
      // Find all active channels for this property that have this room mapped
      const affectedChannels = await this.findAffectedChannels(
        event.propertyId,
        event.roomId,
      );

      if (affectedChannels.length === 0) {
        this.logger.debug(
          `No OTA channels to notify for roomId=${event.roomId}`,
        );
        return;
      }

      // Queue an "open-room" job for each affected channel
      for (const { channel, mapping } of affectedChannels) {
        await this.syncQueue.add('open-room', {
          channelId: channel.id,
          channelType: channel.type,
          propertyId: event.propertyId,
          roomId: event.roomId,
          externalRoomId: mapping.externalId,
          checkIn: event.checkIn,
          checkOut: event.checkOut,
          bookingId: event.bookingId,
          bookingNumber: event.bookingNumber,
          cancelReason: event.cancelReason,
        });

        this.logger.log(
          `Queued open-room job: channelId=${channel.id}, ` +
            `type=${channel.type}, roomId=${event.roomId}, ` +
            `dates=${event.checkIn}..${event.checkOut}`,
        );

        // Log the sync attempt
        await this.channelManagerService.createSyncLog(
          channel.id,
          'open_room',
          'pending',
          {
            booking_id: event.bookingId,
            room_id: event.roomId,
            external_room_id: mapping.externalId,
            check_in: event.checkIn,
            check_out: event.checkOut,
            cancel_reason: event.cancelReason,
          },
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to handle booking.cancelled for bookingId=${event.bookingId}: ${errorMessage}`,
      );
    }
  }

  // ── sync.error ──────────────────────────────────────────────────────────

  /**
   * Handle sync error events for logging and monitoring.
   */
  @OnEvent('sync.error')
  handleSyncError(event: SyncErrorEvent): void {
    this.logger.error(
      `Sync error: channelId=${event.channelId}, type=${event.channelType}, ` +
        `event=${event.eventType}, error=${event.error}`,
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Find all active channels for a property that have a specific room mapped.
   * Returns channel + mapping pairs.
   */
  private async findAffectedChannels(
    propertyId: number,
    roomId: number,
  ): Promise<Array<{ channel: Channel; mapping: RoomMapping }>> {
    // Find all room mappings for this room
    const mappings = await this.mappingRepository.find({
      where: { roomId },
      relations: ['channel'],
    });

    const result: Array<{ channel: Channel; mapping: RoomMapping }> = [];

    for (const mapping of mappings) {
      const channel = mapping.channel;

      // Only include active channels belonging to this property
      if (channel && channel.isActive && channel.propertyId === propertyId) {
        result.push({ channel, mapping });
      }
    }

    return result;
  }
}
