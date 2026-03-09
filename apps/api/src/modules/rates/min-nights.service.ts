import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { MinNightsRule } from '@/database/entities/min-nights-rule.entity';
import { CreateMinNightsRuleDto } from './dto/create-min-nights-rule.dto';
import { UpdateMinNightsRuleDto } from './dto/update-min-nights-rule.dto';

export interface MinNightsCheckResult {
  valid: boolean;
  minNights?: number;
  ruleName?: string;
}

@Injectable()
export class MinNightsService {
  constructor(
    @InjectRepository(MinNightsRule)
    private readonly ruleRepository: Repository<MinNightsRule>,
  ) {}

  // ── List all min-nights rules for a property ──────────────────────────────

  async findAll(propertyId: number): Promise<MinNightsRule[]> {
    return this.ruleRepository.find({
      where: { propertyId },
      order: { dateFrom: 'ASC' },
    });
  }

  // ── Create a new min-nights rule ──────────────────────────────────────────

  async create(
    propertyId: number,
    dto: CreateMinNightsRuleDto,
  ): Promise<MinNightsRule> {
    // Validate date range
    if (dto.date_from >= dto.date_to) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dto.date_from, date_to: dto.date_to },
        'date_from must be before date_to',
      );
    }

    const rule = this.ruleRepository.create({
      propertyId,
      name: dto.name ?? null,
      dateFrom: dto.date_from,
      dateTo: dto.date_to,
      minNights: dto.min_nights,
      appliesToRooms: dto.applies_to_rooms ?? [],
      isActive: true,
    });

    return this.ruleRepository.save(rule);
  }

  // ── Update an existing min-nights rule ────────────────────────────────────

  async update(
    propertyId: number,
    id: number,
    dto: UpdateMinNightsRuleDto,
  ): Promise<MinNightsRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id, propertyId },
    });

    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'min_nights_rule',
        id,
      });
    }

    if (dto.name !== undefined) rule.name = dto.name ?? null;
    if (dto.date_from !== undefined) rule.dateFrom = dto.date_from;
    if (dto.date_to !== undefined) rule.dateTo = dto.date_to;
    if (dto.min_nights !== undefined) rule.minNights = dto.min_nights;
    if (dto.applies_to_rooms !== undefined) rule.appliesToRooms = dto.applies_to_rooms;
    if (dto.is_active !== undefined) rule.isActive = dto.is_active;

    // Validate date range after update
    if (rule.dateFrom >= rule.dateTo) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: rule.dateFrom, date_to: rule.dateTo },
        'date_from must be before date_to',
      );
    }

    return this.ruleRepository.save(rule);
  }

  // ── Remove (hard delete) a min-nights rule ────────────────────────────────

  async remove(propertyId: number, id: number): Promise<void> {
    const rule = await this.ruleRepository.findOne({
      where: { id, propertyId },
    });

    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'min_nights_rule',
        id,
      });
    }

    await this.ruleRepository.remove(rule);
  }

  // ── Check min-nights for a booking ────────────────────────────────────────

  /**
   * Check all active rules where the booking dates overlap.
   * Returns the most restrictive rule (highest minNights).
   * If the booking satisfies all rules, returns { valid: true }.
   */
  async checkMinNights(
    propertyId: number,
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<MinNightsCheckResult> {
    // Calculate actual nights
    const checkInDate = new Date(checkIn + 'T00:00:00Z');
    const checkOutDate = new Date(checkOut + 'T00:00:00Z');
    const actualNights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (actualNights <= 0) {
      return { valid: false, minNights: 1, ruleName: 'Invalid date range' };
    }

    // Find all active rules that overlap with the booking period
    const rules = await this.ruleRepository
      .createQueryBuilder('rule')
      .where('rule.propertyId = :propertyId', { propertyId })
      .andWhere('rule.isActive = true')
      .andWhere('rule.dateFrom < :checkOut', { checkOut })
      .andWhere('rule.dateTo > :checkIn', { checkIn })
      .getMany();

    if (rules.length === 0) {
      return { valid: true };
    }

    // Find the most restrictive rule applicable to this room
    let mostRestrictiveMinNights = 0;
    let mostRestrictiveRuleName: string | undefined;

    for (const rule of rules) {
      // Check if rule applies to this room
      if (rule.appliesToRooms.length > 0 && !rule.appliesToRooms.includes(roomId)) {
        continue;
      }

      if (rule.minNights > mostRestrictiveMinNights) {
        mostRestrictiveMinNights = rule.minNights;
        mostRestrictiveRuleName = rule.name ?? `Rule #${rule.id}`;
      }
    }

    // No applicable rules for this room
    if (mostRestrictiveMinNights === 0) {
      return { valid: true };
    }

    // Check if booking satisfies the most restrictive rule
    if (actualNights < mostRestrictiveMinNights) {
      return {
        valid: false,
        minNights: mostRestrictiveMinNights,
        ruleName: mostRestrictiveRuleName,
      };
    }

    return { valid: true };
  }
}
