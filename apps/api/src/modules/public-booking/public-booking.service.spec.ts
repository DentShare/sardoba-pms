import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PublicBookingService } from './public-booking.service';
import { Property } from '@/database/entities/property.entity';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { BookingExtra } from '@/database/entities/booking-extra.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Room } from '@/database/entities/room.entity';
import { AvailabilityService } from '../bookings/availability.service';
import { BookingNumberService } from '../bookings/booking-number.service';
import { RatesService } from '../rates/rates.service';
import { GuestsService } from '../guests/guests.service';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const mockProperty: Partial<Property> = {
  id: 1,
  name: 'Sardoba Hotel',
  slug: 'sardoba-hotel',
  city: 'Samarkand',
  address: '123 Main St',
  phone: '+998901234567',
  description: 'A fine hotel',
  descriptionUz: 'Yaxshi mehmonxona',
  coverPhoto: '/photos/cover.jpg',
  photos: ['/photos/1.jpg', '/photos/2.jpg'],
  currency: 'UZS',
  checkinTime: '14:00',
  checkoutTime: '12:00',
  timezone: 'Asia/Tashkent',
  locale: 'ru',
  bookingEnabled: true,
};

const mockRoom1: Partial<Room> = {
  id: 10,
  propertyId: 1,
  name: 'Standard 101',
  roomType: 'double',
  floor: 1,
  capacityAdults: 2,
  capacityChildren: 1,
  basePrice: 50000000, // 500,000 som in tiyin
  status: 'active',
  amenities: ['wifi', 'tv'],
  descriptionRu: 'Стандартный номер',
  descriptionUz: 'Standart xona',
  photos: ['/photos/room1.jpg'],
  sortOrder: 1,
};

const mockRoom2: Partial<Room> = {
  id: 11,
  propertyId: 1,
  name: 'Suite 201',
  roomType: 'suite',
  floor: 2,
  capacityAdults: 3,
  capacityChildren: 2,
  basePrice: 100000000, // 1,000,000 som in tiyin
  status: 'active',
  amenities: ['wifi', 'tv', 'minibar'],
  descriptionRu: 'Люкс номер',
  descriptionUz: 'Lyuks xona',
  photos: ['/photos/room2.jpg'],
  sortOrder: 2,
};

const mockInactiveRoom: Partial<Room> = {
  id: 12,
  propertyId: 1,
  name: 'Maintenance 301',
  roomType: 'single',
  floor: 3,
  capacityAdults: 1,
  capacityChildren: 0,
  basePrice: 30000000,
  status: 'maintenance',
  amenities: ['wifi'],
  descriptionRu: null,
  descriptionUz: null,
  photos: [],
  sortOrder: 3,
};

const mockExtraBreakfast: Partial<PropertyExtra> = {
  id: 100,
  propertyId: 1,
  name: 'Breakfast',
  nameUz: 'Nonushta',
  description: 'Full buffet breakfast',
  price: 5000000, // 50,000 som per person
  priceType: 'per_person',
  icon: 'coffee',
  isActive: true,
  sortOrder: 1,
};

const mockExtraParking: Partial<PropertyExtra> = {
  id: 101,
  propertyId: 1,
  name: 'Parking',
  nameUz: 'Avtostoyanka',
  description: 'Underground parking',
  price: 3000000, // 30,000 som per night
  priceType: 'per_night',
  icon: 'car',
  isActive: true,
  sortOrder: 2,
};

const mockExtraTransfer: Partial<PropertyExtra> = {
  id: 102,
  propertyId: 1,
  name: 'Airport Transfer',
  nameUz: 'Aeroport transferi',
  description: 'One-way airport transfer',
  price: 15000000, // 150,000 som per booking
  priceType: 'per_booking',
  icon: 'plane',
  isActive: true,
  sortOrder: 3,
};

const mockInactiveExtra: Partial<PropertyExtra> = {
  id: 103,
  propertyId: 1,
  name: 'Spa Access',
  nameUz: null,
  description: 'Full day spa',
  price: 20000000,
  priceType: 'per_person',
  icon: 'spa',
  isActive: false,
  sortOrder: 4,
};

const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const createMockAvailabilityService = () => ({
  checkAvailability: jest.fn(),
});

const createMockBookingNumberService = () => ({
  generate: jest.fn(),
  generateInTransaction: jest.fn(),
});

const createMockRatesService = () => ({
  calculate: jest.fn(),
});

const createMockGuestsService = () => ({
  findOrCreate: jest.fn(),
});

// ─── Helper: future date strings (to avoid CHECKIN_BEFORE_TODAY) ──────────

function futureDateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const CHECKIN = futureDateStr(10);  // 10 days from now
const CHECKOUT = futureDateStr(13); // 13 days from now (3 nights)

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('PublicBookingService', () => {
  let service: PublicBookingService;
  let propertyRepository: ReturnType<typeof createMockRepository>;
  let propertyExtraRepository: ReturnType<typeof createMockRepository>;
  let bookingExtraRepository: ReturnType<typeof createMockRepository>;
  let bookingRepository: ReturnType<typeof createMockRepository>;
  let guestRepository: ReturnType<typeof createMockRepository>;
  let availabilityService: ReturnType<typeof createMockAvailabilityService>;
  let bookingNumberService: ReturnType<typeof createMockBookingNumberService>;
  let ratesService: ReturnType<typeof createMockRatesService>;
  let guestsService: ReturnType<typeof createMockGuestsService>;
  let dataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
    query: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    propertyRepository = createMockRepository();
    propertyExtraRepository = createMockRepository();
    bookingExtraRepository = createMockRepository();
    bookingRepository = createMockRepository();
    guestRepository = createMockRepository();
    availabilityService = createMockAvailabilityService();
    bookingNumberService = createMockBookingNumberService();
    ratesService = createMockRatesService();
    guestsService = createMockGuestsService();
    dataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn(),
      query: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicBookingService,
        { provide: getRepositoryToken(Property), useValue: propertyRepository },
        { provide: getRepositoryToken(PropertyExtra), useValue: propertyExtraRepository },
        { provide: getRepositoryToken(BookingExtra), useValue: bookingExtraRepository },
        { provide: getRepositoryToken(Booking), useValue: bookingRepository },
        { provide: getRepositoryToken(Guest), useValue: guestRepository },
        { provide: AvailabilityService, useValue: availabilityService },
        { provide: BookingNumberService, useValue: bookingNumberService },
        { provide: RatesService, useValue: ratesService },
        { provide: GuestsService, useValue: guestsService },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PublicBookingService>(PublicBookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getHotelBySlug ─────────────────────────────────────────────────────────

  describe('getHotelBySlug', () => {
    it('should return hotel profile with active rooms and extras', async () => {
      const propertyWithRelations = {
        ...mockProperty,
        rooms: [mockRoom1, mockRoom2, mockInactiveRoom],
        extras: [mockExtraBreakfast, mockExtraParking, mockExtraTransfer, mockInactiveExtra],
      };
      propertyRepository.findOne.mockResolvedValue(propertyWithRelations);

      const result = await service.getHotelBySlug('sardoba-hotel');

      expect(propertyRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'sardoba-hotel' },
        relations: ['rooms', 'extras'],
      });

      // Property info
      expect(result.property).toEqual({
        name: 'Sardoba Hotel',
        slug: 'sardoba-hotel',
        city: 'Samarkand',
        address: '123 Main St',
        phone: '+998901234567',
        description: 'A fine hotel',
        description_uz: 'Yaxshi mehmonxona',
        cover_photo: '/photos/cover.jpg',
        photos: ['/photos/1.jpg', '/photos/2.jpg'],
        currency: 'UZS',
        checkin_time: '14:00',
        checkout_time: '12:00',
        timezone: 'Asia/Tashkent',
        locale: 'ru',
      });

      // Only active rooms returned (maintenance room filtered out)
      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0].id).toBe(10);
      expect(result.rooms[0].name).toBe('Standard 101');
      expect(result.rooms[0].room_type).toBe('double');
      expect(result.rooms[0].base_price).toBe(50000000);
      expect(result.rooms[1].id).toBe(11);

      // Only active extras returned (inactive spa filtered out)
      expect(result.extras).toHaveLength(3);
      expect(result.extras[0].id).toBe(100);
      expect(result.extras[0].name).toBe('Breakfast');
      expect(result.extras[0].price_type).toBe('per_person');
      expect(result.extras[1].id).toBe(101);
      expect(result.extras[2].id).toBe(102);
    });

    it('should throw NOT_FOUND when slug does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getHotelBySlug('nonexistent'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getHotelBySlug('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'property',
          slug: 'nonexistent',
        });
      }
    });

    it('should throw NOT_FOUND when bookingEnabled is false', async () => {
      propertyRepository.findOne.mockResolvedValue({
        ...mockProperty,
        bookingEnabled: false,
        rooms: [],
        extras: [],
      });

      await expect(
        service.getHotelBySlug('sardoba-hotel'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getHotelBySlug('sardoba-hotel');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should return empty rooms and extras arrays when property has none', async () => {
      propertyRepository.findOne.mockResolvedValue({
        ...mockProperty,
        rooms: [],
        extras: [],
      });

      const result = await service.getHotelBySlug('sardoba-hotel');

      expect(result.rooms).toEqual([]);
      expect(result.extras).toEqual([]);
    });

    it('should sort rooms by sortOrder then by name', async () => {
      const roomB = { ...mockRoom1, id: 20, name: 'B Room', sortOrder: 1 };
      const roomA = { ...mockRoom1, id: 21, name: 'A Room', sortOrder: 1 };
      const roomFirst = { ...mockRoom1, id: 22, name: 'Z Room', sortOrder: 0 };

      propertyRepository.findOne.mockResolvedValue({
        ...mockProperty,
        rooms: [roomB, roomA, roomFirst],
        extras: [],
      });

      const result = await service.getHotelBySlug('sardoba-hotel');

      expect(result.rooms[0].name).toBe('Z Room');  // sortOrder 0
      expect(result.rooms[1].name).toBe('A Room');   // sortOrder 1, 'A' < 'B'
      expect(result.rooms[2].name).toBe('B Room');   // sortOrder 1, 'B' > 'A'
    });
  });

  // ─── getAvailableRooms ──────────────────────────────────────────────────────

  describe('getAvailableRooms', () => {
    it('should return rooms with availability status and calculated prices', async () => {
      // findPropertyBySlug (private) calls propertyRepository.findOne with bookingEnabled filter
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      // getActiveRoomsForProperty uses dataSource.getRepository(Room).find
      const mockRoomRepo = {
        find: jest.fn().mockResolvedValue([mockRoom1, mockRoom2]),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
      };
      dataSource.getRepository.mockReturnValue(mockRoomRepo);

      availabilityService.checkAvailability
        .mockResolvedValueOnce({ available: true, blockedDates: [] })
        .mockResolvedValueOnce({ available: false, blockedDates: [CHECKIN] });

      ratesService.calculate
        .mockResolvedValueOnce({
          total: 150000000,
          price_per_night: 50000000,
          nights: 3,
          rate_applied: 'base',
          breakdown: [],
        })
        .mockResolvedValueOnce({
          total: 270000000,
          price_per_night: 90000000,
          nights: 3,
          rate_applied: 'seasonal',
          breakdown: [],
        });

      const result = await service.getAvailableRooms('sardoba-hotel', CHECKIN, CHECKOUT);

      expect(result.check_in).toBe(CHECKIN);
      expect(result.check_out).toBe(CHECKOUT);
      expect(result.rooms).toHaveLength(2);

      // Room 1: available
      expect(result.rooms[0].available).toBe(true);
      expect(result.rooms[0].blocked_dates).toEqual([]);
      expect(result.rooms[0].price.total).toBe(150000000);
      expect(result.rooms[0].price.rate_applied).toBe('base');

      // Room 2: not available
      expect(result.rooms[1].available).toBe(false);
      expect(result.rooms[1].blocked_dates).toEqual([CHECKIN]);
      expect(result.rooms[1].price.total).toBe(270000000);
      expect(result.rooms[1].price.rate_applied).toBe('seasonal');
    });

    it('should use base price fallback when rate calculation fails', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      const mockRoomRepo = {
        find: jest.fn().mockResolvedValue([mockRoom1]),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
      };
      dataSource.getRepository.mockReturnValue(mockRoomRepo);

      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      // Rate calculation throws (no applicable rate)
      ratesService.calculate.mockRejectedValue(
        new SardobaException(ErrorCode.RATE_NOT_FOUND, {}, 'No rate found'),
      );

      const result = await service.getAvailableRooms('sardoba-hotel', CHECKIN, CHECKOUT);

      expect(result.rooms).toHaveLength(1);
      // Fallback: basePrice * nights = 50000000 * 3 = 150000000
      expect(result.rooms[0].price.total).toBe(150000000);
      expect(result.rooms[0].price.price_per_night).toBe(50000000);
      expect(result.rooms[0].price.nights).toBe(3);
      expect(result.rooms[0].price.rate_applied).toBe('base');
    });

    it('should throw CHECKOUT_BEFORE_CHECKIN when dates are invalid', async () => {
      await expect(
        service.getAvailableRooms('sardoba-hotel', CHECKOUT, CHECKIN),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getAvailableRooms('sardoba-hotel', CHECKOUT, CHECKIN);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.CHECKOUT_BEFORE_CHECKIN);
      }
    });

    it('should throw NOT_FOUND when property slug does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getAvailableRooms('nonexistent', CHECKIN, CHECKOUT),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getAvailableRooms('nonexistent', CHECKIN, CHECKOUT);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });
  });

  // ─── calculatePrice ─────────────────────────────────────────────────────────

  describe('calculatePrice', () => {
    beforeEach(() => {
      // findPropertyBySlug
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      // verifyRoom uses dataSource.getRepository(Room).findOne
      const mockRoomRepo = {
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(mockRoom1),
        findOneBy: jest.fn().mockResolvedValue(mockRoom1),
      };
      dataSource.getRepository.mockReturnValue(mockRoomRepo);
    });

    it('should return room price when no extras selected', async () => {
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      const result = await service.calculatePrice(
        'sardoba-hotel',
        10,
        CHECKIN,
        CHECKOUT,
        2,
        [],
      );

      expect(result.room.total).toBe(150000000);
      expect(result.room.price_per_night).toBe(50000000);
      expect(result.room.nights).toBe(3);
      expect(result.extras).toEqual([]);
      expect(result.extras_total).toBe(0);
      expect(result.grand_total).toBe(150000000);
      expect(result.currency).toBe('UZS');
    });

    it('should calculate per_person extras correctly', async () => {
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      propertyExtraRepository.find.mockResolvedValue([
        mockExtraBreakfast,
      ]);

      // 2 adults, breakfast per_person: 5000000 * 1 quantity * 2 adults = 10000000
      const result = await service.calculatePrice(
        'sardoba-hotel',
        10,
        CHECKIN,
        CHECKOUT,
        2,
        [{ extra_id: 100, quantity: 1 }],
      );

      expect(result.extras).toHaveLength(1);
      expect(result.extras[0]).toEqual({
        extra_id: 100,
        name: 'Breakfast',
        quantity: 1,
        unit_price: 5000000,
        price_type: 'per_person',
        total: 10000000,
      });
      expect(result.extras_total).toBe(10000000);
      expect(result.grand_total).toBe(150000000 + 10000000);
    });

    it('should calculate per_night extras correctly', async () => {
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      propertyExtraRepository.find.mockResolvedValue([
        mockExtraParking,
      ]);

      // Parking per_night: 3000000 * 1 quantity * 3 nights = 9000000
      const result = await service.calculatePrice(
        'sardoba-hotel',
        10,
        CHECKIN,
        CHECKOUT,
        2,
        [{ extra_id: 101, quantity: 1 }],
      );

      expect(result.extras).toHaveLength(1);
      expect(result.extras[0]).toEqual({
        extra_id: 101,
        name: 'Parking',
        quantity: 1,
        unit_price: 3000000,
        price_type: 'per_night',
        total: 9000000,
      });
      expect(result.extras_total).toBe(9000000);
      expect(result.grand_total).toBe(150000000 + 9000000);
    });

    it('should calculate per_booking extras correctly', async () => {
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      propertyExtraRepository.find.mockResolvedValue([
        mockExtraTransfer,
      ]);

      // Transfer per_booking: 15000000 * 2 quantity = 30000000
      const result = await service.calculatePrice(
        'sardoba-hotel',
        10,
        CHECKIN,
        CHECKOUT,
        2,
        [{ extra_id: 102, quantity: 2 }],
      );

      expect(result.extras).toHaveLength(1);
      expect(result.extras[0]).toEqual({
        extra_id: 102,
        name: 'Airport Transfer',
        quantity: 2,
        unit_price: 15000000,
        price_type: 'per_booking',
        total: 30000000,
      });
      expect(result.extras_total).toBe(30000000);
      expect(result.grand_total).toBe(150000000 + 30000000);
    });

    it('should calculate multiple extras of different types combined', async () => {
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      propertyExtraRepository.find.mockResolvedValue([
        mockExtraBreakfast,
        mockExtraParking,
        mockExtraTransfer,
      ]);

      const result = await service.calculatePrice(
        'sardoba-hotel',
        10,
        CHECKIN,
        CHECKOUT,
        2,
        [
          { extra_id: 100, quantity: 1 }, // breakfast: 5000000 * 1 * 2 adults = 10000000
          { extra_id: 101, quantity: 1 }, // parking: 3000000 * 1 * 3 nights = 9000000
          { extra_id: 102, quantity: 1 }, // transfer: 15000000 * 1 = 15000000
        ],
      );

      expect(result.extras).toHaveLength(3);
      const totalExtras = 10000000 + 9000000 + 15000000; // = 34000000
      expect(result.extras_total).toBe(totalExtras);
      expect(result.grand_total).toBe(150000000 + totalExtras);
    });

    it('should throw NOT_FOUND when requested extra does not exist', async () => {
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      propertyExtraRepository.find.mockResolvedValue([mockExtraBreakfast]);

      await expect(
        service.calculatePrice(
          'sardoba-hotel',
          10,
          CHECKIN,
          CHECKOUT,
          2,
          [{ extra_id: 999, quantity: 1 }],
        ),
      ).rejects.toThrow(SardobaException);

      try {
        await service.calculatePrice(
          'sardoba-hotel',
          10,
          CHECKIN,
          CHECKOUT,
          2,
          [{ extra_id: 999, quantity: 1 }],
        );
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'extra',
          id: 999,
        });
      }
    });

    it('should use base price fallback when rate calculation fails', async () => {
      ratesService.calculate.mockRejectedValue(
        new SardobaException(ErrorCode.RATE_NOT_FOUND, {}, 'No rate'),
      );

      const result = await service.calculatePrice(
        'sardoba-hotel',
        10,
        CHECKIN,
        CHECKOUT,
        2,
        [],
      );

      // Fallback: basePrice 50000000 * 3 nights = 150000000
      expect(result.room.total).toBe(150000000);
      expect(result.room.price_per_night).toBe(50000000);
      expect(result.room.rate_applied).toBe('base');
    });

    it('should throw NOT_FOUND when room does not belong to property', async () => {
      const mockRoomRepo = {
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(null), // room not found for property
        findOneBy: jest.fn().mockResolvedValue(null),
      };
      dataSource.getRepository.mockReturnValue(mockRoomRepo);

      await expect(
        service.calculatePrice(
          'sardoba-hotel',
          999,
          CHECKIN,
          CHECKOUT,
          2,
          [],
        ),
      ).rejects.toThrow(SardobaException);

      try {
        await service.calculatePrice(
          'sardoba-hotel',
          999,
          CHECKIN,
          CHECKOUT,
          2,
          [],
        );
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw ROOM_NOT_AVAILABLE when room status is not active', async () => {
      const mockRoomRepo = {
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(mockInactiveRoom),
        findOneBy: jest.fn().mockResolvedValue(mockInactiveRoom),
      };
      dataSource.getRepository.mockReturnValue(mockRoomRepo);

      await expect(
        service.calculatePrice(
          'sardoba-hotel',
          12,
          CHECKIN,
          CHECKOUT,
          1,
          [],
        ),
      ).rejects.toThrow(SardobaException);

      try {
        await service.calculatePrice(
          'sardoba-hotel',
          12,
          CHECKIN,
          CHECKOUT,
          1,
          [],
        );
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.ROOM_NOT_AVAILABLE);
      }
    });
  });

  // ─── createPublicBooking ────────────────────────────────────────────────────

  describe('createPublicBooking', () => {
    const baseDto = {
      first_name: 'Aziz',
      last_name: 'Karimov',
      phone: '+998901234567',
      email: 'aziz@example.com',
      room_id: 10,
      check_in: CHECKIN,
      check_out: CHECKOUT,
      adults: 2,
      children: 0,
      notes: 'Late arrival',
      extras: [] as Array<{ extra_id: number; quantity: number }>,
    };

    const savedBooking = {
      id: 500,
      bookingNumber: 'BK-2025-0042',
      propertyId: 1,
      roomId: 10,
      guestId: 200,
      checkIn: CHECKIN,
      checkOut: CHECKOUT,
      nights: 3,
      adults: 2,
      children: 0,
      totalAmount: 150000000,
      paidAmount: 0,
      status: 'new',
      source: 'website',
      createdBy: 0,
      createdAt: new Date('2025-07-01T12:00:00Z'),
    };

    beforeEach(() => {
      // findPropertyBySlug
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      // verifyRoom uses dataSource.getRepository(Room)
      const mockRoomRepo = {
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(mockRoom1),
        findOneBy: jest.fn().mockResolvedValue(mockRoom1),
      };
      dataSource.getRepository.mockReturnValue(mockRoomRepo);

      // Availability check
      availabilityService.checkAvailability.mockResolvedValue({
        available: true,
        blockedDates: [],
      });

      // Guest find or create
      guestsService.findOrCreate.mockResolvedValue({ id: 200 });

      // Rate calculation
      ratesService.calculate.mockResolvedValue({
        total: 150000000,
        price_per_night: 50000000,
        nights: 3,
        rate_applied: 'base',
        breakdown: [],
      });

      // Transaction mock
      const mockManager: Partial<EntityManager> = {
        create: jest.fn().mockReturnValue(savedBooking),
        save: jest.fn().mockResolvedValue(savedBooking),
        query: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockManager as EntityManager);
      });

      // Booking number service
      bookingNumberService.generateInTransaction.mockResolvedValue('BK-2025-0042');
    });

    it('should create a public booking successfully (full flow)', async () => {
      const result = await service.createPublicBooking('sardoba-hotel', baseDto);

      // Verify property was found
      expect(propertyRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'sardoba-hotel', bookingEnabled: true },
      });

      // Verify room was checked
      expect(dataSource.getRepository).toHaveBeenCalled();

      // Verify availability was checked
      expect(availabilityService.checkAvailability).toHaveBeenCalledWith(
        10,
        CHECKIN,
        CHECKOUT,
      );

      // Verify guest findOrCreate
      expect(guestsService.findOrCreate).toHaveBeenCalledWith(1, {
        first_name: 'Aziz',
        last_name: 'Karimov',
        phone: '+998901234567',
        email: 'aziz@example.com',
      });

      // Verify rate calculation
      expect(ratesService.calculate).toHaveBeenCalledWith(1, 10, CHECKIN, CHECKOUT);

      // Verify transaction was called
      expect(dataSource.transaction).toHaveBeenCalled();

      // Verify booking number was generated in transaction
      expect(bookingNumberService.generateInTransaction).toHaveBeenCalled();

      // Verify event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          bookingId: 500,
          propertyId: 1,
          roomId: 10,
          guestId: 200,
          totalAmount: 150000000,
          bookingNumber: 'BK-2025-0042',
          createdBy: 0, // SYSTEM_USER_ID
        }),
      );

      // Verify response format
      expect(result).toEqual({
        booking_number: 'BK-2025-0042',
        property_name: 'Sardoba Hotel',
        room_name: 'Standard 101',
        check_in: CHECKIN,
        check_out: CHECKOUT,
        nights: 3,
        adults: 2,
        children: 0,
        total_amount: 150000000,
        currency: 'UZS',
        guest: {
          first_name: 'Aziz',
          last_name: 'Karimov',
          phone: '+998901234567',
          email: 'aziz@example.com',
        },
        extras: [],
        status: 'new',
        created_at: savedBooking.createdAt,
      });
    });

    it('should create booking with extras and calculate totals correctly', async () => {
      const dtoWithExtras = {
        ...baseDto,
        extras: [
          { extra_id: 100, quantity: 1 }, // breakfast per_person
          { extra_id: 101, quantity: 1 }, // parking per_night
        ],
      };

      propertyExtraRepository.find.mockResolvedValue([
        mockExtraBreakfast,
        mockExtraParking,
      ]);

      // breakfast: 5000000 * 1 * 2 adults = 10000000
      // parking: 3000000 * 1 * 3 nights = 9000000
      // room: 150000000
      // total: 150000000 + 10000000 + 9000000 = 169000000

      const bookingWithExtras = {
        ...savedBooking,
        totalAmount: 169000000,
      };

      const mockManager: Partial<EntityManager> = {
        create: jest.fn().mockReturnValue(bookingWithExtras),
        save: jest.fn().mockResolvedValue(bookingWithExtras),
        query: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockManager as EntityManager);
      });

      const result = await service.createPublicBooking('sardoba-hotel', dtoWithExtras);

      // Verify extras were resolved
      expect(propertyExtraRepository.find).toHaveBeenCalledWith({
        where: { propertyId: 1, isActive: true },
      });

      // Verify extras in response
      expect(result.extras).toHaveLength(2);
      expect(result.extras[0]).toEqual({
        property_extra_id: 100,
        quantity: 1,
        unit_price: 5000000,
        total_price: 10000000,
      });
      expect(result.extras[1]).toEqual({
        property_extra_id: 101,
        quantity: 1,
        unit_price: 3000000,
        total_price: 9000000,
      });

      // Verify booking extras were saved in transaction
      // manager.create should be called for booking + 2 booking extras = 3 times
      expect(mockManager.create).toHaveBeenCalledTimes(3);
      // manager.save should be called for booking + 2 booking extras = 3 times
      expect(mockManager.save).toHaveBeenCalledTimes(3);
    });

    it('should throw OVERBOOKING_DETECTED when room is not available', async () => {
      availabilityService.checkAvailability.mockResolvedValue({
        available: false,
        blockedDates: [CHECKIN, futureDateStr(11)],
      });

      await expect(
        service.createPublicBooking('sardoba-hotel', baseDto),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createPublicBooking('sardoba-hotel', baseDto);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.OVERBOOKING_DETECTED);
        expect((error as SardobaException).details).toEqual({
          blocked_dates: [CHECKIN, futureDateStr(11)],
        });
      }

      // Transaction should NOT be called
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should throw VALIDATION_ERROR when adults exceed room capacity', async () => {
      const dtoTooManyAdults = {
        ...baseDto,
        adults: 5, // room capacity is 2
      };

      await expect(
        service.createPublicBooking('sardoba-hotel', dtoTooManyAdults),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createPublicBooking('sardoba-hotel', dtoTooManyAdults);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as SardobaException).details).toEqual({
          adults: 5,
          capacity_adults: 2,
        });
      }
    });

    it('should throw VALIDATION_ERROR when children exceed room capacity', async () => {
      const dtoTooManyChildren = {
        ...baseDto,
        adults: 1,
        children: 5, // room capacity is 1
      };

      await expect(
        service.createPublicBooking('sardoba-hotel', dtoTooManyChildren),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createPublicBooking('sardoba-hotel', dtoTooManyChildren);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as SardobaException).details).toEqual({
          children: 5,
          capacity_children: 1,
        });
      }
    });

    it('should use base price fallback when rate calculation fails', async () => {
      ratesService.calculate.mockRejectedValue(
        new SardobaException(ErrorCode.RATE_NOT_FOUND, {}, 'No rate'),
      );

      const result = await service.createPublicBooking('sardoba-hotel', baseDto);

      // Fallback total: basePrice 50000000 * 3 nights = 150000000
      expect(result.total_amount).toBe(150000000);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw CHECKOUT_BEFORE_CHECKIN for reversed dates', async () => {
      const dtoReversedDates = {
        ...baseDto,
        check_in: CHECKOUT,
        check_out: CHECKIN,
      };

      await expect(
        service.createPublicBooking('sardoba-hotel', dtoReversedDates),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createPublicBooking('sardoba-hotel', dtoReversedDates);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.CHECKOUT_BEFORE_CHECKIN);
      }
    });

    it('should throw NOT_FOUND when extra does not exist during booking', async () => {
      const dtoWithBadExtra = {
        ...baseDto,
        extras: [{ extra_id: 999, quantity: 1 }],
      };

      propertyExtraRepository.find.mockResolvedValue([mockExtraBreakfast]);

      await expect(
        service.createPublicBooking('sardoba-hotel', dtoWithBadExtra),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createPublicBooking('sardoba-hotel', dtoWithBadExtra);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'extra',
          id: 999,
        });
      }
    });

    it('should set source=website and createdBy=0 (SYSTEM_USER_ID)', async () => {
      await service.createPublicBooking('sardoba-hotel', baseDto);

      // Verify the transaction callback created booking with correct fields
      const transactionCb = dataSource.transaction.mock.calls[0][0];
      const mockManagerVerify: Partial<EntityManager> = {
        create: jest.fn().mockReturnValue(savedBooking),
        save: jest.fn().mockResolvedValue(savedBooking),
        query: jest.fn(),
      };

      await transactionCb(mockManagerVerify);

      expect(mockManagerVerify.create).toHaveBeenCalledWith(
        Booking,
        expect.objectContaining({
          source: 'website',
          createdBy: 0,
          status: 'new',
          paidAmount: 0,
          rateId: null,
        }),
      );
    });

    it('should handle optional email as null in guest info', async () => {
      const dtoWithoutEmail = {
        ...baseDto,
        email: undefined,
      };

      const result = await service.createPublicBooking('sardoba-hotel', dtoWithoutEmail);

      expect(guestsService.findOrCreate).toHaveBeenCalledWith(1, {
        first_name: 'Aziz',
        last_name: 'Karimov',
        phone: '+998901234567',
        email: undefined,
      });

      expect(result.guest.email).toBeNull();
    });
  });

  // ─── getConfirmation ────────────────────────────────────────────────────────

  describe('getConfirmation', () => {
    it('should return booking confirmation with all details', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      const bookingWithRelations = {
        bookingNumber: 'BK-2025-0042',
        status: 'new',
        checkIn: CHECKIN,
        checkOut: CHECKOUT,
        nights: 3,
        adults: 2,
        children: 0,
        totalAmount: 169000000,
        notes: 'Late arrival',
        createdAt: new Date('2025-07-01T12:00:00Z'),
        room: {
          name: 'Standard 101',
          roomType: 'double',
        },
        guest: {
          firstName: 'Aziz',
          lastName: 'Karimov',
          phone: '+998901234567',
          email: 'aziz@example.com',
        },
        extras: [
          {
            quantity: 1,
            unitPrice: 5000000,
            totalPrice: 10000000,
            propertyExtra: { name: 'Breakfast' },
          },
          {
            quantity: 1,
            unitPrice: 3000000,
            totalPrice: 9000000,
            propertyExtra: { name: 'Parking' },
          },
        ],
      };

      bookingRepository.findOne.mockResolvedValue(bookingWithRelations);

      const result = await service.getConfirmation('sardoba-hotel', 'BK-2025-0042');

      // Verify correct query with relations
      expect(bookingRepository.findOne).toHaveBeenCalledWith({
        where: {
          bookingNumber: 'BK-2025-0042',
          propertyId: 1,
        },
        relations: ['room', 'guest', 'extras', 'extras.propertyExtra'],
      });

      expect(result).toEqual({
        booking_number: 'BK-2025-0042',
        status: 'new',
        property: {
          name: 'Sardoba Hotel',
          address: '123 Main St',
          phone: '+998901234567',
          checkin_time: '14:00',
          checkout_time: '12:00',
        },
        room: {
          name: 'Standard 101',
          room_type: 'double',
        },
        guest: {
          first_name: 'Aziz',
          last_name: 'Karimov',
          phone: '+998901234567',
          email: 'aziz@example.com',
        },
        check_in: CHECKIN,
        check_out: CHECKOUT,
        nights: 3,
        adults: 2,
        children: 0,
        total_amount: 169000000,
        currency: 'UZS',
        extras: [
          {
            name: 'Breakfast',
            quantity: 1,
            unit_price: 5000000,
            total_price: 10000000,
          },
          {
            name: 'Parking',
            quantity: 1,
            unit_price: 3000000,
            total_price: 9000000,
          },
        ],
        notes: 'Late arrival',
        created_at: new Date('2025-07-01T12:00:00Z'),
      });
    });

    it('should throw NOT_FOUND when booking number does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);
      bookingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getConfirmation('sardoba-hotel', 'BK-2025-9999'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getConfirmation('sardoba-hotel', 'BK-2025-9999');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'booking',
          booking_number: 'BK-2025-9999',
        });
      }
    });

    it('should throw NOT_FOUND when property slug does not exist', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getConfirmation('nonexistent', 'BK-2025-0042'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getConfirmation('nonexistent', 'BK-2025-0042');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should handle null room and guest relations gracefully', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      const bookingWithNullRelations = {
        bookingNumber: 'BK-2025-0042',
        status: 'cancelled',
        checkIn: CHECKIN,
        checkOut: CHECKOUT,
        nights: 3,
        adults: 1,
        children: 0,
        totalAmount: 50000000,
        notes: null,
        createdAt: new Date(),
        room: null,
        guest: null,
        extras: [],
      };

      bookingRepository.findOne.mockResolvedValue(bookingWithNullRelations);

      const result = await service.getConfirmation('sardoba-hotel', 'BK-2025-0042');

      expect(result.room).toBeNull();
      expect(result.guest).toBeNull();
      expect(result.extras).toEqual([]);
    });

    it('should handle extras with missing propertyExtra name', async () => {
      propertyRepository.findOne.mockResolvedValue(mockProperty);

      const bookingWithOrphanExtra = {
        bookingNumber: 'BK-2025-0042',
        status: 'new',
        checkIn: CHECKIN,
        checkOut: CHECKOUT,
        nights: 3,
        adults: 1,
        children: 0,
        totalAmount: 50000000,
        notes: null,
        createdAt: new Date(),
        room: { name: 'Room 1', roomType: 'single' },
        guest: { firstName: 'Test', lastName: 'User', phone: '+998900000000', email: null },
        extras: [
          {
            quantity: 1,
            unitPrice: 1000000,
            totalPrice: 1000000,
            propertyExtra: null, // deleted extra
          },
        ],
      };

      bookingRepository.findOne.mockResolvedValue(bookingWithOrphanExtra);

      const result = await service.getConfirmation('sardoba-hotel', 'BK-2025-0042');

      // Should use 'Unknown' fallback for missing propertyExtra
      expect(result.extras[0].name).toBe('Unknown');
    });
  });

  // ─── validateDates (tested through public methods) ──────────────────────────

  describe('validateDates (via public methods)', () => {
    it('should throw INVALID_DATE_RANGE for invalid date format', async () => {
      await expect(
        service.getAvailableRooms('sardoba-hotel', 'not-a-date', CHECKOUT),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getAvailableRooms('sardoba-hotel', 'not-a-date', CHECKOUT);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.INVALID_DATE_RANGE);
      }
    });

    it('should throw CHECKIN_BEFORE_TODAY for past check-in date', async () => {
      const pastDate = '2020-01-01';
      const pastCheckout = '2020-01-05';

      await expect(
        service.getAvailableRooms('sardoba-hotel', pastDate, pastCheckout),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getAvailableRooms('sardoba-hotel', pastDate, pastCheckout);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.CHECKIN_BEFORE_TODAY);
      }
    });

    it('should throw CHECKOUT_BEFORE_CHECKIN when dates are equal', async () => {
      await expect(
        service.getAvailableRooms('sardoba-hotel', CHECKIN, CHECKIN),
      ).rejects.toThrow(SardobaException);

      try {
        await service.getAvailableRooms('sardoba-hotel', CHECKIN, CHECKIN);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.CHECKOUT_BEFORE_CHECKIN);
      }
    });
  });
});
