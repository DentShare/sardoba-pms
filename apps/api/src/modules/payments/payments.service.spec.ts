import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Payment, PaymentMethod } from '@/database/entities/payment.entity';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { PaymentsService } from './payments.service';
import { PaymeService } from './payme.service';
import { PaymentCreatedEvent } from './events/payment-created.event';

// ── Helpers ─────────────────────────────────────────────────────────────────

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
    totalAmount: 20000000, // 200,000 som = 20,000,000 tiyin
    paidAmount: 0,
    status: 'confirmed' as BookingStatus,
    source: 'direct',
    sourceReference: null,
    notes: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: 1,
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

function createMockPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    bookingId: 1,
    amount: 5000000,
    method: 'cash' as PaymentMethod,
    paidAt: new Date('2025-07-01T10:00:00Z'),
    notes: null,
    reference: null,
    createdBy: 1,
    createdAt: new Date('2025-07-01T10:00:00Z'),
    booking: createMockBooking(),
    createdByUser: {} as any,
    ...overrides,
  } as Payment;
}

// ── PaymentsService Test Suite ──────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: jest.Mocked<Repository<Payment>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data: any) => data),
            save: jest.fn().mockImplementation(async (data: any) => ({
              id: 1,
              createdAt: new Date(),
              ...data,
            })),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
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

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    bookingRepo = module.get(getRepositoryToken(Booking));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a cash payment successfully', async () => {
      const booking = createMockBooking({
        totalAmount: 20000000,
        paidAmount: 0,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const result = await service.create(1, 42, 1, {
        amount: 5000000,
        method: 'cash',
        notes: 'Partial payment',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(5000000);
      expect(result.method).toBe('cash');
      expect(result.notes).toBe('Partial payment');

      // Verify booking paidAmount was updated
      expect(bookingRepo.update).toHaveBeenCalledWith(1, {
        paidAmount: 5000000,
      });

      // Verify event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.created',
        expect.any(PaymentCreatedEvent),
      );
    });

    it('should throw OVERPAYMENT when amount exceeds remaining balance', async () => {
      const booking = createMockBooking({
        totalAmount: 10000000,
        paidAmount: 8000000,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.create(1, 42, 1, {
          amount: 5000000, // 5M tiyin but only 2M remaining
          method: 'cash',
        }),
      ).rejects.toThrow(SardobaException);

      await expect(
        service.create(1, 42, 1, {
          amount: 5000000,
          method: 'cash',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.OVERPAYMENT,
      });
    });

    it('should throw BOOKING_CANCELLED when booking is cancelled', async () => {
      const booking = createMockBooking({ status: 'cancelled' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.create(1, 42, 1, {
          amount: 5000000,
          method: 'cash',
        }),
      ).rejects.toThrow(SardobaException);

      await expect(
        service.create(1, 42, 1, {
          amount: 5000000,
          method: 'cash',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should throw BOOKING_CANCELLED when booking is no_show', async () => {
      const booking = createMockBooking({ status: 'no_show' });
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.create(1, 42, 1, {
          amount: 5000000,
          method: 'cash',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.BOOKING_CANCELLED,
      });
    });

    it('should throw NOT_FOUND when booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(999, 42, 1, {
          amount: 5000000,
          method: 'cash',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it('should allow payment equal to remaining balance', async () => {
      const booking = createMockBooking({
        totalAmount: 10000000,
        paidAmount: 7000000,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const result = await service.create(1, 42, 1, {
        amount: 3000000, // exactly remaining
        method: 'card',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(3000000);
      expect(bookingRepo.update).toHaveBeenCalledWith(1, {
        paidAmount: 10000000,
      });
    });

    it('should allow payments to checked_in bookings', async () => {
      const booking = createMockBooking({
        status: 'checked_in',
        totalAmount: 10000000,
        paidAmount: 0,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const result = await service.create(1, 42, 1, {
        amount: 5000000,
        method: 'transfer',
      });

      expect(result).toBeDefined();
    });

    it('should set custom paid_at when provided', async () => {
      const booking = createMockBooking({
        totalAmount: 20000000,
        paidAmount: 0,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.create(1, 42, 1, {
        amount: 5000000,
        method: 'cash',
        paid_at: '2025-06-30T12:00:00Z',
      });

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAt: new Date('2025-06-30T12:00:00Z'),
        }),
      );
    });

    it('should set reference when provided', async () => {
      const booking = createMockBooking({
        totalAmount: 20000000,
        paidAmount: 0,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.create(1, 42, 1, {
        amount: 5000000,
        method: 'transfer',
        reference: 'TXN-ABC-123',
      });

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'TXN-ABC-123',
        }),
      );
    });
  });

  // ── findByBooking ───────────────────────────────────────────────────────

  describe('findByBooking', () => {
    it('should return payments with balance info', async () => {
      const booking = createMockBooking({
        totalAmount: 20000000,
        paidAmount: 5000000,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const payments = [
        createMockPayment({ id: 1, amount: 3000000 }),
        createMockPayment({ id: 2, amount: 2000000 }),
      ];
      paymentRepo.find.mockResolvedValue(payments);

      const result = await service.findByBooking(1, 42);

      expect(result.data).toHaveLength(2);
      expect(result.total_amount).toBe(20000000);
      expect(result.paid_amount).toBe(5000000);
      expect(result.balance).toBe(15000000);
    });

    it('should throw NOT_FOUND for non-existent booking', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.findByBooking(999, 42)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a payment and update booking paidAmount', async () => {
      const booking = createMockBooking({ paidAmount: 8000000 });
      const payment = createMockPayment({
        id: 5,
        amount: 3000000,
        booking,
      });
      paymentRepo.findOne.mockResolvedValue(payment);

      const result = await service.remove(5, 1);

      expect(result).toEqual({ deleted: true, id: 5 });
      expect(bookingRepo.update).toHaveBeenCalledWith(booking.id, {
        paidAmount: 5000000, // 8M - 3M
      });
      expect(paymentRepo.remove).toHaveBeenCalledWith(payment);
    });

    it('should throw NOT_FOUND for non-existent payment', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ── getBalance ──────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('should return correct balance', async () => {
      const booking = createMockBooking({
        totalAmount: 20000000,
        paidAmount: 7000000,
      });
      bookingRepo.findOne.mockResolvedValue(booking);

      const result = await service.getBalance(1, 42);

      expect(result).toEqual({
        booking_id: 1,
        total: 20000000,
        paid: 7000000,
        balance: 13000000,
      });
    });
  });
});

// ── PaymeService Test Suite ─────────────────────────────────────────────────

describe('PaymeService', () => {
  let paymeService: PaymeService;
  let paymentsService: jest.Mocked<PaymentsService>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;

  const MERCHANT_ID = 'test_merchant';
  const SECRET_KEY = 'test_secret';
  const validAuth = `Basic ${Buffer.from(`${MERCHANT_ID}:${SECRET_KEY}`).toString('base64')}`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                PAYME_MERCHANT_ID: MERCHANT_ID,
                PAYME_SECRET_KEY: SECRET_KEY,
              };
              return config[key] ?? defaultValue ?? '';
            }),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            createFromWebhook: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    paymeService = module.get<PaymeService>(PaymeService);
    paymentsService = module.get(PaymentsService);
    bookingRepo = module.get(getRepositoryToken(Booking));
  });

  it('should be defined', () => {
    expect(paymeService).toBeDefined();
  });

  // ── Authentication ──────────────────────────────────────────────────────

  describe('verifyAuth', () => {
    it('should accept valid Basic auth', () => {
      expect(paymeService.verifyAuth(validAuth)).toBe(true);
    });

    it('should reject missing auth header', () => {
      expect(paymeService.verifyAuth(undefined)).toBe(false);
    });

    it('should reject invalid auth header', () => {
      const invalidAuth = `Basic ${Buffer.from('wrong:credentials').toString('base64')}`;
      expect(paymeService.verifyAuth(invalidAuth)).toBe(false);
    });

    it('should reject non-Basic auth', () => {
      expect(paymeService.verifyAuth('Bearer some-token')).toBe(false);
    });
  });

  // ── Webhook handling ────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('should reject invalid signature with error code -32504', async () => {
      const result = await paymeService.handleWebhook(
        { id: 1, method: 'CheckPerformTransaction', params: {} },
        'Basic invalid',
      );

      expect(result).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32504,
        },
      });
    });

    it('should reject unknown method with error code -32601', async () => {
      const result = await paymeService.handleWebhook(
        { id: 1, method: 'UnknownMethod', params: {} },
        validAuth,
      );

      expect(result).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
        },
      });
    });

    // ── CheckPerformTransaction ───────────────────────────────────────────

    describe('CheckPerformTransaction', () => {
      it('should allow valid booking', async () => {
        const booking = createMockBooking({
          totalAmount: 20000000,
          paidAmount: 0,
          status: 'confirmed',
        });
        bookingRepo.findOne.mockResolvedValue(booking);

        const result = await paymeService.handleWebhook(
          {
            id: 1,
            method: 'CheckPerformTransaction',
            params: {
              amount: 10000000,
              account: { booking_id: '1' },
            },
          },
          validAuth,
        );

        expect(result).toMatchObject({
          jsonrpc: '2.0',
          id: 1,
          result: { allow: true },
        });
      });

      it('should reject cancelled booking', async () => {
        const booking = createMockBooking({ status: 'cancelled' });
        bookingRepo.findOne.mockResolvedValue(booking);

        const result = await paymeService.handleWebhook(
          {
            id: 1,
            method: 'CheckPerformTransaction',
            params: {
              amount: 10000000,
              account: { booking_id: '1' },
            },
          },
          validAuth,
        );

        expect(result).toHaveProperty('error');
        expect((result as any).error.code).toBe(-31008);
      });
    });

    // ── PerformTransaction flow ───────────────────────────────────────────

    describe('PerformTransaction', () => {
      it('should create payment when performing a valid transaction', async () => {
        const booking = createMockBooking({
          totalAmount: 20000000,
          paidAmount: 0,
          status: 'confirmed',
        });
        bookingRepo.findOne.mockResolvedValue(booking);

        const mockPayment = createMockPayment({
          id: 10,
          amount: 5000000,
          method: 'payme',
        });
        paymentsService.createFromWebhook.mockResolvedValue(mockPayment);

        // Step 1: CreateTransaction
        const createResult = await paymeService.handleWebhook(
          {
            id: 1,
            method: 'CreateTransaction',
            params: {
              id: 'txn-001',
              amount: 5000000,
              time: Date.now(),
              account: { booking_id: '1' },
            },
          },
          validAuth,
        );

        expect(createResult).toMatchObject({
          jsonrpc: '2.0',
          id: 1,
          result: {
            transaction: 'txn-001',
            state: 1,
          },
        });

        // Step 2: PerformTransaction
        const performResult = await paymeService.handleWebhook(
          {
            id: 2,
            method: 'PerformTransaction',
            params: { id: 'txn-001' },
          },
          validAuth,
        );

        expect(performResult).toMatchObject({
          jsonrpc: '2.0',
          id: 2,
          result: {
            transaction: 'txn-001',
            state: 2,
          },
        });

        // Verify payment was created via webhook
        expect(paymentsService.createFromWebhook).toHaveBeenCalledWith(
          1,          // bookingId
          5000000,    // amount
          'payme',    // method
          'payme:txn-001', // reference
        );
      });

      it('should return error for non-existent transaction', async () => {
        const result = await paymeService.handleWebhook(
          {
            id: 1,
            method: 'PerformTransaction',
            params: { id: 'nonexistent' },
          },
          validAuth,
        );

        expect(result).toHaveProperty('error');
        expect((result as any).error.code).toBe(-31003);
      });

      it('should be idempotent for already-performed transactions', async () => {
        const booking = createMockBooking({
          totalAmount: 20000000,
          paidAmount: 0,
        });
        bookingRepo.findOne.mockResolvedValue(booking);

        const mockPayment = createMockPayment();
        paymentsService.createFromWebhook.mockResolvedValue(mockPayment);

        // Create + Perform
        await paymeService.handleWebhook(
          {
            id: 1,
            method: 'CreateTransaction',
            params: {
              id: 'txn-idem',
              amount: 5000000,
              time: Date.now(),
              account: { booking_id: '1' },
            },
          },
          validAuth,
        );

        await paymeService.handleWebhook(
          {
            id: 2,
            method: 'PerformTransaction',
            params: { id: 'txn-idem' },
          },
          validAuth,
        );

        // Perform again (idempotent)
        const result = await paymeService.handleWebhook(
          {
            id: 3,
            method: 'PerformTransaction',
            params: { id: 'txn-idem' },
          },
          validAuth,
        );

        expect(result).toMatchObject({
          jsonrpc: '2.0',
          id: 3,
          result: {
            transaction: 'txn-idem',
            state: 2,
          },
        });

        // createFromWebhook should only be called once
        expect(paymentsService.createFromWebhook).toHaveBeenCalledTimes(1);
      });
    });

    // ── CancelTransaction ─────────────────────────────────────────────────

    describe('CancelTransaction', () => {
      it('should cancel a created transaction', async () => {
        const booking = createMockBooking({
          totalAmount: 20000000,
          paidAmount: 0,
        });
        bookingRepo.findOne.mockResolvedValue(booking);

        // Create transaction
        await paymeService.handleWebhook(
          {
            id: 1,
            method: 'CreateTransaction',
            params: {
              id: 'txn-cancel',
              amount: 5000000,
              time: Date.now(),
              account: { booking_id: '1' },
            },
          },
          validAuth,
        );

        // Cancel transaction
        const result = await paymeService.handleWebhook(
          {
            id: 2,
            method: 'CancelTransaction',
            params: { id: 'txn-cancel', reason: 1 },
          },
          validAuth,
        );

        expect(result).toMatchObject({
          jsonrpc: '2.0',
          id: 2,
          result: {
            transaction: 'txn-cancel',
            state: -1, // cancelled before perform
          },
        });
      });
    });

    // ── CheckTransaction ──────────────────────────────────────────────────

    describe('CheckTransaction', () => {
      it('should return transaction state', async () => {
        const booking = createMockBooking({
          totalAmount: 20000000,
          paidAmount: 0,
        });
        bookingRepo.findOne.mockResolvedValue(booking);

        // Create
        await paymeService.handleWebhook(
          {
            id: 1,
            method: 'CreateTransaction',
            params: {
              id: 'txn-check',
              amount: 5000000,
              time: 1700000000000,
              account: { booking_id: '1' },
            },
          },
          validAuth,
        );

        // Check
        const result = await paymeService.handleWebhook(
          {
            id: 2,
            method: 'CheckTransaction',
            params: { id: 'txn-check' },
          },
          validAuth,
        );

        expect(result).toMatchObject({
          jsonrpc: '2.0',
          id: 2,
          result: {
            transaction: 'txn-check',
            state: 1,
            create_time: 1700000000000,
          },
        });
      });
    });
  });
});
