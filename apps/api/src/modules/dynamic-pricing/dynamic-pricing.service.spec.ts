import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DynamicPricingService, PRICING_RULE_TEMPLATES } from './dynamic-pricing.service';
import { DynamicPricingRule } from '@/database/entities/dynamic-pricing-rule.entity';
import { PricingChangeLog } from '@/database/entities/pricing-change-log.entity';
import { DynamicPriceOverride } from '@/database/entities/dynamic-price-override.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CreateRuleDto } from './dto/create-rule.dto';
import { addDays, format, getDay, differenceInDays } from 'date-fns';

// ── Helpers ─────────────────────────────────────────────────────────────────

const PROPERTY_ID = 42;

function createMockRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 5,
    propertyId: PROPERTY_ID,
    name: 'Deluxe 101',
    roomType: 'double',
    floor: 2,
    capacityAdults: 2,
    capacityChildren: 1,
    basePrice: 50000000, // 500,000 som in tiyin
    status: 'active',
    amenities: ['wifi', 'ac'],
    descriptionRu: null,
    descriptionUz: null,
    photos: [],
    sortOrder: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    property: {} as any,
    bookings: [],
    blocks: [],
    mappings: [],
    ...overrides,
  } as Room;
}

function createMockRule(overrides: Partial<DynamicPricingRule> = {}): DynamicPricingRule {
  return {
    id: 'rule-uuid-001',
    propertyId: PROPERTY_ID,
    name: 'High Season',
    isActive: true,
    priority: 10,
    triggerType: 'occupancy_high',
    triggerConfig: { threshold: 80, period_days: 7 },
    actionType: 'increase_percent',
    actionValue: 20,
    applyTo: 'all',
    roomIds: [],
    minPrice: null,
    maxPrice: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    property: {} as any,
    ...overrides,
  } as DynamicPricingRule;
}

function createMockChangeLog(overrides: Partial<PricingChangeLog> = {}): PricingChangeLog {
  return {
    id: 'log-uuid-001',
    propertyId: PROPERTY_ID,
    roomId: 5,
    ruleId: 'rule-uuid-001',
    ruleName: 'High Season',
    date: '2025-07-01',
    oldPrice: 50000000,
    newPrice: 60000000,
    triggerValue: 85,
    createdAt: new Date('2025-06-01'),
    property: {} as any,
    room: createMockRoom(),
    ...overrides,
  } as PricingChangeLog;
}

// ── Mock QueryBuilder ───────────────────────────────────────────────────────

function createMockQueryBuilder(returnValue: {
  getMany?: any[];
  getManyAndCount?: [any[], number];
  getOne?: any;
  getCount?: number;
}) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnValue.getMany ?? []),
    getManyAndCount: jest.fn().mockResolvedValue(
      returnValue.getManyAndCount ?? [[], 0],
    ),
    getOne: jest.fn().mockResolvedValue(returnValue.getOne ?? null),
    getCount: jest.fn().mockResolvedValue(returnValue.getCount ?? 0),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('DynamicPricingService', () => {
  let service: DynamicPricingService;
  let ruleRepo: jest.Mocked<Repository<DynamicPricingRule>>;
  let changeLogRepo: jest.Mocked<Repository<PricingChangeLog>>;
  let overrideRepo: jest.Mocked<Repository<DynamicPriceOverride>>;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicPricingService,
        {
          provide: getRepositoryToken(DynamicPricingRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => ({ ...data })),
            save: jest.fn().mockImplementation(async (entity: any) => ({
              id: entity.id || 'new-rule-uuid',
              createdAt: new Date('2025-01-01'),
              updatedAt: new Date('2025-01-01'),
              ...entity,
            })),
            remove: jest.fn().mockResolvedValue(undefined),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PricingChangeLog),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => ({ ...data })),
            save: jest.fn().mockImplementation(async (entity: any) => ({
              id: 'log-uuid-new',
              ...entity,
            })),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DynamicPriceOverride),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => ({ ...data })),
            save: jest.fn(),
            upsert: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DynamicPricingService>(DynamicPricingService);
    ruleRepo = module.get(getRepositoryToken(DynamicPricingRule));
    changeLogRepo = module.get(getRepositoryToken(PricingChangeLog));
    overrideRepo = module.get(getRepositoryToken(DynamicPriceOverride));
    roomRepo = module.get(getRepositoryToken(Room));
    bookingRepo = module.get(getRepositoryToken(Booking));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all rules for a property sorted by priority', async () => {
      const rules = [
        createMockRule({ id: 'rule-1', priority: 5 }),
        createMockRule({ id: 'rule-2', priority: 10 }),
      ];
      ruleRepo.find.mockResolvedValue(rules);

      const result = await service.findAll(PROPERTY_ID);

      expect(result.data).toHaveLength(2);
      expect(ruleRepo.find).toHaveBeenCalledWith({
        where: { propertyId: PROPERTY_ID },
        order: { priority: 'ASC', createdAt: 'ASC' },
      });
    });

    it('should return empty array when no rules exist', async () => {
      ruleRepo.find.mockResolvedValue([]);

      const result = await service.findAll(PROPERTY_ID);

      expect(result.data).toHaveLength(0);
    });

    it('should return snake_case fields in response', async () => {
      const rule = createMockRule();
      ruleRepo.find.mockResolvedValue([rule]);

      const result = await service.findAll(PROPERTY_ID);
      const ruleResponse = result.data[0] as any;

      expect(ruleResponse).toHaveProperty('id');
      expect(ruleResponse).toHaveProperty('property_id');
      expect(ruleResponse).toHaveProperty('trigger_type');
      expect(ruleResponse).toHaveProperty('trigger_config');
      expect(ruleResponse).toHaveProperty('action_type');
      expect(ruleResponse).toHaveProperty('action_value');
      expect(ruleResponse).toHaveProperty('apply_to');
      expect(ruleResponse).toHaveProperty('room_ids');
      expect(ruleResponse).toHaveProperty('min_price');
      expect(ruleResponse).toHaveProperty('max_price');
      expect(ruleResponse).toHaveProperty('is_active');
      expect(ruleResponse).toHaveProperty('created_at');
      expect(ruleResponse).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(ruleResponse).not.toHaveProperty('propertyId');
      expect(ruleResponse).not.toHaveProperty('triggerType');
      expect(ruleResponse).not.toHaveProperty('actionType');
      expect(ruleResponse).not.toHaveProperty('isActive');
    });

    it('should convert actionValue to number in response', async () => {
      const rule = createMockRule({ actionValue: '20' as any });
      ruleRepo.find.mockResolvedValue([rule]);

      const result = await service.findAll(PROPERTY_ID);

      expect(typeof (result.data[0] as any).action_value).toBe('number');
      expect((result.data[0] as any).action_value).toBe(20);
    });

    it('should convert null minPrice/maxPrice correctly', async () => {
      const rule = createMockRule({ minPrice: null, maxPrice: null });
      ruleRepo.find.mockResolvedValue([rule]);

      const result = await service.findAll(PROPERTY_ID);

      expect((result.data[0] as any).min_price).toBeNull();
      expect((result.data[0] as any).max_price).toBeNull();
    });

    it('should convert non-null minPrice/maxPrice to numbers', async () => {
      const rule = createMockRule({ minPrice: '30000000' as any, maxPrice: '80000000' as any });
      ruleRepo.find.mockResolvedValue([rule]);

      const result = await service.findAll(PROPERTY_ID);

      expect((result.data[0] as any).min_price).toBe(30000000);
      expect((result.data[0] as any).max_price).toBe(80000000);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a single rule by id and property', async () => {
      const rule = createMockRule();
      ruleRepo.findOne.mockResolvedValue(rule);

      const result = await service.findOne('rule-uuid-001', PROPERTY_ID);

      expect(result).toBeDefined();
      expect((result as any).id).toBe('rule-uuid-001');
      expect(ruleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'rule-uuid-001', propertyId: PROPERTY_ID },
      });
    });

    it('should throw NOT_FOUND when rule does not exist', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', PROPERTY_ID)).rejects.toThrow(
        SardobaException,
      );
      await expect(service.findOne('non-existent', PROPERTY_ID)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw NOT_FOUND when rule belongs to another property', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('rule-uuid-001', 9999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto: CreateRuleDto = {
      name: 'Weekend Premium',
      trigger_type: 'day_of_week',
      trigger_config: { days: [5, 6, 0] },
      action_type: 'increase_percent',
      action_value: 15,
    };

    it('should create a rule successfully', async () => {
      const result = await service.create(PROPERTY_ID, createDto);

      expect(result).toBeDefined();
      expect(ruleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: PROPERTY_ID,
          name: 'Weekend Premium',
          triggerType: 'day_of_week',
          triggerConfig: { days: [5, 6, 0] },
          actionType: 'increase_percent',
          actionValue: 15,
          applyTo: 'all',
          roomIds: [],
          isActive: true,
          priority: 10,
        }),
      );
      expect(ruleRepo.save).toHaveBeenCalled();
    });

    it('should use provided optional fields', async () => {
      const dto: CreateRuleDto = {
        ...createDto,
        apply_to: 'room',
        room_ids: ['room-1', 'room-2'],
        min_price: 30000000,
        max_price: 80000000,
        is_active: false,
        priority: 5,
      };

      await service.create(PROPERTY_ID, dto);

      expect(ruleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applyTo: 'room',
          roomIds: ['room-1', 'room-2'],
          minPrice: 30000000,
          maxPrice: 80000000,
          isActive: false,
          priority: 5,
        }),
      );
    });

    it('should set minPrice to null when not provided', async () => {
      await service.create(PROPERTY_ID, createDto);

      expect(ruleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: null,
          maxPrice: null,
        }),
      );
    });

    it('should throw VALIDATION_ERROR when min_price > max_price', async () => {
      const invalidDto: CreateRuleDto = {
        ...createDto,
        min_price: 80000000,
        max_price: 30000000,
      };

      await expect(service.create(PROPERTY_ID, invalidDto)).rejects.toThrow(
        SardobaException,
      );
      await expect(service.create(PROPERTY_ID, invalidDto)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should allow equal min_price and max_price', async () => {
      const dto: CreateRuleDto = {
        ...createDto,
        min_price: 50000000,
        max_price: 50000000,
      };

      const result = await service.create(PROPERTY_ID, dto);
      expect(result).toBeDefined();
    });

    it('should default apply_to to "all" when not specified', async () => {
      await service.create(PROPERTY_ID, createDto);

      expect(ruleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ applyTo: 'all' }),
      );
    });

    it('should return the created rule in snake_case format', async () => {
      const result = await service.create(PROPERTY_ID, createDto);

      expect(result).toHaveProperty('property_id');
      expect(result).toHaveProperty('trigger_type');
      expect(result).toHaveProperty('action_type');
      expect(result).toHaveProperty('is_active');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update only provided fields', async () => {
      const existingRule = createMockRule();
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.update('rule-uuid-001', PROPERTY_ID, { name: 'Updated Name' });

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });

    it('should update trigger_type and trigger_config', async () => {
      const existingRule = createMockRule();
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.update('rule-uuid-001', PROPERTY_ID, {
        trigger_type: 'days_before',
        trigger_config: { days_min: 1, days_max: 3 },
      });

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerType: 'days_before',
          triggerConfig: { days_min: 1, days_max: 3 },
        }),
      );
    });

    it('should update action_type and action_value', async () => {
      const existingRule = createMockRule();
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.update('rule-uuid-001', PROPERTY_ID, {
        action_type: 'set_fixed',
        action_value: 45000000,
      });

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'set_fixed',
          actionValue: 45000000,
        }),
      );
    });

    it('should throw NOT_FOUND when updating non-existent rule', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', PROPERTY_ID, { name: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw VALIDATION_ERROR when updated min_price > max_price', async () => {
      const existingRule = createMockRule({ minPrice: 30000000, maxPrice: 80000000 });
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await expect(
        service.update('rule-uuid-001', PROPERTY_ID, { min_price: 90000000 }),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should throw VALIDATION_ERROR when updated max_price < existing min_price', async () => {
      const existingRule = createMockRule({ minPrice: 50000000, maxPrice: 80000000 });
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await expect(
        service.update('rule-uuid-001', PROPERTY_ID, { max_price: 30000000 }),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should allow update when both min and max are null', async () => {
      const existingRule = createMockRule({ minPrice: null, maxPrice: null });
      ruleRepo.findOne.mockResolvedValue(existingRule);

      const result = await service.update('rule-uuid-001', PROPERTY_ID, {
        name: 'Updated',
      });

      expect(result).toBeDefined();
    });

    it('should update is_active field', async () => {
      const existingRule = createMockRule({ isActive: true });
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.update('rule-uuid-001', PROPERTY_ID, { is_active: false });

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should update priority field', async () => {
      const existingRule = createMockRule({ priority: 10 });
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.update('rule-uuid-001', PROPERTY_ID, { priority: 1 });

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 1 }),
      );
    });

    it('should update room_ids', async () => {
      const existingRule = createMockRule({ roomIds: [] });
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.update('rule-uuid-001', PROPERTY_ID, {
        room_ids: ['room-1', 'room-2'],
      });

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roomIds: ['room-1', 'room-2'] }),
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove an existing rule', async () => {
      const rule = createMockRule();
      ruleRepo.findOne.mockResolvedValue(rule);

      await service.remove('rule-uuid-001', PROPERTY_ID);

      expect(ruleRepo.remove).toHaveBeenCalledWith(rule);
    });

    it('should throw NOT_FOUND when removing non-existent rule', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', PROPERTY_ID),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw NOT_FOUND when rule belongs to another property', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('rule-uuid-001', 9999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── toggle ──────────────────────────────────────────────────────────────

  describe('toggle', () => {
    it('should toggle active rule to inactive', async () => {
      const rule = createMockRule({ isActive: true });
      ruleRepo.findOne.mockResolvedValue(rule);

      const result = await service.toggle('rule-uuid-001', PROPERTY_ID);

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(result).toBeDefined();
    });

    it('should toggle inactive rule to active', async () => {
      const rule = createMockRule({ isActive: false });
      ruleRepo.findOne.mockResolvedValue(rule);

      await service.toggle('rule-uuid-001', PROPERTY_ID);

      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should throw NOT_FOUND when toggling non-existent rule', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.toggle('non-existent', PROPERTY_ID),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should return the toggled rule in snake_case format', async () => {
      const rule = createMockRule({ isActive: true });
      ruleRepo.findOne.mockResolvedValue(rule);

      const result = await service.toggle('rule-uuid-001', PROPERTY_ID);

      expect(result).toHaveProperty('is_active');
      expect(result).not.toHaveProperty('isActive');
    });
  });

  // ── getHistory ──────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('should return paginated pricing change history', async () => {
      const logs = [createMockChangeLog()];
      changeLogRepo.findAndCount.mockResolvedValue([logs, 1]);

      const result = await service.getHistory(PROPERTY_ID, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 50,
        last_page: 1,
      });
      expect(changeLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { propertyId: PROPERTY_ID },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
        relations: ['room'],
      });
    });

    it('should calculate correct skip for page 2', async () => {
      changeLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(PROPERTY_ID, 2, 50);

      expect(changeLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });

    it('should calculate correct skip for page 3 with custom per_page', async () => {
      changeLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(PROPERTY_ID, 3, 20);

      expect(changeLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should default to page 1 and per_page 50', async () => {
      changeLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(PROPERTY_ID);

      expect(changeLogRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it('should return correct change_percent', async () => {
      const log = createMockChangeLog({ oldPrice: 50000000, newPrice: 60000000 });
      changeLogRepo.findAndCount.mockResolvedValue([[log], 1]);

      const result = await service.getHistory(PROPERTY_ID);
      const entry = result.data[0] as any;

      expect(entry.change_percent).toBe(20);
    });

    it('should return null change_percent when old_price is null', async () => {
      const log = createMockChangeLog({ oldPrice: null, newPrice: 60000000 });
      changeLogRepo.findAndCount.mockResolvedValue([[log], 1]);

      const result = await service.getHistory(PROPERTY_ID);
      const entry = result.data[0] as any;

      expect(entry.change_percent).toBeNull();
    });

    it('should return null change_percent when new_price is null', async () => {
      const log = createMockChangeLog({ oldPrice: 50000000, newPrice: null });
      changeLogRepo.findAndCount.mockResolvedValue([[log], 1]);

      const result = await service.getHistory(PROPERTY_ID);
      const entry = result.data[0] as any;

      expect(entry.change_percent).toBeNull();
    });

    it('should include room_name from relation', async () => {
      const room = createMockRoom({ name: 'Suite 201' });
      const log = createMockChangeLog({ room } as any);
      changeLogRepo.findAndCount.mockResolvedValue([[log], 1]);

      const result = await service.getHistory(PROPERTY_ID);
      const entry = result.data[0] as any;

      expect(entry.room_name).toBe('Suite 201');
    });

    it('should return null room_name when room is null', async () => {
      const log = createMockChangeLog({ room: null } as any);
      changeLogRepo.findAndCount.mockResolvedValue([[log], 1]);

      const result = await service.getHistory(PROPERTY_ID);
      const entry = result.data[0] as any;

      expect(entry.room_name).toBeNull();
    });

    it('should calculate last_page correctly', async () => {
      changeLogRepo.findAndCount.mockResolvedValue([[], 101]);

      const result = await service.getHistory(PROPERTY_ID, 1, 50);

      expect(result.meta.last_page).toBe(3);
    });

    it('should return last_page = 1 when total is 0', async () => {
      changeLogRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getHistory(PROPERTY_ID, 1, 50);

      expect(result.meta.last_page).toBe(1);
    });

    it('should convert numeric string fields from bigint to number', async () => {
      const log = createMockChangeLog({
        oldPrice: '50000000' as any,
        newPrice: '60000000' as any,
        triggerValue: '85' as any,
      });
      changeLogRepo.findAndCount.mockResolvedValue([[log], 1]);

      const result = await service.getHistory(PROPERTY_ID);
      const entry = result.data[0] as any;

      expect(typeof entry.old_price).toBe('number');
      expect(typeof entry.new_price).toBe('number');
      expect(typeof entry.trigger_value).toBe('number');
    });
  });

  // ── getTemplates ────────────────────────────────────────────────────────

  describe('getTemplates', () => {
    it('should return all preset templates', () => {
      const result = service.getTemplates();

      expect(result.data).toEqual(PRICING_RULE_TEMPLATES);
      expect(result.data).toHaveLength(5);
    });

    it('should include occupancy_high template', () => {
      const result = service.getTemplates();

      const highOccupancy = result.data.find(
        (t: any) => t.trigger_type === 'occupancy_high',
      );
      expect(highOccupancy).toBeDefined();
      expect(highOccupancy!.action_type).toBe('increase_percent');
    });

    it('should include occupancy_low template', () => {
      const result = service.getTemplates();

      const lowOccupancy = result.data.find(
        (t: any) => t.trigger_type === 'occupancy_low',
      );
      expect(lowOccupancy).toBeDefined();
      expect(lowOccupancy!.action_type).toBe('decrease_percent');
    });

    it('should include day_of_week template for weekends', () => {
      const result = service.getTemplates();

      const weekendTemplate = result.data.find(
        (t: any) => t.trigger_type === 'day_of_week',
      );
      expect(weekendTemplate).toBeDefined();
      expect(weekendTemplate!.trigger_config.days).toEqual([5, 6, 0]);
    });

    it('should include last_minute and early_bird days_before templates', () => {
      const result = service.getTemplates();

      const daysBefore = result.data.filter(
        (t: any) => t.trigger_type === 'days_before',
      );
      expect(daysBefore).toHaveLength(2);

      const lastMinute = daysBefore.find(
        (t: any) => t.trigger_config.days_max === 3,
      );
      expect(lastMinute).toBeDefined();
      expect(lastMinute!.trigger_config.days_min).toBe(1);

      const earlyBird = daysBefore.find(
        (t: any) => t.trigger_config.days_min === 30,
      );
      expect(earlyBird).toBeDefined();
    });
  });

  // ── applyAction (tested through public methods) ────────────────────────

  describe('price action logic', () => {
    // We test the private applyAction and clampPrice logic indirectly
    // through the runPricingCalculation method.

    function setupForPricingRun(
      rules: DynamicPricingRule[],
      rooms: Room[],
      bookingCount = 0,
    ) {
      ruleRepo.find.mockResolvedValue(rules);
      roomRepo.find.mockResolvedValue(rooms);
      roomRepo.count.mockResolvedValue(rooms.length);

      const qb = createMockQueryBuilder({ getCount: bookingCount });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);
    }

    describe('increase_percent', () => {
      it('should increase price by percentage correctly', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] }, // all days
          actionType: 'increase_percent',
          actionValue: 20,
          minPrice: null,
          maxPrice: null,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        // Verify override was created with increased price
        expect(overrideRepo.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            roomId: room.id,
            price: 60000000, // 50M + 20% = 60M
          }),
          ['roomId', 'date'],
        );
      });
    });

    describe('decrease_percent', () => {
      it('should decrease price by percentage correctly', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] }, // all days
          actionType: 'decrease_percent',
          actionValue: 10,
          minPrice: null,
          maxPrice: null,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            roomId: room.id,
            price: 45000000, // 50M - 10% = 45M
          }),
          ['roomId', 'date'],
        );
      });
    });

    describe('set_fixed', () => {
      it('should set fixed price', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
          actionType: 'set_fixed',
          actionValue: 45000000,
          minPrice: null,
          maxPrice: null,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 45000000,
          }),
          ['roomId', 'date'],
        );
      });
    });

    describe('price clamping', () => {
      it('should clamp price to minPrice when result is below', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
          actionType: 'decrease_percent',
          actionValue: 50, // 50% decrease = 25M
          minPrice: 30000000, // should clamp to 30M
          maxPrice: null,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 30000000,
          }),
          ['roomId', 'date'],
        );
      });

      it('should clamp price to maxPrice when result is above', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
          actionType: 'increase_percent',
          actionValue: 100, // 100% increase = 100M
          minPrice: null,
          maxPrice: 70000000, // should clamp to 70M
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 70000000,
          }),
          ['roomId', 'date'],
        );
      });

      it('should clamp between both min and max', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
          actionType: 'decrease_percent',
          actionValue: 80, // 80% decrease = 10M
          minPrice: 20000000,
          maxPrice: 70000000,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 20000000, // clamped to min
          }),
          ['roomId', 'date'],
        );
      });
    });
  });

  // ── runPricingCalculation ───────────────────────────────────────────────

  describe('runPricingCalculation', () => {
    function setupForPricingRun(
      rules: DynamicPricingRule[],
      rooms: Room[],
      bookingCount = 0,
    ) {
      ruleRepo.find.mockResolvedValue(rules);
      roomRepo.find.mockResolvedValue(rooms);
      roomRepo.count.mockResolvedValue(rooms.length);

      const qb = createMockQueryBuilder({ getCount: bookingCount });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);
    }

    it('should do nothing when no active rules exist', async () => {
      ruleRepo.find.mockResolvedValue([]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(roomRepo.find).not.toHaveBeenCalled();
      expect(overrideRepo.upsert).not.toHaveBeenCalled();
    });

    it('should process all active rooms', async () => {
      const rooms = [
        createMockRoom({ id: 1, name: 'Room 1' }),
        createMockRoom({ id: 2, name: 'Room 2' }),
      ];
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], rooms);

      await service.runPricingCalculation(PROPERTY_ID);

      // Both rooms should have overrides created
      const upsertCalls = overrideRepo.upsert.mock.calls;
      const roomIdsUpserted = new Set(upsertCalls.map((call) => (call[0] as any).roomId));
      expect(roomIdsUpserted.has(1)).toBe(true);
      expect(roomIdsUpserted.has(2)).toBe(true);
    });

    it('should filter rules by room when apply_to is "room"', async () => {
      const room1 = createMockRoom({ id: 1 });
      const room2 = createMockRoom({ id: 2 });
      const rule = createMockRule({
        applyTo: 'room',
        roomIds: ['1'], // only applies to room 1
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], [room1, room2]);

      await service.runPricingCalculation(PROPERTY_ID);

      // Only room 1 should have overrides
      const upsertCalls = overrideRepo.upsert.mock.calls;
      const roomIdsUpserted = upsertCalls.map((call) => (call[0] as any).roomId);
      expect(roomIdsUpserted).toContain(1);
      expect(roomIdsUpserted).not.toContain(2);
    });

    it('should apply rules to all rooms when apply_to is "all"', async () => {
      const rooms = [
        createMockRoom({ id: 1 }),
        createMockRoom({ id: 2 }),
        createMockRoom({ id: 3 }),
      ];
      const rule = createMockRule({
        applyTo: 'all',
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], rooms);

      await service.runPricingCalculation(PROPERTY_ID);

      const upsertCalls = overrideRepo.upsert.mock.calls;
      const roomIdsUpserted = new Set(upsertCalls.map((call) => (call[0] as any).roomId));
      expect(roomIdsUpserted.size).toBe(3);
    });

    it('should log price changes in change log', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 20,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(changeLogRepo.save).toHaveBeenCalled();
      expect(changeLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: PROPERTY_ID,
          roomId: room.id,
          ruleId: rule.id,
          ruleName: rule.name,
          oldPrice: 50000000,
          newPrice: 60000000,
        }),
      );
    });

    it('should not create override when price does not change', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      // set_fixed with same price as base
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'set_fixed',
        actionValue: 50000000, // same as base price
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      // price didn't change, so no override should be created
      expect(overrideRepo.upsert).not.toHaveBeenCalled();
    });

    it('should apply only the first matching rule (break after first match)', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule1 = createMockRule({
        id: 'rule-1',
        priority: 1,
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 20, // +20% = 60M
      });
      const rule2 = createMockRule({
        id: 'rule-2',
        priority: 2,
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 50, // +50% would be 75M if applied
      });

      setupForPricingRun([rule1, rule2], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      // Should only apply rule1's pricing (break after first)
      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 60000000, // only rule1 applied
          ruleIds: ['rule-1'],
        }),
        ['roomId', 'date'],
      );
    });

    it('should sort rules by priority before applying', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      // Rules intentionally ordered "wrong" by priority to verify sorting
      const ruleLow = createMockRule({
        id: 'rule-low',
        priority: 20,
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 50,
      });
      const ruleHigh = createMockRule({
        id: 'rule-high',
        priority: 1,
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      // Pass them unsorted - the service should sort by priority
      setupForPricingRun([ruleLow, ruleHigh], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      // ruleHigh (priority=1) should be applied first
      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 55000000, // +10% from ruleHigh
          ruleIds: ['rule-high'],
        }),
        ['roomId', 'date'],
      );
    });
  });

  // ── Trigger evaluation (via runPricingCalculation) ─────────────────────

  describe('trigger evaluation', () => {
    function setupForPricingRun(
      rules: DynamicPricingRule[],
      rooms: Room[],
      bookingCount = 0,
    ) {
      ruleRepo.find.mockResolvedValue(rules);
      roomRepo.find.mockResolvedValue(rooms);
      roomRepo.count.mockResolvedValue(rooms.length);

      const qb = createMockQueryBuilder({ getCount: bookingCount });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);
    }

    describe('day_of_week trigger', () => {
      it('should trigger on matching day of week', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const today = new Date();
        const todayDow = getDay(today);

        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [todayDow] }, // matches today
          actionType: 'increase_percent',
          actionValue: 15,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        // Should have at least one override for today
        expect(overrideRepo.upsert).toHaveBeenCalled();
      });

      it('should not trigger on non-matching day of week', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        // Pick a day that definitely won't match any day in a 90-day window
        // This is hard to guarantee, so instead we use an empty days array
        const rule = createMockRule({
          triggerType: 'day_of_week',
          triggerConfig: { days: [] }, // never triggers
          actionType: 'increase_percent',
          actionValue: 15,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).not.toHaveBeenCalled();
      });
    });

    describe('occupancy_high trigger', () => {
      it('should trigger when occupancy >= threshold', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'occupancy_high',
          triggerConfig: { threshold: 80, period_days: 7 },
          actionType: 'increase_percent',
          actionValue: 20,
        });

        // Setup for high occupancy: many rooms means low individual booking impact
        // Use 1 room and many bookings to get high occupancy
        ruleRepo.find.mockResolvedValue([rule]);
        roomRepo.find.mockResolvedValue([room]);
        roomRepo.count.mockResolvedValue(1);

        // 1 room, 7 days = 7 slots. 6 bookings = ~86% occupancy
        const qb = createMockQueryBuilder({ getCount: 6 });
        bookingRepo.createQueryBuilder.mockReturnValue(qb);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalled();
      });

      it('should not trigger when occupancy < threshold', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'occupancy_high',
          triggerConfig: { threshold: 80, period_days: 7 },
          actionType: 'increase_percent',
          actionValue: 20,
        });

        ruleRepo.find.mockResolvedValue([rule]);
        roomRepo.find.mockResolvedValue([room]);
        roomRepo.count.mockResolvedValue(10); // 10 rooms

        // 10 rooms, 7 days = 70 slots. 1 booking = ~1.4% occupancy
        const qb = createMockQueryBuilder({ getCount: 1 });
        bookingRepo.createQueryBuilder.mockReturnValue(qb);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).not.toHaveBeenCalled();
      });
    });

    describe('occupancy_low trigger', () => {
      it('should trigger when occupancy <= threshold', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'occupancy_low',
          triggerConfig: { threshold: 30, period_days: 14 },
          actionType: 'decrease_percent',
          actionValue: 10,
        });

        ruleRepo.find.mockResolvedValue([rule]);
        roomRepo.find.mockResolvedValue([room]);
        roomRepo.count.mockResolvedValue(10); // 10 rooms

        // 10 rooms, 14 days = 140 slots. 2 bookings = ~1.4% occupancy
        const qb = createMockQueryBuilder({ getCount: 2 });
        bookingRepo.createQueryBuilder.mockReturnValue(qb);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalled();
      });

      it('should not trigger when occupancy > threshold', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'occupancy_low',
          triggerConfig: { threshold: 30, period_days: 14 },
          actionType: 'decrease_percent',
          actionValue: 10,
        });

        ruleRepo.find.mockResolvedValue([rule]);
        roomRepo.find.mockResolvedValue([room]);
        roomRepo.count.mockResolvedValue(1); // 1 room

        // 1 room, 14 days = 14 slots. 10 bookings = ~71% occupancy
        const qb = createMockQueryBuilder({ getCount: 10 });
        bookingRepo.createQueryBuilder.mockReturnValue(qb);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).not.toHaveBeenCalled();
      });
    });

    describe('days_before trigger', () => {
      it('should trigger for dates within the days range', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'days_before',
          triggerConfig: { days_min: 1, days_max: 90 }, // covers full 90-day horizon
          actionType: 'decrease_percent',
          actionValue: 15,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).toHaveBeenCalled();
      });

      it('should not trigger for dates outside the days range', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        // This won't match because the pricing horizon is 90 days,
        // but the rule requires 100+ days
        const rule = createMockRule({
          triggerType: 'days_before',
          triggerConfig: { days_min: 100, days_max: 200 },
          actionType: 'decrease_percent',
          actionValue: 15,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).not.toHaveBeenCalled();
      });
    });

    describe('zero occupancy', () => {
      it('should return 0% occupancy when there are no rooms', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'occupancy_low',
          triggerConfig: { threshold: 30, period_days: 7 },
          actionType: 'decrease_percent',
          actionValue: 10,
        });

        ruleRepo.find.mockResolvedValue([rule]);
        roomRepo.find.mockResolvedValue([room]);
        roomRepo.count.mockResolvedValue(0); // 0 rooms -> occupancy = 0

        const qb = createMockQueryBuilder({ getCount: 0 });
        bookingRepo.createQueryBuilder.mockReturnValue(qb);

        await service.runPricingCalculation(PROPERTY_ID);

        // 0% occupancy <= 30% threshold, so rule should trigger
        expect(overrideRepo.upsert).toHaveBeenCalled();
      });
    });

    describe('unknown trigger type', () => {
      it('should not trigger for unknown trigger types', async () => {
        const room = createMockRoom({ basePrice: 50000000 });
        const rule = createMockRule({
          triggerType: 'unknown_type' as any,
          triggerConfig: {},
          actionType: 'increase_percent',
          actionValue: 10,
        });

        setupForPricingRun([rule], [room]);

        await service.runPricingCalculation(PROPERTY_ID);

        expect(overrideRepo.upsert).not.toHaveBeenCalled();
      });
    });
  });

  // ── preview ─────────────────────────────────────────────────────────────

  describe('preview', () => {
    const previewDto: CreateRuleDto = {
      name: 'Weekend Surge',
      trigger_type: 'day_of_week',
      trigger_config: { days: [0, 1, 2, 3, 4, 5, 6] }, // all days for predictability
      action_type: 'increase_percent',
      action_value: 25,
    };

    it('should return preview data for all active rooms', async () => {
      const rooms = [
        createMockRoom({ id: 1, name: 'Room 1', basePrice: 40000000 }),
        createMockRoom({ id: 2, name: 'Room 2', basePrice: 60000000 }),
      ];
      roomRepo.find.mockResolvedValue(rooms);
      roomRepo.count.mockResolvedValue(2);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.preview(PROPERTY_ID, previewDto);

      expect(result.preview_days).toBeDefined();
      expect(result.preview_days.length).toBeGreaterThan(0);

      // Both rooms should be represented
      const roomIds = new Set(result.preview_days.map((d) => d.room_id));
      expect(roomIds.has(1)).toBe(true);
      expect(roomIds.has(2)).toBe(true);
    });

    it('should calculate correct price changes in preview', async () => {
      const room = createMockRoom({ id: 1, name: 'Deluxe', basePrice: 40000000 });
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.preview(PROPERTY_ID, previewDto);

      const firstDay = result.preview_days[0];
      expect(firstDay.current_price).toBe(40000000);
      expect(firstDay.new_price).toBe(50000000); // 40M + 25% = 50M
      expect(firstDay.change_percent).toBe(25);
      expect(firstDay.room_name).toBe('Deluxe');
      expect(firstDay.rule_name).toBe('Weekend Surge');
    });

    it('should preview 31 days ahead (today + 30)', async () => {
      const room = createMockRoom({ id: 1, basePrice: 40000000 });
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.preview(PROPERTY_ID, previewDto);

      // 31 days for a single room, all days matching
      expect(result.preview_days).toHaveLength(31);
    });

    it('should not include days where price does not change', async () => {
      const room = createMockRoom({ id: 1, basePrice: 50000000 });
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      // set_fixed to same base price - no change
      const noChangeDto: CreateRuleDto = {
        name: 'No Change',
        trigger_type: 'day_of_week',
        trigger_config: { days: [0, 1, 2, 3, 4, 5, 6] },
        action_type: 'set_fixed',
        action_value: 50000000, // same as basePrice
      };

      const result = await service.preview(PROPERTY_ID, noChangeDto);

      expect(result.preview_days).toHaveLength(0);
    });

    it('should only preview rooms matching apply_to "room" filter', async () => {
      const room1 = createMockRoom({ id: 1, name: 'Room 1', basePrice: 40000000 });
      const room2 = createMockRoom({ id: 2, name: 'Room 2', basePrice: 60000000 });
      roomRepo.find.mockResolvedValue([room1, room2]);
      roomRepo.count.mockResolvedValue(2);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const filteredDto: CreateRuleDto = {
        ...previewDto,
        apply_to: 'room',
        room_ids: ['1'],
      };

      const result = await service.preview(PROPERTY_ID, filteredDto);

      const roomIds = new Set(result.preview_days.map((d) => d.room_id));
      expect(roomIds.has(1)).toBe(true);
      expect(roomIds.has(2)).toBe(false);
    });

    it('should return empty preview_days when no rooms exist', async () => {
      roomRepo.find.mockResolvedValue([]);

      const result = await service.preview(PROPERTY_ID, previewDto);

      expect(result.preview_days).toEqual([]);
    });

    it('should include correct date format in preview', async () => {
      const room = createMockRoom({ id: 1, basePrice: 40000000 });
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.preview(PROPERTY_ID, previewDto);

      const firstDay = result.preview_days[0];
      // Date should be in YYYY-MM-DD format
      expect(firstDay.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should apply price clamping in preview', async () => {
      const room = createMockRoom({ id: 1, basePrice: 50000000 });
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const clampedDto: CreateRuleDto = {
        name: 'Clamped Increase',
        trigger_type: 'day_of_week',
        trigger_config: { days: [0, 1, 2, 3, 4, 5, 6] },
        action_type: 'increase_percent',
        action_value: 100, // 100% = 100M
        max_price: 70000000, // clamped to 70M
      };

      const result = await service.preview(PROPERTY_ID, clampedDto);

      const firstDay = result.preview_days[0];
      expect(firstDay.new_price).toBe(70000000);
    });
  });

  // ── ruleAppliesTo (tested through pricing and preview) ─────────────────

  describe('ruleAppliesTo logic', () => {
    function setupForPricingRun(
      rules: DynamicPricingRule[],
      rooms: Room[],
    ) {
      ruleRepo.find.mockResolvedValue(rules);
      roomRepo.find.mockResolvedValue(rooms);
      roomRepo.count.mockResolvedValue(rooms.length);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);
    }

    it('should apply to all rooms when applyTo is "all"', async () => {
      const rooms = [
        createMockRoom({ id: 1 }),
        createMockRoom({ id: 2 }),
        createMockRoom({ id: 3 }),
      ];
      const rule = createMockRule({
        applyTo: 'all',
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], rooms);

      await service.runPricingCalculation(PROPERTY_ID);

      const roomIdsUpserted = new Set(
        overrideRepo.upsert.mock.calls.map((call) => (call[0] as any).roomId),
      );
      expect(roomIdsUpserted.size).toBe(3);
    });

    it('should apply only to specific rooms when applyTo is "room"', async () => {
      const rooms = [
        createMockRoom({ id: 10 }),
        createMockRoom({ id: 20 }),
        createMockRoom({ id: 30 }),
      ];
      const rule = createMockRule({
        applyTo: 'room',
        roomIds: ['10', '30'],
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], rooms);

      await service.runPricingCalculation(PROPERTY_ID);

      const roomIdsUpserted = new Set(
        overrideRepo.upsert.mock.calls.map((call) => (call[0] as any).roomId),
      );
      expect(roomIdsUpserted.has(10)).toBe(true);
      expect(roomIdsUpserted.has(20)).toBe(false);
      expect(roomIdsUpserted.has(30)).toBe(true);
    });

    it('should not apply when applyTo is "room" but roomIds is empty', async () => {
      const room = createMockRoom({ id: 1 });
      const rule = createMockRule({
        applyTo: 'room',
        roomIds: [],
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(overrideRepo.upsert).not.toHaveBeenCalled();
    });

    it('should not match when applyTo is "room_type" (unsupported in current logic)', async () => {
      const room = createMockRoom({ id: 1 });
      const rule = createMockRule({
        applyTo: 'room_type',
        roomIds: [],
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      // room_type is not handled in ruleAppliesTo, returns false
      expect(overrideRepo.upsert).not.toHaveBeenCalled();
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    function setupForPricingRun(
      rules: DynamicPricingRule[],
      rooms: Room[],
      bookingCount = 0,
    ) {
      ruleRepo.find.mockResolvedValue(rules);
      roomRepo.find.mockResolvedValue(rooms);
      roomRepo.count.mockResolvedValue(rooms.length);

      const qb = createMockQueryBuilder({ getCount: bookingCount });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);
    }

    it('should handle 0% price increase (no change)', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 0,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      // 0% increase means price doesn't change, so no override
      expect(overrideRepo.upsert).not.toHaveBeenCalled();
    });

    it('should handle 100% price decrease (price goes to 0)', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'decrease_percent',
        actionValue: 100, // 100% decrease = 0
        minPrice: null,
        maxPrice: null,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 0,
        }),
        ['roomId', 'date'],
      );
    });

    it('should round prices to integers', async () => {
      const room = createMockRoom({ basePrice: 33333333 }); // 333,333.33 som
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 7, // 7% of 33333333 = 2333333.31
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      const upsertCall = overrideRepo.upsert.mock.calls[0][0] as any;
      // Math.round(33333333 * 1.07) = Math.round(35666666.31) = 35666666
      expect(upsertCall.price).toBe(35666666);
      expect(Number.isInteger(upsertCall.price)).toBe(true);
    });

    it('should handle very large prices without overflow', async () => {
      const room = createMockRoom({ basePrice: 999999999999 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 10,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      const upsertCall = overrideRepo.upsert.mock.calls[0][0] as any;
      expect(upsertCall.price).toBe(1099999999999);
    });

    it('should handle actionValue as string (decimal from DB)', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: '20.00' as any, // DB returns decimal as string
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 60000000, // correctly parsed from string "20.00"
        }),
        ['roomId', 'date'],
      );
    });

    it('should handle set_fixed with decimal actionValue string', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'set_fixed',
        actionValue: '45000000.50' as any,
      });

      setupForPricingRun([rule], [room]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 45000001, // Math.round(45000000.50)
        }),
        ['roomId', 'date'],
      );
    });

    it('should handle inactive rules being ignored', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      // The service queries for isActive: true, so inactive rules
      // are filtered at the DB level. Verifying the query is correct.
      ruleRepo.find.mockResolvedValue([]);
      roomRepo.find.mockResolvedValue([room]);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(ruleRepo.find).toHaveBeenCalledWith({
        where: { propertyId: PROPERTY_ID, isActive: true },
        order: { priority: 'ASC' },
      });
    });

    it('should use default period_days of 7 when not specified for occupancy', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'occupancy_low',
        triggerConfig: { threshold: 50 }, // no period_days
        actionType: 'decrease_percent',
        actionValue: 10,
      });

      ruleRepo.find.mockResolvedValue([rule]);
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(10);

      // Low occupancy
      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.runPricingCalculation(PROPERTY_ID);

      // Occupancy = 0% <= 50%, should trigger
      expect(overrideRepo.upsert).toHaveBeenCalled();
    });

    it('should handle rooms with basePrice as string (bigint from DB)', async () => {
      const room = createMockRoom({ basePrice: '50000000' as any });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'increase_percent',
        actionValue: 20,
      });

      ruleRepo.find.mockResolvedValue([rule]);
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 60000000,
        }),
        ['roomId', 'date'],
      );
    });

    it('should handle minPrice/maxPrice as string (bigint from DB) during clamping', async () => {
      const room = createMockRoom({ basePrice: 50000000 });
      const rule = createMockRule({
        triggerType: 'day_of_week',
        triggerConfig: { days: [0, 1, 2, 3, 4, 5, 6] },
        actionType: 'decrease_percent',
        actionValue: 80, // 80% decrease = 10M
        minPrice: '30000000' as any, // DB returns bigint as string
        maxPrice: '80000000' as any,
      });

      ruleRepo.find.mockResolvedValue([rule]);
      roomRepo.find.mockResolvedValue([room]);
      roomRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder({ getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.runPricingCalculation(PROPERTY_ID);

      expect(overrideRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 30000000, // clamped to min
        }),
        ['roomId', 'date'],
      );
    });
  });

  // ── PRICING_RULE_TEMPLATES constant ────────────────────────────────────

  describe('PRICING_RULE_TEMPLATES', () => {
    it('should export 5 templates', () => {
      expect(PRICING_RULE_TEMPLATES).toHaveLength(5);
    });

    it('each template should have required fields', () => {
      for (const template of PRICING_RULE_TEMPLATES) {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('trigger_type');
        expect(template).toHaveProperty('trigger_config');
        expect(template).toHaveProperty('action_type');
        expect(template).toHaveProperty('action_value');
        expect(typeof template.name).toBe('string');
        expect(typeof template.trigger_type).toBe('string');
        expect(typeof template.trigger_config).toBe('object');
        expect(typeof template.action_type).toBe('string');
        expect(typeof template.action_value).toBe('number');
      }
    });

    it('action_value should be positive for all templates', () => {
      for (const template of PRICING_RULE_TEMPLATES) {
        expect(template.action_value).toBeGreaterThan(0);
      }
    });
  });
});
