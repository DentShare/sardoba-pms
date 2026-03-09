import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { HolidayRule } from '@/database/entities/holiday-rule.entity';
import { CreateHolidayRuleDto } from './dto/create-holiday-rule.dto';
import { UpdateHolidayRuleDto } from './dto/update-holiday-rule.dto';
import { UZ_HOLIDAYS } from './holidays-uz';

@Injectable()
export class HolidayCalendarService {
  constructor(
    @InjectRepository(HolidayRule)
    private readonly holidayRepository: Repository<HolidayRule>,
  ) {}

  // ── List all holiday rules for a property ─────────────────────────────────

  async findAll(propertyId: number, year?: number): Promise<HolidayRule[]> {
    const qb = this.holidayRepository
      .createQueryBuilder('holiday')
      .where('holiday.propertyId = :propertyId', { propertyId });

    if (year) {
      // Return rules that overlap with the given year,
      // plus recurring rules regardless of their stored year
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      qb.andWhere(
        '(holiday.recurYearly = true OR (holiday.dateFrom <= :yearEnd AND holiday.dateTo >= :yearStart))',
        { yearStart, yearEnd },
      );
    }

    qb.orderBy('holiday.dateFrom', 'ASC');

    return qb.getMany();
  }

  // ── Create a new holiday rule ─────────────────────────────────────────────

  async create(
    propertyId: number,
    dto: CreateHolidayRuleDto,
  ): Promise<HolidayRule> {
    // Validate date range
    if (dto.date_from > dto.date_to) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dto.date_from, date_to: dto.date_to },
        'date_from must be before or equal to date_to',
      );
    }

    const rule = this.holidayRepository.create({
      propertyId,
      name: dto.name,
      dateFrom: dto.date_from,
      dateTo: dto.date_to,
      priceBoostPercent: dto.price_boost_percent,
      minNights: dto.min_nights ?? 1,
      recurYearly: dto.recur_yearly ?? false,
      isActive: true,
    });

    return this.holidayRepository.save(rule);
  }

  // ── Update an existing holiday rule ───────────────────────────────────────

  async update(
    propertyId: number,
    id: number,
    dto: UpdateHolidayRuleDto,
  ): Promise<HolidayRule> {
    const rule = await this.holidayRepository.findOne({
      where: { id, propertyId },
    });

    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'holiday_rule',
        id,
      });
    }

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.date_from !== undefined) rule.dateFrom = dto.date_from;
    if (dto.date_to !== undefined) rule.dateTo = dto.date_to;
    if (dto.price_boost_percent !== undefined) rule.priceBoostPercent = dto.price_boost_percent;
    if (dto.min_nights !== undefined) rule.minNights = dto.min_nights;
    if (dto.recur_yearly !== undefined) rule.recurYearly = dto.recur_yearly;
    if (dto.is_active !== undefined) rule.isActive = dto.is_active;

    // Validate date range after update
    if (rule.dateFrom > rule.dateTo) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: rule.dateFrom, date_to: rule.dateTo },
        'date_from must be before or equal to date_to',
      );
    }

    return this.holidayRepository.save(rule);
  }

  // ── Remove (hard delete) a holiday rule ───────────────────────────────────

  async remove(propertyId: number, id: number): Promise<void> {
    const rule = await this.holidayRepository.findOne({
      where: { id, propertyId },
    });

    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'holiday_rule',
        id,
      });
    }

    await this.holidayRepository.remove(rule);
  }

  // ── Get boost percentage for a specific date ──────────────────────────────

  /**
   * Returns the highest boost percentage for a given date.
   * Checks both specific-year rules and recurring yearly rules.
   * Returns 0 if no holiday rule applies.
   */
  async getBoostForDate(propertyId: number, date: string): Promise<number> {
    // Extract month-day for recurring rule matching
    const monthDay = date.substring(5); // "MM-DD" from "YYYY-MM-DD"

    const rules = await this.holidayRepository
      .createQueryBuilder('holiday')
      .where('holiday.propertyId = :propertyId', { propertyId })
      .andWhere('holiday.isActive = true')
      .andWhere(
        `(
          (holiday.recurYearly = false AND holiday.dateFrom <= :date AND holiday.dateTo >= :date)
          OR
          (holiday.recurYearly = true AND SUBSTRING(holiday.dateFrom, 6) <= :monthDay AND SUBSTRING(holiday.dateTo, 6) >= :monthDay)
        )`,
        { date, monthDay },
      )
      .getMany();

    if (rules.length === 0) {
      return 0;
    }

    // Return the highest boost percentage among matching rules
    return Math.max(...rules.map((r) => r.priceBoostPercent));
  }

  // ── Seed default UZ holidays for a year ───────────────────────────────────

  /**
   * Create holiday rules from UZ_HOLIDAYS for the given year.
   * Only creates rules if no rules exist for this property yet.
   */
  async seedDefaultHolidays(propertyId: number, year: number): Promise<void> {
    // Check if any rules exist for this property
    const existingCount = await this.holidayRepository.count({
      where: { propertyId },
    });

    if (existingCount > 0) {
      return; // Do not seed if rules already exist
    }

    const rules = UZ_HOLIDAYS.map((holiday) => {
      return this.holidayRepository.create({
        propertyId,
        name: holiday.nameRu,
        dateFrom: `${year}-${holiday.dateMonthDay}`,
        dateTo: `${year}-${holiday.dateMonthDay}`,
        priceBoostPercent: holiday.defaultBoostPercent,
        minNights: 1,
        recurYearly: true,
        isActive: true,
      });
    });

    await this.holidayRepository.save(rules);
  }
}
