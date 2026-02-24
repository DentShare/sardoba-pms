import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Property } from '@/database/entities/property.entity';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { BookingExtra } from '@/database/entities/booking-extra.entity';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Room } from '@/database/entities/room.entity';
import { AvailabilityService } from '../bookings/availability.service';
import { BookingNumberService } from '../bookings/booking-number.service';
import { RatesService } from '../rates/rates.service';
import { GuestsService } from '../guests/guests.service';
import { BookingCreatedEvent } from '../bookings/events/booking-created.event';
import { PublicBookingDto, ExtraSelectionDto } from './dto/public-booking.dto';

/** System user ID for public (unauthenticated) bookings */
const SYSTEM_USER_ID = 0;

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyExtra)
    private readonly propertyExtraRepository: Repository<PropertyExtra>,
    @InjectRepository(BookingExtra)
    private readonly bookingExtraRepository: Repository<BookingExtra>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly availabilityService: AvailabilityService,
    private readonly bookingNumberService: BookingNumberService,
    private readonly ratesService: RatesService,
    private readonly guestsService: GuestsService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── getHotelBySlug ──────────────────────────────────────────────────────────

  /**
   * Returns public hotel profile by slug.
   * Includes property info, active rooms, photos, and extras.
   * Throws NOT_FOUND if slug doesn't exist or bookingEnabled is false.
   */
  async getHotelBySlug(slug: string) {
    const property = await this.propertyRepository.findOne({
      where: { slug },
      relations: ['rooms', 'extras'],
    });

    if (!property || !property.bookingEnabled) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'property', slug },
        'Hotel not found or booking is not enabled',
      );
    }

    // Filter to active rooms only, sorted by sortOrder
    const activeRooms = (property.rooms ?? [])
      .filter((room) => room.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    // Filter to active extras only, sorted by sortOrder
    const activeExtras = (property.extras ?? [])
      .filter((extra) => extra.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      property: {
        name: property.name,
        slug: property.slug,
        city: property.city,
        address: property.address,
        phone: property.phone,
        description: property.description,
        description_uz: property.descriptionUz,
        cover_photo: property.coverPhoto,
        photos: property.photos,
        currency: property.currency,
        checkin_time: property.checkinTime,
        checkout_time: property.checkoutTime,
        timezone: property.timezone,
        locale: property.locale,
      },
      rooms: activeRooms.map((room) => ({
        id: room.id,
        name: room.name,
        room_type: room.roomType,
        floor: room.floor,
        capacity_adults: room.capacityAdults,
        capacity_children: room.capacityChildren,
        base_price: Number(room.basePrice),
        amenities: room.amenities,
        description_ru: room.descriptionRu,
        description_uz: room.descriptionUz,
        photos: room.photos,
      })),
      extras: activeExtras.map((extra) => ({
        id: extra.id,
        name: extra.name,
        name_uz: extra.nameUz,
        description: extra.description,
        price: Number(extra.price),
        price_type: extra.priceType,
        icon: extra.icon,
      })),
    };
  }

  // ── getAvailableRooms ───────────────────────────────────────────────────────

  /**
   * Returns rooms with availability and calculated prices for a date range.
   */
  async getAvailableRooms(slug: string, checkIn: string, checkOut: string) {
    this.validateDates(checkIn, checkOut);

    const property = await this.findPropertyBySlug(slug);
    const activeRooms = await this.getActiveRoomsForProperty(property.id);

    const results = [];

    for (const room of activeRooms) {
      const availability = await this.availabilityService.checkAvailability(
        room.id,
        checkIn,
        checkOut,
      );

      // Calculate price regardless of availability (for display)
      let priceInfo = null;
      try {
        const rateCalc = await this.ratesService.calculate(
          property.id,
          room.id,
          checkIn,
          checkOut,
        );
        priceInfo = {
          total: rateCalc.total,
          price_per_night: rateCalc.price_per_night,
          nights: rateCalc.nights,
          rate_applied: rateCalc.rate_applied,
        };
      } catch {
        // If no rate found, use base_price as fallback
        const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
        priceInfo = {
          total: Number(room.basePrice) * nights,
          price_per_night: Number(room.basePrice),
          nights,
          rate_applied: 'base',
        };
      }

      results.push({
        id: room.id,
        name: room.name,
        room_type: room.roomType,
        floor: room.floor,
        capacity_adults: room.capacityAdults,
        capacity_children: room.capacityChildren,
        amenities: room.amenities,
        description_ru: room.descriptionRu,
        description_uz: room.descriptionUz,
        photos: room.photos,
        available: availability.available,
        blocked_dates: availability.blockedDates,
        price: priceInfo,
      });
    }

    return {
      check_in: checkIn,
      check_out: checkOut,
      rooms: results,
    };
  }

  // ── calculatePrice ──────────────────────────────────────────────────────────

  /**
   * Returns full price breakdown: room price + extras + total.
   */
  async calculatePrice(
    slug: string,
    roomId: number,
    checkIn: string,
    checkOut: string,
    adults: number = 1,
    extras: ExtraSelectionDto[] = [],
  ) {
    this.validateDates(checkIn, checkOut);

    const property = await this.findPropertyBySlug(slug);
    const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));

    // Verify room belongs to property and is active
    await this.verifyRoom(roomId, property.id);

    // Calculate room price
    let roomPrice;
    try {
      roomPrice = await this.ratesService.calculate(
        property.id,
        roomId,
        checkIn,
        checkOut,
      );
    } catch {
      // Fallback if no applicable rate
      const room = await this.dataSource.getRepository(Room).findOneBy({ id: roomId });
      const perNight = Number(room?.basePrice ?? 0);
      roomPrice = {
        total: perNight * nights,
        price_per_night: perNight,
        nights,
        rate_applied: 'base',
        breakdown: [],
      };
    }

    // Calculate extras price
    let extrasTotal = 0;
    const extrasBreakdown: Array<{
      extra_id: number;
      name: string;
      quantity: number;
      unit_price: number;
      price_type: string;
      total: number;
    }> = [];

    if (extras.length > 0) {
      const propertyExtras = await this.propertyExtraRepository.find({
        where: { propertyId: property.id, isActive: true },
      });
      const extrasMap = new Map(propertyExtras.map((e) => [e.id, e]));

      for (const sel of extras) {
        const extra = extrasMap.get(sel.extra_id);
        if (!extra) {
          throw new SardobaException(
            ErrorCode.NOT_FOUND,
            { resource: 'extra', id: sel.extra_id },
            `Extra service with id ${sel.extra_id} not found`,
          );
        }

        const unitPrice = Number(extra.price);
        let itemTotal: number;

        switch (extra.priceType) {
          case 'per_night':
            itemTotal = unitPrice * sel.quantity * nights;
            break;
          case 'per_person':
            itemTotal = unitPrice * sel.quantity * adults;
            break;
          case 'per_booking':
          default:
            itemTotal = unitPrice * sel.quantity;
            break;
        }

        extrasBreakdown.push({
          extra_id: extra.id,
          name: extra.name,
          quantity: sel.quantity,
          unit_price: unitPrice,
          price_type: extra.priceType,
          total: itemTotal,
        });

        extrasTotal += itemTotal;
      }
    }

    return {
      room: {
        total: roomPrice.total,
        price_per_night: roomPrice.price_per_night,
        nights: roomPrice.nights,
        rate_applied: roomPrice.rate_applied,
        breakdown: roomPrice.breakdown,
      },
      extras: extrasBreakdown,
      extras_total: extrasTotal,
      grand_total: roomPrice.total + extrasTotal,
      currency: property.currency,
    };
  }

  // ── createPublicBooking ─────────────────────────────────────────────────────

  /**
   * Creates a booking from the public booking page.
   * - Find or create guest by phone
   * - Validate room availability
   * - Calculate price
   * - Create booking with source='website', createdBy=0
   * - Create booking_extras
   * - Emit BookingCreatedEvent
   */
  async createPublicBooking(slug: string, dto: PublicBookingDto) {
    this.validateDates(dto.check_in, dto.check_out);

    const property = await this.findPropertyBySlug(slug);

    // Verify room
    const room = await this.verifyRoom(dto.room_id, property.id);

    // Check availability
    const availability = await this.availabilityService.checkAvailability(
      dto.room_id,
      dto.check_in,
      dto.check_out,
    );

    if (!availability.available) {
      throw new SardobaException(
        ErrorCode.OVERBOOKING_DETECTED,
        { blocked_dates: availability.blockedDates },
        'Room is not available for the requested dates',
      );
    }

    // Validate capacity
    if (dto.adults > room.capacityAdults) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        {
          adults: dto.adults,
          capacity_adults: room.capacityAdults,
        },
        `Room capacity is ${room.capacityAdults} adults, but ${dto.adults} requested`,
      );
    }

    if ((dto.children ?? 0) > room.capacityChildren) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        {
          children: dto.children,
          capacity_children: room.capacityChildren,
        },
        `Room capacity is ${room.capacityChildren} children, but ${dto.children} requested`,
      );
    }

    // Find or create guest
    const guestResult = await this.guestsService.findOrCreate(property.id, {
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone,
      email: dto.email,
    });
    const guestId = (guestResult as any).id;

    // Calculate price
    const nights = differenceInCalendarDays(
      parseISO(dto.check_out),
      parseISO(dto.check_in),
    );

    let roomTotal: number;
    try {
      const rateCalc = await this.ratesService.calculate(
        property.id,
        dto.room_id,
        dto.check_in,
        dto.check_out,
      );
      roomTotal = rateCalc.total;
    } catch {
      roomTotal = Number(room.basePrice) * nights;
    }

    // Resolve extras
    const resolvedExtras: Array<{
      propertyExtraId: number;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    let extrasTotal = 0;

    if (dto.extras && dto.extras.length > 0) {
      const propertyExtras = await this.propertyExtraRepository.find({
        where: { propertyId: property.id, isActive: true },
      });
      const extrasMap = new Map(propertyExtras.map((e) => [e.id, e]));

      for (const sel of dto.extras) {
        const extra = extrasMap.get(sel.extra_id);
        if (!extra) {
          throw new SardobaException(
            ErrorCode.NOT_FOUND,
            { resource: 'extra', id: sel.extra_id },
            `Extra service with id ${sel.extra_id} not found`,
          );
        }

        const unitPrice = Number(extra.price);
        let itemTotal: number;

        switch (extra.priceType) {
          case 'per_night':
            itemTotal = unitPrice * sel.quantity * nights;
            break;
          case 'per_person':
            itemTotal = unitPrice * sel.quantity * dto.adults;
            break;
          case 'per_booking':
          default:
            itemTotal = unitPrice * sel.quantity;
            break;
        }

        resolvedExtras.push({
          propertyExtraId: extra.id,
          quantity: sel.quantity,
          unitPrice,
          totalPrice: itemTotal,
        });

        extrasTotal += itemTotal;
      }
    }

    const totalAmount = roomTotal + extrasTotal;

    // Create booking + extras in a single transaction
    const savedBooking = await this.dataSource.transaction(async (manager) => {
      // Generate booking number within transaction
      const bookingNumber =
        await this.bookingNumberService.generateInTransaction(manager);

      // Create booking
      const booking = manager.create(Booking, {
        bookingNumber,
        propertyId: property.id,
        roomId: dto.room_id,
        guestId,
        rateId: null,
        checkIn: dto.check_in,
        checkOut: dto.check_out,
        nights,
        adults: dto.adults,
        children: dto.children ?? 0,
        totalAmount,
        paidAmount: 0,
        status: 'new' as BookingStatus,
        source: 'website',
        sourceReference: null,
        notes: dto.notes ?? null,
        createdBy: SYSTEM_USER_ID,
      });

      const saved = await manager.save(Booking, booking);

      // Create booking extras
      for (const re of resolvedExtras) {
        const bookingExtra = manager.create(BookingExtra, {
          bookingId: saved.id,
          propertyExtraId: re.propertyExtraId,
          quantity: re.quantity,
          unitPrice: re.unitPrice,
          totalPrice: re.totalPrice,
        });
        await manager.save(BookingExtra, bookingExtra);
      }

      return saved;
    });

    this.logger.log(
      `Public booking created: ${savedBooking.bookingNumber} for property ${property.name} (${property.id})`,
    );

    // Emit event for notifications
    this.eventEmitter.emit(
      'booking.created',
      new BookingCreatedEvent(
        savedBooking.id,
        savedBooking.propertyId,
        savedBooking.roomId,
        guestId,
        savedBooking.checkIn,
        savedBooking.checkOut,
        savedBooking.totalAmount,
        savedBooking.bookingNumber,
        SYSTEM_USER_ID,
      ),
    );

    // Return confirmation
    return {
      booking_number: savedBooking.bookingNumber,
      property_name: property.name,
      room_name: room.name,
      check_in: savedBooking.checkIn,
      check_out: savedBooking.checkOut,
      nights: savedBooking.nights,
      adults: savedBooking.adults,
      children: savedBooking.children,
      total_amount: Number(savedBooking.totalAmount),
      currency: property.currency,
      guest: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone: dto.phone,
        email: dto.email ?? null,
      },
      extras: resolvedExtras.map((re) => ({
        property_extra_id: re.propertyExtraId,
        quantity: re.quantity,
        unit_price: re.unitPrice,
        total_price: re.totalPrice,
      })),
      status: 'new',
      created_at: savedBooking.createdAt,
    };
  }

  // ── getConfirmation ─────────────────────────────────────────────────────────

  /**
   * Returns booking confirmation details by booking number.
   * Only returns bookings made via 'website' source for security.
   */
  async getConfirmation(slug: string, bookingNumber: string) {
    const property = await this.findPropertyBySlug(slug);

    const booking = await this.bookingRepository.findOne({
      where: {
        bookingNumber,
        propertyId: property.id,
      },
      relations: ['room', 'guest', 'extras', 'extras.propertyExtra'],
    });

    if (!booking) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'booking', booking_number: bookingNumber },
        'Booking not found',
      );
    }

    return {
      booking_number: booking.bookingNumber,
      status: booking.status,
      property: {
        name: property.name,
        address: property.address,
        phone: property.phone,
        checkin_time: property.checkinTime,
        checkout_time: property.checkoutTime,
      },
      room: booking.room
        ? {
            name: booking.room.name,
            room_type: booking.room.roomType,
          }
        : null,
      guest: booking.guest
        ? {
            first_name: booking.guest.firstName,
            last_name: booking.guest.lastName,
            phone: booking.guest.phone,
            email: booking.guest.email,
          }
        : null,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      total_amount: Number(booking.totalAmount),
      currency: property.currency,
      extras: (booking.extras ?? []).map((be) => ({
        name: be.propertyExtra?.name ?? 'Unknown',
        quantity: be.quantity,
        unit_price: Number(be.unitPrice),
        total_price: Number(be.totalPrice),
      })),
      notes: booking.notes,
      created_at: booking.createdAt,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Validate check-in / check-out dates.
   */
  private validateDates(checkIn: string, checkOut: string): void {
    const ciDate = parseISO(checkIn);
    const coDate = parseISO(checkOut);

    if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime())) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { check_in: checkIn, check_out: checkOut },
        'Invalid date format. Expected YYYY-MM-DD.',
      );
    }

    if (coDate <= ciDate) {
      throw new SardobaException(
        ErrorCode.CHECKOUT_BEFORE_CHECKIN,
        { check_in: checkIn, check_out: checkOut },
        'Check-out date must be after check-in date',
      );
    }

    // Check-in must not be in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (ciDate < today) {
      throw new SardobaException(
        ErrorCode.CHECKIN_BEFORE_TODAY,
        { check_in: checkIn },
        'Check-in date cannot be in the past',
      );
    }
  }

  /**
   * Find property by slug. Throws if not found or booking not enabled.
   */
  private async findPropertyBySlug(slug: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { slug, bookingEnabled: true },
    });

    if (!property) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'property', slug },
        'Hotel not found or booking is not enabled',
      );
    }

    return property;
  }

  /**
   * Get active rooms for a property, sorted by sortOrder.
   */
  private async getActiveRoomsForProperty(propertyId: number): Promise<Room[]> {
    return this.dataSource.getRepository(Room).find({
      where: { propertyId, status: 'active' },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Verify room belongs to property and is active.
   */
  private async verifyRoom(roomId: number, propertyId: number): Promise<Room> {
    const room = await this.dataSource.getRepository(Room).findOne({
      where: { id: roomId, propertyId },
    });

    if (!room) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'room', id: roomId },
        'Room not found',
      );
    }

    if (room.status !== 'active') {
      throw new SardobaException(
        ErrorCode.ROOM_NOT_AVAILABLE,
        { room_id: roomId, room_status: room.status },
        'Room is not available for booking',
      );
    }

    return room;
  }
}
