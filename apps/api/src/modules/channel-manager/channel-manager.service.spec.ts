import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac } from 'crypto';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelManagerListener } from './channel-manager.listener';
import { BookingComService, BookingComWebhookPayload } from './channels/booking-com.service';
import { Channel, ChannelType } from '@/database/entities/channel.entity';
import { RoomMapping } from '@/database/entities/room-mapping.entity';
import { SyncLog, SyncStatus } from '@/database/entities/sync-log.entity';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { Guest } from '@/database/entities/guest.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Helpers ─────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test_webhook_secret_123';

function createMockChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 1,
    propertyId: 42,
    type: 'booking_com' as ChannelType,
    isActive: true,
    credentials: Buffer.from(
      JSON.stringify({
        api_key: 'bk_test_key',
        hotel_id: 'hotel_123',
        webhook_secret: WEBHOOK_SECRET,
      }),
    ),
    lastSyncAt: null,
    createdAt: new Date('2025-01-01'),
    property: {} as any,
    roomMappings: [],
    syncLogs: [],
    ...overrides,
  } as Channel;
}

function createMockRoomMapping(
  overrides: Partial<RoomMapping> = {},
): RoomMapping {
  return {
    id: 1,
    roomId: 5,
    channelId: 1,
    externalId: 'ext_room_101',
    room: {
      id: 5,
      propertyId: 42,
      name: 'Deluxe 101',
      roomType: 'double',
      floor: 2,
      capacityAdults: 2,
      capacityChildren: 1,
      basePrice: 50000000,
      status: 'active',
      amenities: [],
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
    } as Room,
    channel: createMockChannel(),
    ...overrides,
  } as RoomMapping;
}

function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    bookingNumber: 'OTA-20250701-1234',
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
    status: 'confirmed' as BookingStatus,
    source: 'booking_com',
    sourceReference: 'res_12345',
    notes: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: 0,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    property: {} as any,
    room: {} as any,
    guest: {} as any,
    rate: null,
    createdByUser: {} as any,
    history: [],
    payments: [],
    ...overrides,
  } as Booking;
}

function createMockGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 10,
    propertyId: 42,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    email: null,
    nationality: null,
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

function createHmacSignature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function createMockEntityManager(): jest.Mocked<EntityManager> {
  const manager: Partial<EntityManager> = {
    create: jest.fn().mockImplementation((_entity: any, data: any) => data),
    save: jest.fn().mockImplementation(async (_entity: any, data: any) => ({
      id: 1,
      ...data,
    })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    query: jest.fn().mockResolvedValue([]),
  };
  return manager as jest.Mocked<EntityManager>;
}

function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job_1' }),
    process: jest.fn(),
    on: jest.fn(),
  };
}

// ── Test Suites ──────────────────────────────────────────────────────────────

describe('ChannelManagerService', () => {
  let service: ChannelManagerService;
  let channelRepo: jest.Mocked<Repository<Channel>>;
  let mappingRepo: jest.Mocked<Repository<RoomMapping>>;
  let syncLogRepo: jest.Mocked<Repository<SyncLog>>;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let syncQueue: ReturnType<typeof createMockQueue>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const mockManager = createMockEntityManager();
    syncQueue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelManagerService,
        {
          provide: getRepositoryToken(Channel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockImplementation(async (data) => ({
              id: 1,
              ...data,
            })),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoomMapping),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SyncLog),
          useValue: {
            find: jest.fn(),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockImplementation(async (data) => ({
              id: 1,
              ...data,
            })),
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
          provide: getQueueToken('channel-sync'),
          useValue: syncQueue,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (cb: any) => {
              return cb(mockManager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ChannelManagerService>(ChannelManagerService);
    channelRepo = module.get(getRepositoryToken(Channel));
    mappingRepo = module.get(getRepositoryToken(RoomMapping));
    syncLogRepo = module.get(getRepositoryToken(SyncLog));
    roomRepo = module.get(getRepositoryToken(Room));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all channels for a property', async () => {
      const channels = [createMockChannel()];
      channelRepo.find.mockResolvedValue(channels);

      const result = await service.findAll(42);

      expect(result.data).toHaveLength(1);
      expect(channelRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 42 },
        order: { createdAt: 'DESC' },
      });
    });

    it('should mask credentials in response', async () => {
      const channels = [createMockChannel()];
      channelRepo.find.mockResolvedValue(channels);

      const result = await service.findAll(42);
      const channel = result.data[0] as any;

      // api_key should be masked (contains 'key')
      expect(channel.credentials.api_key).toContain('***');
      // hotel_id should NOT be masked
      expect(channel.credentials.hotel_id).toBe('hotel_123');
    });
  });

  describe('findOne', () => {
    it('should return a channel by id and propertyId', async () => {
      channelRepo.findOne.mockResolvedValue(createMockChannel());

      const result = await service.findOne(1, 42);

      expect(result).toBeDefined();
      expect((result as any).id).toBe(1);
    });

    it('should throw CHANNEL_NOT_FOUND when not found', async () => {
      channelRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 42)).rejects.toMatchObject({
        code: ErrorCode.CHANNEL_NOT_FOUND,
      });
    });
  });

  describe('create', () => {
    it('should create a channel with encrypted credentials', async () => {
      channelRepo.findOne.mockResolvedValue(null); // No duplicate
      channelRepo.save.mockImplementation(async (data: any) => ({
        id: 1,
        createdAt: new Date(),
        ...data,
      }));

      const result = await service.create(42, {
        type: 'booking_com',
        is_active: true,
        credentials: { api_key: 'test_key', hotel_id: '123' },
      });

      expect(result).toBeDefined();
      expect(channelRepo.save).toHaveBeenCalled();
    });

    it('should throw ALREADY_EXISTS for duplicate channel type', async () => {
      channelRepo.findOne.mockResolvedValue(createMockChannel());

      await expect(
        service.create(42, {
          type: 'booking_com',
          credentials: { api_key: 'test' },
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.ALREADY_EXISTS,
      });
    });
  });

  describe('remove', () => {
    it('should deactivate a channel', async () => {
      const channel = createMockChannel({ isActive: true });
      channelRepo.findOne.mockResolvedValue(channel);
      channelRepo.save.mockImplementation(async (data: any) => data);

      const result = await service.remove(1, 42);

      expect((result as any).is_active).toBe(false);
    });
  });

  describe('forceSync', () => {
    it('should queue a sync job for an active channel', async () => {
      const channel = createMockChannel({ isActive: true });
      channelRepo.findOne.mockResolvedValue(channel);
      channelRepo.save.mockImplementation(async (data: any) => data);

      const result = await service.forceSync(1, 42);

      expect(result.message).toBe('Sync job queued successfully');
      expect(syncQueue.add).toHaveBeenCalledWith(
        'sync-channel',
        expect.objectContaining({
          channelId: 1,
          propertyId: 42,
          channelType: 'booking_com',
        }),
      );
    });

    it('should throw CHANNEL_NOT_CONFIGURED for inactive channel', async () => {
      const channel = createMockChannel({ isActive: false });
      channelRepo.findOne.mockResolvedValue(channel);

      await expect(service.forceSync(1, 42)).rejects.toMatchObject({
        code: ErrorCode.CHANNEL_NOT_CONFIGURED,
      });
    });
  });

  describe('updateMappings', () => {
    it('should replace all mappings in a transaction', async () => {
      const channel = createMockChannel();
      channelRepo.findOne.mockResolvedValue(channel);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 5, propertyId: 42 },
          { id: 6, propertyId: 42 },
        ]),
      };
      (roomRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      mappingRepo.find.mockResolvedValue([]);

      await service.updateMappings(1, [
        { room_id: 5, external_id: 'ext_101' },
        { room_id: 6, external_id: 'ext_102' },
      ]);

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for invalid room IDs', async () => {
      const channel = createMockChannel();
      channelRepo.findOne.mockResolvedValue(channel);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 5, propertyId: 42 }]),
      };
      (roomRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await expect(
        service.updateMappings(1, [
          { room_id: 5, external_id: 'ext_101' },
          { room_id: 999, external_id: 'ext_999' },
        ]),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});

// ── BookingComService Tests ──────────────────────────────────────────────────

describe('BookingComService', () => {
  let bookingComService: BookingComService;
  let channelManagerService: jest.Mocked<ChannelManagerService>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let channelRepo: jest.Mocked<Repository<Channel>>;
  let guestRepo: jest.Mocked<Repository<Guest>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockManager = createMockEntityManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingComService,
        {
          provide: ChannelManagerService,
          useValue: {
            resolveRoomByExternalId: jest.fn(),
            createSyncLog: jest.fn().mockResolvedValue({ id: 1 }),
            updateLastSyncAt: jest.fn(),
            getChannelEntity: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockImplementation(async (data) => ({
              id: 1,
              ...data,
            })),
          },
        },
        {
          provide: getRepositoryToken(Channel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Guest),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockImplementation(async (data) => ({
              id: 10,
              ...data,
            })),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (cb: any) => {
              return cb(mockManager);
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

    bookingComService = module.get<BookingComService>(BookingComService);
    channelManagerService = module.get(ChannelManagerService);
    bookingRepo = module.get(getRepositoryToken(Booking));
    channelRepo = module.get(getRepositoryToken(Channel));
    guestRepo = module.get(getRepositoryToken(Guest));
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('verifySignature', () => {
    it('should verify a valid HMAC-SHA256 signature', () => {
      const body = '{"event":"new_reservation","hotel_id":"hotel_123"}';
      const signature = createHmacSignature(body, WEBHOOK_SECRET);

      const result = bookingComService.verifySignature(
        body,
        signature,
        WEBHOOK_SECRET,
      );

      expect(result).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const body = '{"event":"new_reservation","hotel_id":"hotel_123"}';
      const invalidSignature = 'invalid_signature_value_that_is_wrong';

      const result = bookingComService.verifySignature(
        body,
        invalidSignature,
        WEBHOOK_SECRET,
      );

      expect(result).toBe(false);
    });

    it('should reject signature with tampered body', () => {
      const originalBody = '{"event":"new_reservation","hotel_id":"hotel_123"}';
      const signature = createHmacSignature(originalBody, WEBHOOK_SECRET);

      const tamperedBody =
        '{"event":"new_reservation","hotel_id":"hotel_456"}';

      const result = bookingComService.verifySignature(
        tamperedBody,
        signature,
        WEBHOOK_SECRET,
      );

      expect(result).toBe(false);
    });

    it('should handle Buffer body input', () => {
      const body = '{"event":"new_reservation"}';
      const bufferBody = Buffer.from(body);
      const signature = createHmacSignature(body, WEBHOOK_SECRET);

      const result = bookingComService.verifySignature(
        bufferBody,
        signature,
        WEBHOOK_SECRET,
      );

      expect(result).toBe(true);
    });
  });

  describe('processWebhook', () => {
    const newReservationPayload: BookingComWebhookPayload = {
      event: 'new_reservation',
      hotel_id: 'hotel_123',
      reservation_id: 'res_new_001',
      room_id: 'ext_room_101',
      guest_name: 'John Doe',
      guest_email: 'john@example.com',
      guest_phone: '+1234567890',
      check_in: '2025-07-10',
      check_out: '2025-07-15',
      adults: 2,
      children: 0,
      total_price: 500000,
      currency: 'UZS',
    };

    it('should reject webhook with invalid signature', async () => {
      const channel = createMockChannel();
      channelRepo.find.mockResolvedValue([channel]);

      const rawBody = JSON.stringify(newReservationPayload);

      await expect(
        bookingComService.processWebhook(
          newReservationPayload,
          rawBody,
          'invalid_signature',
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.WEBHOOK_SIGNATURE_INVALID,
      });
    });

    it('should process new_reservation and create a booking', async () => {
      const channel = createMockChannel();
      channelRepo.find.mockResolvedValue([channel]);

      const mapping = createMockRoomMapping();
      channelManagerService.resolveRoomByExternalId.mockResolvedValue(mapping);

      // No existing booking with this reservation ID
      bookingRepo.findOne.mockResolvedValue(null);

      // No existing guest
      guestRepo.findOne.mockResolvedValue(null);

      const rawBody = JSON.stringify(newReservationPayload);
      const signature = createHmacSignature(rawBody, WEBHOOK_SECRET);

      const result = await bookingComService.processWebhook(
        newReservationPayload,
        rawBody,
        signature,
      );

      expect(result.status).toBe('ok');
      expect(result.action).toBe('booking_created');
      expect(channelManagerService.createSyncLog).toHaveBeenCalledWith(
        channel.id,
        'new_reservation',
        'success',
        expect.objectContaining({
          reservation_id: 'res_new_001',
        }),
      );
    });

    it('should process cancellation and cancel the booking', async () => {
      const channel = createMockChannel();
      channelRepo.find.mockResolvedValue([channel]);

      const cancellationPayload: BookingComWebhookPayload = {
        event: 'cancellation',
        hotel_id: 'hotel_123',
        reservation_id: 'res_12345',
        room_id: 'ext_room_101',
        guest_name: 'John Doe',
        check_in: '2025-07-01',
        check_out: '2025-07-05',
      };

      const existingBooking = createMockBooking({
        status: 'confirmed',
        sourceReference: 'res_12345',
      });
      bookingRepo.findOne.mockResolvedValue(existingBooking);
      bookingRepo.save.mockImplementation(async (data: any) => data);

      const rawBody = JSON.stringify(cancellationPayload);
      const signature = createHmacSignature(rawBody, WEBHOOK_SECRET);

      const result = await bookingComService.processWebhook(
        cancellationPayload,
        rawBody,
        signature,
      );

      expect(result.status).toBe('ok');
      expect(result.action).toBe('booking_cancelled');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({
          bookingId: existingBooking.id,
        }),
      );
    });

    it('should throw CHANNEL_NOT_FOUND for unknown hotel_id', async () => {
      channelRepo.find.mockResolvedValue([]); // No channels match

      const payload: BookingComWebhookPayload = {
        event: 'new_reservation',
        hotel_id: 'unknown_hotel',
        reservation_id: 'res_001',
        room_id: 'ext_room_101',
        guest_name: 'Test Guest',
        check_in: '2025-07-01',
        check_out: '2025-07-05',
      };

      const rawBody = JSON.stringify(payload);

      await expect(
        bookingComService.processWebhook(payload, rawBody, 'any_sig'),
      ).rejects.toMatchObject({
        code: ErrorCode.CHANNEL_NOT_FOUND,
      });
    });
  });
});

// ── ChannelManagerListener Tests ─────────────────────────────────────────────

describe('ChannelManagerListener', () => {
  let listener: ChannelManagerListener;
  let channelManagerService: jest.Mocked<ChannelManagerService>;
  let syncQueue: ReturnType<typeof createMockQueue>;
  let channelRepo: jest.Mocked<Repository<Channel>>;
  let mappingRepo: jest.Mocked<Repository<RoomMapping>>;

  beforeEach(async () => {
    syncQueue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelManagerListener,
        {
          provide: ChannelManagerService,
          useValue: {
            createSyncLog: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
        {
          provide: getQueueToken('channel-sync'),
          useValue: syncQueue,
        },
        {
          provide: getRepositoryToken(Channel),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoomMapping),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<ChannelManagerListener>(ChannelManagerListener);
    channelManagerService = module.get(ChannelManagerService);
    channelRepo = module.get(getRepositoryToken(Channel));
    mappingRepo = module.get(getRepositoryToken(RoomMapping));
  });

  describe('handleBookingCreated', () => {
    it('should queue close-room jobs for affected channels', async () => {
      const channel = createMockChannel();
      const mapping = createMockRoomMapping({ channel });

      mappingRepo.find.mockResolvedValue([mapping]);

      const event = {
        bookingId: 1,
        propertyId: 42,
        roomId: 5,
        guestId: 10,
        checkIn: '2025-07-01',
        checkOut: '2025-07-05',
        totalAmount: 200000000,
        bookingNumber: 'BK-2025-0001',
        createdBy: 1,
      };

      await listener.handleBookingCreated(event as any);

      expect(syncQueue.add).toHaveBeenCalledWith(
        'close-room',
        expect.objectContaining({
          channelId: channel.id,
          channelType: 'booking_com',
          roomId: 5,
          checkIn: '2025-07-01',
          checkOut: '2025-07-05',
        }),
      );
    });

    it('should not queue jobs when no channels are mapped', async () => {
      mappingRepo.find.mockResolvedValue([]);

      const event = {
        bookingId: 1,
        propertyId: 42,
        roomId: 5,
        guestId: 10,
        checkIn: '2025-07-01',
        checkOut: '2025-07-05',
        totalAmount: 200000000,
        bookingNumber: 'BK-2025-0001',
        createdBy: 1,
      };

      await listener.handleBookingCreated(event as any);

      expect(syncQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('handleBookingCancelled', () => {
    it('should queue open-room jobs for affected channels', async () => {
      const channel = createMockChannel();
      const mapping = createMockRoomMapping({ channel });

      mappingRepo.find.mockResolvedValue([mapping]);

      const event = {
        bookingId: 1,
        propertyId: 42,
        roomId: 5,
        guestId: 10,
        checkIn: '2025-07-01',
        checkOut: '2025-07-05',
        bookingNumber: 'BK-2025-0001',
        cancelReason: 'Guest changed plans',
        cancelledBy: 1,
      };

      await listener.handleBookingCancelled(event as any);

      expect(syncQueue.add).toHaveBeenCalledWith(
        'open-room',
        expect.objectContaining({
          channelId: channel.id,
          channelType: 'booking_com',
          roomId: 5,
          checkIn: '2025-07-01',
          checkOut: '2025-07-05',
          cancelReason: 'Guest changed plans',
        }),
      );
    });

    it('should skip inactive channels', async () => {
      const inactiveChannel = createMockChannel({ isActive: false });
      const mapping = createMockRoomMapping({ channel: inactiveChannel });

      mappingRepo.find.mockResolvedValue([mapping]);

      const event = {
        bookingId: 1,
        propertyId: 42,
        roomId: 5,
        guestId: 10,
        checkIn: '2025-07-01',
        checkOut: '2025-07-05',
        bookingNumber: 'BK-2025-0001',
        cancelReason: null,
        cancelledBy: 1,
      };

      await listener.handleBookingCancelled(event as any);

      expect(syncQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('handleSyncError', () => {
    it('should log sync errors without throwing', () => {
      // This should not throw
      expect(() =>
        listener.handleSyncError({
          channelId: 1,
          channelType: 'booking_com',
          eventType: 'new_reservation',
          reservationId: 'res_001',
          error: 'Connection timeout',
        }),
      ).not.toThrow();
    });
  });
});
