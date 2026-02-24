import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RatesService, RateCalculation } from './rates.service';
import { Rate, RateType } from '@/database/entities/rate.entity';
import { Room } from '@/database/entities/room.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 1,
    propertyId: 42,
    name: 'Deluxe 101',
    roomType: 'double',
    floor: 2,
    capacityAdults: 2,
    capacityChildren: 1,
    basePrice: 50000000, // 500,000 som in tiyin
    status: 'active',
    amenities: ['wifi', 'ac', 'tv'],
    descriptionRu: null,
    descriptionUz: null,
    photos: [],
    sortOrder: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    property: {} as any,
    bookings: [],
    blocks: [],
    mappings: [],
    ...overrides,
  } as Room;
}

function createMockRate(overrides: Partial<Rate> = {}): Rate {
  return {
    id: 1,
    propertyId: 42,
    name: 'Base Rate',
    type: 'base' as RateType,
    price: 50000000,
    discountPercent: null,
    dateFrom: null,
    dateTo: null,
    minStay: 1,
    appliesToRooms: [],
    daysOfWeek: [],
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    property: {} as any,
    ...overrides,
  } as Rate;
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
    getMany: jest.fn().mockResolvedValue(returnValue.getMany ?? []),
    getManyAndCount: jest.fn().mockResolvedValue(
      returnValue.getManyAndCount ?? [[], 0],
    ),
    getOne: jest.fn().mockResolvedValue(returnValue.getOne ?? null),
    getCount: jest.fn().mockResolvedValue(returnValue.getCount ?? 0),
  };
  return qb;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('RatesService', () => {
  let service: RatesService;
  let rateRepo: jest.Mocked<Repository<Rate>>;
  let roomRepo: jest.Mocked<Repository<Room>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatesService,
        {
          provide: getRepositoryToken(Rate),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RatesService>(RatesService);
    rateRepo = module.get(getRepositoryToken(Rate));
    roomRepo = module.get(getRepositoryToken(Room));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated rates', async () => {
      const rates = [
        createMockRate(),
        createMockRate({ id: 2, name: 'Weekend Rate' }),
      ];
      const qb = createMockQueryBuilder({
        getManyAndCount: [rates, 2],
      });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, { page: 1, per_page: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
      expect(qb.where).toHaveBeenCalledWith(
        'rate.propertyId = :propertyId',
        { propertyId: 42 },
      );
    });

    it('should apply type filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { page: 1, per_page: 20, type: 'seasonal' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'rate.type = :type',
        { type: 'seasonal' },
      );
    });

    it('should apply is_active filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { page: 1, per_page: 20, is_active: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'rate.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should return snake_case fields in response', async () => {
      const rates = [createMockRate()];
      const qb = createMockQueryBuilder({ getManyAndCount: [rates, 1] });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, {});
      const rate = result.data[0] as any;

      expect(rate).toHaveProperty('property_id');
      expect(rate).toHaveProperty('discount_percent');
      expect(rate).toHaveProperty('date_from');
      expect(rate).toHaveProperty('date_to');
      expect(rate).toHaveProperty('min_stay');
      expect(rate).toHaveProperty('applies_to_rooms');
      expect(rate).toHaveProperty('days_of_week');
      expect(rate).toHaveProperty('is_active');
      expect(rate).toHaveProperty('created_at');
      expect(rate).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(rate).not.toHaveProperty('propertyId');
      expect(rate).not.toHaveProperty('discountPercent');
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a rate', async () => {
      const rate = createMockRate();
      rateRepo.findOne.mockResolvedValue(rate);

      const result = (await service.findOne(1, 42)) as any;

      expect(result.id).toBe(1);
      expect(result.property_id).toBe(42);
      expect(rateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, propertyId: 42 },
      });
    });

    it('should throw RATE_NOT_FOUND for non-existent rate', async () => {
      rateRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 42)).rejects.toThrow(SardobaException);
      await expect(service.findOne(999, 42)).rejects.toMatchObject({
        code: ErrorCode.RATE_NOT_FOUND,
      });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a base rate', async () => {
      const dto = {
        name: 'Standard Rate',
        type: 'base' as const,
        property_id: 42,
        price: 50000000,
      };

      const created = createMockRate({ name: 'Standard Rate' });
      rateRepo.create.mockReturnValue(created);
      rateRepo.save.mockResolvedValue(created);

      const result = (await service.create(42, dto)) as any;

      expect(rateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          name: 'Standard Rate',
          type: 'base',
          price: 50000000,
        }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw VALIDATION_ERROR if neither price nor discount_percent', async () => {
      const dto = {
        name: 'Bad Rate',
        type: 'base' as const,
        property_id: 42,
      };

      await expect(service.create(42, dto)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should require date_from/date_to for seasonal rates', async () => {
      const dto = {
        name: 'Summer',
        type: 'seasonal' as const,
        property_id: 42,
        price: 60000000,
      };

      await expect(service.create(42, dto)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should check for conflicts on seasonal rates', async () => {
      const dto = {
        name: 'Summer 2025',
        type: 'seasonal' as const,
        property_id: 42,
        price: 60000000,
        date_from: '2025-06-01',
        date_to: '2025-08-31',
      };

      const conflicting = createMockRate({
        id: 99,
        name: 'Existing Summer',
        type: 'seasonal',
        dateFrom: '2025-07-01',
        dateTo: '2025-09-30',
        appliesToRooms: [],
      });

      const qb = createMockQueryBuilder({ getMany: [conflicting] });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.create(42, dto)).rejects.toMatchObject({
        code: ErrorCode.RATE_CONFLICT,
      });
    });

    it('should require days_of_week for weekend rates', async () => {
      const dto = {
        name: 'Weekend',
        type: 'weekend' as const,
        property_id: 42,
        price: 55000000,
      };

      await expect(service.create(42, dto)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update specified fields', async () => {
      const rate = createMockRate();
      rateRepo.findOne.mockResolvedValue(rate);
      rateRepo.save.mockResolvedValue({
        ...rate,
        name: 'Updated Rate',
        price: 60000000,
      } as Rate);

      const result = (await service.update(1, 42, {
        name: 'Updated Rate',
        price: 60000000,
      })) as any;

      expect(result.name).toBe('Updated Rate');
      expect(result.price).toBe(60000000);
    });

    it('should throw RATE_NOT_FOUND for non-existent rate', async () => {
      rateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, 42, { name: 'X' }),
      ).rejects.toMatchObject({
        code: ErrorCode.RATE_NOT_FOUND,
      });
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete by setting isActive=false', async () => {
      const rate = createMockRate({ isActive: true });
      rateRepo.findOne.mockResolvedValue(rate);
      rateRepo.save.mockResolvedValue({ ...rate, isActive: false } as Rate);

      await service.remove(1, 42);

      expect(rateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw RATE_NOT_FOUND for non-existent rate', async () => {
      rateRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 42)).rejects.toMatchObject({
        code: ErrorCode.RATE_NOT_FOUND,
      });
    });
  });

  // ── calculate ──────────────────────────────────────────────────────────────

  describe('calculate', () => {
    const room = createMockRoom({ id: 1, propertyId: 42, basePrice: 50000000 });

    // Helper to set up room + rates for calculate tests
    function setupCalculate(rates: Rate[]) {
      roomRepo.findOne.mockResolvedValue(room);
      rateRepo.find.mockResolvedValue(rates);
    }

    // ── Base rate fallback ─────────────────────────────────────────────────

    it('should use base rate as fallback', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      setupCalculate([baseRate]);

      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-04');

      expect(result.nights).toBe(3);
      expect(result.total).toBe(150000000); // 50M * 3 nights
      expect(result.price_per_night).toBe(50000000);
      expect(result.rate_applied).toBe('Base Rate');
      expect(result.breakdown).toHaveLength(3);
      expect(result.breakdown[0]).toEqual({
        date: '2025-07-01',
        price: 50000000,
        rate_name: 'Base Rate',
      });
    });

    // ── Seasonal overrides base ────────────────────────────────────────────

    it('should apply seasonal rate over base rate', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      const seasonalRate = createMockRate({
        id: 2,
        name: 'Summer Season',
        type: 'seasonal',
        price: 70000000,
        dateFrom: '2025-06-01',
        dateTo: '2025-08-31',
        appliesToRooms: [],
      });

      setupCalculate([baseRate, seasonalRate]);

      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-04');

      expect(result.nights).toBe(3);
      expect(result.total).toBe(210000000); // 70M * 3 nights
      expect(result.rate_applied).toBe('Summer Season');

      for (const night of result.breakdown) {
        expect(night.rate_name).toBe('Summer Season');
        expect(night.price).toBe(70000000);
      }
    });

    // ── Weekend applies on Fri/Sat/Sun ─────────────────────────────────────

    it('should apply weekend rate on specified days of week', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      // Friday=5, Saturday=6
      const weekendRate = createMockRate({
        id: 2,
        name: 'Weekend Rate',
        type: 'weekend',
        price: 65000000,
        daysOfWeek: [5, 6, 0], // Fri, Sat, Sun
        appliesToRooms: [],
      });

      setupCalculate([baseRate, weekendRate]);

      // 2025-07-07 is Monday, 2025-07-14 is Monday (week span)
      const result = await service.calculate(42, 1, '2025-07-07', '2025-07-14');

      expect(result.nights).toBe(7);

      // Mon(7), Tue(8), Wed(9), Thu(10) = base; Fri(11), Sat(12), Sun(13) = weekend
      const weekdayNights = result.breakdown.filter(
        (n) => n.rate_name === 'Base Rate',
      );
      const weekendNights = result.breakdown.filter(
        (n) => n.rate_name === 'Weekend Rate',
      );

      expect(weekdayNights).toHaveLength(4);
      expect(weekendNights).toHaveLength(3);

      // Total: 4 * 50M + 3 * 65M = 200M + 195M = 395M
      expect(result.total).toBe(395000000);
    });

    // ── Long stay with min_stay ────────────────────────────────────────────

    it('should apply longstay rate when min_stay is met', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      const longstayRate = createMockRate({
        id: 3,
        name: 'Long Stay 7+',
        type: 'longstay',
        discountPercent: 20,
        price: null,
        minStay: 7,
        appliesToRooms: [],
      });

      setupCalculate([baseRate, longstayRate]);

      // 7 nights - should trigger longstay
      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-08');

      expect(result.nights).toBe(7);

      // Longstay has higher priority than base (4 vs 5)
      // discountPercent=20 on basePrice 50M => 40M per night
      const expectedNightPrice = Math.round(50000000 * (1 - 20 / 100)); // 40,000,000
      expect(result.total).toBe(expectedNightPrice * 7); // 280M
      expect(result.rate_applied).toBe('Long Stay 7+');

      for (const night of result.breakdown) {
        expect(night.price).toBe(expectedNightPrice);
        expect(night.rate_name).toBe('Long Stay 7+');
      }
    });

    it('should NOT apply longstay rate when min_stay is not met', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      const longstayRate = createMockRate({
        id: 3,
        name: 'Long Stay 7+',
        type: 'longstay',
        discountPercent: 20,
        price: null,
        minStay: 7,
        appliesToRooms: [],
      });

      setupCalculate([baseRate, longstayRate]);

      // 3 nights - should NOT trigger longstay
      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-04');

      expect(result.nights).toBe(3);
      expect(result.total).toBe(150000000); // Base: 50M * 3
      expect(result.rate_applied).toBe('Base Rate');
    });

    // ── Special has highest priority ───────────────────────────────────────

    it('should apply special rate with highest priority over all others', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      const seasonalRate = createMockRate({
        id: 2,
        name: 'Summer Season',
        type: 'seasonal',
        price: 70000000,
        dateFrom: '2025-06-01',
        dateTo: '2025-08-31',
        appliesToRooms: [],
      });

      const specialRate = createMockRate({
        id: 4,
        name: 'VIP Promo',
        type: 'special',
        price: 35000000,
        dateFrom: '2025-07-01',
        dateTo: '2025-07-10',
        appliesToRooms: [],
      });

      setupCalculate([baseRate, seasonalRate, specialRate]);

      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-04');

      expect(result.nights).toBe(3);
      expect(result.total).toBe(105000000); // 35M * 3
      expect(result.rate_applied).toBe('VIP Promo');

      for (const night of result.breakdown) {
        expect(night.rate_name).toBe('VIP Promo');
        expect(night.price).toBe(35000000);
      }
    });

    // ── Explicit rateId ignores priority ───────────────────────────────────

    it('should use explicit rateId and ignore priority system', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      const specialRate = createMockRate({
        id: 4,
        name: 'VIP Promo',
        type: 'special',
        price: 35000000,
        dateFrom: '2025-07-01',
        dateTo: '2025-07-10',
        appliesToRooms: [],
      });

      roomRepo.findOne.mockResolvedValue(room);
      // When rateId is provided, service uses findOne on rateRepo, not find
      rateRepo.findOne.mockResolvedValue(baseRate);

      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-04', 1);

      expect(result.nights).toBe(3);
      expect(result.total).toBe(150000000); // Base: 50M * 3 (NOT VIP Promo)
      expect(result.rate_applied).toBe('Base Rate');

      for (const night of result.breakdown) {
        expect(night.rate_name).toBe('Base Rate');
      }
    });

    // ── RATE_NOT_APPLICABLE when no base rate ──────────────────────────────

    it('should throw RATE_NOT_APPLICABLE when no rate matches', async () => {
      // No rates at all
      setupCalculate([]);

      await expect(
        service.calculate(42, 1, '2025-07-01', '2025-07-04'),
      ).rejects.toThrow(SardobaException);

      await expect(
        service.calculate(42, 1, '2025-07-01', '2025-07-04'),
      ).rejects.toMatchObject({
        code: ErrorCode.RATE_NOT_APPLICABLE,
      });
    });

    it('should throw RATE_NOT_APPLICABLE when room not in appliesToRooms', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [99, 100], // Not room 1
      });

      setupCalculate([baseRate]);

      await expect(
        service.calculate(42, 1, '2025-07-01', '2025-07-04'),
      ).rejects.toMatchObject({
        code: ErrorCode.RATE_NOT_APPLICABLE,
      });
    });

    // ── RATE_CONFLICT on overlapping seasonal rates ────────────────────────

    it('should detect RATE_CONFLICT on overlapping seasonal rates during create', async () => {
      const existingRate = createMockRate({
        id: 10,
        name: 'Summer 2025',
        type: 'seasonal',
        price: 70000000,
        dateFrom: '2025-06-01',
        dateTo: '2025-08-31',
        appliesToRooms: [1, 2],
      });

      const qb = createMockQueryBuilder({ getMany: [existingRate] });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      const dto = {
        name: 'Holiday Rate',
        type: 'seasonal' as const,
        property_id: 42,
        price: 80000000,
        date_from: '2025-07-15',
        date_to: '2025-09-15',
        applies_to_rooms: [1, 3], // Room 1 overlaps
      };

      await expect(service.create(42, dto)).rejects.toMatchObject({
        code: ErrorCode.RATE_CONFLICT,
      });
    });

    it('should NOT conflict when seasonal rates have disjoint rooms', async () => {
      const existingRate = createMockRate({
        id: 10,
        name: 'Summer 2025',
        type: 'seasonal',
        price: 70000000,
        dateFrom: '2025-06-01',
        dateTo: '2025-08-31',
        appliesToRooms: [1, 2],
      });

      const qb = createMockQueryBuilder({ getMany: [existingRate] });
      rateRepo.createQueryBuilder.mockReturnValue(qb);

      const dto = {
        name: 'Holiday Rate',
        type: 'seasonal' as const,
        property_id: 42,
        price: 80000000,
        date_from: '2025-07-15',
        date_to: '2025-09-15',
        applies_to_rooms: [3, 4], // No overlap with rooms [1, 2]
      };

      const created = createMockRate({
        id: 11,
        name: 'Holiday Rate',
        type: 'seasonal',
        price: 80000000,
        dateFrom: '2025-07-15',
        dateTo: '2025-09-15',
        appliesToRooms: [3, 4],
      });
      rateRepo.create.mockReturnValue(created);
      rateRepo.save.mockResolvedValue(created);

      const result = (await service.create(42, dto)) as any;
      expect(result.name).toBe('Holiday Rate');
    });

    // ── Mixed rates across a stay ──────────────────────────────────────────

    it('should mix seasonal and base rates across a stay spanning date boundaries', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      // Seasonal covers only 2025-07-01 to 2025-07-03
      const seasonalRate = createMockRate({
        id: 2,
        name: 'Short Season',
        type: 'seasonal',
        price: 70000000,
        dateFrom: '2025-07-01',
        dateTo: '2025-07-03', // Inclusive, so 07-01, 07-02, 07-03
        appliesToRooms: [],
      });

      setupCalculate([baseRate, seasonalRate]);

      // Stay: 2025-07-01 to 2025-07-06 (5 nights: 01, 02, 03, 04, 05)
      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-06');

      expect(result.nights).toBe(5);

      // Jul 1, 2, 3 = seasonal (70M); Jul 4, 5 = base (50M)
      const seasonalNights = result.breakdown.filter(
        (n) => n.rate_name === 'Short Season',
      );
      const baseNights = result.breakdown.filter(
        (n) => n.rate_name === 'Base Rate',
      );

      expect(seasonalNights).toHaveLength(3);
      expect(baseNights).toHaveLength(2);

      // Total: 3 * 70M + 2 * 50M = 210M + 100M = 310M
      expect(result.total).toBe(310000000);
      expect(result.rate_applied).toContain('Mixed');
    });

    // ── Discount percent calculation ───────────────────────────────────────

    it('should calculate price using discount_percent off room basePrice', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Discount Rate',
        type: 'base',
        price: null,
        discountPercent: 10,
        appliesToRooms: [],
      });

      setupCalculate([baseRate]);

      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-03');

      expect(result.nights).toBe(2);
      // 10% discount on 50M => 45M per night
      const expectedPrice = Math.round(50000000 * (1 - 10 / 100));
      expect(result.breakdown[0].price).toBe(expectedPrice);
      expect(result.total).toBe(expectedPrice * 2);
    });

    // ── INVALID_DATE_RANGE ─────────────────────────────────────────────────

    it('should throw INVALID_DATE_RANGE when checkIn >= checkOut', async () => {
      await expect(
        service.calculate(42, 1, '2025-07-05', '2025-07-01'),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE_RANGE,
      });
    });

    it('should throw INVALID_DATE_RANGE when checkIn equals checkOut', async () => {
      await expect(
        service.calculate(42, 1, '2025-07-01', '2025-07-01'),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE_RANGE,
      });
    });

    // ── RATE_NOT_FOUND for explicit rateId ─────────────────────────────────

    it('should throw RATE_NOT_FOUND when explicit rateId does not exist', async () => {
      roomRepo.findOne.mockResolvedValue(room);
      rateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculate(42, 1, '2025-07-01', '2025-07-04', 999),
      ).rejects.toMatchObject({
        code: ErrorCode.RATE_NOT_FOUND,
      });
    });

    // ── NOT_FOUND for room ─────────────────────────────────────────────────

    it('should throw NOT_FOUND when room does not exist', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculate(42, 999, '2025-07-01', '2025-07-04'),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    // ── appliesToRooms filtering ───────────────────────────────────────────

    it('should only apply rate when room is in appliesToRooms', async () => {
      const baseRateRoom1 = createMockRate({
        id: 1,
        name: 'Room 1 Base',
        type: 'base',
        price: 50000000,
        appliesToRooms: [1],
      });

      const baseRateRoom2 = createMockRate({
        id: 2,
        name: 'Room 2 Base',
        type: 'base',
        price: 40000000,
        appliesToRooms: [2],
      });

      setupCalculate([baseRateRoom1, baseRateRoom2]);

      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-03');

      expect(result.rate_applied).toBe('Room 1 Base');
      expect(result.breakdown[0].price).toBe(50000000);
    });

    // ── Special rate only within date range ────────────────────────────────

    it('should apply special rate only within its date range', async () => {
      const baseRate = createMockRate({
        id: 1,
        name: 'Base Rate',
        type: 'base',
        price: 50000000,
        appliesToRooms: [],
      });

      const specialRate = createMockRate({
        id: 4,
        name: 'Flash Sale',
        type: 'special',
        price: 30000000,
        dateFrom: '2025-07-02',
        dateTo: '2025-07-03', // Only Jul 2 and Jul 3
        appliesToRooms: [],
      });

      setupCalculate([baseRate, specialRate]);

      // Stay: Jul 1-5 (4 nights: 1, 2, 3, 4)
      const result = await service.calculate(42, 1, '2025-07-01', '2025-07-05');

      expect(result.nights).toBe(4);

      // Jul 1 = base (50M), Jul 2 = special (30M), Jul 3 = special (30M), Jul 4 = base (50M)
      expect(result.breakdown[0]).toMatchObject({
        date: '2025-07-01',
        price: 50000000,
        rate_name: 'Base Rate',
      });
      expect(result.breakdown[1]).toMatchObject({
        date: '2025-07-02',
        price: 30000000,
        rate_name: 'Flash Sale',
      });
      expect(result.breakdown[2]).toMatchObject({
        date: '2025-07-03',
        price: 30000000,
        rate_name: 'Flash Sale',
      });
      expect(result.breakdown[3]).toMatchObject({
        date: '2025-07-04',
        price: 50000000,
        rate_name: 'Base Rate',
      });

      expect(result.total).toBe(160000000); // 50 + 30 + 30 + 50 = 160M
    });
  });
});
