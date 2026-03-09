import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupBookingsService } from './group-bookings.service';
import { GroupBooking, GroupBookingStatus } from '@/database/entities/group-booking.entity';
import { GroupBookingRoom, GroupBookingRoomStatus } from '@/database/entities/group-booking-room.entity';
import { Agency } from '@/database/entities/agency.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockAgency(overrides: Partial<Agency> = {}): Agency {
  return {
    id: 1,
    propertyId: 42,
    name: 'Uzbekistan Travel',
    contactPerson: 'Alisher Karimov',
    phone: '+998901234567',
    email: 'info@uztravel.com',
    commission: 10,
    notes: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    property: {} as any,
    groups: [],
    ...overrides,
  } as Agency;
}

function createMockRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 5,
    propertyId: 42,
    name: 'Deluxe 101',
    roomType: 'double',
    floor: 2,
    capacityAdults: 2,
    capacityChildren: 1,
    basePrice: 50000000,
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

function createMockGroupBookingRoom(
  overrides: Partial<GroupBookingRoom> = {},
): GroupBookingRoom {
  return {
    id: 1,
    groupBookingId: 1,
    roomId: 5,
    bookingId: null,
    guestName: 'Ivan Ivanov',
    guestPhone: '+998901234567',
    guestPassport: 'AA1234567',
    status: 'pending' as GroupBookingRoomStatus,
    pricePerNight: 50000000,
    createdAt: new Date('2025-01-01'),
    group: {} as any,
    room: createMockRoom(),
    booking: null,
    ...overrides,
  } as GroupBookingRoom;
}

function createMockGroupBooking(
  overrides: Partial<GroupBooking> = {},
): GroupBooking {
  return {
    id: 1,
    propertyId: 42,
    groupName: 'Tourist group from Moscow',
    groupNumber: 'GRP-260315-001',
    agencyId: 1,
    contactPerson: 'Ivan Petrov',
    contactPhone: '+998901234567',
    contactEmail: 'group@example.com',
    checkIn: '2026-03-15',
    checkOut: '2026-03-20',
    roomsCount: 2,
    guestsCount: 2,
    totalAmount: 500000000,
    paidAmount: 0,
    status: 'tentative' as GroupBookingStatus,
    notes: null,
    createdBy: 1,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    property: {} as any,
    agency: createMockAgency(),
    rooms: [
      createMockGroupBookingRoom({ id: 1, roomId: 5 }),
      createMockGroupBookingRoom({ id: 2, roomId: 6 }),
    ],
    ...overrides,
  } as GroupBooking;
}

// ── Mock QueryBuilder ───────────────────────────────────────────────────────

function createMockQueryBuilder(returnValue: {
  getMany?: any[];
  getManyAndCount?: [any[], number];
  getOne?: any;
  getCount?: number;
  getRawMany?: any[];
}) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnValue.getMany ?? []),
    getManyAndCount: jest.fn().mockResolvedValue(
      returnValue.getManyAndCount ?? [[], 0],
    ),
    getOne: jest.fn().mockResolvedValue(returnValue.getOne ?? null),
    getCount: jest.fn().mockResolvedValue(returnValue.getCount ?? 0),
    getRawMany: jest.fn().mockResolvedValue(returnValue.getRawMany ?? []),
  };
  return qb;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('GroupBookingsService', () => {
  let service: GroupBookingsService;
  let groupRepo: jest.Mocked<Repository<GroupBooking>>;
  let groupRoomRepo: jest.Mocked<Repository<GroupBookingRoom>>;
  let agencyRepo: jest.Mocked<Repository<Agency>>;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupBookingsService,
        {
          provide: getRepositoryToken(GroupBooking),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => data),
            save: jest.fn().mockImplementation(async (data: any) => ({
              id: 1,
              ...data,
            })),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GroupBookingRoom),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => data),
            save: jest.fn().mockImplementation(async (data: any) => data),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Agency),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => data),
            save: jest.fn().mockImplementation(async (data: any) => ({
              id: 1,
              createdAt: new Date('2025-01-01'),
              updatedAt: new Date('2025-01-01'),
              ...data,
            })),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GroupBookingsService>(GroupBookingsService);
    groupRepo = module.get(getRepositoryToken(GroupBooking));
    groupRoomRepo = module.get(getRepositoryToken(GroupBookingRoom));
    agencyRepo = module.get(getRepositoryToken(Agency));
    roomRepo = module.get(getRepositoryToken(Room));
    bookingRepo = module.get(getRepositoryToken(Booking));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findAllGroups
  // ══════════════════════════════════════════════════════════════════════════

  describe('findAllGroups', () => {
    it('should return paginated groups with default pagination', async () => {
      const groups = [createMockGroupBooking()];
      const qb = createMockQueryBuilder({
        getManyAndCount: [groups, 1],
      });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllGroups(42, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
    });

    it('should apply custom pagination', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, { page: 2, per_page: 10 });

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should calculate last_page correctly', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 25] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllGroups(42, { per_page: 10 });

      expect(result.meta.last_page).toBe(3);
    });

    it('should return last_page=1 when total is 0', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllGroups(42, {});

      expect(result.meta.last_page).toBe(1);
    });

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, { status: 'confirmed' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'g.status = :status',
        { status: 'confirmed' },
      );
    });

    it('should filter by agency_id', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, { agency_id: 5 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'g.agencyId = :agencyId',
        { agencyId: 5 },
      );
    });

    it('should filter by search term (group name / number)', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, { search: 'Moscow' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(g.groupName ILIKE :search OR g.groupNumber ILIKE :search)',
        { search: '%Moscow%' },
      );
    });

    it('should filter by date_from', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, { date_from: '2026-03-01' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'g.checkOut >= :dateFrom',
        { dateFrom: '2026-03-01' },
      );
    });

    it('should filter by date_to', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, { date_to: '2026-03-31' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'g.checkIn <= :dateTo',
        { dateTo: '2026-03-31' },
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, {
        status: 'tentative',
        agency_id: 1,
        search: 'test',
        date_from: '2026-03-01',
        date_to: '2026-03-31',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(5);
    });

    it('should order results by check_in descending', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllGroups(42, {});

      expect(qb.orderBy).toHaveBeenCalledWith('g.checkIn', 'DESC');
    });

    it('should return snake_case fields in response', async () => {
      const groups = [createMockGroupBooking()];
      const qb = createMockQueryBuilder({ getManyAndCount: [groups, 1] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllGroups(42, {});
      const group = result.data[0] as any;

      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('property_id');
      expect(group).toHaveProperty('group_name');
      expect(group).toHaveProperty('group_number');
      expect(group).toHaveProperty('agency_id');
      expect(group).toHaveProperty('contact_person');
      expect(group).toHaveProperty('contact_phone');
      expect(group).toHaveProperty('contact_email');
      expect(group).toHaveProperty('check_in');
      expect(group).toHaveProperty('check_out');
      expect(group).toHaveProperty('rooms_count');
      expect(group).toHaveProperty('guests_count');
      expect(group).toHaveProperty('total_amount');
      expect(group).toHaveProperty('paid_amount');
      expect(group).toHaveProperty('status');
      expect(group).toHaveProperty('created_by');
      expect(group).toHaveProperty('created_at');
      expect(group).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(group).not.toHaveProperty('propertyId');
      expect(group).not.toHaveProperty('groupName');
      expect(group).not.toHaveProperty('groupNumber');
    });

    it('should include agency response when agency relation is loaded', async () => {
      const groups = [createMockGroupBooking()];
      const qb = createMockQueryBuilder({ getManyAndCount: [groups, 1] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllGroups(42, {});
      const group = result.data[0] as any;

      expect(group.agency).toBeDefined();
      expect(group.agency).toHaveProperty('id');
      expect(group.agency).toHaveProperty('name');
      expect(group.agency).toHaveProperty('commission');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findOneGroup
  // ══════════════════════════════════════════════════════════════════════════

  describe('findOneGroup', () => {
    it('should return a group with full details including relations', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      const result = (await service.findOneGroup(1)) as any;

      expect(result.id).toBe(1);
      expect(result.group_name).toBe('Tourist group from Moscow');
      expect(result.agency).toBeDefined();
      expect(result.rooms).toBeDefined();
      expect(result.rooms).toHaveLength(2);
      expect(groupRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['agency', 'rooms', 'rooms.room'],
      });
    });

    it('should return room details in snake_case', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      const result = (await service.findOneGroup(1)) as any;
      const room = result.rooms[0];

      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('group_booking_id');
      expect(room).toHaveProperty('room_id');
      expect(room).toHaveProperty('booking_id');
      expect(room).toHaveProperty('guest_name');
      expect(room).toHaveProperty('guest_phone');
      expect(room).toHaveProperty('guest_passport');
      expect(room).toHaveProperty('status');
      expect(room).toHaveProperty('price_per_night');
      expect(room).toHaveProperty('created_at');
    });

    it('should include nested room info when room relation is loaded', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      const result = (await service.findOneGroup(1)) as any;
      const roomDetail = result.rooms[0].room;

      expect(roomDetail).toBeDefined();
      expect(roomDetail).toHaveProperty('id');
      expect(roomDetail).toHaveProperty('name');
      expect(roomDetail).toHaveProperty('room_type');
    });

    it('should throw NOT_FOUND for non-existent group', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneGroup(999)).rejects.toThrow(SardobaException);
      await expect(service.findOneGroup(999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // createGroup
  // ══════════════════════════════════════════════════════════════════════════

  describe('createGroup', () => {
    const createDto = {
      group_name: 'Tourist group from Moscow',
      agency_id: 1,
      contact_person: 'Ivan Petrov',
      contact_phone: '+998901234567',
      contact_email: 'group@example.com',
      check_in: '2026-03-15',
      check_out: '2026-03-20',
      notes: 'Breakfast included',
      rooms: [
        {
          room_id: 5,
          guest_name: 'Ivan Ivanov',
          guest_phone: '+998901111111',
          guest_passport: 'AA1234567',
          price_per_night: 50000000,
        },
        {
          room_id: 6,
          guest_name: 'Petr Petrov',
          guest_phone: '+998902222222',
          guest_passport: 'BB7654321',
          price_per_night: 60000000,
        },
      ],
    };

    it('should create a group booking successfully', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const rooms = [
        createMockRoom({ id: 5 }),
        createMockRoom({ id: 6 }),
      ];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      // Mock generateGroupNumber
      const numberQb = createMockQueryBuilder({ getOne: null });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      // The saved group returned
      const savedGroup = createMockGroupBooking({ id: 10 });
      groupRepo.save.mockResolvedValue(savedGroup);

      // findOneGroup call at end
      groupRepo.findOne.mockResolvedValue(savedGroup);

      const result = await service.createGroup(42, createDto, 1);

      expect(result).toBeDefined();
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          groupName: 'Tourist group from Moscow',
          agencyId: 1,
          contactPerson: 'Ivan Petrov',
          contactPhone: '+998901234567',
          contactEmail: 'group@example.com',
          checkIn: '2026-03-15',
          checkOut: '2026-03-20',
          roomsCount: 2,
          guestsCount: 2,
          status: 'tentative',
          notes: 'Breakfast included',
          createdBy: 1,
          paidAmount: 0,
        }),
      );
    });

    it('should calculate totalAmount correctly (sum of price_per_night * nights)', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const rooms = [createMockRoom({ id: 5 }), createMockRoom({ id: 6 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      const numberQb = createMockQueryBuilder({ getOne: null });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      const savedGroup = createMockGroupBooking({ id: 10 });
      groupRepo.save.mockResolvedValue(savedGroup);
      groupRepo.findOne.mockResolvedValue(savedGroup);

      await service.createGroup(42, createDto, 1);

      // 5 nights * (50000000 + 60000000) = 550000000
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 550000000,
        }),
      );
    });

    it('should create group rooms for each room in the DTO', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const rooms = [createMockRoom({ id: 5 }), createMockRoom({ id: 6 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      const numberQb = createMockQueryBuilder({ getOne: null });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      const savedGroup = createMockGroupBooking({ id: 10 });
      groupRepo.save.mockResolvedValue(savedGroup);
      groupRepo.findOne.mockResolvedValue(savedGroup);

      await service.createGroup(42, createDto, 1);

      expect(groupRoomRepo.create).toHaveBeenCalledTimes(2);
      expect(groupRoomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBookingId: 10,
          roomId: 5,
          guestName: 'Ivan Ivanov',
          guestPhone: '+998901111111',
          guestPassport: 'AA1234567',
          pricePerNight: 50000000,
          status: 'pending',
        }),
      );
      expect(groupRoomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBookingId: 10,
          roomId: 6,
          guestName: 'Petr Petrov',
          guestPhone: '+998902222222',
          guestPassport: 'BB7654321',
          pricePerNight: 60000000,
          status: 'pending',
        }),
      );
      expect(groupRoomRepo.save).toHaveBeenCalled();
    });

    it('should throw INVALID_DATE_RANGE when check_in >= check_out', async () => {
      const invalidDto = {
        ...createDto,
        check_in: '2026-03-20',
        check_out: '2026-03-15',
      };

      await expect(
        service.createGroup(42, invalidDto, 1),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.createGroup(42, invalidDto, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE_RANGE,
      });
    });

    it('should throw INVALID_DATE_RANGE when check_in equals check_out', async () => {
      const invalidDto = {
        ...createDto,
        check_in: '2026-03-15',
        check_out: '2026-03-15',
      };

      await expect(
        service.createGroup(42, invalidDto, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_DATE_RANGE,
      });
    });

    it('should throw NOT_FOUND when agency does not exist', async () => {
      agencyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createGroup(42, createDto, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw NOT_FOUND when agency is inactive', async () => {
      // findOne with isActive: true will return null for inactive agency
      agencyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createGroup(42, createDto, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw NOT_FOUND when one or more rooms do not exist', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      // Only return one room when two are requested
      const rooms = [createMockRoom({ id: 5 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      await expect(
        service.createGroup(42, createDto, 1),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.createGroup(42, createDto, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should skip agency validation when agency_id is not provided', async () => {
      const dtoWithoutAgency = {
        ...createDto,
        agency_id: undefined,
      };

      const rooms = [createMockRoom({ id: 5 }), createMockRoom({ id: 6 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      const numberQb = createMockQueryBuilder({ getOne: null });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      const savedGroup = createMockGroupBooking({ id: 10, agencyId: null, agency: null });
      groupRepo.save.mockResolvedValue(savedGroup);
      groupRepo.findOne.mockResolvedValue(savedGroup);

      await service.createGroup(42, dtoWithoutAgency, 1);

      expect(agencyRepo.findOne).not.toHaveBeenCalled();
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId: null,
        }),
      );
    });

    it('should generate group number with correct format', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const rooms = [createMockRoom({ id: 5 }), createMockRoom({ id: 6 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      // No existing group with today's prefix
      const numberQb = createMockQueryBuilder({ getOne: null });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      const savedGroup = createMockGroupBooking({ id: 10 });
      groupRepo.save.mockResolvedValue(savedGroup);
      groupRepo.findOne.mockResolvedValue(savedGroup);

      await service.createGroup(42, createDto, 1);

      // Verify create was called with a groupNumber matching the pattern GRP-YYMMDD-NNN
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupNumber: expect.stringMatching(/^GRP-\d{6}-\d{3}$/),
        }),
      );
    });

    it('should increment group number sequence when previous groups exist', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const rooms = [createMockRoom({ id: 5 }), createMockRoom({ id: 6 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      // Return existing group with today's prefix
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const existingNumber = `GRP-${yy}${mm}${dd}-003`;
      const existingGroup = createMockGroupBooking({
        groupNumber: existingNumber,
      });
      const numberQb = createMockQueryBuilder({ getOne: existingGroup });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      const savedGroup = createMockGroupBooking({ id: 10 });
      groupRepo.save.mockResolvedValue(savedGroup);
      groupRepo.findOne.mockResolvedValue(savedGroup);

      await service.createGroup(42, createDto, 1);

      const expectedNumber = `GRP-${yy}${mm}${dd}-004`;
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupNumber: expectedNumber,
        }),
      );
    });

    it('should set optional contact fields to null when not provided', async () => {
      const minimalDto = {
        group_name: 'Minimal group',
        check_in: '2026-03-15',
        check_out: '2026-03-20',
        rooms: [
          { room_id: 5, price_per_night: 50000000 },
        ],
      };

      const rooms = [createMockRoom({ id: 5 })];
      const roomQb = createMockQueryBuilder({ getMany: rooms });
      roomRepo.createQueryBuilder.mockReturnValue(roomQb);

      const numberQb = createMockQueryBuilder({ getOne: null });
      groupRepo.createQueryBuilder.mockReturnValue(numberQb);

      const savedGroup = createMockGroupBooking({ id: 10 });
      groupRepo.save.mockResolvedValue(savedGroup);
      groupRepo.findOne.mockResolvedValue(savedGroup);

      await service.createGroup(42, minimalDto, 1);

      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId: null,
          contactPerson: null,
          contactPhone: null,
          contactEmail: null,
          notes: null,
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // updateGroup
  // ══════════════════════════════════════════════════════════════════════════

  describe('updateGroup', () => {
    it('should update group name', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      await service.updateGroup(1, { group_name: 'Updated name' });

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ groupName: 'Updated name' }),
      );
    });

    it('should update multiple fields at once', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      await service.updateGroup(1, {
        group_name: 'Updated name',
        contact_person: 'New Person',
        contact_phone: '+998909999999',
        contact_email: 'new@example.com',
        notes: 'New notes',
        status: 'confirmed',
      });

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          groupName: 'Updated name',
          contactPerson: 'New Person',
          contactPhone: '+998909999999',
          contactEmail: 'new@example.com',
          notes: 'New notes',
          status: 'confirmed',
        }),
      );
    });

    it('should update agency_id', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      await service.updateGroup(1, { agency_id: 5 });

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: 5 }),
      );
    });

    it('should update check_in and check_out dates', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      await service.updateGroup(1, {
        check_in: '2026-04-01',
        check_out: '2026-04-10',
      });

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          checkIn: '2026-04-01',
          checkOut: '2026-04-10',
        }),
      );
    });

    it('should not update fields that are not in the DTO', async () => {
      const group = createMockGroupBooking();
      groupRepo.findOne.mockResolvedValue(group);

      await service.updateGroup(1, { group_name: 'Only this changes' });

      // The original values should remain intact
      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contactPerson: 'Ivan Petrov',
          contactPhone: '+998901234567',
        }),
      );
    });

    it('should throw NOT_FOUND for non-existent group', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateGroup(999, { group_name: 'test' }),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.updateGroup(999, { group_name: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should call findOneGroup to return updated group with relations', async () => {
      const group = createMockGroupBooking();
      // First findOne is for finding the group, second is for findOneGroup
      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      const result = await service.updateGroup(1, { group_name: 'Updated' });

      expect(result).toBeDefined();
      // findOne is called twice: once in updateGroup, once in findOneGroup
      expect(groupRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // confirmGroup
  // ══════════════════════════════════════════════════════════════════════════

  describe('confirmGroup', () => {
    it('should confirm a tentative group and update all pending rooms', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'pending' }),
        createMockGroupBookingRoom({ id: 2, status: 'pending' }),
      ];
      const group = createMockGroupBooking({ status: 'tentative', rooms });

      // First findOne for confirmGroup, second for findOneGroup
      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.confirmGroup(1, 1);

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' }),
      );
      expect(groupRoomRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'confirmed' }),
          expect.objectContaining({ status: 'confirmed' }),
        ]),
      );
    });

    it('should only update pending rooms, not rooms with other statuses', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'pending' }),
        createMockGroupBookingRoom({ id: 2, status: 'cancelled' }),
      ];
      const group = createMockGroupBooking({ status: 'tentative', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.confirmGroup(1, 1);

      // The cancelled room should remain cancelled
      const savedRooms = (groupRoomRepo.save as jest.Mock).mock.calls[0][0];
      const cancelledRoom = savedRooms.find((r: any) => r.id === 2);
      expect(cancelledRoom.status).toBe('cancelled');

      const pendingRoom = savedRooms.find((r: any) => r.id === 1);
      expect(pendingRoom.status).toBe('confirmed');
    });

    it('should throw GROUP_INVALID_STATUS when group is not tentative', async () => {
      const group = createMockGroupBooking({ status: 'confirmed' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.confirmGroup(1, 1),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.confirmGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw GROUP_INVALID_STATUS when group is checked_in', async () => {
      const group = createMockGroupBooking({ status: 'checked_in' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.confirmGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw GROUP_INVALID_STATUS when group is cancelled', async () => {
      const group = createMockGroupBooking({ status: 'cancelled' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.confirmGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw NOT_FOUND for non-existent group', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.confirmGroup(999, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // checkInGroup
  // ══════════════════════════════════════════════════════════════════════════

  describe('checkInGroup', () => {
    it('should check in a confirmed group and update rooms to checked_in', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'confirmed' }),
        createMockGroupBookingRoom({ id: 2, status: 'confirmed' }),
      ];
      const group = createMockGroupBooking({ status: 'confirmed', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.checkInGroup(1, 1);

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'checked_in' }),
      );
      expect(groupRoomRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'checked_in' }),
          expect.objectContaining({ status: 'checked_in' }),
        ]),
      );
    });

    it('should update both confirmed and pending rooms to checked_in', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'confirmed' }),
        createMockGroupBookingRoom({ id: 2, status: 'pending' }),
      ];
      const group = createMockGroupBooking({ status: 'confirmed', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.checkInGroup(1, 1);

      const savedRooms = (groupRoomRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRooms[0].status).toBe('checked_in');
      expect(savedRooms[1].status).toBe('checked_in');
    });

    it('should not change rooms that are already cancelled', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'confirmed' }),
        createMockGroupBookingRoom({ id: 2, status: 'cancelled' }),
      ];
      const group = createMockGroupBooking({ status: 'confirmed', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.checkInGroup(1, 1);

      const savedRooms = (groupRoomRepo.save as jest.Mock).mock.calls[0][0];
      const cancelledRoom = savedRooms.find((r: any) => r.id === 2);
      expect(cancelledRoom.status).toBe('cancelled');
    });

    it('should throw GROUP_INVALID_STATUS when group is not confirmed', async () => {
      const group = createMockGroupBooking({ status: 'tentative' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.checkInGroup(1, 1),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.checkInGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw GROUP_INVALID_STATUS when group is already checked_in', async () => {
      const group = createMockGroupBooking({ status: 'checked_in' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.checkInGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw GROUP_INVALID_STATUS when group is cancelled', async () => {
      const group = createMockGroupBooking({ status: 'cancelled' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.checkInGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw NOT_FOUND for non-existent group', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkInGroup(999, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // cancelGroup
  // ══════════════════════════════════════════════════════════════════════════

  describe('cancelGroup', () => {
    it('should cancel a tentative group and all rooms', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'pending' }),
        createMockGroupBookingRoom({ id: 2, status: 'pending' }),
      ];
      const group = createMockGroupBooking({ status: 'tentative', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.cancelGroup(1, 1);

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(groupRoomRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'cancelled' }),
          expect.objectContaining({ status: 'cancelled' }),
        ]),
      );
    });

    it('should cancel a confirmed group', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'confirmed' }),
      ];
      const group = createMockGroupBooking({ status: 'confirmed', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.cancelGroup(1, 1);

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('should not change rooms that are already checked_out', async () => {
      const rooms = [
        createMockGroupBookingRoom({ id: 1, status: 'confirmed' }),
        createMockGroupBookingRoom({ id: 2, status: 'checked_out' }),
      ];
      const group = createMockGroupBooking({ status: 'confirmed', rooms });

      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await service.cancelGroup(1, 1);

      const savedRooms = (groupRoomRepo.save as jest.Mock).mock.calls[0][0];
      const checkedOutRoom = savedRooms.find((r: any) => r.id === 2);
      expect(checkedOutRoom.status).toBe('checked_out');

      const confirmedRoom = savedRooms.find((r: any) => r.id === 1);
      expect(confirmedRoom.status).toBe('cancelled');
    });

    it('should throw GROUP_INVALID_STATUS when group is checked_in', async () => {
      const group = createMockGroupBooking({ status: 'checked_in' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.cancelGroup(1, 1),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.cancelGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw GROUP_INVALID_STATUS when group is checked_out', async () => {
      const group = createMockGroupBooking({ status: 'checked_out' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.cancelGroup(1, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should throw NOT_FOUND for non-existent group', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelGroup(999, 1),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // getGroupStats
  // ══════════════════════════════════════════════════════════════════════════

  describe('getGroupStats', () => {
    it('should return stats grouped by status', async () => {
      const rawStats = [
        { status: 'tentative', count: 5, total_amount: '250000000' },
        { status: 'confirmed', count: 3, total_amount: '150000000' },
        { status: 'checked_in', count: 2, total_amount: '100000000' },
      ];

      const qb = createMockQueryBuilder({ getRawMany: rawStats });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getGroupStats(42);

      expect(result.by_status).toEqual({
        tentative: { count: 5, total_amount: 250000000 },
        confirmed: { count: 3, total_amount: 150000000 },
        checked_in: { count: 2, total_amount: 100000000 },
      });
      expect(result.total_groups).toBe(10);
      expect(result.total_revenue).toBe(500000000);
    });

    it('should return empty stats when no groups exist', async () => {
      const qb = createMockQueryBuilder({ getRawMany: [] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getGroupStats(42);

      expect(result.by_status).toEqual({});
      expect(result.total_groups).toBe(0);
      expect(result.total_revenue).toBe(0);
    });

    it('should filter by propertyId', async () => {
      const qb = createMockQueryBuilder({ getRawMany: [] });
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getGroupStats(42);

      expect(qb.where).toHaveBeenCalledWith(
        'g.propertyId = :propertyId',
        { propertyId: 42 },
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Agency CRUD
  // ══════════════════════════════════════════════════════════════════════════

  describe('findAllAgencies', () => {
    it('should return all active agencies for a property', async () => {
      const agencies = [
        createMockAgency({ id: 1, name: 'Agency A' }),
        createMockAgency({ id: 2, name: 'Agency B' }),
      ];
      agencyRepo.find.mockResolvedValue(agencies);

      const result = await service.findAllAgencies(42);

      expect(result).toHaveLength(2);
      expect(agencyRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 42, isActive: true },
        order: { name: 'ASC' },
      });
    });

    it('should return agencies in snake_case format', async () => {
      const agencies = [createMockAgency()];
      agencyRepo.find.mockResolvedValue(agencies);

      const result = await service.findAllAgencies(42);
      const agency = result[0] as any;

      expect(agency).toHaveProperty('id');
      expect(agency).toHaveProperty('property_id');
      expect(agency).toHaveProperty('name');
      expect(agency).toHaveProperty('contact_person');
      expect(agency).toHaveProperty('phone');
      expect(agency).toHaveProperty('email');
      expect(agency).toHaveProperty('commission');
      expect(agency).toHaveProperty('notes');
      expect(agency).toHaveProperty('is_active');
      expect(agency).toHaveProperty('created_at');
      expect(agency).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(agency).not.toHaveProperty('propertyId');
      expect(agency).not.toHaveProperty('contactPerson');
      expect(agency).not.toHaveProperty('isActive');
    });

    it('should return empty array when no agencies exist', async () => {
      agencyRepo.find.mockResolvedValue([]);

      const result = await service.findAllAgencies(42);

      expect(result).toEqual([]);
    });
  });

  describe('createAgency', () => {
    const createAgencyDto = {
      name: 'New Travel Agency',
      contact_person: 'Alisher Karimov',
      phone: '+998901234567',
      email: 'info@agency.com',
      commission: 15,
      notes: 'Premium partner',
    };

    it('should create an agency successfully', async () => {
      const savedAgency = createMockAgency({
        name: 'New Travel Agency',
        contactPerson: 'Alisher Karimov',
        phone: '+998901234567',
        email: 'info@agency.com',
        commission: 15,
        notes: 'Premium partner',
      });
      agencyRepo.save.mockResolvedValue(savedAgency);

      const result = (await service.createAgency(42, createAgencyDto)) as any;

      expect(result).toBeDefined();
      expect(result.name).toBe('New Travel Agency');
      expect(agencyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          name: 'New Travel Agency',
          contactPerson: 'Alisher Karimov',
          phone: '+998901234567',
          email: 'info@agency.com',
          commission: 15,
          notes: 'Premium partner',
          isActive: true,
        }),
      );
    });

    it('should set optional fields to null/default when not provided', async () => {
      const minimalDto = { name: 'Minimal Agency' };

      const savedAgency = createMockAgency({ name: 'Minimal Agency' });
      agencyRepo.save.mockResolvedValue(savedAgency);

      await service.createAgency(42, minimalDto);

      expect(agencyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          name: 'Minimal Agency',
          contactPerson: null,
          phone: null,
          email: null,
          commission: 0,
          notes: null,
          isActive: true,
        }),
      );
    });

    it('should return snake_case response after creation', async () => {
      const savedAgency = createMockAgency();
      agencyRepo.save.mockResolvedValue(savedAgency);

      const result = (await service.createAgency(42, createAgencyDto)) as any;

      expect(result).toHaveProperty('property_id');
      expect(result).toHaveProperty('contact_person');
      expect(result).toHaveProperty('is_active');
      expect(typeof result.commission).toBe('number');
    });
  });

  describe('updateAgency', () => {
    it('should update agency name', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const updatedAgency = createMockAgency({ name: 'Updated Agency' });
      agencyRepo.save.mockResolvedValue(updatedAgency);

      const result = (await service.updateAgency(1, {
        name: 'Updated Agency',
      })) as any;

      expect(result.name).toBe('Updated Agency');
    });

    it('should update multiple fields', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const updatedAgency = createMockAgency({
        name: 'Updated',
        commission: 20,
        phone: '+998909999999',
      });
      agencyRepo.save.mockResolvedValue(updatedAgency);

      await service.updateAgency(1, {
        name: 'Updated',
        commission: 20,
        phone: '+998909999999',
      });

      expect(agencyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated',
          commission: 20,
          phone: '+998909999999',
        }),
      );
    });

    it('should update is_active flag', async () => {
      const agency = createMockAgency({ isActive: true });
      agencyRepo.findOne.mockResolvedValue(agency);

      const updatedAgency = createMockAgency({ isActive: false });
      agencyRepo.save.mockResolvedValue(updatedAgency);

      await service.updateAgency(1, { is_active: false });

      expect(agencyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should not update fields not present in DTO', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const savedAgency = { ...agency, name: 'Only Name Changed' } as Agency;
      agencyRepo.save.mockResolvedValue(savedAgency);

      await service.updateAgency(1, { name: 'Only Name Changed' });

      // Verify original commission was preserved
      expect(agencyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          commission: 10,
          contactPerson: 'Alisher Karimov',
        }),
      );
    });

    it('should throw NOT_FOUND for non-existent agency', async () => {
      agencyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAgency(999, { name: 'test' }),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.updateAgency(999, { name: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe('deleteAgency', () => {
    it('should soft-delete agency by setting isActive to false', async () => {
      const agency = createMockAgency({ isActive: true });
      agencyRepo.findOne.mockResolvedValue(agency);

      await service.deleteAgency(1);

      expect(agencyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NOT_FOUND for non-existent agency', async () => {
      agencyRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAgency(999)).rejects.toThrow(SardobaException);
      await expect(service.deleteAgency(999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should return void on successful deletion', async () => {
      const agency = createMockAgency();
      agencyRepo.findOne.mockResolvedValue(agency);

      const result = await service.deleteAgency(1);

      expect(result).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // verifyGroupProperty
  // ══════════════════════════════════════════════════════════════════════════

  describe('verifyGroupProperty', () => {
    it('should return group when property matches', async () => {
      const group = createMockGroupBooking({ propertyId: 42 });
      groupRepo.findOne.mockResolvedValue(group);

      const result = await service.verifyGroupProperty(1, 42);

      expect(result).toBe(group);
    });

    it('should throw NOT_FOUND when group does not exist', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyGroupProperty(999, 42),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.verifyGroupProperty(999, 42),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw FORBIDDEN when property does not match', async () => {
      const group = createMockGroupBooking({ propertyId: 99 });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(
        service.verifyGroupProperty(1, 42),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.verifyGroupProperty(1, 42),
      ).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // verifyAgencyProperty
  // ══════════════════════════════════════════════════════════════════════════

  describe('verifyAgencyProperty', () => {
    it('should return agency when property matches', async () => {
      const agency = createMockAgency({ propertyId: 42 });
      agencyRepo.findOne.mockResolvedValue(agency);

      const result = await service.verifyAgencyProperty(1, 42);

      expect(result).toBe(agency);
    });

    it('should throw NOT_FOUND when agency does not exist', async () => {
      agencyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyAgencyProperty(999, 42),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.verifyAgencyProperty(999, 42),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw FORBIDDEN when property does not match', async () => {
      const agency = createMockAgency({ propertyId: 99 });
      agencyRepo.findOne.mockResolvedValue(agency);

      await expect(
        service.verifyAgencyProperty(1, 42),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.verifyAgencyProperty(1, 42),
      ).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Status transition state machine
  // ══════════════════════════════════════════════════════════════════════════

  describe('status transition state machine', () => {
    it('should allow tentative -> confirmed', async () => {
      const group = createMockGroupBooking({ status: 'tentative', rooms: [] });
      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await expect(service.confirmGroup(1, 1)).resolves.toBeDefined();
    });

    it('should allow confirmed -> checked_in', async () => {
      const group = createMockGroupBooking({ status: 'confirmed', rooms: [] });
      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await expect(service.checkInGroup(1, 1)).resolves.toBeDefined();
    });

    it('should allow tentative -> cancelled', async () => {
      const group = createMockGroupBooking({ status: 'tentative', rooms: [] });
      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await expect(service.cancelGroup(1, 1)).resolves.toBeDefined();
    });

    it('should allow confirmed -> cancelled', async () => {
      const group = createMockGroupBooking({ status: 'confirmed', rooms: [] });
      groupRepo.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(group);

      await expect(service.cancelGroup(1, 1)).resolves.toBeDefined();
    });

    it('should reject confirmed -> confirmed (via confirmGroup)', async () => {
      const group = createMockGroupBooking({ status: 'confirmed' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(service.confirmGroup(1, 1)).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should reject tentative -> checked_in (must confirm first)', async () => {
      const group = createMockGroupBooking({ status: 'tentative' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(service.checkInGroup(1, 1)).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should reject checked_in -> cancelled', async () => {
      const group = createMockGroupBooking({ status: 'checked_in' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(service.cancelGroup(1, 1)).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should reject checked_out -> cancelled', async () => {
      const group = createMockGroupBooking({ status: 'checked_out' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(service.cancelGroup(1, 1)).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should reject checked_out -> confirmed', async () => {
      const group = createMockGroupBooking({ status: 'checked_out' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(service.confirmGroup(1, 1)).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });

    it('should reject cancelled -> confirmed', async () => {
      const group = createMockGroupBooking({ status: 'cancelled' });
      groupRepo.findOne.mockResolvedValue(group);

      await expect(service.confirmGroup(1, 1)).rejects.toMatchObject({
        code: ErrorCode.GROUP_INVALID_STATUS,
      });
    });
  });
});
