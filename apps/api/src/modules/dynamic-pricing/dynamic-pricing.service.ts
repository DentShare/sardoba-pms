import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { addDays, eachDayOfInterval, differenceInDays, format, getDay } from 'date-fns';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { DynamicPricingRule } from '@/database/entities/dynamic-pricing-rule.entity';
import { PricingChangeLog } from '@/database/entities/pricing-change-log.entity';
import { DynamicPriceOverride } from '@/database/entities/dynamic-price-override.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

export const PRICING_RULE_TEMPLATES = [
  {
    name: 'Высокий сезон (загрузка > 80%)',
    trigger_type: 'occupancy_high',
    trigger_config: { threshold: 80, period_days: 7 },
    action_type: 'increase_percent',
    action_value: 20,
  },
  {
    name: 'Низкий сезон (загрузка < 30%)',
    trigger_type: 'occupancy_low',
    trigger_config: { threshold: 30, period_days: 14 },
    action_type: 'decrease_percent',
    action_value: 10,
  },
  {
    name: 'Last Minute (за 1-3 дня)',
    trigger_type: 'days_before',
    trigger_config: { days_min: 1, days_max: 3 },
    action_type: 'decrease_percent',
    action_value: 15,
  },
  {
    name: 'Early Bird (за 30+ дней)',
    trigger_type: 'days_before',
    trigger_config: { days_min: 30, days_max: 999 },
    action_type: 'decrease_percent',
    action_value: 10,
  },
  {
    name: 'Выходные (пт-вс)',
    trigger_type: 'day_of_week',
    trigger_config: { days: [5, 6, 0] },
    action_type: 'increase_percent',
    action_value: 15,
  },
];

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(
    @InjectRepository(DynamicPricingRule)
    private readonly ruleRepository: Repository<DynamicPricingRule>,
    @InjectRepository(PricingChangeLog)
    private readonly changeLogRepository: Repository<PricingChangeLog>,
    @InjectRepository(DynamicPriceOverride)
    private readonly overrideRepository: Repository<DynamicPriceOverride>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(propertyId: number) {
    const rules = await this.ruleRepository.find({
      where: { propertyId },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
    return { data: rules.map((r) => this.toResponse(r)) };
  }

  async findOne(ruleId: string, propertyId: number) {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId, propertyId },
    });
    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'pricing_rule', id: ruleId });
    }
    return this.toResponse(rule);
  }

  async create(propertyId: number, dto: CreateRuleDto) {
    if (dto.min_price !== undefined && dto.max_price !== undefined && dto.min_price > dto.max_price) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { min_price: dto.min_price, max_price: dto.max_price },
        'min_price cannot exceed max_price',
      );
    }

    const rule = this.ruleRepository.create({
      propertyId,
      name: dto.name,
      triggerType: dto.trigger_type as DynamicPricingRule['triggerType'],
      triggerConfig: dto.trigger_config,
      actionType: dto.action_type as DynamicPricingRule['actionType'],
      actionValue: dto.action_value,
      applyTo: (dto.apply_to as DynamicPricingRule['applyTo']) || 'all',
      roomIds: dto.room_ids || [],
      minPrice: dto.min_price ?? null,
      maxPrice: dto.max_price ?? null,
      isActive: dto.is_active ?? true,
      priority: dto.priority ?? 10,
    });

    const saved = await this.ruleRepository.save(rule);
    return this.toResponse(saved);
  }

  async update(ruleId: string, propertyId: number, dto: UpdateRuleDto) {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId, propertyId },
    });
    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'pricing_rule', id: ruleId });
    }

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.trigger_type !== undefined) rule.triggerType = dto.trigger_type as DynamicPricingRule['triggerType'];
    if (dto.trigger_config !== undefined) rule.triggerConfig = dto.trigger_config;
    if (dto.action_type !== undefined) rule.actionType = dto.action_type as DynamicPricingRule['actionType'];
    if (dto.action_value !== undefined) rule.actionValue = dto.action_value;
    if (dto.apply_to !== undefined) rule.applyTo = dto.apply_to as DynamicPricingRule['applyTo'];
    if (dto.room_ids !== undefined) rule.roomIds = dto.room_ids;
    if (dto.min_price !== undefined) rule.minPrice = dto.min_price;
    if (dto.max_price !== undefined) rule.maxPrice = dto.max_price;
    if (dto.is_active !== undefined) rule.isActive = dto.is_active;
    if (dto.priority !== undefined) rule.priority = dto.priority;

    const effectiveMin = rule.minPrice;
    const effectiveMax = rule.maxPrice;
    if (effectiveMin !== null && effectiveMax !== null && effectiveMin > effectiveMax) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { min_price: effectiveMin, max_price: effectiveMax },
        'min_price cannot exceed max_price',
      );
    }

    const saved = await this.ruleRepository.save(rule);
    return this.toResponse(saved);
  }

  async remove(ruleId: string, propertyId: number) {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId, propertyId },
    });
    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'pricing_rule', id: ruleId });
    }
    await this.ruleRepository.remove(rule);
  }

  async toggle(ruleId: string, propertyId: number) {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId, propertyId },
    });
    if (!rule) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'pricing_rule', id: ruleId });
    }
    rule.isActive = !rule.isActive;
    const saved = await this.ruleRepository.save(rule);
    return this.toResponse(saved);
  }

  async getHistory(propertyId: number, page = 1, perPage = 50) {
    const skip = (page - 1) * perPage;
    const [logs, total] = await this.changeLogRepository.findAndCount({
      where: { propertyId },
      order: { createdAt: 'DESC' },
      skip,
      take: perPage,
      relations: ['room'],
    });

    return {
      data: logs.map((log) => ({
        id: log.id,
        room_id: log.roomId,
        room_name: log.room?.name ?? null,
        rule_id: log.ruleId,
        rule_name: log.ruleName,
        date: log.date,
        old_price: log.oldPrice !== null ? Number(log.oldPrice) : null,
        new_price: log.newPrice !== null ? Number(log.newPrice) : null,
        change_percent:
          log.oldPrice && log.newPrice
            ? Math.round(((Number(log.newPrice) - Number(log.oldPrice)) / Number(log.oldPrice)) * 10000) / 100
            : null,
        trigger_value: log.triggerValue !== null ? Number(log.triggerValue) : null,
        created_at: log.createdAt,
      })),
      meta: { total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 },
    };
  }

  async preview(propertyId: number, dto: CreateRuleDto) {
    const rooms = await this.roomRepository.find({
      where: { propertyId, status: 'active' },
    });

    const tempRule: DynamicPricingRule = {
      id: 'preview',
      propertyId,
      name: dto.name,
      isActive: true,
      priority: dto.priority ?? 10,
      triggerType: dto.trigger_type as DynamicPricingRule['triggerType'],
      triggerConfig: dto.trigger_config,
      actionType: dto.action_type as DynamicPricingRule['actionType'],
      actionValue: dto.action_value,
      applyTo: (dto.apply_to as DynamicPricingRule['applyTo']) || 'all',
      roomIds: dto.room_ids || [],
      minPrice: dto.min_price ?? null,
      maxPrice: dto.max_price ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      property: null as any,
    };

    const today = new Date();
    const previewDays: Array<{
      date: string;
      room_id: number;
      room_name: string;
      current_price: number;
      new_price: number;
      change_percent: number;
      trigger_value: number | null;
      rule_name: string;
    }> = [];

    for (const room of rooms) {
      if (!this.ruleAppliesTo(tempRule, room)) continue;

      const dates = eachDayOfInterval({ start: today, end: addDays(today, 30) });
      for (const date of dates) {
        const triggerValue = await this.evaluateTrigger(tempRule, room, date, propertyId);
        if (triggerValue === null) continue;

        const basePrice = Number(room.basePrice);
        let newPrice = this.applyAction(basePrice, tempRule);
        newPrice = this.clampPrice(newPrice, tempRule);

        if (newPrice !== basePrice) {
          previewDays.push({
            date: format(date, 'yyyy-MM-dd'),
            room_id: room.id,
            room_name: room.name,
            current_price: basePrice,
            new_price: newPrice,
            change_percent: Math.round(((newPrice - basePrice) / basePrice) * 10000) / 100,
            trigger_value: triggerValue,
            rule_name: tempRule.name,
          });
        }
      }
    }

    return { preview_days: previewDays };
  }

  async runPricingCalculation(propertyId: number) {
    const rules = await this.ruleRepository.find({
      where: { propertyId, isActive: true },
      order: { priority: 'ASC' },
    });

    if (rules.length === 0) return;

    const rooms = await this.roomRepository.find({
      where: { propertyId, status: 'active' },
    });

    const today = new Date();
    const horizon = addDays(today, 90);
    const dates = eachDayOfInterval({ start: today, end: horizon });

    for (const room of rooms) {
      for (const date of dates) {
        const basePrice = Number(room.basePrice);
        let finalPrice = basePrice;
        const appliedRuleIds: string[] = [];

        const sortedRules = rules
          .filter((r) => this.ruleAppliesTo(r, room))
          .sort((a, b) => a.priority - b.priority);

        for (const rule of sortedRules) {
          const triggerValue = await this.evaluateTrigger(rule, room, date, propertyId);
          if (triggerValue === null) continue;

          const newPrice = this.applyAction(finalPrice, rule);
          finalPrice = this.clampPrice(newPrice, rule);
          appliedRuleIds.push(rule.id);

          if (finalPrice !== basePrice) {
            await this.changeLogRepository.save(
              this.changeLogRepository.create({
                propertyId,
                roomId: room.id,
                ruleId: rule.id,
                ruleName: rule.name,
                date: format(date, 'yyyy-MM-dd'),
                oldPrice: basePrice,
                newPrice: finalPrice,
                triggerValue,
              }),
            );
          }
          break;
        }

        if (appliedRuleIds.length > 0 && finalPrice !== basePrice) {
          await this.overrideRepository.upsert(
            {
              roomId: room.id,
              date: format(date, 'yyyy-MM-dd'),
              price: finalPrice,
              ruleIds: appliedRuleIds,
              calculatedAt: new Date(),
            },
            ['roomId', 'date'],
          );
        }
      }
    }

    this.logger.log(`Pricing calculation completed for property ${propertyId}`);
  }

  getTemplates() {
    return { data: PRICING_RULE_TEMPLATES };
  }

  private ruleAppliesTo(rule: DynamicPricingRule, room: Room): boolean {
    if (rule.applyTo === 'all') return true;
    if (rule.applyTo === 'room' && rule.roomIds.includes(String(room.id))) return true;
    return false;
  }

  private async evaluateTrigger(
    rule: DynamicPricingRule,
    room: Room,
    date: Date,
    propertyId: number,
  ): Promise<number | null> {
    const config = rule.triggerConfig;

    switch (rule.triggerType) {
      case 'occupancy_high':
      case 'occupancy_low': {
        const threshold = config.threshold as number;
        const periodDays = (config.period_days as number) || 7;
        const periodEnd = addDays(date, periodDays);
        const occupancy = await this.calculateOccupancy(propertyId, date, periodEnd);

        if (rule.triggerType === 'occupancy_high' && occupancy >= threshold) return occupancy;
        if (rule.triggerType === 'occupancy_low' && occupancy <= threshold) return occupancy;
        return null;
      }

      case 'days_before': {
        const daysMin = config.days_min as number;
        const daysMax = config.days_max as number;
        const daysUntil = differenceInDays(date, new Date());
        if (daysUntil >= daysMin && daysUntil <= daysMax) return daysUntil;
        return null;
      }

      case 'day_of_week': {
        const days = config.days as number[];
        const dayOfWeek = getDay(date);
        if (days.includes(dayOfWeek)) return dayOfWeek;
        return null;
      }

      default:
        return null;
    }
  }

  private applyAction(basePrice: number, rule: DynamicPricingRule): number {
    switch (rule.actionType) {
      case 'increase_percent':
        return Math.round(basePrice * (1 + Number(rule.actionValue) / 100));
      case 'decrease_percent':
        return Math.round(basePrice * (1 - Number(rule.actionValue) / 100));
      case 'set_fixed':
        return Math.round(Number(rule.actionValue));
      default:
        return basePrice;
    }
  }

  private clampPrice(price: number, rule: DynamicPricingRule): number {
    let result = price;
    if (rule.minPrice !== null) result = Math.max(result, Number(rule.minPrice));
    if (rule.maxPrice !== null) result = Math.min(result, Number(rule.maxPrice));
    return result;
  }

  private async calculateOccupancy(propertyId: number, from: Date, to: Date): Promise<number> {
    const totalRooms = await this.roomRepository.count({
      where: { propertyId, status: 'active' },
    });
    if (totalRooms === 0) return 0;

    const days = differenceInDays(to, from) || 1;
    const totalSlots = totalRooms * days;

    const fromStr = format(from, 'yyyy-MM-dd');
    const toStr = format(to, 'yyyy-MM-dd');

    const occupiedCount = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.propertyId = :propertyId', { propertyId })
      .andWhere('b.status NOT IN (:...statuses)', { statuses: ['cancelled', 'no_show'] })
      .andWhere('b.checkIn < :to', { to: toStr })
      .andWhere('b.checkOut > :from', { from: fromStr })
      .getCount();

    return Math.round((occupiedCount / totalSlots) * 100);
  }

  private toResponse(rule: DynamicPricingRule) {
    return {
      id: rule.id,
      property_id: rule.propertyId,
      name: rule.name,
      is_active: rule.isActive,
      priority: rule.priority,
      trigger_type: rule.triggerType,
      trigger_config: rule.triggerConfig,
      action_type: rule.actionType,
      action_value: Number(rule.actionValue),
      apply_to: rule.applyTo,
      room_ids: rule.roomIds,
      min_price: rule.minPrice !== null ? Number(rule.minPrice) : null,
      max_price: rule.maxPrice !== null ? Number(rule.maxPrice) : null,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
  }
}
