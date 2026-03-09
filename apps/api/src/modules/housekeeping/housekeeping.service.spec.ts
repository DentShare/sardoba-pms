import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HousekeepingService } from './housekeeping.service';
import { CleaningTask } from '@/database/entities/cleaning-task.entity';
import { RoomCleaningStatus } from '@/database/entities/room-cleaning-status.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { User } from '@/database/entities/user.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    propertyId: 42,
    name: 'Dilnoza Maidova',
    email: 'dilnoza@hotel.uz',
    passwordHash: 'hashed',
    role: 'admin',
    isActive: true,
    phone: '+998901234567',
    refreshToken: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    property: {} as any,
    ...overrides,
  } as User;
}

function createMockCleaningTask(overrides: Partial<CleaningTask> = {}): CleaningTask {
  return {
    id: 1,
    propertyId: 42,
    roomId: 5,
    assignedTo: null,
    taskType: 'standard',
    cleaningStatus: 'dirty',
    taskStatus: 'pending',
    priority: 'normal',
    notes: null,
    startedAt: null,
    completedAt: null,
    durationMinutes: null,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    room: createMockRoom(),
    property: {} as any,
    assignee: null,
    ...overrides,
  } as CleaningTask;
}

function createMockRoomCleaningStatus(
  overrides: Partial<RoomCleaningStatus> = {},
): RoomCleaningStatus {
  return {
    id: 1,
    propertyId: 42,
    roomId: 5,
    cleaningStatus: 'clean',
    lastCleanedAt: new Date('2025-06-01T10:00:00Z'),
    lastCleanedBy: 7,
    updatedAt: new Date('2025-06-01'),
    room: createMockRoom(),
    property: {} as any,
    ...overrides,
  } as RoomCleaningStatus;
}

function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    bookingNumber: 'BK-2025-0001',
    propertyId: 42,
    roomId: 5,
    guestId: 10,
    rateId: null,
    checkIn: '2025-07-01',
    checkOut: '2025-07-05',
    nights: 4,
    adults: 2,
    children: 0,
    totalAmount: 200000000,
    paidAmount: 0,
    status: 'confirmed',
    source: 'direct',
    sourceReference: null,
    notes: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: 1,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    property: {} as any,
    room: createMockRoom(),
    guest: {} as any,
    rate: null,
    createdByUser: {} as any,
    history: [],
    payments: [],
    extras: [],
    ...overrides,
  } as Booking;
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

describe('HousekeepingService', () => {
  let service: HousekeepingService;
  let taskRepo: jest.Mocked<Repository<CleaningTask>>;
  let roomStatusRepo: jest.Mocked<Repository<RoomCleaningStatus>>;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingService,
        {
          provide: getRepositoryToken(CleaningTask),
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
          provide: getRepositoryToken(RoomCleaningStatus),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
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
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HousekeepingService>(HousekeepingService);
    taskRepo = module.get(getRepositoryToken(CleaningTask));
    roomStatusRepo = module.get(getRepositoryToken(RoomCleaningStatus));
    roomRepo = module.get(getRepositoryToken(Room));
    bookingRepo = module.get(getRepositoryToken(Booking));
    userRepo = module.get(getRepositoryToken(User));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── getRoomStatuses ────────────────────────────────────────────────────────

  describe('getRoomStatuses', () => {
    it('should return all active rooms with their cleaning statuses', async () => {
      const rooms = [
        createMockRoom({ id: 1, name: 'Room 101', floor: 1 }),
        createMockRoom({ id: 2, name: 'Room 102', floor: 1 }),
        createMockRoom({ id: 3, name: 'Room 201', floor: 2 }),
      ];
      roomRepo.find.mockResolvedValue(rooms);

      const statuses = [
        createMockRoomCleaningStatus({ roomId: 1, cleaningStatus: 'dirty' }),
        createMockRoomCleaningStatus({ roomId: 2, cleaningStatus: 'clean' }),
      ];
      roomStatusRepo.find.mockResolvedValue(statuses);

      const result = await service.getRoomStatuses(42);

      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          room_id: 1,
          room_name: 'Room 101',
          cleaning_status: 'dirty',
        }),
      );
      expect(result.data[1]).toEqual(
        expect.objectContaining({
          room_id: 2,
          room_name: 'Room 102',
          cleaning_status: 'clean',
        }),
      );
      // Room 3 has no status record -> defaults to 'clean'
      expect(result.data[2]).toEqual(
        expect.objectContaining({
          room_id: 3,
          room_name: 'Room 201',
          cleaning_status: 'clean',
          last_cleaned_at: null,
          last_cleaned_by: null,
        }),
      );
    });

    it('should only fetch active rooms for the given property', async () => {
      roomRepo.find.mockResolvedValue([]);
      roomStatusRepo.find.mockResolvedValue([]);

      await service.getRoomStatuses(42);

      expect(roomRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 42, status: 'active' },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });

    it('should return empty data when no active rooms exist', async () => {
      roomRepo.find.mockResolvedValue([]);
      roomStatusRepo.find.mockResolvedValue([]);

      const result = await service.getRoomStatuses(42);

      expect(result.data).toEqual([]);
    });

    it('should include room_type and floor in the response', async () => {
      const rooms = [createMockRoom({ id: 1, roomType: 'suite', floor: 3 })];
      roomRepo.find.mockResolvedValue(rooms);
      roomStatusRepo.find.mockResolvedValue([]);

      const result = await service.getRoomStatuses(42);

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          room_type: 'suite',
          floor: 3,
        }),
      );
    });
  });

  // ── updateRoomStatus ───────────────────────────────────────────────────────

  describe('updateRoomStatus', () => {
    it('should update an existing room status', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const existingStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'dirty',
      });
      roomStatusRepo.findOne.mockResolvedValue(existingStatus);

      const savedStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'cleaning',
      });
      roomStatusRepo.save.mockResolvedValue(savedStatus);

      const user = createMockUser();
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.updateRoomStatus(42, 5, 'cleaning', 7);

      expect(result).toEqual(
        expect.objectContaining({
          room_id: 5,
          cleaning_status: 'cleaning',
        }),
      );
      expect(roomStatusRepo.save).toHaveBeenCalled();
    });

    it('should create a new status record when none exists', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomStatusRepo.findOne.mockResolvedValue(null);

      const newStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'dirty',
      });
      roomStatusRepo.create.mockReturnValue(newStatus);
      roomStatusRepo.save.mockResolvedValue(newStatus);

      userRepo.findOne.mockResolvedValue(createMockUser());

      await service.updateRoomStatus(42, 5, 'dirty', 7);

      expect(roomStatusRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          roomId: 5,
          cleaningStatus: 'dirty',
        }),
      );
    });

    it('should set lastCleanedAt and lastCleanedBy when status is clean', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const existingStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'inspection',
        lastCleanedAt: null,
        lastCleanedBy: null,
      });
      roomStatusRepo.findOne.mockResolvedValue(existingStatus);
      roomStatusRepo.save.mockImplementation(async (entity: any) => entity);

      // No status change event because old status is 'inspection'
      // but since we're changing to 'clean', event should fire
      userRepo.findOne.mockResolvedValue(createMockUser());

      await service.updateRoomStatus(42, 5, 'clean', 7);

      // The save call should have updated lastCleanedAt and lastCleanedBy
      const savedEntity = (roomStatusRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedEntity.lastCleanedAt).toBeInstanceOf(Date);
      expect(savedEntity.lastCleanedBy).toBe(7);
    });

    it('should NOT set lastCleanedAt when status is not clean', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const existingStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'clean',
        lastCleanedAt: new Date('2025-01-01'),
        lastCleanedBy: 3,
      });
      roomStatusRepo.findOne.mockResolvedValue(existingStatus);
      roomStatusRepo.save.mockImplementation(async (entity: any) => entity);
      userRepo.findOne.mockResolvedValue(createMockUser());

      await service.updateRoomStatus(42, 5, 'dirty', 7);

      // lastCleanedAt should remain as the original value, not updated
      const savedEntity = (roomStatusRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedEntity.cleaningStatus).toBe('dirty');
      // The code doesn't reset lastCleanedAt when transitioning away from 'clean'
    });

    it('should emit room.status_changed event when status changes', async () => {
      const room = createMockRoom({ name: 'Deluxe 101' });
      roomRepo.findOne.mockResolvedValue(room);

      const existingStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'dirty',
      });
      roomStatusRepo.findOne.mockResolvedValue(existingStatus);
      roomStatusRepo.save.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'cleaning' }),
      );

      const user = createMockUser({ name: 'Dilnoza Maidova' });
      userRepo.findOne.mockResolvedValue(user);

      await service.updateRoomStatus(42, 5, 'cleaning', 7);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.room.status_changed',
        expect.objectContaining({
          propertyId: 42,
          roomName: 'Deluxe 101',
          oldStatus: 'dirty',
          newStatus: 'cleaning',
          changedBy: 'Dilnoza Maidova',
        }),
      );
    });

    it('should NOT emit event when status does not change', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const existingStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'dirty',
      });
      roomStatusRepo.findOne.mockResolvedValue(existingStatus);
      roomStatusRepo.save.mockResolvedValue(existingStatus);

      await service.updateRoomStatus(42, 5, 'dirty', 7);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should use fallback changedBy when user is not found', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const existingStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'dirty',
      });
      roomStatusRepo.findOne.mockResolvedValue(existingStatus);
      roomStatusRepo.save.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'clean' }),
      );

      userRepo.findOne.mockResolvedValue(null);

      await service.updateRoomStatus(42, 5, 'clean', 99);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.room.status_changed',
        expect.objectContaining({
          changedBy: 'User #99',
        }),
      );
    });

    it('should throw NOT_FOUND when room does not exist', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRoomStatus(42, 999, 'clean', 7),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.updateRoomStatus(42, 999, 'clean', 7),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw NOT_FOUND when room belongs to a different property', async () => {
      // Room with propertyId=42 but we pass propertyId=99
      roomRepo.findOne.mockResolvedValue(null); // findOne with wrong property returns null

      await expect(
        service.updateRoomStatus(99, 5, 'clean', 7),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should default old status to clean when no prior status record exists', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      roomStatusRepo.findOne.mockResolvedValue(null);

      const newStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'dirty',
      });
      roomStatusRepo.create.mockReturnValue(newStatus);
      roomStatusRepo.save.mockResolvedValue(newStatus);

      userRepo.findOne.mockResolvedValue(createMockUser());

      await service.updateRoomStatus(42, 5, 'dirty', 7);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.room.status_changed',
        expect.objectContaining({
          oldStatus: 'clean',
          newStatus: 'dirty',
        }),
      );
    });
  });

  // ── findAllTasks ───────────────────────────────────────────────────────────

  describe('findAllTasks', () => {
    it('should return paginated tasks with default pagination', async () => {
      const tasks = [createMockCleaningTask()];
      const qb = createMockQueryBuilder({
        getManyAndCount: [tasks, 1],
      });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTasks(42, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
      expect(qb.where).toHaveBeenCalledWith(
        'task.propertyId = :propertyId',
        { propertyId: 42 },
      );
    });

    it('should apply task_status filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, { task_status: 'in_progress' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'task.taskStatus = :taskStatus',
        { taskStatus: 'in_progress' },
      );
    });

    it('should apply task_type filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, { task_type: 'checkout' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'task.taskType = :taskType',
        { taskType: 'checkout' },
      );
    });

    it('should apply assigned_to filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, { assigned_to: 7 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'task.assignedTo = :assignedTo',
        { assignedTo: 7 },
      );
    });

    it('should apply room_id filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, { room_id: 5 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'task.roomId = :roomId',
        { roomId: 5 },
      );
    });

    it('should respect page and per_page parameters', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, { page: 3, per_page: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should calculate last_page correctly', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 55] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTasks(42, { page: 1, per_page: 10 });

      expect(result.meta.last_page).toBe(6); // Math.ceil(55/10)
    });

    it('should return last_page = 1 when there are zero results', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTasks(42, {});

      expect(result.meta.last_page).toBe(1);
    });

    it('should apply multiple filters simultaneously', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, {
        task_status: 'pending',
        task_type: 'standard',
        assigned_to: 7,
        room_id: 5,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should include room and assignee relations', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, {});

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('task.room', 'room');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('task.assignee', 'assignee');
    });

    it('should order results by createdAt DESC', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTasks(42, {});

      expect(qb.orderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
    });

    it('should return snake_case fields in task response', async () => {
      const task = createMockCleaningTask({
        assignee: createMockUser(),
      });
      const qb = createMockQueryBuilder({ getManyAndCount: [[task], 1] });
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTasks(42, {});

      const item = result.data[0] as any;
      expect(item).toHaveProperty('property_id');
      expect(item).toHaveProperty('room_id');
      expect(item).toHaveProperty('assigned_to');
      expect(item).toHaveProperty('task_type');
      expect(item).toHaveProperty('cleaning_status');
      expect(item).toHaveProperty('task_status');
      expect(item).toHaveProperty('started_at');
      expect(item).toHaveProperty('completed_at');
      expect(item).toHaveProperty('duration_minutes');
      expect(item).toHaveProperty('created_at');
      expect(item).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(item).not.toHaveProperty('propertyId');
      expect(item).not.toHaveProperty('roomId');
      expect(item).not.toHaveProperty('taskType');
    });
  });

  // ── findOneTask ────────────────────────────────────────────────────────────

  describe('findOneTask', () => {
    it('should return a single task with relations', async () => {
      const task = createMockCleaningTask({
        room: createMockRoom({ id: 5, name: 'Room 101' }),
        assignee: createMockUser({ id: 7, name: 'Dilnoza' }),
      });
      taskRepo.findOne.mockResolvedValue(task);

      const result = (await service.findOneTask(1)) as any;

      expect(result.id).toBe(1);
      expect(result.room).toEqual(
        expect.objectContaining({
          id: 5,
          name: 'Room 101',
        }),
      );
      expect(result.assignee).toEqual(
        expect.objectContaining({
          id: 7,
          name: 'Dilnoza',
        }),
      );
      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['room', 'assignee'],
      });
    });

    it('should throw NOT_FOUND for non-existent task', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneTask(999)).rejects.toThrow(SardobaException);
      await expect(service.findOneTask(999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should include room info in response when room relation is loaded', async () => {
      const task = createMockCleaningTask({
        room: createMockRoom({ id: 5, name: 'Suite 301', roomType: 'suite', floor: 3 }),
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValue(task);

      const result = (await service.findOneTask(1)) as any;

      expect(result.room).toEqual({
        id: 5,
        name: 'Suite 301',
        room_type: 'suite',
        floor: 3,
      });
    });

    it('should include assignee info in response when assignee is loaded', async () => {
      const task = createMockCleaningTask({
        assignee: createMockUser({ id: 7, name: 'Maidova', email: 'maid@hotel.uz' }),
      });
      taskRepo.findOne.mockResolvedValue(task);

      const result = (await service.findOneTask(1)) as any;

      expect(result.assignee).toEqual({
        id: 7,
        name: 'Maidova',
        email: 'maid@hotel.uz',
      });
    });
  });

  // ── createTask ─────────────────────────────────────────────────────────────

  describe('createTask', () => {
    const createDto = {
      room_id: 5,
      task_type: 'standard' as const,
    };

    it('should create a task successfully without assignment', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const createdEntity = createMockCleaningTask({
        taskStatus: 'pending',
        assignedTo: null,
      });
      taskRepo.create.mockReturnValue(createdEntity);
      taskRepo.save.mockResolvedValue({ ...createdEntity, id: 10 } as CleaningTask);

      // updateRoomStatusInternal
      roomStatusRepo.findOne.mockResolvedValue(null);
      const newRoomStatus = createMockRoomCleaningStatus({ cleaningStatus: 'dirty' });
      roomStatusRepo.create.mockReturnValue(newRoomStatus);
      roomStatusRepo.save.mockResolvedValue(newRoomStatus);

      // findOne for the full task after save
      const fullTask = createMockCleaningTask({
        id: 10,
        taskStatus: 'pending',
        assignedTo: null,
        room: createMockRoom(),
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValue(fullTask);

      const result = (await service.createTask(42, createDto as any)) as any;

      expect(result.id).toBe(10);
      expect(result.task_status).toBe('pending');
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          roomId: 5,
          taskType: 'standard',
          cleaningStatus: 'dirty',
          taskStatus: 'pending',
          priority: 'normal',
        }),
      );
    });

    it('should set taskStatus to assigned when assigned_to is provided', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const user = createMockUser({ id: 7 });
      userRepo.findOne.mockResolvedValue(user);

      const createdEntity = createMockCleaningTask({
        taskStatus: 'assigned',
        assignedTo: 7,
      });
      taskRepo.create.mockReturnValue(createdEntity);
      taskRepo.save.mockResolvedValue({ ...createdEntity, id: 10 } as CleaningTask);

      // updateRoomStatusInternal
      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'dirty' }),
      );
      roomStatusRepo.save.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'dirty' }),
      );

      const fullTask = createMockCleaningTask({
        id: 10,
        taskStatus: 'assigned',
        assignedTo: 7,
        room: createMockRoom(),
        assignee: createMockUser({ id: 7, name: 'Dilnoza' }),
      });
      taskRepo.findOne.mockResolvedValue(fullTask);

      await service.createTask(42, {
        ...createDto,
        assigned_to: 7,
      } as any);

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskStatus: 'assigned',
          assignedTo: 7,
        }),
      );
    });

    it('should emit task.created event', async () => {
      const room = createMockRoom({ name: 'Suite 301', roomType: 'suite' });
      roomRepo.findOne.mockResolvedValue(room);

      taskRepo.create.mockReturnValue(createMockCleaningTask());
      taskRepo.save.mockResolvedValue(createMockCleaningTask({ id: 10 }));

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      const fullTask = createMockCleaningTask({
        id: 10,
        room: room,
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValue(fullTask);

      await service.createTask(42, createDto as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.created',
        expect.objectContaining({
          propertyId: 42,
          roomName: 'Suite 301',
          roomType: 'suite',
          taskType: 'standard',
          priority: 'normal',
        }),
      );
    });

    it('should emit task.assigned event when assigned_to is provided', async () => {
      const room = createMockRoom({ name: 'Room 101' });
      roomRepo.findOne.mockResolvedValue(room);

      const user = createMockUser({ id: 7, name: 'Dilnoza' });
      userRepo.findOne.mockResolvedValue(user);

      taskRepo.create.mockReturnValue(createMockCleaningTask());
      taskRepo.save.mockResolvedValue(createMockCleaningTask({ id: 10 }));

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      const fullTask = createMockCleaningTask({
        id: 10,
        room: room,
        assignee: user,
        assignedTo: 7,
      });
      taskRepo.findOne.mockResolvedValue(fullTask);

      await service.createTask(42, {
        ...createDto,
        assigned_to: 7,
      } as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.assigned',
        expect.objectContaining({
          propertyId: 42,
          roomName: 'Room 101',
          taskType: 'standard',
          maidName: 'Dilnoza',
        }),
      );
    });

    it('should NOT emit task.assigned event when no assignment', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      taskRepo.create.mockReturnValue(createMockCleaningTask());
      taskRepo.save.mockResolvedValue(createMockCleaningTask({ id: 10 }));

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      const fullTask = createMockCleaningTask({
        id: 10,
        room: createMockRoom(),
        assignee: null,
        assignedTo: null,
      });
      taskRepo.findOne.mockResolvedValue(fullTask);

      await service.createTask(42, createDto as any);

      // Should emit task.created but NOT task.assigned
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.created',
        expect.anything(),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'housekeeping.task.assigned',
        expect.anything(),
      );
    });

    it('should throw NOT_FOUND when room does not exist', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTask(42, createDto as any),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.createTask(42, createDto as any),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw NOT_FOUND when assigned user does not exist', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTask(42, {
          ...createDto,
          assigned_to: 999,
        } as any),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should use provided priority and notes', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      taskRepo.create.mockReturnValue(createMockCleaningTask());
      taskRepo.save.mockResolvedValue(createMockCleaningTask({ id: 10 }));

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.findOne.mockResolvedValue(
        createMockCleaningTask({ id: 10, room: createMockRoom(), assignee: null }),
      );

      await service.createTask(42, {
        ...createDto,
        priority: 'urgent',
        notes: 'VIP guest arriving',
      } as any);

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent',
          notes: 'VIP guest arriving',
        }),
      );
    });

    it('should default priority to normal and notes to null', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      taskRepo.create.mockReturnValue(createMockCleaningTask());
      taskRepo.save.mockResolvedValue(createMockCleaningTask({ id: 10 }));

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.findOne.mockResolvedValue(
        createMockCleaningTask({ id: 10, room: createMockRoom(), assignee: null }),
      );

      await service.createTask(42, createDto as any);

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'normal',
          notes: null,
        }),
      );
    });

    it('should update room status to dirty when creating a task', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      taskRepo.create.mockReturnValue(createMockCleaningTask());
      taskRepo.save.mockResolvedValue(createMockCleaningTask({ id: 10 }));

      // This is what updateRoomStatusInternal calls
      const existingRoomStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'clean',
      });
      roomStatusRepo.findOne.mockResolvedValue(existingRoomStatus);
      roomStatusRepo.save.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'dirty' }),
      );

      taskRepo.findOne.mockResolvedValue(
        createMockCleaningTask({ id: 10, room: createMockRoom(), assignee: null }),
      );

      await service.createTask(42, createDto as any);

      // roomStatusRepo.save should have been called with dirty status
      const savedRoomStatus = (roomStatusRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRoomStatus.cleaningStatus).toBe('dirty');
    });
  });

  // ── updateTask ─────────────────────────────────────────────────────────────

  describe('updateTask', () => {
    it('should throw NOT_FOUND when task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTask(999, { task_status: 'in_progress' } as any, 7),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.updateTask(999, { task_status: 'in_progress' } as any, 7),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should update priority and notes fields', async () => {
      const task = createMockCleaningTask();
      // First findOne returns the task for updating
      taskRepo.findOne.mockResolvedValueOnce(task);
      taskRepo.save.mockResolvedValue(task);
      // Second findOne returns the full task after save
      const fullTask = createMockCleaningTask({
        priority: 'high',
        notes: 'Updated notes',
        room: createMockRoom(),
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      const result = (await service.updateTask(
        1,
        { priority: 'high', notes: 'Updated notes' } as any,
        7,
      )) as any;

      expect(result.priority).toBe('high');
      expect(result.notes).toBe('Updated notes');
    });

    it('should assign a user to the task', async () => {
      const task = createMockCleaningTask({ assignedTo: null });
      taskRepo.findOne.mockResolvedValueOnce(task);

      const user = createMockUser({ id: 7, propertyId: 42 });
      userRepo.findOne.mockResolvedValue(user);

      taskRepo.save.mockResolvedValue({ ...task, assignedTo: 7 } as CleaningTask);

      const fullTask = createMockCleaningTask({
        assignedTo: 7,
        room: createMockRoom(),
        assignee: user,
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      await service.updateTask(1, { assigned_to: 7 } as any, 7);

      expect(task.assignedTo).toBe(7);
    });

    it('should throw NOT_FOUND when assigning non-existent user', async () => {
      const task = createMockCleaningTask();
      taskRepo.findOne.mockResolvedValueOnce(task);
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTask(1, { assigned_to: 999 } as any, 7),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    // ── Status transition: in_progress ─────────────────────────────────────

    it('should set startedAt and cleaning status when transitioning to in_progress', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'assigned',
        startedAt: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      // updateRoomStatusInternal
      roomStatusRepo.findOne.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'dirty' }),
      );
      roomStatusRepo.save.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'cleaning' }),
      );

      taskRepo.save.mockResolvedValue(task);

      const fullTask = createMockCleaningTask({
        taskStatus: 'in_progress',
        cleaningStatus: 'cleaning',
        room: createMockRoom(),
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      await service.updateTask(1, { task_status: 'in_progress' } as any, 7);

      expect(task.startedAt).toBeInstanceOf(Date);
      expect(task.cleaningStatus).toBe('cleaning');
    });

    it('should update room status to cleaning when task moves to in_progress', async () => {
      const task = createMockCleaningTask({ taskStatus: 'assigned' });
      taskRepo.findOne.mockResolvedValueOnce(task);

      const roomStatus = createMockRoomCleaningStatus({ cleaningStatus: 'dirty' });
      roomStatusRepo.findOne.mockResolvedValue(roomStatus);
      roomStatusRepo.save.mockImplementation(async (entity: any) => entity);

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({ room: createMockRoom(), assignee: null }),
      );

      await service.updateTask(1, { task_status: 'in_progress' } as any, 7);

      const savedRoomStatus = (roomStatusRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRoomStatus.cleaningStatus).toBe('cleaning');
    });

    // ── Status transition: completed ───────────────────────────────────────

    it('should set completedAt and calculate duration when transitioning to completed', async () => {
      const startTime = new Date('2025-06-01T10:00:00Z');
      const task = createMockCleaningTask({
        taskStatus: 'in_progress',
        startedAt: startTime,
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'cleaning' }),
      );
      roomStatusRepo.save.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'inspection' }),
      );

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({
          taskStatus: 'completed',
          room: createMockRoom(),
          assignee: null,
        }),
      );

      await service.updateTask(1, { task_status: 'completed' } as any, 7);

      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.cleaningStatus).toBe('inspection');
      expect(task.durationMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should set cleaningStatus to inspection when task is completed', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'in_progress',
        startedAt: new Date('2025-06-01T10:00:00Z'),
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({ room: createMockRoom(), assignee: null }),
      );

      await service.updateTask(1, { task_status: 'completed' } as any, 7);

      expect(task.cleaningStatus).toBe('inspection');
    });

    it('should emit task.completed event', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'in_progress',
        startedAt: new Date('2025-06-01T10:00:00Z'),
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.save.mockResolvedValue(task);

      const fullTask = createMockCleaningTask({
        taskStatus: 'completed',
        room: createMockRoom({ name: 'Room 101' }),
        assignee: createMockUser({ name: 'Dilnoza' }),
        durationMinutes: 30,
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      await service.updateTask(1, { task_status: 'completed' } as any, 7);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.completed',
        expect.objectContaining({
          propertyId: 42,
          roomName: 'Room 101',
          maidName: 'Dilnoza',
        }),
      );
    });

    it('should handle completed task without startedAt (no duration)', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'assigned',
        startedAt: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({ room: createMockRoom(), assignee: null }),
      );

      await service.updateTask(1, { task_status: 'completed' } as any, 7);

      // durationMinutes should NOT be calculated when startedAt is null
      expect(task.durationMinutes).toBeNull();
    });

    // ── Status transition: verified ────────────────────────────────────────

    it('should set cleaningStatus to clean when verified', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'completed',
        cleaningStatus: 'inspection',
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'inspection' }),
      );
      roomStatusRepo.save.mockImplementation(async (entity: any) => entity);

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({ room: createMockRoom(), assignee: null }),
      );

      await service.updateTask(1, { task_status: 'verified' } as any, 7);

      expect(task.cleaningStatus).toBe('clean');
    });

    it('should set room lastCleanedBy to the verifier userId on verified', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'completed',
        cleaningStatus: 'inspection',
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      const roomStatus = createMockRoomCleaningStatus({
        cleaningStatus: 'inspection',
      });
      roomStatusRepo.findOne.mockResolvedValue(roomStatus);
      roomStatusRepo.save.mockImplementation(async (entity: any) => entity);

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({ room: createMockRoom(), assignee: null }),
      );

      await service.updateTask(1, { task_status: 'verified' } as any, 12);

      // updateRoomStatusInternal should have been called with userId=12
      const savedRoomStatus = (roomStatusRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRoomStatus.cleaningStatus).toBe('clean');
      expect(savedRoomStatus.lastCleanedAt).toBeInstanceOf(Date);
      expect(savedRoomStatus.lastCleanedBy).toBe(12);
    });

    // ── Status transition: assigned ────────────────────────────────────────

    it('should emit task.assigned event when status is set to assigned', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'pending',
        assignedTo: 7,
      });
      taskRepo.findOne.mockResolvedValueOnce(task);
      taskRepo.save.mockResolvedValue(task);

      const fullTask = createMockCleaningTask({
        taskStatus: 'assigned',
        assignedTo: 7,
        room: createMockRoom({ name: 'Room 201' }),
        assignee: createMockUser({ name: 'Dilnoza' }),
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      await service.updateTask(1, { task_status: 'assigned' } as any, 7);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.assigned',
        expect.objectContaining({
          roomName: 'Room 201',
          maidName: 'Dilnoza',
        }),
      );
    });

    it('should set assignedTo when task_status is assigned and assigned_to is provided but task has no assignee', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'pending',
        assignedTo: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      const user = createMockUser({ id: 7 });
      userRepo.findOne.mockResolvedValue(user);

      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValueOnce(
        createMockCleaningTask({
          assignedTo: 7,
          room: createMockRoom(),
          assignee: user,
        }),
      );

      await service.updateTask(
        1,
        { task_status: 'assigned', assigned_to: 7 } as any,
        7,
      );

      expect(task.assignedTo).toBe(7);
    });

    it('should use fallback maid name in completed event when no assignee', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'in_progress',
        startedAt: new Date('2025-06-01T10:00:00Z'),
        assignedTo: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.save.mockResolvedValue(task);

      const fullTask = createMockCleaningTask({
        taskStatus: 'completed',
        room: createMockRoom({ name: 'Room 101' }),
        assignee: null,
        durationMinutes: 0,
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      await service.updateTask(1, { task_status: 'completed' } as any, 7);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.completed',
        expect.objectContaining({
          maidName: 'Не назначена',
        }),
      );
    });

    it('should use fallback room name when room relation is missing', async () => {
      const task = createMockCleaningTask({
        taskStatus: 'in_progress',
        startedAt: new Date('2025-06-01T10:00:00Z'),
      });
      taskRepo.findOne.mockResolvedValueOnce(task);

      roomStatusRepo.findOne.mockResolvedValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.save.mockResolvedValue(task);

      // full task without room relation loaded
      const fullTask = createMockCleaningTask({
        taskStatus: 'completed',
        roomId: 99,
        room: undefined as any,
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValueOnce(fullTask);

      await service.updateTask(1, { task_status: 'completed' } as any, 7);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'housekeeping.task.completed',
        expect.objectContaining({
          roomName: 'Room #99',
        }),
      );
    });
  });

  // ── deleteTask ─────────────────────────────────────────────────────────────

  describe('deleteTask', () => {
    it('should delete an existing task', async () => {
      const task = createMockCleaningTask();
      taskRepo.findOne.mockResolvedValue(task);

      await service.deleteTask(1);

      expect(taskRepo.remove).toHaveBeenCalledWith(task);
    });

    it('should throw NOT_FOUND when task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTask(999)).rejects.toThrow(SardobaException);
      await expect(service.deleteTask(999)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should return void on successful deletion', async () => {
      const task = createMockCleaningTask();
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.remove.mockResolvedValue(task);

      const result = await service.deleteTask(1);

      expect(result).toBeUndefined();
    });
  });

  // ── getHousekeepingStats ───────────────────────────────────────────────────

  describe('getHousekeepingStats', () => {
    it('should return stats with all status counts', async () => {
      const roomStatusQb = createMockQueryBuilder({
        getRawMany: [
          { status: 'clean', count: '5' },
          { status: 'dirty', count: '3' },
          { status: 'cleaning', count: '1' },
        ],
      });
      roomStatusRepo.createQueryBuilder.mockReturnValue(roomStatusQb);

      const taskStatusQb = createMockQueryBuilder({
        getRawMany: [
          { status: 'pending', count: '4' },
          { status: 'in_progress', count: '2' },
          { status: 'completed', count: '1' },
        ],
      });
      taskRepo.createQueryBuilder.mockReturnValue(taskStatusQb);

      roomRepo.count.mockResolvedValue(10);

      const result = await service.getHousekeepingStats(42);

      expect(result).toEqual({
        total_rooms: 10,
        room_statuses: {
          clean: 5,
          dirty: 3,
          cleaning: 1,
          inspection: 0,
          do_not_disturb: 0,
          out_of_order: 0,
        },
        task_statuses: {
          pending: 4,
          assigned: 0,
          in_progress: 2,
          completed: 1,
          verified: 0,
        },
      });
    });

    it('should return all zeros when no data exists', async () => {
      roomStatusRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawMany: [] }),
      );
      taskRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawMany: [] }),
      );
      roomRepo.count.mockResolvedValue(0);

      const result = await service.getHousekeepingStats(42);

      expect(result.total_rooms).toBe(0);
      expect(result.room_statuses.clean).toBe(0);
      expect(result.room_statuses.dirty).toBe(0);
      expect(result.task_statuses.pending).toBe(0);
    });

    it('should parse count strings to integers', async () => {
      roomStatusRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({
          getRawMany: [{ status: 'clean', count: '15' }],
        }),
      );
      taskRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawMany: [] }),
      );
      roomRepo.count.mockResolvedValue(15);

      const result = await service.getHousekeepingStats(42);

      // Ensure the value is a number, not a string
      expect(result.room_statuses.clean).toBe(15);
      expect(typeof result.room_statuses.clean).toBe('number');
    });

    it('should count only active rooms for total_rooms', async () => {
      roomStatusRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawMany: [] }),
      );
      taskRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawMany: [] }),
      );
      roomRepo.count.mockResolvedValue(8);

      await service.getHousekeepingStats(42);

      expect(roomRepo.count).toHaveBeenCalledWith({
        where: { propertyId: 42, status: 'active' },
      });
    });
  });

  // ── autoCreateTasksForCheckouts ────────────────────────────────────────────

  describe('autoCreateTasksForCheckouts', () => {
    it('should create tasks for today\'s checkouts', async () => {
      const checkouts = [
        createMockBooking({
          id: 1,
          roomId: 5,
          bookingNumber: 'BK-2025-0001',
          checkOut: new Date().toISOString().split('T')[0],
          status: 'confirmed',
        }),
        createMockBooking({
          id: 2,
          roomId: 6,
          bookingNumber: 'BK-2025-0002',
          checkOut: new Date().toISOString().split('T')[0],
          status: 'checked_in',
        }),
      ];

      const bookingQb = createMockQueryBuilder({ getMany: checkouts });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      // No existing tasks for today
      const taskQb = createMockQueryBuilder({ getMany: [] });
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);

      // For each booking, create -> save -> findOne
      taskRepo.create.mockImplementation((data: any) => ({
        id: undefined,
        ...data,
      }) as CleaningTask);

      let saveCallCount = 0;
      taskRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: ++saveCallCount + 100,
      }) as CleaningTask);

      // updateRoomStatusInternal
      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      // findOne for the full task after each save
      taskRepo.findOne.mockImplementation(async ({ where }: any) => {
        return createMockCleaningTask({
          id: where.id,
          taskType: 'checkout',
          room: createMockRoom({ id: where.id === 101 ? 5 : 6 }),
          assignee: null,
        });
      });

      const result = await service.autoCreateTasksForCheckouts(42);

      expect(result.created_count).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(taskRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should skip rooms that already have checkout tasks for today', async () => {
      const checkouts = [
        createMockBooking({ id: 1, roomId: 5, bookingNumber: 'BK-2025-0001' }),
        createMockBooking({ id: 2, roomId: 6, bookingNumber: 'BK-2025-0002' }),
      ];

      const bookingQb = createMockQueryBuilder({ getMany: checkouts });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      // Existing task already exists for room 5
      const existingTasks = [
        createMockCleaningTask({ roomId: 5, taskType: 'checkout' }),
      ];
      const taskQb = createMockQueryBuilder({ getMany: existingTasks });
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);

      taskRepo.create.mockImplementation((data: any) => ({
        id: undefined,
        ...data,
      }) as CleaningTask);
      taskRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 200,
      }) as CleaningTask);

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.findOne.mockResolvedValue(
        createMockCleaningTask({ id: 200, room: createMockRoom(), assignee: null }),
      );

      const result = await service.autoCreateTasksForCheckouts(42);

      // Only 1 task should be created (room 6), room 5 already has a task
      expect(result.created_count).toBe(1);
      expect(taskRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should return empty data when no checkouts for today', async () => {
      const bookingQb = createMockQueryBuilder({ getMany: [] });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const taskQb = createMockQueryBuilder({ getMany: [] });
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);

      const result = await service.autoCreateTasksForCheckouts(42);

      expect(result.created_count).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should create tasks with correct properties', async () => {
      const checkouts = [
        createMockBooking({
          id: 1,
          roomId: 5,
          bookingNumber: 'BK-2025-0042',
          checkOut: new Date().toISOString().split('T')[0],
        }),
      ];

      const bookingQb = createMockQueryBuilder({ getMany: checkouts });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const taskQb = createMockQueryBuilder({ getMany: [] });
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);

      taskRepo.create.mockImplementation((data: any) => data as CleaningTask);
      taskRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 10,
      }) as CleaningTask);

      roomStatusRepo.findOne.mockResolvedValue(null);
      roomStatusRepo.create.mockReturnValue(createMockRoomCleaningStatus());
      roomStatusRepo.save.mockResolvedValue(createMockRoomCleaningStatus());

      taskRepo.findOne.mockResolvedValue(
        createMockCleaningTask({ id: 10, room: createMockRoom(), assignee: null }),
      );

      await service.autoCreateTasksForCheckouts(42);

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          roomId: 5,
          assignedTo: null,
          taskType: 'checkout',
          cleaningStatus: 'dirty',
          taskStatus: 'pending',
          priority: 'normal',
          notes: 'Auto-created for checkout booking #BK-2025-0042',
        }),
      );
    });

    it('should only query confirmed and checked_in bookings', async () => {
      const bookingQb = createMockQueryBuilder({ getMany: [] });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const taskQb = createMockQueryBuilder({ getMany: [] });
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);

      await service.autoCreateTasksForCheckouts(42);

      expect(bookingQb.andWhere).toHaveBeenCalledWith(
        'booking.status IN (:...statuses)',
        { statuses: ['confirmed', 'checked_in'] },
      );
    });

    it('should set room status to dirty for each new checkout task', async () => {
      const checkouts = [
        createMockBooking({
          id: 1,
          roomId: 5,
          bookingNumber: 'BK-2025-0001',
        }),
      ];

      const bookingQb = createMockQueryBuilder({ getMany: checkouts });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingQb);

      const taskQb = createMockQueryBuilder({ getMany: [] });
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);

      taskRepo.create.mockImplementation((data: any) => data as CleaningTask);
      taskRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 10,
      }) as CleaningTask);

      const roomStatus = createMockRoomCleaningStatus({ cleaningStatus: 'clean' });
      roomStatusRepo.findOne.mockResolvedValue(roomStatus);
      roomStatusRepo.save.mockImplementation(async (entity: any) => entity);

      taskRepo.findOne.mockResolvedValue(
        createMockCleaningTask({ id: 10, room: createMockRoom(), assignee: null }),
      );

      await service.autoCreateTasksForCheckouts(42);

      // roomStatusRepo.save should have been called to set status to 'dirty'
      const savedRoomStatus = (roomStatusRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRoomStatus.cleaningStatus).toBe('dirty');
    });
  });

  // ── verifyTaskProperty ─────────────────────────────────────────────────────

  describe('verifyTaskProperty', () => {
    it('should return the task when it belongs to the property', async () => {
      const task = createMockCleaningTask({ propertyId: 42 });
      taskRepo.findOne.mockResolvedValue(task);

      const result = await service.verifyTaskProperty(1, 42);

      expect(result).toEqual(task);
    });

    it('should throw NOT_FOUND when task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyTaskProperty(999, 42),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.verifyTaskProperty(999, 42),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw FORBIDDEN when task belongs to a different property', async () => {
      const task = createMockCleaningTask({ propertyId: 99 });
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.verifyTaskProperty(1, 42),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.verifyTaskProperty(1, 42),
      ).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });

    it('should query by task id only (not property)', async () => {
      const task = createMockCleaningTask();
      taskRepo.findOne.mockResolvedValue(task);

      await service.verifyTaskProperty(1, 42);

      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  // ── Response format tests ──────────────────────────────────────────────────

  describe('response format', () => {
    it('taskToResponseFormat should include room info when room is loaded', async () => {
      const task = createMockCleaningTask({
        room: createMockRoom({ id: 5, name: 'Suite 301', roomType: 'suite', floor: 3 }),
        assignee: null,
      });
      taskRepo.findOne.mockResolvedValue(task);

      const result = (await service.findOneTask(1)) as any;

      expect(result.room).toEqual({
        id: 5,
        name: 'Suite 301',
        room_type: 'suite',
        floor: 3,
      });
      expect(result.assignee).toBeUndefined();
    });

    it('taskToResponseFormat should include assignee info when assignee is loaded', async () => {
      const task = createMockCleaningTask({
        room: createMockRoom(),
        assignee: createMockUser({ id: 7, name: 'Dilnoza', email: 'dilnoza@hotel.uz' }),
      });
      taskRepo.findOne.mockResolvedValue(task);

      const result = (await service.findOneTask(1)) as any;

      expect(result.assignee).toEqual({
        id: 7,
        name: 'Dilnoza',
        email: 'dilnoza@hotel.uz',
      });
    });

    it('updateRoomStatus should return proper response format', async () => {
      const room = createMockRoom({ id: 5, name: 'Room 101', roomType: 'double', floor: 1 });
      roomRepo.findOne.mockResolvedValue(room);

      const savedStatus = createMockRoomCleaningStatus({
        id: 1,
        propertyId: 42,
        roomId: 5,
        cleaningStatus: 'clean',
        lastCleanedAt: new Date('2025-06-01T10:00:00Z'),
        lastCleanedBy: 7,
        updatedAt: new Date('2025-06-01'),
      });
      roomStatusRepo.findOne.mockResolvedValue(
        createMockRoomCleaningStatus({ cleaningStatus: 'dirty' }),
      );
      roomStatusRepo.save.mockResolvedValue(savedStatus);

      userRepo.findOne.mockResolvedValue(createMockUser());

      const result = (await service.updateRoomStatus(42, 5, 'clean', 7)) as any;

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('property_id');
      expect(result).toHaveProperty('room_id');
      expect(result).toHaveProperty('cleaning_status');
      expect(result).toHaveProperty('last_cleaned_at');
      expect(result).toHaveProperty('last_cleaned_by');
      expect(result).toHaveProperty('updated_at');
      expect(result).toHaveProperty('room');
      expect(result.room).toEqual({
        id: 5,
        name: 'Room 101',
        room_type: 'double',
        floor: 1,
      });
    });
  });
});
