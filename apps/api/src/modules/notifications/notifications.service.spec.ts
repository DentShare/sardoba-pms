import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './telegram/telegram.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Payment, PaymentMethod } from '@/database/entities/payment.entity';
import { BookingCreatedEvent } from '../bookings/events/booking-created.event';
import { BookingCancelledEvent } from '../bookings/events/booking-cancelled.event';
import { PaymentCreatedEvent } from '../payments/events/payment-created.event';

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockSettings(
  overrides: Partial<NotificationSettings> = {},
): NotificationSettings {
  return {
    id: 1,
    propertyId: 42,
    telegramRecipients: [
      { name: 'Admin', chatId: '111222333', isActive: true },
      { name: 'Manager', chatId: '444555666', isActive: true },
      { name: 'Inactive', chatId: '777888999', isActive: false },
    ],
    eventNewBooking: true,
    eventCancellation: true,
    eventDailyDigest: true,
    dailyDigestTime: '08:00',
    eventPayment: true,
    eventSyncError: true,
    updatedAt: new Date('2025-01-01'),
    property: {} as any,
    ...overrides,
  } as NotificationSettings;
}

function createMockBooking(
  overrides: Partial<Booking> = {},
): Booking {
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
    room: {
      id: 5,
      name: 'Deluxe 101',
      roomType: 'double',
      propertyId: 42,
    } as Room,
    guest: {
      id: 10,
      firstName: 'Aziz',
      lastName: 'Karimov',
      phone: '+998901234567',
      propertyId: 42,
    } as Guest,
    rate: null,
    createdByUser: {} as any,
    history: [],
    payments: [],
    ...overrides,
  } as Booking;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let settingsRepo: jest.Mocked<Repository<NotificationSettings>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let guestRepo: jest.Mocked<Repository<Guest>>;
  let telegramService: jest.Mocked<TelegramService>;
  let whatsAppService: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(NotificationSettings),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Guest),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: TelegramService,
          useValue: {
            sendMessage: jest.fn(),
            isReady: jest.fn(),
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            sendConfirmation: jest.fn(),
            isConfigured: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    settingsRepo = module.get(getRepositoryToken(NotificationSettings));
    bookingRepo = module.get(getRepositoryToken(Booking));
    roomRepo = module.get(getRepositoryToken(Room));
    guestRepo = module.get(getRepositoryToken(Guest));
    telegramService = module.get(TelegramService);
    whatsAppService = module.get(WhatsAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── sendToTelegramRecipients ────────────────────────────────────────────

  describe('sendToTelegramRecipients', () => {
    it('should send to all active recipients', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);
      telegramService.sendMessage.mockResolvedValue(true);

      const sent = await service.sendToTelegramRecipients(42, 'Test message');

      // Should send to 2 active recipients (not the inactive one)
      expect(sent).toBe(2);
      expect(telegramService.sendMessage).toHaveBeenCalledTimes(2);
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        '111222333',
        'Test message',
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        '444555666',
        'Test message',
      );
    });

    it('should return 0 when no settings found', async () => {
      settingsRepo.findOne.mockResolvedValue(null);

      const sent = await service.sendToTelegramRecipients(42, 'Test message');

      expect(sent).toBe(0);
      expect(telegramService.sendMessage).not.toHaveBeenCalled();
    });

    it('should return 0 when no active recipients', async () => {
      const settings = createMockSettings({
        telegramRecipients: [
          { name: 'Inactive', chatId: '111', isActive: false },
        ],
      });
      settingsRepo.findOne.mockResolvedValue(settings);

      const sent = await service.sendToTelegramRecipients(42, 'Test message');

      expect(sent).toBe(0);
      expect(telegramService.sendMessage).not.toHaveBeenCalled();
    });

    it('should count only successful sends', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);
      telegramService.sendMessage
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const sent = await service.sendToTelegramRecipients(42, 'Test message');

      expect(sent).toBe(1);
    });
  });

  // ── handleBookingCreated ───────────────────────────────────────────────

  describe('handleBookingCreated', () => {
    it('should send Telegram notification on new booking', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);

      const booking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(booking);

      telegramService.sendMessage.mockResolvedValue(true);
      whatsAppService.sendConfirmation.mockResolvedValue(true);

      const event = new BookingCreatedEvent(
        1,
        42,
        5,
        10,
        '2025-07-01',
        '2025-07-05',
        200000000,
        'BK-2025-0001',
        1,
      );

      await service.handleBookingCreated(event);

      // Telegram: 2 active recipients
      expect(telegramService.sendMessage).toHaveBeenCalledTimes(2);

      // Should contain booking number in the message
      const firstCallMessage = telegramService.sendMessage.mock.calls[0][1];
      expect(firstCallMessage).toContain('BK-2025-0001');
      expect(firstCallMessage).toContain('Aziz Karimov');
      expect(firstCallMessage).toContain('Deluxe 101');
    });

    it('should send WhatsApp confirmation to guest', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);

      const booking = createMockBooking();
      bookingRepo.findOne.mockResolvedValue(booking);

      telegramService.sendMessage.mockResolvedValue(true);
      whatsAppService.sendConfirmation.mockResolvedValue(true);

      const event = new BookingCreatedEvent(
        1,
        42,
        5,
        10,
        '2025-07-01',
        '2025-07-05',
        200000000,
        'BK-2025-0001',
        1,
      );

      await service.handleBookingCreated(event);

      expect(whatsAppService.sendConfirmation).toHaveBeenCalledWith(
        '+998901234567',
        booking,
      );
    });

    it('should skip notification when eventNewBooking is disabled', async () => {
      const settings = createMockSettings({ eventNewBooking: false });
      settingsRepo.findOne.mockResolvedValue(settings);

      const event = new BookingCreatedEvent(
        1,
        42,
        5,
        10,
        '2025-07-01',
        '2025-07-05',
        200000000,
        'BK-2025-0001',
        1,
      );

      await service.handleBookingCreated(event);

      expect(telegramService.sendMessage).not.toHaveBeenCalled();
      expect(whatsAppService.sendConfirmation).not.toHaveBeenCalled();
    });

    it('should not throw when event handler encounters an error', async () => {
      settingsRepo.findOne.mockRejectedValue(new Error('DB error'));

      const event = new BookingCreatedEvent(
        1,
        42,
        5,
        10,
        '2025-07-01',
        '2025-07-05',
        200000000,
        'BK-2025-0001',
        1,
      );

      // Should not throw - event handlers must be resilient
      await expect(
        service.handleBookingCreated(event),
      ).resolves.toBeUndefined();
    });
  });

  // ── handleBookingCancelled ─────────────────────────────────────────────

  describe('handleBookingCancelled', () => {
    it('should send cancellation notification', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);

      const booking = createMockBooking({
        status: 'cancelled',
        cancelReason: 'Guest changed plans',
        cancelledAt: new Date(),
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      telegramService.sendMessage.mockResolvedValue(true);

      const event = new BookingCancelledEvent(
        1,
        42,
        5,
        10,
        '2025-07-01',
        '2025-07-05',
        'BK-2025-0001',
        'Guest changed plans',
        1,
      );

      await service.handleBookingCancelled(event);

      expect(telegramService.sendMessage).toHaveBeenCalledTimes(2);

      const message = telegramService.sendMessage.mock.calls[0][1];
      expect(message).toContain('Отмена');
      expect(message).toContain('BK-2025-0001');
      expect(message).toContain('Guest changed plans');
    });

    it('should skip when eventCancellation is disabled', async () => {
      const settings = createMockSettings({ eventCancellation: false });
      settingsRepo.findOne.mockResolvedValue(settings);

      const event = new BookingCancelledEvent(
        1,
        42,
        5,
        10,
        '2025-07-01',
        '2025-07-05',
        'BK-2025-0001',
        null,
        1,
      );

      await service.handleBookingCancelled(event);

      expect(telegramService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ── handlePaymentCreated ──────────────────────────────────────────────

  describe('handlePaymentCreated', () => {
    it('should send payment notification', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);

      const booking = createMockBooking({ paidAmount: 100000000 });
      bookingRepo.findOne.mockResolvedValue(booking);

      telegramService.sendMessage.mockResolvedValue(true);

      const event = new PaymentCreatedEvent(
        1,
        1,
        42,
        100000000,
        'cash',
        100000000,
        200000000,
        1,
      );

      await service.handlePaymentCreated(event);

      expect(telegramService.sendMessage).toHaveBeenCalledTimes(2);

      const message = telegramService.sendMessage.mock.calls[0][1];
      expect(message).toContain('Оплата получена');
      expect(message).toContain('BK-2025-0001');
    });

    it('should skip when eventPayment is disabled', async () => {
      const settings = createMockSettings({ eventPayment: false });
      settingsRepo.findOne.mockResolvedValue(settings);

      const event = new PaymentCreatedEvent(
        1,
        1,
        42,
        100000000,
        'cash',
        100000000,
        200000000,
        1,
      );

      await service.handlePaymentCreated(event);

      expect(telegramService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ── handleSyncError ───────────────────────────────────────────────────

  describe('handleSyncError', () => {
    it('should send sync error notification', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);
      telegramService.sendMessage.mockResolvedValue(true);

      await service.handleSyncError({
        propertyId: 42,
        channelType: 'booking_com',
        error: 'Connection timeout',
      });

      expect(telegramService.sendMessage).toHaveBeenCalledTimes(2);

      const message = telegramService.sendMessage.mock.calls[0][1];
      expect(message).toContain('Ошибка синхронизации');
      expect(message).toContain('booking_com');
      expect(message).toContain('Connection timeout');
    });

    it('should skip when eventSyncError is disabled', async () => {
      const settings = createMockSettings({ eventSyncError: false });
      settingsRepo.findOne.mockResolvedValue(settings);

      await service.handleSyncError({
        propertyId: 42,
        channelType: 'booking_com',
        error: 'Connection timeout',
      });

      expect(telegramService.sendMessage).not.toHaveBeenCalled();
    });
  });
});

// ── DailyDigestCron tests ─────────────────────────────────────────────────

import { DailyDigestCron } from './cron/daily-digest.cron';
import { Property } from '@/database/entities/property.entity';

describe('DailyDigestCron', () => {
  let cron: DailyDigestCron;
  let settingsRepo: jest.Mocked<Repository<NotificationSettings>>;
  let bookingRepo: any;
  let roomRepo: jest.Mocked<Repository<Room>>;
  let propertyRepo: jest.Mocked<Repository<Property>>;
  let notificationsService: jest.Mocked<NotificationsService>;

  // Mock QueryBuilder
  function createMockQb(result: { getMany?: any[]; getCount?: number; getRawOne?: any }) {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(result.getMany ?? []),
      getCount: jest.fn().mockResolvedValue(result.getCount ?? 0),
      getRawOne: jest.fn().mockResolvedValue(result.getRawOne ?? { total: '0' }),
    };
    return qb;
  }

  beforeEach(async () => {
    const mockQb = createMockQb({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyDigestCron,
        {
          provide: getRepositoryToken(NotificationSettings),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            count: jest.fn().mockResolvedValue(10),
          },
        },
        {
          provide: getRepositoryToken(Property),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendToTelegramRecipients: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    cron = module.get<DailyDigestCron>(DailyDigestCron);
    settingsRepo = module.get(getRepositoryToken(NotificationSettings));
    bookingRepo = module.get(getRepositoryToken(Booking));
    roomRepo = module.get(getRepositoryToken(Room));
    propertyRepo = module.get(getRepositoryToken(Property));
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(cron).toBeDefined();
  });

  describe('buildDigestData', () => {
    it('should build correct digest data structure', async () => {
      const property = {
        id: 42,
        name: 'Test Hotel',
      } as Property;
      propertyRepo.findOne.mockResolvedValue(property);

      const checkInBooking = createMockBooking({
        bookingNumber: 'BK-2025-0010',
      });
      const checkOutBooking = createMockBooking({
        bookingNumber: 'BK-2025-0005',
      });

      // First call: check-ins, second: check-outs, third: in-house, fourth: revenue
      const checkInQb = createMockQb({ getMany: [checkInBooking] });
      const checkOutQb = createMockQb({ getMany: [checkOutBooking] });
      const inHouseQb = createMockQb({ getMany: [checkInBooking] });
      const revenueQb = createMockQb({ getRawOne: { total: '50000000' } });

      bookingRepo.createQueryBuilder
        .mockReturnValueOnce(checkInQb)
        .mockReturnValueOnce(checkOutQb)
        .mockReturnValueOnce(inHouseQb)
        .mockReturnValueOnce(revenueQb);

      roomRepo.count.mockResolvedValue(10);

      const data = await cron.buildDigestData(42);

      expect(data).not.toBeNull();
      expect(data!.propertyName).toBe('Test Hotel');
      expect(data!.checkIns).toHaveLength(1);
      expect(data!.checkOuts).toHaveLength(1);
      expect(data!.totalRooms).toBe(10);
      expect(data!.occupiedRooms).toBe(1);
      expect(data!.occupancyPercent).toBe(10);
      expect(data!.todayRevenue).toBe(50000000);
      expect(data!.checkIns[0].guestName).toBe('Aziz Karimov');
      expect(data!.checkIns[0].roomName).toBe('Deluxe 101');
    });

    it('should return null if property not found', async () => {
      propertyRepo.findOne.mockResolvedValue(null);

      const data = await cron.buildDigestData(999);

      expect(data).toBeNull();
    });

    it('should handle zero rooms gracefully (0% occupancy)', async () => {
      const property = { id: 42, name: 'Empty Hotel' } as Property;
      propertyRepo.findOne.mockResolvedValue(property);

      const emptyQb = createMockQb({ getMany: [], getCount: 0 });
      bookingRepo.createQueryBuilder.mockReturnValue(emptyQb);
      roomRepo.count.mockResolvedValue(0);

      const data = await cron.buildDigestData(42);

      expect(data).not.toBeNull();
      expect(data!.occupancyPercent).toBe(0);
      expect(data!.checkIns).toHaveLength(0);
      expect(data!.checkOuts).toHaveLength(0);
    });
  });

  describe('handleDailyDigest', () => {
    it('should send digest to all enabled properties', async () => {
      const settings1 = createMockSettings({ propertyId: 42 });
      const settings2 = createMockSettings({ propertyId: 43 });
      settingsRepo.find.mockResolvedValue([settings1, settings2]);

      // Mock buildDigestData by mocking property lookups
      const property = { id: 42, name: 'Hotel A' } as Property;
      propertyRepo.findOne.mockResolvedValue(property);

      const emptyQb = createMockQb({ getMany: [] });
      bookingRepo.createQueryBuilder.mockReturnValue(emptyQb);
      roomRepo.count.mockResolvedValue(5);

      await cron.handleDailyDigest();

      // sendToTelegramRecipients should be called for each property
      expect(notificationsService.sendToTelegramRecipients).toHaveBeenCalledTimes(2);
    });

    it('should skip properties with no active recipients', async () => {
      const settings = createMockSettings({
        telegramRecipients: [
          { name: 'Inactive', chatId: '111', isActive: false },
        ],
      });
      settingsRepo.find.mockResolvedValue([settings]);

      await cron.handleDailyDigest();

      expect(notificationsService.sendToTelegramRecipients).not.toHaveBeenCalled();
    });

    it('should handle no properties with digest enabled', async () => {
      settingsRepo.find.mockResolvedValue([]);

      await cron.handleDailyDigest();

      expect(notificationsService.sendToTelegramRecipients).not.toHaveBeenCalled();
    });
  });
});

// ── Template tests ──────────────────────────────────────────────────────────

import {
  newBookingTemplate,
  cancellationTemplate,
  paymentReceivedTemplate,
  syncErrorTemplate,
  dailyDigestTemplate,
  testMessageTemplate,
} from './telegram/telegram.templates';

describe('Telegram Templates', () => {
  describe('newBookingTemplate', () => {
    it('should format new booking message with all fields', () => {
      const booking = createMockBooking();
      const guest = booking.guest!;
      const room = booking.room!;

      const message = newBookingTemplate(booking, guest, room);

      expect(message).toContain('Новое бронирование #BK-2025-0001');
      expect(message).toContain('Aziz Karimov');
      expect(message).toContain('Deluxe 101');
      expect(message).toContain('4'); // nights
      expect(message).toContain('2 000 000 сум'); // 200000000 tiyin = 2 000 000 sum
      expect(message).toContain('Прямое'); // direct source
    });
  });

  describe('cancellationTemplate', () => {
    it('should format cancellation with reason', () => {
      const booking = createMockBooking({
        cancelReason: 'Guest requested cancellation',
      });

      const message = cancellationTemplate(booking);

      expect(message).toContain('Отмена бронирования #BK-2025-0001');
      expect(message).toContain('Guest requested cancellation');
      expect(message).toContain('номер освобождён');
    });
  });

  describe('paymentReceivedTemplate', () => {
    it('should format payment with remaining balance', () => {
      const booking = createMockBooking({
        totalAmount: 200000000,
        paidAmount: 100000000,
      });
      const payment = {
        amount: 100000000,
        method: 'cash' as PaymentMethod,
        reference: null,
      } as Payment;

      const message = paymentReceivedTemplate(booking, payment);

      expect(message).toContain('Оплата получена');
      expect(message).toContain('BK-2025-0001');
      expect(message).toContain('Наличные'); // cash method
      expect(message).toContain('1 000 000 сум'); // payment amount
    });

    it('should show fully paid message when balance is zero', () => {
      const booking = createMockBooking({
        totalAmount: 200000000,
        paidAmount: 200000000,
      });
      const payment = {
        amount: 100000000,
        method: 'payme' as PaymentMethod,
        reference: 'TXN123',
      } as Payment;

      const message = paymentReceivedTemplate(booking, payment);

      expect(message).toContain('Полностью оплачено');
    });
  });

  describe('syncErrorTemplate', () => {
    it('should format sync error alert', () => {
      const message = syncErrorTemplate('booking_com', 'Connection timeout');

      expect(message).toContain('Ошибка синхронизации');
      expect(message).toContain('booking_com');
      expect(message).toContain('Connection timeout');
    });
  });

  describe('dailyDigestTemplate', () => {
    it('should format daily digest with check-ins and check-outs', () => {
      const message = dailyDigestTemplate({
        propertyName: 'Sardoba Hotel',
        date: '2025-07-01',
        checkIns: [
          {
            bookingNumber: 'BK-001',
            guestName: 'Aziz Karimov',
            roomName: 'Deluxe 101',
            nights: 3,
          },
        ],
        checkOuts: [
          {
            bookingNumber: 'BK-002',
            guestName: 'Dildora Khamidova',
            roomName: 'Standard 205',
          },
        ],
        occupiedRooms: 8,
        totalRooms: 10,
        occupancyPercent: 80,
        todayRevenue: 500000000,
        inHouseGuests: 15,
      });

      expect(message).toContain('Утренний дайджест');
      expect(message).toContain('Sardoba Hotel');
      expect(message).toContain('8/10');
      expect(message).toContain('80%');
      expect(message).toContain('15'); // in-house guests
      expect(message).toContain('Заезды сегодня (1)');
      expect(message).toContain('BK-001');
      expect(message).toContain('Aziz Karimov');
      expect(message).toContain('Выезды сегодня (1)');
      expect(message).toContain('BK-002');
    });

    it('should handle empty check-ins and check-outs', () => {
      const message = dailyDigestTemplate({
        propertyName: 'Sardoba Hotel',
        date: '2025-07-01',
        checkIns: [],
        checkOuts: [],
        occupiedRooms: 0,
        totalRooms: 10,
        occupancyPercent: 0,
        todayRevenue: 0,
        inHouseGuests: 0,
      });

      expect(message).toContain('Заезды сегодня: нет');
      expect(message).toContain('Выезды сегодня: нет');
    });
  });

  describe('testMessageTemplate', () => {
    it('should format test message', () => {
      const message = testMessageTemplate('Sardoba Hotel');

      expect(message).toContain('Тестовое сообщение');
      expect(message).toContain('Sardoba Hotel');
      expect(message).toContain('корректно');
    });
  });
});
