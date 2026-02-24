import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestsService } from './guests.service';
import { CryptoService } from './crypto.service';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 1,
    propertyId: 42,
    firstName: 'Anvar',
    lastName: 'Karimov',
    phone: '+998901234567',
    email: 'anvar@example.com',
    nationality: 'UZ',
    documentType: 'passport',
    documentNumber: null,
    dateOfBirth: '1990-05-15',
    isVip: false,
    notes: null,
    totalRevenue: 0,
    visitCount: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    property: {} as any,
    bookings: [],
    ...overrides,
  } as Guest;
}

function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    bookingNumber: 'BK-20250601-001',
    propertyId: 42,
    roomId: 1,
    guestId: 1,
    rateId: null,
    checkIn: '2025-06-01',
    checkOut: '2025-06-05',
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
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    property: {} as any,
    room: { name: 'Deluxe 101' } as any,
    guest: {} as any,
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
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
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

// ── Mock CryptoService ──────────────────────────────────────────────────────

const mockCryptoService = {
  encrypt: jest.fn((text: string) => {
    // Simple reversible mock: prepend "ENC:" and convert to hex
    return Buffer.from(`ENC:${text}`).toString('hex');
  }),
  decrypt: jest.fn((hex: string) => {
    const decoded = Buffer.from(hex, 'hex').toString('utf8');
    return decoded.replace(/^ENC:/, '');
  }),
};

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('GuestsService', () => {
  let service: GuestsService;
  let guestRepo: jest.Mocked<Repository<Guest>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: getRepositoryToken(Guest),
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
          provide: getRepositoryToken(Booking),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
    guestRepo = module.get(getRepositoryToken(Guest));
    bookingRepo = module.get(getRepositoryToken(Booking));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create guest and encrypt documentNumber', async () => {
      const dto = {
        first_name: 'Anvar',
        last_name: 'Karimov',
        phone: '+998901234567',
        document_type: 'passport' as const,
        document_number: 'AA1234567',
      };

      // No duplicate phone
      const phoneCheckQb = createMockQueryBuilder({ getOne: null });
      guestRepo.createQueryBuilder.mockReturnValue(phoneCheckQb);

      const createdGuest = createMockGuest({
        documentNumber: Buffer.from(
          mockCryptoService.encrypt('AA1234567'),
          'hex',
        ),
      });
      guestRepo.create.mockReturnValue(createdGuest);
      guestRepo.save.mockResolvedValue(createdGuest);

      const result = await service.create(42, dto);

      // Verify encrypt was called with the document number
      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('AA1234567');

      // Verify repository create received encrypted buffer
      expect(guestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 42,
          firstName: 'Anvar',
          lastName: 'Karimov',
          phone: '+998901234567',
          documentType: 'passport',
          documentNumber: expect.any(Buffer),
        }),
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('first_name', 'Anvar');
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should decrypt documentNumber only on getById', async () => {
      const encryptedHex = mockCryptoService.encrypt('AA1234567');
      const guest = createMockGuest({
        documentNumber: Buffer.from(encryptedHex, 'hex'),
      });
      guestRepo.findOne.mockResolvedValue(guest);

      // Mock bookings query
      const bookingsQb = createMockQueryBuilder({
        getMany: [createMockBooking()],
      });
      bookingRepo.createQueryBuilder.mockReturnValue(bookingsQb);

      const result = await service.findOne(1, 42) as any;

      // decrypt should have been called
      expect(mockCryptoService.decrypt).toHaveBeenCalled();

      // Response should include decrypted document_number
      expect(result.document_number).toBe('AA1234567');

      // Response should include bookings
      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0]).toHaveProperty('booking_number');
      expect(result.bookings[0]).toHaveProperty('room_name', 'Deluxe 101');
    });

    it('should NOT include documentNumber in list response', async () => {
      const guests = [createMockGuest()];
      const qb = createMockQueryBuilder({
        getManyAndCount: [guests, 1],
      });
      guestRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(42, {});
      const guestData = result.data[0] as any;

      // List format should NOT have document_number
      expect(guestData).not.toHaveProperty('document_number');
      // But should have other fields in snake_case
      expect(guestData).toHaveProperty('first_name');
      expect(guestData).toHaveProperty('last_name');
      expect(guestData).toHaveProperty('property_id');
    });

    it('should throw GUEST_NOT_FOUND for non-existent guest', async () => {
      guestRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 42)).rejects.toThrow(SardobaException);
      await expect(service.findOne(999, 42)).rejects.toMatchObject({
        code: ErrorCode.GUEST_NOT_FOUND,
      });
    });
  });

  // ── search ──────────────────────────────────────────────────────────────

  describe('search', () => {
    it('should return max 10 results by default', async () => {
      const guests = Array.from({ length: 10 }, (_, i) =>
        createMockGuest({
          id: i + 1,
          firstName: `Guest${i}`,
          lastName: `Last${i}`,
          phone: `+99890123456${i}`,
        }),
      );

      const qb = createMockQueryBuilder({ getMany: guests });
      guestRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search(42, 'Guest');

      expect(result).toHaveLength(10);
      expect(qb.limit).toHaveBeenCalledWith(10);

      // Each result should only have id, first_name, last_name, phone
      const first = result[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('first_name');
      expect(first).toHaveProperty('last_name');
      expect(first).toHaveProperty('phone');
    });

    it('should respect custom limit parameter', async () => {
      const qb = createMockQueryBuilder({ getMany: [] });
      guestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search(42, 'Test', 5);

      expect(qb.limit).toHaveBeenCalledWith(5);
    });
  });

  // ── duplicate phone ─────────────────────────────────────────────────────

  describe('duplicate phone detection', () => {
    it('should throw GUEST_DUPLICATE_PHONE on duplicate phone within property', async () => {
      const dto = {
        first_name: 'Anvar',
        last_name: 'Karimov',
        phone: '+998901234567',
      };

      // Phone already exists
      const existingGuest = createMockGuest();
      const phoneCheckQb = createMockQueryBuilder({ getOne: existingGuest });
      guestRepo.createQueryBuilder.mockReturnValue(phoneCheckQb);

      await expect(service.create(42, dto)).rejects.toThrow(SardobaException);
      await expect(service.create(42, dto)).rejects.toMatchObject({
        code: ErrorCode.GUEST_DUPLICATE_PHONE,
      });
    });
  });

  // ── findOrCreate ────────────────────────────────────────────────────────

  describe('findOrCreate', () => {
    it('should return existing guest when found by phone', async () => {
      const existingGuest = createMockGuest();
      guestRepo.findOne.mockResolvedValue(existingGuest);

      const dto = {
        first_name: 'Anvar',
        last_name: 'Karimov',
        phone: '+998901234567',
      };

      const result = await service.findOrCreate(42, dto) as any;

      expect(result.id).toBe(1);
      expect(result.phone).toBe('+998901234567');

      // Should NOT have called create
      expect(guestRepo.create).not.toHaveBeenCalled();
    });

    it('should create new guest when not found by phone', async () => {
      // findOne returns null (guest not found)
      guestRepo.findOne.mockResolvedValue(null);

      // Phone uniqueness check passes
      const phoneCheckQb = createMockQueryBuilder({ getOne: null });
      guestRepo.createQueryBuilder.mockReturnValue(phoneCheckQb);

      const newGuest = createMockGuest({ id: 99 });
      guestRepo.create.mockReturnValue(newGuest);
      guestRepo.save.mockResolvedValue(newGuest);

      const dto = {
        first_name: 'Bobur',
        last_name: 'Aliev',
        phone: '+998907654321',
      };

      const result = await service.findOrCreate(42, dto) as any;

      expect(guestRepo.create).toHaveBeenCalled();
      expect(guestRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should re-encrypt documentNumber when changed', async () => {
      const guest = createMockGuest();
      guestRepo.findOne.mockResolvedValue(guest);

      // No phone conflict
      const phoneCheckQb = createMockQueryBuilder({ getOne: null });
      guestRepo.createQueryBuilder.mockReturnValue(phoneCheckQb);

      guestRepo.save.mockImplementation(async (entity) => entity as Guest);

      await service.update(1, 42, { document_number: 'BB9999999' });

      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('BB9999999');
      expect(guestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          documentNumber: expect.any(Buffer),
        }),
      );
    });

    it('should throw GUEST_NOT_FOUND for non-existent guest', async () => {
      guestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, 42, { first_name: 'X' }),
      ).rejects.toMatchObject({
        code: ErrorCode.GUEST_NOT_FOUND,
      });
    });
  });

  // ── exportOvir ──────────────────────────────────────────────────────────

  describe('exportOvir', () => {
    it('should return CSV with UTF-8 BOM and semicolons', async () => {
      const guest = createMockGuest({
        documentNumber: Buffer.from(
          mockCryptoService.encrypt('AA1234567'),
          'hex',
        ),
      });
      const booking = createMockBooking({ guest });

      const qb = createMockQueryBuilder({ getMany: [booking] });
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const csv = await service.exportOvir(42, '2025-06-01', '2025-06-30');

      // Should start with BOM
      expect(csv.charCodeAt(0)).toBe(0xfeff);

      // Should use semicolons
      expect(csv).toContain(';');

      // Should contain guest data
      expect(csv).toContain('Karimov');
      expect(csv).toContain('Anvar');

      // Should contain header fields in Russian
      expect(csv).toContain('\u0424\u0430\u043C\u0438\u043B\u0438\u044F');
      expect(csv).toContain('\u0418\u043C\u044F');
    });
  });
});
