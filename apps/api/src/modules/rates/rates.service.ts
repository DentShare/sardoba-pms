import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rate, RateType } from '@/database/entities/rate.entity';
import { Room } from '@/database/entities/room.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { RateQueryDto } from './dto/rate-query.dto';

// ── Interfaces for calculate result ──────────────────────────────────────────

export interface NightBreakdown {
  date: string;
  price: number;
  rate_name: string;
}

export interface RateCalculation {
  nights: number;
  rate_applied: string;
  price_per_night: number;
  total: number;
  breakdown: NightBreakdown[];
}

// ── Priority order for rate types ────────────────────────────────────────────

const RATE_PRIORITY: Record<RateType, number> = {
  special: 1,
  seasonal: 2,
  weekend: 3,
  longstay: 4,
  base: 5,
};

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly rateRepository: Repository<Rate>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  // ── List rates with pagination and filters ─────────────────────────────────

  async findAll(propertyId: number, query: RateQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.rateRepository
      .createQueryBuilder('rate')
      .where('rate.propertyId = :propertyId', { propertyId });

    if (query.type) {
      qb.andWhere('rate.type = :type', { type: query.type });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('rate.isActive = :isActive', { isActive: query.is_active });
    }

    qb.orderBy('rate.type', 'ASC').addOrderBy('rate.name', 'ASC');

    const [rates, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: rates.map((rate) => this.toResponseFormat(rate)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  // ── Get single rate by ID ──────────────────────────────────────────────────

  async findOne(rateId: number, propertyId: number): Promise<Record<string, unknown>> {
    const rate = await this.rateRepository.findOne({
      where: { id: rateId, propertyId },
    });

    if (!rate) {
      throw new SardobaException(ErrorCode.RATE_NOT_FOUND, {
        resource: 'rate',
        id: rateId,
      });
    }

    return this.toResponseFormat(rate);
  }

  // ── Create a new rate ──────────────────────────────────────────────────────

  async create(
    propertyId: number,
    dto: CreateRateDto,
  ): Promise<Record<string, unknown>> {
    // Validate that price or discount_percent is provided
    if (dto.price === undefined && dto.discount_percent === undefined) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'Either price or discount_percent must be provided' },
        'Either price or discount_percent must be provided',
      );
    }

    const rateType = dto.type as RateType;

    // Validate date range for seasonal/special types
    if (rateType === 'seasonal' || rateType === 'special') {
      if (!dto.date_from || !dto.date_to) {
        throw new SardobaException(
          ErrorCode.VALIDATION_ERROR,
          { reason: 'date_from and date_to are required for seasonal/special rates' },
          'date_from and date_to are required for seasonal/special rates',
        );
      }

      if (dto.date_from >= dto.date_to) {
        throw new SardobaException(
          ErrorCode.INVALID_DATE_RANGE,
          { date_from: dto.date_from, date_to: dto.date_to },
          'date_from must be before date_to',
        );
      }

      // Check for conflicts
      await this.checkConflicts(propertyId, rateType, dto.date_from, dto.date_to, dto.applies_to_rooms ?? []);
    }

    // Validate days_of_week for weekend type
    if (rateType === 'weekend' && (!dto.days_of_week || dto.days_of_week.length === 0)) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'days_of_week is required for weekend rates' },
        'days_of_week is required for weekend rates',
      );
    }

    const rate = this.rateRepository.create({
      propertyId,
      name: dto.name,
      type: rateType,
      price: dto.price ?? null,
      discountPercent: dto.discount_percent ?? null,
      dateFrom: dto.date_from ?? null,
      dateTo: dto.date_to ?? null,
      minStay: dto.min_stay ?? 1,
      appliesToRooms: dto.applies_to_rooms ?? [],
      daysOfWeek: dto.days_of_week ?? [],
      isActive: dto.is_active ?? true,
    });

    const saved = await this.rateRepository.save(rate);
    return this.toResponseFormat(saved);
  }

  // ── Update an existing rate ────────────────────────────────────────────────

  async update(
    rateId: number,
    propertyId: number,
    dto: UpdateRateDto,
  ): Promise<Record<string, unknown>> {
    const rate = await this.rateRepository.findOne({
      where: { id: rateId, propertyId },
    });

    if (!rate) {
      throw new SardobaException(ErrorCode.RATE_NOT_FOUND, {
        resource: 'rate',
        id: rateId,
      });
    }

    // Map snake_case DTO fields to camelCase entity fields
    if (dto.name !== undefined) rate.name = dto.name;
    if (dto.type !== undefined) rate.type = dto.type as RateType;
    if (dto.price !== undefined) rate.price = dto.price;
    if (dto.discount_percent !== undefined) rate.discountPercent = dto.discount_percent;
    if (dto.date_from !== undefined) rate.dateFrom = dto.date_from;
    if (dto.date_to !== undefined) rate.dateTo = dto.date_to;
    if (dto.min_stay !== undefined) rate.minStay = dto.min_stay;
    if (dto.applies_to_rooms !== undefined) rate.appliesToRooms = dto.applies_to_rooms;
    if (dto.days_of_week !== undefined) rate.daysOfWeek = dto.days_of_week;
    if (dto.is_active !== undefined) rate.isActive = dto.is_active;

    // Validate price/discount after updates
    if (rate.price === null && rate.discountPercent === null) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'Either price or discount_percent must be provided' },
        'Rate must have either price or discount_percent',
      );
    }

    // Validate date range for seasonal/special types after update
    const effectiveType = rate.type;
    if (effectiveType === 'seasonal' || effectiveType === 'special') {
      if (!rate.dateFrom || !rate.dateTo) {
        throw new SardobaException(
          ErrorCode.VALIDATION_ERROR,
          { reason: 'date_from and date_to are required for seasonal/special rates' },
          'date_from and date_to are required for seasonal/special rates',
        );
      }

      if (rate.dateFrom >= rate.dateTo) {
        throw new SardobaException(
          ErrorCode.INVALID_DATE_RANGE,
          { date_from: rate.dateFrom, date_to: rate.dateTo },
          'date_from must be before date_to',
        );
      }

      // Check for conflicts (exclude current rate)
      await this.checkConflicts(
        propertyId,
        effectiveType,
        rate.dateFrom,
        rate.dateTo,
        rate.appliesToRooms,
        rateId,
      );
    }

    // Validate days_of_week for weekend type
    if (effectiveType === 'weekend' && rate.daysOfWeek.length === 0) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'days_of_week is required for weekend rates' },
        'days_of_week is required for weekend rates',
      );
    }

    const saved = await this.rateRepository.save(rate);
    return this.toResponseFormat(saved);
  }

  // ── Soft-delete a rate (set isActive=false) ────────────────────────────────

  async remove(rateId: number, propertyId: number): Promise<void> {
    const rate = await this.rateRepository.findOne({
      where: { id: rateId, propertyId },
    });

    if (!rate) {
      throw new SardobaException(ErrorCode.RATE_NOT_FOUND, {
        resource: 'rate',
        id: rateId,
      });
    }

    rate.isActive = false;
    await this.rateRepository.save(rate);
  }

  // ── Calculate price for a room stay ────────────────────────────────────────

  async calculate(
    propertyId: number,
    roomId: number,
    checkIn: string,
    checkOut: string,
    rateId?: number,
  ): Promise<RateCalculation> {
    // Validate date range
    if (checkIn >= checkOut) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { check_in: checkIn, check_out: checkOut },
        'check_in must be before check_out',
      );
    }

    // Load room to get basePrice
    const room = await this.roomRepository.findOne({
      where: { id: roomId, propertyId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    // Calculate total nights
    const checkInDate = new Date(checkIn + 'T00:00:00Z');
    const checkOutDate = new Date(checkOut + 'T00:00:00Z');
    const totalNights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (totalNights <= 0) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { check_in: checkIn, check_out: checkOut },
        'Stay must be at least one night',
      );
    }

    // If explicit rateId is provided, load only that rate
    if (rateId !== undefined) {
      const explicitRate = await this.rateRepository.findOne({
        where: { id: rateId, propertyId, isActive: true },
      });

      if (!explicitRate) {
        throw new SardobaException(ErrorCode.RATE_NOT_FOUND, {
          resource: 'rate',
          id: rateId,
        });
      }

      return this.calculateWithExplicitRate(room, explicitRate, checkIn, totalNights);
    }

    // Load all active rates for this property
    const rates = await this.rateRepository.find({
      where: { propertyId, isActive: true },
    });

    return this.calculateWithPriority(room, rates, checkIn, totalNights);
  }

  // ── Private: calculate using an explicit rate for all nights ───────────────

  private calculateWithExplicitRate(
    room: Room,
    rate: Rate,
    checkIn: string,
    totalNights: number,
  ): RateCalculation {
    const breakdown: NightBreakdown[] = [];
    let total = 0;

    const currentDate = new Date(checkIn + 'T00:00:00Z');

    for (let i = 0; i < totalNights; i++) {
      const dateStr = this.formatDate(currentDate);
      const nightPrice = this.resolveNightPrice(room, rate);

      breakdown.push({
        date: dateStr,
        price: nightPrice,
        rate_name: rate.name,
      });

      total += nightPrice;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const pricePerNight = totalNights > 0 ? Math.round(total / totalNights) : 0;

    return {
      nights: totalNights,
      rate_applied: rate.name,
      price_per_night: pricePerNight,
      total,
      breakdown,
    };
  }

  // ── Private: calculate using priority system ───────────────────────────────

  private calculateWithPriority(
    room: Room,
    rates: Rate[],
    checkIn: string,
    totalNights: number,
  ): RateCalculation {
    const breakdown: NightBreakdown[] = [];
    let total = 0;
    const rateNamesUsed = new Set<string>();

    const currentDate = new Date(checkIn + 'T00:00:00Z');

    for (let i = 0; i < totalNights; i++) {
      const dateStr = this.formatDate(currentDate);
      const dayOfWeek = currentDate.getUTCDay(); // 0=Sunday, 6=Saturday

      const applicableRate = this.findBestRate(
        rates,
        room.id,
        dateStr,
        dayOfWeek,
        totalNights,
      );

      if (!applicableRate) {
        throw new SardobaException(
          ErrorCode.RATE_NOT_APPLICABLE,
          {
            room_id: room.id,
            date: dateStr,
            reason: 'No applicable rate found for this date',
          },
          `No applicable rate found for room ${room.id} on ${dateStr}`,
        );
      }

      const nightPrice = this.resolveNightPrice(room, applicableRate);

      breakdown.push({
        date: dateStr,
        price: nightPrice,
        rate_name: applicableRate.name,
      });

      total += nightPrice;
      rateNamesUsed.add(applicableRate.name);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const pricePerNight = totalNights > 0 ? Math.round(total / totalNights) : 0;

    // Determine the primary rate name used
    const rateApplied =
      rateNamesUsed.size === 1
        ? Array.from(rateNamesUsed)[0]
        : `Mixed (${Array.from(rateNamesUsed).join(', ')})`;

    return {
      nights: totalNights,
      rate_applied: rateApplied,
      price_per_night: pricePerNight,
      total,
      breakdown,
    };
  }

  // ── Private: find the best rate for a specific night ───────────────────────

  private findBestRate(
    rates: Rate[],
    roomId: number,
    dateStr: string,
    dayOfWeek: number,
    totalNights: number,
  ): Rate | null {
    let bestRate: Rate | null = null;
    let bestPriority = Infinity;

    for (const rate of rates) {
      if (!rate.isActive) continue;

      const priority = RATE_PRIORITY[rate.type] ?? Infinity;

      // Skip if we already have a higher-priority (lower number) rate
      if (priority >= bestPriority) continue;

      // Check if rate applies to this room
      if (rate.appliesToRooms.length > 0 && !rate.appliesToRooms.includes(roomId)) {
        continue;
      }

      // Check type-specific conditions
      switch (rate.type) {
        case 'special':
          if (!this.isDateInRange(dateStr, rate.dateFrom, rate.dateTo)) continue;
          break;

        case 'seasonal':
          if (!this.isDateInRange(dateStr, rate.dateFrom, rate.dateTo)) continue;
          break;

        case 'weekend':
          if (!rate.daysOfWeek.includes(dayOfWeek)) continue;
          break;

        case 'longstay':
          if (totalNights < rate.minStay) continue;
          break;

        case 'base':
          // Base rate always applies if room matches
          break;

        default:
          continue;
      }

      bestRate = rate;
      bestPriority = priority;
    }

    return bestRate;
  }

  // ── Private: resolve the price for a night based on rate ───────────────────

  private resolveNightPrice(room: Room, rate: Rate): number {
    if (rate.discountPercent !== null && rate.discountPercent !== undefined) {
      const basePrice = Number(room.basePrice);
      return Math.round(basePrice * (1 - rate.discountPercent / 100));
    }

    if (rate.price !== null && rate.price !== undefined) {
      return Number(rate.price);
    }

    // Fallback to room base price (should not happen due to DB constraint)
    return Number(room.basePrice);
  }

  // ── Private: check if a date string falls within a range ───────────────────

  private isDateInRange(
    dateStr: string,
    dateFrom: string | null,
    dateTo: string | null,
  ): boolean {
    if (!dateFrom || !dateTo) return false;
    return dateStr >= dateFrom && dateStr <= dateTo;
  }

  // ── Private: format a Date to YYYY-MM-DD ───────────────────────────────────

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ── Private: check for date conflicts ──────────────────────────────────────

  private async checkConflicts(
    propertyId: number,
    type: RateType,
    dateFrom: string,
    dateTo: string,
    appliesToRooms: number[],
    excludeRateId?: number,
  ): Promise<void> {
    const qb = this.rateRepository
      .createQueryBuilder('rate')
      .where('rate.propertyId = :propertyId', { propertyId })
      .andWhere('rate.type = :type', { type })
      .andWhere('rate.isActive = true')
      .andWhere('rate.dateFrom < :dateTo', { dateTo })
      .andWhere('rate.dateTo > :dateFrom', { dateFrom });

    if (excludeRateId !== undefined) {
      qb.andWhere('rate.id != :excludeRateId', { excludeRateId });
    }

    const overlapping = await qb.getMany();

    if (overlapping.length === 0) return;

    // Check if there is a room overlap
    for (const existing of overlapping) {
      // If either rate applies to all rooms (empty array), they conflict
      if (appliesToRooms.length === 0 || existing.appliesToRooms.length === 0) {
        throw new SardobaException(
          ErrorCode.RATE_CONFLICT,
          {
            conflicting_rate_id: existing.id,
            conflicting_rate_name: existing.name,
            existing_date_from: existing.dateFrom,
            existing_date_to: existing.dateTo,
          },
          `Rate conflicts with existing rate "${existing.name}" (${existing.dateFrom} - ${existing.dateTo})`,
        );
      }

      // Check for specific room overlap
      const roomOverlap = appliesToRooms.some((roomId) =>
        existing.appliesToRooms.includes(roomId),
      );

      if (roomOverlap) {
        throw new SardobaException(
          ErrorCode.RATE_CONFLICT,
          {
            conflicting_rate_id: existing.id,
            conflicting_rate_name: existing.name,
            existing_date_from: existing.dateFrom,
            existing_date_to: existing.dateTo,
            overlapping_rooms: appliesToRooms.filter((id) =>
              existing.appliesToRooms.includes(id),
            ),
          },
          `Rate conflicts with existing rate "${existing.name}" on overlapping rooms`,
        );
      }
    }
  }

  // ── Private: transform entity to snake_case response ───────────────────────

  private toResponseFormat(rate: Rate): Record<string, unknown> {
    return {
      id: rate.id,
      property_id: rate.propertyId,
      name: rate.name,
      type: rate.type,
      price: rate.price !== null ? Number(rate.price) : null,
      discount_percent: rate.discountPercent,
      date_from: rate.dateFrom,
      date_to: rate.dateTo,
      min_stay: rate.minStay,
      applies_to_rooms: rate.appliesToRooms,
      days_of_week: rate.daysOfWeek,
      is_active: rate.isActive,
      created_at: rate.createdAt,
      updated_at: rate.updatedAt,
    };
  }
}
