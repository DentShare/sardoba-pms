import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '@/database/entities/booking.entity';
import { RoomBlock } from '@/database/entities/room-block.entity';

export interface AvailabilityResult {
  available: boolean;
  blockedDates: string[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(RoomBlock)
    private readonly roomBlockRepository: Repository<RoomBlock>,
  ) {}

  /**
   * Check if a room is available for the given date range.
   * Checks against both active bookings and room blocks.
   *
   * @param roomId - Room to check
   * @param checkIn - Check-in date (YYYY-MM-DD)
   * @param checkOut - Check-out date (YYYY-MM-DD)
   * @param excludeBookingId - Booking ID to exclude (for updates)
   * @returns Availability result with any blocked dates
   */
  async checkAvailability(
    roomId: number,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: number,
  ): Promise<AvailabilityResult> {
    const blockedDates = new Set<string>();

    // Check overlapping bookings (status != 'cancelled' and status != 'no_show')
    const bookingQb = this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.roomId = :roomId', { roomId })
      .andWhere('booking.checkIn < :checkOut', { checkOut })
      .andWhere('booking.checkOut > :checkIn', { checkIn })
      .andWhere('booking.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'no_show'],
      });

    if (excludeBookingId) {
      bookingQb.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    const overlappingBookings = await bookingQb.getMany();

    // Collect dates from overlapping bookings
    for (const booking of overlappingBookings) {
      this.collectDates(booking.checkIn, booking.checkOut, checkIn, checkOut, blockedDates);
    }

    // Check overlapping room blocks
    const overlappingBlocks = await this.roomBlockRepository
      .createQueryBuilder('block')
      .where('block.roomId = :roomId', { roomId })
      .andWhere('block.dateFrom < :checkOut', { checkOut })
      .andWhere('block.dateTo > :checkIn', { checkIn })
      .getMany();

    // Collect dates from overlapping blocks
    for (const block of overlappingBlocks) {
      this.collectDates(block.dateFrom, block.dateTo, checkIn, checkOut, blockedDates);
    }

    const sortedBlockedDates = Array.from(blockedDates).sort();

    return {
      available: sortedBlockedDates.length === 0,
      blockedDates: sortedBlockedDates,
    };
  }

  /**
   * Collect individual dates from a range, bounded by the query range.
   */
  private collectDates(
    rangeStart: string,
    rangeEnd: string,
    queryStart: string,
    queryEnd: string,
    dates: Set<string>,
  ): void {
    const start = rangeStart > queryStart ? rangeStart : queryStart;
    const end = rangeEnd < queryEnd ? rangeEnd : queryEnd;

    const current = new Date(start);
    const endDate = new Date(end);

    while (current < endDate) {
      dates.add(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  }
}
