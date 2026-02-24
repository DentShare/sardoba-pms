import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { BookingNumberService } from './booking-number.service';
import { RatesService } from '../rates/rates.service';
import { GuestsService } from '../guests/guests.service';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { BookingHistory } from '@/database/entities/booking-history.entity';
import { Room } from '@/database/entities/room.entity';
import { Guest } from '@/database/entities/guest.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { BookingCreatedEvent } from './events/booking-created.event';

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

function createMockGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 10,
    propertyId: 42,
    firstName: 'Aziz',
    lastName: 'Karimov',
    phone: '+998901234567',
    email: null,
    nationality: 'UZ',
    documentType: null,
    documentNumber: null,
    dateOfBirth: null,
    isVip: false,
    notes: null,
    totalRevenue: 0,
    visitCount: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    property: {} as any,
    bookings: [],
    ...overrides,
  } as Guest;
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
    status: 'new' as BookingStatus,
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
    guest: createMockGuest(),
    rate: null,
    createdByUser: {} as any,
    history: [],
    payments: [],
    ...overrides,
  } as Booking;
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
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnValue.getMany ?? []),
    getManyAndCount: jest.fn().mockResolvedValue(
      returnValue.getManyAndCount ?? [[], 0],
    ),
    getOne: jest.fn().mockResolvedValue(returnValue.getOne ?? null),
    getCount: jest.fn().mockResolvedValue(returnValue.getCount ?? 0),
  };
  return qb;
}

// ── Mock EntityManager for transactions ─────────────────────────────────────

function createMockEntityManager() {
  const manager: Partial<EntityManager> = {
    create: jest.fn().mockImplementation((_entity: any, data: any) => data),
    save: jest.fn().mockImplementation(async (_entity: any, data: any) => ({
      id: 1,
      ...data,
    })),
    query: jest.fn().mockResolvedValue([]),
  };
  return manager as jest.Mocked<EntityManager>;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let historyRepo: jest.Mocked<Repository<BookingHistory>>;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let guestRepo: jest.Mocked<Repository<Guest>>;
  let availabilityService: jest.Mocked<AvailabilityService>;
  let bookingNumberService: jest.Mocked<BookingNumberService>;
  let ratesService: jest.Mocked<RatesService>;
  let guestsService: jest.Mocked<GuestsService>;
  let dataSource: jest.Mocked<DataSource>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockManager = createMockEntityManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
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
          provide: getRepositoryToken(BookingHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Guest),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AvailabilityService,
          useValue: {
            checkAvailability: jest.fn(),
          },
        },
        {
          provide: BookingNumberService,
          useValue: {
            generate: jest.fn(),
            generateInTransaction: jest.fn(),
          },
        },
        {
          provide: RatesService,
          useValue: {
            calculate: jest.fn(),
          },
        },
        {
          provide: GuestsService,
          useValue: {
            findOrCreate: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (cb: any) => {
              return cb(mockManager);
            }),
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue(
                createMockQueryBuilder({ getMany: [] }),
              ),
            }),
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

    service = module.get<BookingsService>(BookingsService);
    bookingRepo = module.get(getRepositoryToken(Booking));
    historyRepo = module.get(getRepositoryToken(BookingHistory));
    roomRepo = module.get(getRepositoryToken(Room));
    guestRepo = module.get(getRepositoryToken(Guest));
    availabilityService = module.get(AvailabilityService);
    bookingNumberService = module.get(BookingNumberService);
    ratesService = module.get(RatesService);
    guestsService = module.get(GuestsService);
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      property_id: 42,
      room_id: 5,
      check_in: '2025-07-01',
      check_out: '2025-07-05',
      adults: 2,
      children: 0,
      guest_id: 10,
      source: 'direct' as const,
    };

    it('should create a booking successfully', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const guest = createMockGuest();
      guestRepo.findOne.mockResolvedValue(guest);

      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      ratesService.calculate.mockResolvedValue({
        nights: 4,
        rateApplied: 'Base Rate',
        pricePerNight: 50000000,
        total: 200000000,
        breakdown: [
          { date: '2025-07-01', price: 50000000, rateName: 'Base Rate' },
          { date: '2025-07-02', price: 50000000, rateName: 'Base Rate' },
          { date: '2025-07-03', price: 50000000, rateName: 'Base Rate' },
          { date: '2025-07-04', price: 50000000, rateName: 'Base Rate' },
        ],
      });

      bookingNumberService.generateInTransaction.mockResolvedValue('BK-2025-0001');

      // The create method calls findOne at the end for the full booking
      const savedBooking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(savedBooking);

      const result = await service.create(42, 1, createDto);

      expect(result).toBeDefined();
      expect(availabilityService.checkAvailability).toHaveBeenCalledWith(5, '2025-07-01', '2025-07-05');
      expect(ratesService.calculate).toHaveBeenCalledWith(5, '2025-07-01', '2025-07-05', undefined);
      expect(bookingNumberService.generateInTransaction).toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw OVERBOOKING_DETECTED when room is occupied', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const guest = createMockGuest();
      guestRepo.findOne.mockResolvedValue(guest);

      availabilityService.checkAvailability.mockResolvedValue({
        available: false,
        blockedDates: ['2025-07-02', '2025-07-03'],
      });

      await expect(service.create(42, 1, createDto)).rejects.toThrow(
        SardobaException,
      );
      await expect(service.create(42, 1, createDto)).rejects.toMatchObject({
        code: ErrorCode.OVERBOOKING_DETECTED,
      });
    });

    it('should calculate correct nights count', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const guest = createMockGuest();
      guestRepo.findOne.mockResolvedValue(guest);

      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      ratesService.calculate.mockResolvedValue({
        nights: 4,
        rateApplied: 'Base Rate',
        pricePerNight: 50000000,
        total: 200000000,
        breakdown: [],
      });

      bookingNumberService.generateInTransaction.mockResolvedValue('BK-2025-0001');

      const savedBooking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(savedBooking);

      await service.create(42, 1, createDto);

      // Verify the transaction callback was called
      expect(dataSource.transaction).toHaveBeenCalled();

      // Get the transaction callback and check what it created
      const transactionFn = (dataSource.transaction as jest.Mock).mock.calls[0][0];
      const mockManager = createMockEntityManager();
      await transactionFn(mockManager);

      // The first create call should be the booking with nights=4
      const bookingCreateCall = (mockManager.create as jest.Mock).mock.calls[0];
      expect(bookingCreateCall[1]).toMatchObject({
        nights: 4,
        checkIn: '2025-07-01',
        checkOut: '2025-07-05',
      });
    });

    it('should emit BookingCreatedEvent after creation', async () => {
      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const guest = createMockGuest();
      guestRepo.findOne.mockResolvedValue(guest);

      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      ratesService.calculate.mockResolvedValue({
        nights: 4,
        rateApplied: 'Base Rate',
        pricePerNight: 50000000,
        total: 200000000,
        breakdown: [],
      });

      bookingNumberService.generateInTransaction.mockResolvedValue('BK-2025-0001');

      const savedBooking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(savedBooking);

      await service.create(42, 1, createDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.any(BookingCreatedEvent),
      );
    });

    it('should throw CHECKOUT_BEFORE_CHECKIN for invalid dates', async () => {
      const invalidDto = {
        ...createDto,
        check_in: '2025-07-05',
        check_out: '2025-07-01',
      };

      await expect(service.create(42, 1, invalidDto)).rejects.toThrow(
        SardobaException,
      );
      await expect(service.create(42, 1, invalidDto)).rejects.toMatchObject({
        code: ErrorCode.CHECKOUT_BEFORE_CHECKIN,
      });
    });

    it('should throw NOT_FOUND when room does not exist', async () => {
      roomRepo.findOne.mockResolvedValue(null);

      await expect(service.create(42, 1, createDto)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should throw ROOM_NOT_AVAILABLE when room is inactive', async () => {
      const inactiveRoom = createMockRoom({ status: 'inactive' });
      roomRepo.findOne.mockResolvedValue(inactiveRoom);

      await expect(service.create(42, 1, createDto)).rejects.toMatchObject({
        code: ErrorCode.ROOM_NOT_AVAILABLE,
      });
    });

    it('should use GuestsService.findOrCreate when guest data is provided', async () => {
      const dtoWithGuest = {
        ...createDto,
        guest_id: undefined as any,
        guest: {
          first_name: 'Aziz',
          last_name: 'Karimov',
          phone: '+998901234567',
        },
      };

      const room = createMockRoom();
      roomRepo.findOne.mockResolvedValue(room);

      const guest = createMockGuest();
      guestsService.findOrCreate.mockResolvedValue(guest);

      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      ratesService.calculate.mockResolvedValue({
        nights: 4,
        rateApplied: 'Base Rate',
        pricePerNight: 50000000,
        total: 200000000,
        breakdown: [],
      });

      bookingNumberService.generateInTransaction.mockResolvedValue('BK-2025-0001');

      const savedBooking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(savedBooking);

      await service.create(42, 1, dtoWithGuest);

      expect(guestsService.findOrCreate).toHaveBeenCalledWith(42, {
        firstName: 'Aziz',
        lastName: 'Karimov',
        phone: '+998901234567',
        email: undefined,
        nationality: undefined,
      });
    });
  });

  // ── cancel ──────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel a booking with new status', async () => {
      const booking = createMockBooking({ status: 'new' });
      bookingRepo.findOne.mockResolvedValue(booking);

      const cancelledBooking = createMockBooking({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Guest changed plans',
      });
      // Second findOne call returns the cancelled booking
      bookingRepo.findOne
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(cancelledBooking);

      const result = await service.cancel(1, 42, 1, {
        reason: 'Guest changed plans',
      });

      expect(result).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({
          bookingId: 1,
          cancelReason: 'Guest changed plans',
        }),
      );
    });

    it('should set cancelledAt when cancelling', async () => {
      const booking = createMockBooking({ status: 'confirmed' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.cancel(1, 42, 1, { reason: 'No show' });

      // Check that the transaction was called and booking has cancelledAt set
      expect(dataSource.transaction).toHaveBeenCalled();

      // Verify the booking was modified before save
      const transactionFn = (dataSource.transaction as jest.Mock).mock.calls[0][0];
      const mockManager = createMockEntityManager();
      await transactionFn(mockManager);

      const savedBooking = (mockManager.save as jest.Mock).mock.calls[0][1];
      expect(savedBooking.cancelledAt).toBeInstanceOf(Date);
      expect(savedBooking.status).toBe('cancelled');
    });

    it('should block cancellation of checked_in booking', async () => {
      const booking = createMockBooking({ status: 'checked_in' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel(1, 42, 1, { reason: 'test' }),
      ).rejects.toThrow(SardobaException);
      await expect(
        service.cancel(1, 42, 1, { reason: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should block cancellation of already cancelled booking', async () => {
      const booking = createMockBooking({ status: 'cancelled' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel(1, 42, 1, { reason: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should block cancellation of checked_out booking', async () => {
      const booking = createMockBooking({ status: 'checked_out' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel(1, 42, 1, { reason: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });
  });

  // ── checkIn ─────────────────────────────────────────────────────────────

  describe('checkIn', () => {
    it('should update status to checked_in from confirmed', async () => {
      const booking = createMockBooking({ status: 'confirmed' });
      bookingRepo.findOne.mockResolvedValue(booking);

      const checkedInBooking = createMockBooking({ status: 'checked_in' });
      bookingRepo.findOne
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(checkedInBooking);

      const result = await service.checkIn(1, 42, 1);

      expect(result).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.status_changed',
        expect.objectContaining({
          oldStatus: 'confirmed',
          newStatus: 'checked_in',
        }),
      );
    });

    it('should update status to checked_in from new', async () => {
      const booking = createMockBooking({ status: 'new' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.checkIn(1, 42, 1);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.status_changed',
        expect.objectContaining({
          oldStatus: 'new',
          newStatus: 'checked_in',
        }),
      );
    });

    it('should throw error when checking in cancelled booking', async () => {
      const booking = createMockBooking({ status: 'cancelled' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.checkIn(1, 42, 1)).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should throw error when checking in already checked_in booking', async () => {
      const booking = createMockBooking({ status: 'checked_in' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.checkIn(1, 42, 1)).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });
  });

  // ── checkOut ────────────────────────────────────────────────────────────

  describe('checkOut', () => {
    it('should update status to checked_out from checked_in', async () => {
      const booking = createMockBooking({ status: 'checked_in' });
      bookingRepo.findOne.mockResolvedValue(booking);

      const checkedOutBooking = createMockBooking({ status: 'checked_out' });
      bookingRepo.findOne
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(checkedOutBooking);

      const result = await service.checkOut(1, 42, 1);

      expect(result).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.status_changed',
        expect.objectContaining({
          oldStatus: 'checked_in',
          newStatus: 'checked_out',
        }),
      );
    });

    it('should throw error when checking out a new booking', async () => {
      const booking = createMockBooking({ status: 'new' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.checkOut(1, 42, 1)).rejects.toThrow(
        SardobaException,
      );
      await expect(service.checkOut(1, 42, 1)).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should throw error when checking out a confirmed booking', async () => {
      const booking = createMockBooking({ status: 'confirmed' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.checkOut(1, 42, 1)).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should throw error when checking out a cancelled booking', async () => {
      const booking = createMockBooking({ status: 'cancelled' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.checkOut(1, 42, 1)).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update booking notes', async () => {
      const booking = createMockBooking({ status: 'confirmed' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.update(1, 42, 1, { notes: 'Updated notes' });

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw BOOKING_CANCELLED when booking is cancelled', async () => {
      const booking = createMockBooking({ status: 'cancelled' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.update(1, 42, 1, { notes: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should throw BOOKING_CANCELLED when booking is checked_out', async () => {
      const booking = createMockBooking({ status: 'checked_out' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.update(1, 42, 1, { notes: 'test' }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should re-check availability when room changes', async () => {
      const booking = createMockBooking({ status: 'new' });
      bookingRepo.findOne.mockResolvedValue(booking);

      const newRoom = createMockRoom({ id: 6 });
      roomRepo.findOne.mockResolvedValue(newRoom);

      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      ratesService.calculate.mockResolvedValue({
        nights: 4,
        rateApplied: 'Base Rate',
        pricePerNight: 50000000,
        total: 200000000,
        breakdown: [],
      });

      await service.update(1, 42, 1, { room_id: 6 });

      expect(availabilityService.checkAvailability).toHaveBeenCalledWith(
        6,
        '2025-07-01',
        '2025-07-05',
        1, // excludeBookingId
      );
    });

    it('should throw OVERBOOKING_DETECTED when new dates conflict', async () => {
      const booking = createMockBooking({ status: 'new' });
      bookingRepo.findOne.mockResolvedValue(booking);

      availabilityService.checkAvailability.mockResolvedValue({
        available: false,
        blockedDates: ['2025-07-10', '2025-07-11'],
      });

      ratesService.calculate.mockResolvedValue({
        nights: 5,
        rateApplied: 'Base Rate',
        pricePerNight: 50000000,
        total: 250000000,
        breakdown: [],
      });

      await expect(
        service.update(1, 42, 1, {
          check_in: '2025-07-10',
          check_out: '2025-07-15',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.OVERBOOKING_DETECTED,
      });
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const bookings = [createMockBooking()];
      const qb = createMockQueryBuilder({
        getManyAndCount: [bookings, 1],
      });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, { page: 1, per_page: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
    });

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { status: 'confirmed' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'booking.status = :status',
        { status: 'confirmed' },
      );
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(42, { search: 'Karimov' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%Karimov%' },
      );
    });

    it('should return snake_case fields in response', async () => {
      const bookings = [createMockBooking()];
      const qb = createMockQueryBuilder({ getManyAndCount: [bookings, 1] });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, {});

      const booking = result.data[0] as any;
      expect(booking).toHaveProperty('booking_number');
      expect(booking).toHaveProperty('property_id');
      expect(booking).toHaveProperty('room_id');
      expect(booking).toHaveProperty('guest_id');
      expect(booking).toHaveProperty('check_in');
      expect(booking).toHaveProperty('check_out');
      expect(booking).toHaveProperty('total_amount');
      expect(booking).toHaveProperty('paid_amount');
      expect(booking).toHaveProperty('created_at');
      expect(booking).toHaveProperty('updated_at');
      // Should NOT have camelCase
      expect(booking).not.toHaveProperty('bookingNumber');
      expect(booking).not.toHaveProperty('propertyId');
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return booking with all relations', async () => {
      const booking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(booking);

      const result = (await service.findOne(1, 42)) as any;

      expect(result.id).toBe(1);
      expect(result.room).toBeDefined();
      expect(result.guest).toBeDefined();
      expect(result.payments).toBeDefined();
      expect(result.history).toBeDefined();
      expect(bookingRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, propertyId: 42 },
        relations: ['room', 'guest', 'payments', 'history', 'rate', 'createdByUser'],
      });
    });

    it('should throw NOT_FOUND for non-existent booking', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 42)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
