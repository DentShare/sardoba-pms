import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomsService } from './rooms.service';
import { Room } from '@/database/entities/room.entity';
import { RoomBlock } from '@/database/entities/room-block.entity';
import { Booking } from '@/database/entities/booking.entity';
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
    basePrice: 50000000,
    status: 'active',
    amenities: ['wifi', 'ac', 'tv'],
    descriptionRu: 'Просторный номер',
    descriptionUz: 'Keng xona',
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

function createMockBlock(overrides: Partial<RoomBlock> = {}): RoomBlock {
  return {
    id: 1,
    roomId: 1,
    dateFrom: '2025-06-01',
    dateTo: '2025-06-05',
    reason: 'Maintenance',
    createdBy: 10,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    room: {} as any,
    createdByUser: {} as any,
    ...overrides,
  } as RoomBlock;
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

describe('RoomsService', () => {
  let service: RoomsService;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let blockRepo: jest.Mocked<Repository<RoomBlock>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: getRepositoryToken(Room),
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
          provide: getRepositoryToken(RoomBlock),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomRepo = module.get(getRepositoryToken(Room));
    blockRepo = module.get(getRepositoryToken(RoomBlock));
    bookingRepo = module.get(getRepositoryToken(Booking));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated rooms', async () => {
      const rooms = [createMockRoom(), createMockRoom({ id: 2, name: 'Suite 201' })];
      const qb = createMockQueryBuilder({
        getManyAndCount: [rooms, 2],
      });
      roomRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, { page: 1, per_page: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
      expect(qb.where).toHaveBeenCalledWith(
        'room.propertyId = :propertyId',
        { propertyId: 42 },
      );
    });

    it('should apply room_type filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      roomRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { page: 1, per_page: 20, room_type: 'suite' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'room.roomType = :roomType',
        { roomType: 'suite' },
      );
    });

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      roomRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { page: 1, per_page: 20, status: 'maintenance' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'room.status = :status',
        { status: 'maintenance' },
      );
    });

    it('should apply floor filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      roomRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { page: 1, per_page: 20, floor: 3 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'room.floor = :floor',
        { floor: 3 },
      );
    });

    it('should calculate pagination correctly', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 50] });
      roomRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, { page: 3, per_page: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta.last_page).toBe(5); // ceil(50/10)
    });

    it('should return snake_case fields in response', async () => {
      const rooms = [createMockRoom()];
      const qb = createMockQueryBuilder({ getManyAndCount: [rooms, 1] });
      roomRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, {});

      const room = result.data[0] as any;
      expect(room).toHaveProperty('property_id');
      expect(room).toHaveProperty('room_type');
      expect(room).toHaveProperty('capacity_adults');
      expect(room).toHaveProperty('capacity_children');
      expect(room).toHaveProperty('base_price');
      expect(room).toHaveProperty('description_ru');
      expect(room).toHaveProperty('description_uz');
      expect(room).toHaveProperty('sort_order');
      expect(room).toHaveProperty('created_at');
      expect(room).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(room).not.toHaveProperty('propertyId');
      expect(room).not.toHaveProperty('roomType');
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a room with blocks', async () => {
      const room = createMockRoom({
        blocks: [createMockBlock()],
      });
      roomRepo.findOne.mockResolvedValue(room);

      const result = await service.findOne(1) as any;

      expect(result.id).toBe(1);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]).toHaveProperty('date_from');
      expect(roomRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['blocks'],
      });
    });

    it('should throw NOT_FOUND for non-existent room', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(SardobaException);
      await expect(service.findOne(999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a room with all fields', async () => {
      const dto = {
        name: 'Deluxe 101',
        room_type: 'double' as const,
        floor: 2,
        capacity_adults: 2,
        capacity_children: 1,
        base_price: 50000000,
        amenities: ['wifi', 'ac'] as any[],
        description_ru: 'Просторный номер',
        description_uz: 'Keng xona',
        sort_order: 0,
      };

      const createdEntity = createMockRoom();
      roomRepo.create.mockReturnValue(createdEntity);
      roomRepo.save.mockResolvedValue(createdEntity);

      const result = await service.create(42, dto) as any;

      expect(roomRepo.create).toHaveBeenCalledWith({
        propertyId: 42,
        name: 'Deluxe 101',
        roomType: 'double',
        floor: 2,
        capacityAdults: 2,
        capacityChildren: 1,
        basePrice: 50000000,
        amenities: ['wifi', 'ac'],
        descriptionRu: 'Просторный номер',
        descriptionUz: 'Keng xona',
        sortOrder: 0,
        status: 'active',
        photos: [],
      });
      expect(result).toHaveProperty('id');
      expect(result.property_id).toBe(42);
    });

    it('should set defaults for optional fields', async () => {
      const dto = {
        name: 'Simple Room',
        room_type: 'single' as const,
        capacity_adults: 1,
        base_price: 30000000,
      };

      const createdEntity = createMockRoom({
        name: 'Simple Room',
        roomType: 'single',
        capacityAdults: 1,
        capacityChildren: 0,
        basePrice: 30000000,
        amenities: [],
        descriptionRu: null,
        descriptionUz: null,
        floor: null,
        sortOrder: 0,
      });
      roomRepo.create.mockReturnValue(createdEntity);
      roomRepo.save.mockResolvedValue(createdEntity);

      await service.create(42, dto);

      expect(roomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          capacityChildren: 0,
          amenities: [],
          descriptionRu: null,
          descriptionUz: null,
          floor: null,
          sortOrder: 0,
        }),
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update specified fields', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomRepo.save.mockResolvedValue({
        ...room,
        name: 'Updated Room',
        basePrice: 60000000,
      } as Room);

      const result = await service.update(1, {
        name: 'Updated Room',
        base_price: 60000000,
      }) as any;

      expect(result.name).toBe('Updated Room');
      expect(result.base_price).toBe(60000000);
    });

    it('should not overwrite fields not in the DTO', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomRepo.save.mockImplementation(async (entity) => entity as Room);

      await service.update(1, { name: 'New Name' });

      // The save should have been called with the original values
      // except the changed name
      expect(roomRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          roomType: 'double', // unchanged
          basePrice: 50000000, // unchanged
        }),
      );
    });

    it('should throw NOT_FOUND for non-existent room', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'X' })).rejects.toThrow(
        SardobaException,
      );
      await expect(service.update(999, { name: 'X' })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should allow changing status', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomRepo.save.mockImplementation(async (entity) => entity as Room);

      await service.update(1, { status: 'maintenance' });

      expect(roomRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'maintenance' }),
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete room with no active bookings', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      bookingRepo.count.mockResolvedValue(0);
      roomRepo.remove.mockResolvedValue(room);

      await service.remove(1);

      expect(roomRepo.remove).toHaveBeenCalledWith(room);
    });

    it('should throw VALIDATION_ERROR if room has active bookings', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      bookingRepo.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(SardobaException);
      await expect(service.remove(1)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      });
      expect(roomRepo.remove).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for non-existent room', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(SardobaException);
      await expect(service.remove(999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── checkAvailability ─────────────────────────────────────────────────

  describe('checkAvailability', () => {
    it('should return available=true when no blocks or bookings', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      const blockQb = createMockQueryBuilder({ getMany: [] });
      blockRepo.createQueryBuilder.mockReturnValue(blockQb);

      const bookingQb = createMockQueryBuilder({ getMany: [] });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const result = await service.checkAvailability(1, '2025-06-01', '2025-06-10');

      expect(result.available).toBe(true);
      expect(result.blocked_dates).toEqual([]);
      expect(result.booked_dates).toEqual([]);
    });

    it('should return available=false when blocks exist', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      const blockQb = createMockQueryBuilder({
        getMany: [
          createMockBlock({ dateFrom: '2025-06-03', dateTo: '2025-06-05' }),
        ],
      });
      blockRepo.createQueryBuilder.mockReturnValue(blockQb);

      const bookingQb = createMockQueryBuilder({ getMany: [] });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const result = await service.checkAvailability(1, '2025-06-01', '2025-06-10');

      expect(result.available).toBe(false);
      expect(result.blocked_dates).toContain('2025-06-03');
      expect(result.blocked_dates).toContain('2025-06-04');
      expect(result.blocked_dates).not.toContain('2025-06-05'); // dateTo is exclusive
    });

    it('should return available=false when bookings exist', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      const blockQb = createMockQueryBuilder({ getMany: [] });
      blockRepo.createQueryBuilder.mockReturnValue(blockQb);

      const bookingQb = createMockQueryBuilder({
        getMany: [
          {
            checkIn: '2025-06-02',
            checkOut: '2025-06-04',
          },
        ],
      });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const result = await service.checkAvailability(1, '2025-06-01', '2025-06-10');

      expect(result.available).toBe(false);
      expect(result.booked_dates).toContain('2025-06-02');
      expect(result.booked_dates).toContain('2025-06-03');
    });

    it('should throw INVALID_DATE_RANGE when from >= to', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      await expect(
        service.checkAvailability(1, '2025-06-10', '2025-06-01'),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.checkAvailability(1, '2025-06-10', '2025-06-01'),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE_RANGE,
      });
    });

    it('should throw NOT_FOUND for non-existent room', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkAvailability(999, '2025-06-01', '2025-06-10'),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── createBlock ───────────────────────────────────────────────────────

  describe('createBlock', () => {
    it('should create a block successfully', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      const blockQb = createMockQueryBuilder({ getOne: null });
      blockRepo.createQueryBuilder.mockReturnValue(blockQb);

      const savedBlock = createMockBlock();
      blockRepo.create.mockReturnValue(savedBlock);
      blockRepo.save.mockResolvedValue(savedBlock);

      const result = await service.createBlock(
        1,
        { date_from: '2025-06-01', date_to: '2025-06-05', reason: 'Maintenance' },
        10,
      ) as any;

      expect(result.id).toBe(1);
      expect(result.date_from).toBe('2025-06-01');
      expect(result.date_to).toBe('2025-06-05');
      expect(result.reason).toBe('Maintenance');
      expect(result.created_by).toBe(10);
    });

    it('should throw ROOM_NOT_AVAILABLE when overlapping block exists', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      const existingBlock = createMockBlock({
        dateFrom: '2025-06-03',
        dateTo: '2025-06-08',
      });
      const blockQb = createMockQueryBuilder({ getOne: existingBlock });
      blockRepo.createQueryBuilder.mockReturnValue(blockQb);

      await expect(
        service.createBlock(
          1,
          { date_from: '2025-06-01', date_to: '2025-06-05' },
          10,
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.ROOM_NOT_AVAILABLE,
      });
    });

    it('should throw INVALID_DATE_RANGE when date_from >= date_to', async () => {
      roomRepo.findOne.mockResolvedValue(createMockRoom());

      await expect(
        service.createBlock(
          1,
          { date_from: '2025-06-10', date_to: '2025-06-05' },
          10,
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE_RANGE,
      });
    });

    it('should throw NOT_FOUND for non-existent room', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createBlock(
          999,
          { date_from: '2025-06-01', date_to: '2025-06-05' },
          10,
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── removeBlock ───────────────────────────────────────────────────────

  describe('removeBlock', () => {
    it('should remove a block successfully', async () => {
      const block = createMockBlock();
      blockRepo.findOne.mockResolvedValue(block);
      blockRepo.remove.mockResolvedValue(block);

      await service.removeBlock(1, 1);

      expect(blockRepo.remove).toHaveBeenCalledWith(block);
    });

    it('should throw NOT_FOUND when block does not exist', async () => {
      blockRepo.findOne.mockResolvedValue(null);

      await expect(service.removeBlock(1, 999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should match both roomId and blockId', async () => {
      blockRepo.findOne.mockResolvedValue(null);

      await expect(service.removeBlock(1, 5)).rejects.toThrow(SardobaException);

      expect(blockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, roomId: 1 },
      });
    });
  });

  // ── verifyRoomProperty ────────────────────────────────────────────────

  describe('verifyRoomProperty', () => {
    it('should return room when property matches', async () => {
      const room = createMockRoom({ propertyId: 42 });
      roomRepo.findOne.mockResolvedValue(room);

      const result = await service.verifyRoomProperty(1, 42);

      expect(result).toBe(room);
    });

    it('should throw NOT_FOUND when room does not exist', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyRoomProperty(999, 42)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw FORBIDDEN when property does not match', async () => {
      const room = createMockRoom({ propertyId: 42 });
      roomRepo.findOne.mockResolvedValue(room);

      await expect(service.verifyRoomProperty(1, 99)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });
  });
});
