import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { Property } from '@/database/entities/property.entity';
import { todayInTashkent } from '@sardoba/shared';
import { NotificationsService } from '../notifications.service';
import {
  dailyDigestTemplate,
  DailyDigestData,
} from '../telegram/telegram.templates';

/**
 * Daily digest cron job.
 *
 * Runs at 03:00 UTC = 08:00 Tashkent (Asia/Tashkent is UTC+5).
 * Sends a morning summary to all properties with dailyDigest enabled.
 */
@Injectable()
export class DailyDigestCron {
  private readonly logger = new Logger(DailyDigestCron.name);

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Daily digest cron — 08:00 Tashkent = 03:00 UTC.
   */
  @Cron('0 3 * * *')
  async handleDailyDigest(): Promise<void> {
    this.logger.log('Starting daily digest cron job');

    try {
      // Get all settings with daily digest enabled
      const allSettings = await this.settingsRepository.find({
        where: { eventDailyDigest: true },
      });

      if (allSettings.length === 0) {
        this.logger.log('No properties with daily digest enabled');
        return;
      }

      let sentCount = 0;

      for (const settings of allSettings) {
        try {
          // Skip properties with no active recipients
          const activeRecipients = settings.telegramRecipients.filter(
            (r) => r.isActive,
          );
          if (activeRecipients.length === 0) {
            continue;
          }

          const digestData = await this.buildDigestData(settings.propertyId);
          if (!digestData) {
            continue;
          }

          const message = dailyDigestTemplate(digestData);
          const sent = await this.notificationsService.sendToTelegramRecipients(
            settings.propertyId,
            message,
          );

          if (sent > 0) {
            sentCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to send daily digest for property #${settings.propertyId}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      this.logger.log(
        `Daily digest completed: sent to ${sentCount}/${allSettings.length} properties`,
      );
    } catch (error) {
      this.logger.error(
        'Daily digest cron job failed',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Build digest data for a specific property.
   */
  async buildDigestData(propertyId: number): Promise<DailyDigestData | null> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return null;
    }

    const today = todayInTashkent();

    // Get today's check-ins
    const checkInBookings = await this.bookingRepository
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
    const checkOutBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.room', 'room')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.checkOut = :today', { today })
      .andWhere('booking.status NOT IN (:...excluded)', {
        excluded: ['cancelled', 'no_show'],
      })
      .getMany();

    // Get currently occupied rooms (in-house bookings)
    const inHouseBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.checkIn <= :today', { today })
      .andWhere('booking.checkOut > :today', { today })
      .andWhere('booking.status IN (:...activeStatuses)', {
        activeStatuses: ['confirmed', 'checked_in'],
      })
      .getMany();

    // Count unique occupied rooms
    const occupiedRoomIds = new Set(inHouseBookings.map((b) => b.roomId));
    const occupiedRooms = occupiedRoomIds.size;

    // Total active rooms
    const totalRooms = await this.roomRepository.count({
      where: { propertyId, status: 'active' },
    });

    // Occupancy percentage
    const occupancyPercent =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Today's revenue: sum of payments created today for this property's bookings
    const todayRevenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.payments', 'payment')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('DATE(payment.paidAt) = :today', { today })
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .getRawOne();

    const todayRevenue = parseInt(todayRevenueResult?.total ?? '0', 10);

    // In-house guests count
    const inHouseGuests = inHouseBookings.reduce(
      (sum, b) => sum + b.adults + b.children,
      0,
    );

    return {
      propertyName: property.name,
      date: today,
      checkIns: checkInBookings.map((b) => ({
        bookingNumber: b.bookingNumber,
        guestName: b.guest
          ? `${b.guest.firstName} ${b.guest.lastName}`
          : 'Неизвестный гость',
        roomName: b.room?.name ?? '—',
        nights: b.nights,
      })),
      checkOuts: checkOutBookings.map((b) => ({
        bookingNumber: b.bookingNumber,
        guestName: b.guest
          ? `${b.guest.firstName} ${b.guest.lastName}`
          : 'Неизвестный гость',
        roomName: b.room?.name ?? '—',
      })),
      occupiedRooms,
      totalRooms,
      occupancyPercent,
      todayRevenue,
      inHouseGuests,
    };
  }
}
