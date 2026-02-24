import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { BookingHistory } from '@/database/entities/booking-history.entity';
import { Room } from '@/database/entities/room.entity';
import { RoomBlock } from '@/database/entities/room-block.entity';
import { Guest } from '@/database/entities/guest.entity';
import { AvailabilityService } from './availability.service';
import { BookingNumberService } from './booking-number.service';
import { RatesService } from '../rates/rates.service';
import { GuestsService } from '../guests/guests.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { BookingCreatedEvent } from './events/booking-created.event';
import { BookingCancelledEvent } from './events/booking-cancelled.event';
import { BookingStatusChangedEvent } from './events/booking-status-changed.event';

/** Statuses that cannot be modified */
const IMMUTABLE_STATUSES: BookingStatus[] = ['cancelled', 'checked_out', 'no_show'];

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private readonly historyRepository: Repository<BookingHistory>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly availabilityService: AvailabilityService,
    private readonly bookingNumberService: BookingNumberService,
    private readonly ratesService: RatesService,
    private readonly guestsService: GuestsService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── findAll ──────────────────────────────────────────────────────────────

  /**
   * Paginated list of bookings with filters.
   * Joins room name and guest name for display.
   */
  async findAll(propertyId: number, query: BookingFilterDto) {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.guest', 'guest')
      .where('booking.propertyId = :propertyId', { propertyId });

    // Apply filters
    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query.source) {
      qb.andWhere('booking.source = :source', { source: query.source });
    }

    if (query.room_id) {
      qb.andWhere('booking.roomId = :roomId', { roomId: query.room_id });
    }

    if (query.guest_id) {
      qb.andWhere('booking.guestId = :guestId', { guestId: query.guest_id });
    }

    if (query.date_from) {
      qb.andWhere('booking.checkIn >= :dateFrom', { dateFrom: query.date_from });
    }

    if (query.date_to) {
      qb.andWhere('booking.checkIn <= :dateTo', { dateTo: query.date_to });
    }

    if (query.search) {
      qb.andWhere(
        `(
          booking.bookingNumber ILIKE :search
          OR guest.firstName ILIKE :search
          OR guest.lastName ILIKE :search
          OR room.name ILIKE :search
        )`,
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('booking.createdAt', 'DESC');

    const [bookings, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: bookings.map((booking) => this.toListResponseFormat(booking)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  // ── findOne ──────────────────────────────────────────────────────────────

  /**
   * Full booking details with room, guest, payments, and history.
   */
  async findOne(id: number, propertyId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, propertyId },
      relations: ['room', 'guest', 'payments', 'history', 'rate', 'createdByUser'],
    });

    if (!booking) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'booking',
        id,
      });
    }

    return this.toDetailResponseFormat(booking);
  }

  // ── create ───────────────────────────────────────────────────────────────

  /**
   * Create a new booking.
   * 1. Validate dates
   * 2. Verify room is active and belongs to property
   * 3. Check availability
   * 4. Find/create guest
   * 5. Calculate price
   * 6. Generate booking number
   * 7. Save in transaction
   * 8. Create history record
   * 9. Emit BookingCreatedEvent
   */
  async create(propertyId: number, userId: number, dto: CreateBookingDto) {
    // 1. Validate dates
    this.validateDates(dto.check_in, dto.check_out);

    // 2. Verify room
    const room = await this.roomRepository.findOne({
      where: { id: dto.room_id },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: dto.room_id,
      });
    }

    if (room.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: dto.room_id,
      });
    }

    if (room.status !== 'active') {
      throw new SardobaException(
        ErrorCode.ROOM_NOT_AVAILABLE,
        { room_id: dto.room_id, room_status: room.status },
        'Room is not active and cannot be booked',
      );
    }

    // 3. Check availability
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

    // 4. Find or create guest
    let guestId: number;
    if (dto.guest_id) {
      // Verify guest exists and belongs to property
      const existingGuest = await this.guestRepository.findOne({
        where: { id: dto.guest_id, propertyId },
      });
      if (!existingGuest) {
        throw new SardobaException(ErrorCode.NOT_FOUND, {
          resource: 'guest',
          id: dto.guest_id,
        });
      }
      guestId = existingGuest.id;
    } else if (dto.guest) {
      const guest = await this.guestsService.findOrCreate(propertyId, {
        firstName: dto.guest.first_name,
        lastName: dto.guest.last_name,
        phone: dto.guest.phone,
        email: dto.guest.email,
        nationality: dto.guest.nationality,
      });
      guestId = guest.id;
    } else {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { field: 'guest' },
        'Either guest_id or guest data must be provided',
      );
    }

    // 5. Calculate price
    const nights = differenceInCalendarDays(
      parseISO(dto.check_out),
      parseISO(dto.check_in),
    );

    const rateCalculation = await this.ratesService.calculate(
      dto.room_id,
      dto.check_in,
      dto.check_out,
      dto.rate_id ?? undefined,
    );

    // 6 & 7. Generate booking number and save in transaction
    const savedBooking = await this.dataSource.transaction(async (manager) => {
      // Generate booking number within transaction (advisory lock)
      const bookingNumber =
        await this.bookingNumberService.generateInTransaction(manager);

      // Create booking
      const booking = manager.create(Booking, {
        bookingNumber,
        propertyId,
        roomId: dto.room_id,
        guestId,
        rateId: dto.rate_id ?? null,
        checkIn: dto.check_in,
        checkOut: dto.check_out,
        nights,
        adults: dto.adults ?? 1,
        children: dto.children ?? 0,
        totalAmount: rateCalculation.total,
        paidAmount: 0,
        status: 'new' as BookingStatus,
        source: dto.source ?? 'direct',
        sourceReference: dto.source_reference ?? null,
        notes: dto.notes ?? null,
        createdBy: userId,
      });

      const saved = await manager.save(Booking, booking);

      // 8. Create history record
      const history = manager.create(BookingHistory, {
        bookingId: saved.id,
        userId,
        action: 'CREATED',
        oldValue: null,
        newValue: {
          status: 'new',
          room_id: dto.room_id,
          check_in: dto.check_in,
          check_out: dto.check_out,
          nights,
          total_amount: rateCalculation.total,
          guest_id: guestId,
          source: dto.source ?? 'direct',
        },
      });

      await manager.save(BookingHistory, history);

      return saved;
    });

    // 9. Emit event (outside transaction for async processing)
    this.eventEmitter.emit(
      'booking.created',
      new BookingCreatedEvent(
        savedBooking.id,
        savedBooking.propertyId,
        savedBooking.roomId,
        savedBooking.guestId,
        savedBooking.checkIn,
        savedBooking.checkOut,
        savedBooking.totalAmount,
        savedBooking.bookingNumber,
        savedBooking.createdBy,
      ),
    );

    // Return full booking with relations
    return this.findOne(savedBooking.id, propertyId);
  }

  // ── update ───────────────────────────────────────────────────────────────

  /**
   * Update booking fields. Re-checks availability if dates or room changed.
   * Creates a history record for the change.
   */
  async update(
    id: number,
    propertyId: number,
    userId: number,
    dto: UpdateBookingDto,
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id, propertyId },
    });

    if (!booking) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'booking',
        id,
      });
    }

    // Validate booking can be modified
    if (IMMUTABLE_STATUSES.includes(booking.status)) {
      throw new SardobaException(
        ErrorCode.BOOKING_CANCELLED,
        { status: booking.status },
        `Cannot modify booking with status '${booking.status}'`,
      );
    }

    // Capture old values for history
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    const newRoomId = dto.room_id ?? booking.roomId;
    const newCheckIn = dto.check_in ?? booking.checkIn;
    const newCheckOut = dto.check_out ?? booking.checkOut;

    // Validate dates if changed
    if (dto.check_in || dto.check_out) {
      this.validateDates(newCheckIn, newCheckOut);
    }

    // If room, check_in, or check_out changed, re-check availability
    const datesOrRoomChanged =
      dto.room_id !== undefined ||
      dto.check_in !== undefined ||
      dto.check_out !== undefined;

    if (datesOrRoomChanged) {
      // Verify new room if changed
      if (dto.room_id !== undefined && dto.room_id !== booking.roomId) {
        const newRoom = await this.roomRepository.findOne({
          where: { id: dto.room_id, propertyId },
        });

        if (!newRoom) {
          throw new SardobaException(ErrorCode.NOT_FOUND, {
            resource: 'room',
            id: dto.room_id,
          });
        }

        if (newRoom.status !== 'active') {
          throw new SardobaException(
            ErrorCode.ROOM_NOT_AVAILABLE,
            { room_id: dto.room_id, room_status: newRoom.status },
            'Room is not active and cannot be booked',
          );
        }
      }

      // Check availability (exclude current booking)
      const availability = await this.availabilityService.checkAvailability(
        newRoomId,
        newCheckIn,
        newCheckOut,
        id,
      );

      if (!availability.available) {
        throw new SardobaException(
          ErrorCode.OVERBOOKING_DETECTED,
          { blocked_dates: availability.blockedDates },
          'Room is not available for the requested dates',
        );
      }
    }

    // Apply changes
    if (dto.room_id !== undefined && dto.room_id !== booking.roomId) {
      oldValues.room_id = booking.roomId;
      newValues.room_id = dto.room_id;
      booking.roomId = dto.room_id;
    }

    if (dto.check_in !== undefined && dto.check_in !== booking.checkIn) {
      oldValues.check_in = booking.checkIn;
      newValues.check_in = dto.check_in;
      booking.checkIn = dto.check_in;
    }

    if (dto.check_out !== undefined && dto.check_out !== booking.checkOut) {
      oldValues.check_out = booking.checkOut;
      newValues.check_out = dto.check_out;
      booking.checkOut = dto.check_out;
    }

    // Recalculate nights if dates changed
    if (dto.check_in !== undefined || dto.check_out !== undefined) {
      const newNights = differenceInCalendarDays(
        parseISO(booking.checkOut),
        parseISO(booking.checkIn),
      );
      oldValues.nights = booking.nights;
      newValues.nights = newNights;
      booking.nights = newNights;

      // Recalculate price
      const rateCalculation = await this.ratesService.calculate(
        booking.roomId,
        booking.checkIn,
        booking.checkOut,
        dto.rate_id ?? booking.rateId ?? undefined,
      );
      oldValues.total_amount = Number(booking.totalAmount);
      newValues.total_amount = rateCalculation.total;
      booking.totalAmount = rateCalculation.total;
    }

    if (dto.adults !== undefined && dto.adults !== booking.adults) {
      oldValues.adults = booking.adults;
      newValues.adults = dto.adults;
      booking.adults = dto.adults;
    }

    if (dto.children !== undefined && dto.children !== booking.children) {
      oldValues.children = booking.children;
      newValues.children = dto.children;
      booking.children = dto.children;
    }

    if (dto.rate_id !== undefined && dto.rate_id !== booking.rateId) {
      oldValues.rate_id = booking.rateId;
      newValues.rate_id = dto.rate_id;
      booking.rateId = dto.rate_id;
    }

    if (dto.notes !== undefined && dto.notes !== booking.notes) {
      oldValues.notes = booking.notes;
      newValues.notes = dto.notes;
      booking.notes = dto.notes;
    }

    // Save booking and history in a transaction
    await this.dataSource.transaction(async (manager) => {
      await manager.save(Booking, booking);

      if (Object.keys(newValues).length > 0) {
        const history = manager.create(BookingHistory, {
          bookingId: booking.id,
          userId,
          action: 'UPDATED',
          oldValue: oldValues,
          newValue: newValues,
        });
        await manager.save(BookingHistory, history);
      }
    });

    return this.findOne(id, propertyId);
  }

  // ── cancel ───────────────────────────────────────────────────────────────

  /**
   * Cancel a booking. Only allowed for new, confirmed statuses.
   * Sets status to cancelled, records cancelledAt and cancelReason.
   */
  async cancel(
    id: number,
    propertyId: number,
    userId: number,
    dto: CancelBookingDto,
  ) {
    const booking = await this.bookingRepository.findOne({
      where: { id, propertyId },
    });

    if (!booking) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'booking',
        id,
      });
    }

    // Only new, confirmed can be cancelled
    const cancellableStatuses: BookingStatus[] = ['new', 'confirmed'];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new SardobaException(
        ErrorCode.BOOKING_CANCELLED,
        { current_status: booking.status },
        `Cannot cancel booking with status '${booking.status}'`,
      );
    }

    const oldStatus = booking.status;
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = dto.reason ?? null;

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Booking, booking);

      const history = manager.create(BookingHistory, {
        bookingId: booking.id,
        userId,
        action: 'CANCELLED',
        oldValue: { status: oldStatus },
        newValue: {
          status: 'cancelled',
          cancel_reason: dto.reason ?? null,
          cancelled_at: booking.cancelledAt!.toISOString(),
        },
      });
      await manager.save(BookingHistory, history);
    });

    // Emit event
    this.eventEmitter.emit(
      'booking.cancelled',
      new BookingCancelledEvent(
        booking.id,
        booking.propertyId,
        booking.roomId,
        booking.guestId,
        booking.checkIn,
        booking.checkOut,
        booking.bookingNumber,
        booking.cancelReason,
        userId,
      ),
    );

    return this.findOne(id, propertyId);
  }

  // ── checkIn ──────────────────────────────────────────────────────────────

  /**
   * Transition booking status: confirmed -> checked_in.
   * Also accepts 'new' status for direct walk-in check-ins.
   */
  async checkIn(id: number, propertyId: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, propertyId },
    });

    if (!booking) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'booking',
        id,
      });
    }

    const allowedStatuses: BookingStatus[] = ['new', 'confirmed'];
    if (!allowedStatuses.includes(booking.status)) {
      throw new SardobaException(
        ErrorCode.BOOKING_CANCELLED,
        { current_status: booking.status },
        `Cannot check in booking with status '${booking.status}'`,
      );
    }

    const oldStatus = booking.status;
    booking.status = 'checked_in';

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Booking, booking);

      const history = manager.create(BookingHistory, {
        bookingId: booking.id,
        userId,
        action: 'STATUS_CHANGED',
        oldValue: { status: oldStatus },
        newValue: { status: 'checked_in' },
      });
      await manager.save(BookingHistory, history);
    });

    // Emit event
    this.eventEmitter.emit(
      'booking.status_changed',
      new BookingStatusChangedEvent(
        booking.id,
        booking.propertyId,
        booking.roomId,
        booking.bookingNumber,
        oldStatus,
        'checked_in',
        userId,
      ),
    );

    return this.findOne(id, propertyId);
  }

  // ── checkOut ─────────────────────────────────────────────────────────────

  /**
   * Transition booking status: checked_in -> checked_out.
   */
  async checkOut(id: number, propertyId: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, propertyId },
    });

    if (!booking) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'booking',
        id,
      });
    }

    if (booking.status !== 'checked_in') {
      throw new SardobaException(
        ErrorCode.BOOKING_CANCELLED,
        { current_status: booking.status },
        `Cannot check out booking with status '${booking.status}'. Must be 'checked_in'.`,
      );
    }

    const oldStatus = booking.status;
    booking.status = 'checked_out';

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Booking, booking);

      const history = manager.create(BookingHistory, {
        bookingId: booking.id,
        userId,
        action: 'STATUS_CHANGED',
        oldValue: { status: oldStatus },
        newValue: { status: 'checked_out' },
      });
      await manager.save(BookingHistory, history);
    });

    // Emit event
    this.eventEmitter.emit(
      'booking.status_changed',
      new BookingStatusChangedEvent(
        booking.id,
        booking.propertyId,
        booking.roomId,
        booking.bookingNumber,
        oldStatus,
        'checked_out',
        userId,
      ),
    );

    return this.findOne(id, propertyId);
  }

  // ── getCalendar ──────────────────────────────────────────────────────────

  /**
   * Get calendar data for a property: all rooms with their bookings and blocks
   * for the given date range. Optimized query to minimize round trips.
   */
  async getCalendar(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
    roomType?: string,
  ) {
    // Validate date range
    if (dateFrom >= dateTo) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dateFrom, date_to: dateTo },
        'date_from must be before date_to',
      );
    }

    // Get rooms for the property
    const roomQb = this.roomRepository
      .createQueryBuilder('room')
      .where('room.propertyId = :propertyId', { propertyId })
      .andWhere('room.status = :status', { status: 'active' });

    if (roomType) {
      roomQb.andWhere('room.roomType = :roomType', { roomType });
    }

    roomQb.orderBy('room.sortOrder', 'ASC').addOrderBy('room.name', 'ASC');

    const rooms = await roomQb.getMany();

    if (rooms.length === 0) {
      return {
        rooms: [],
        date_from: dateFrom,
        date_to: dateTo,
      };
    }

    const roomIds = rooms.map((r) => r.id);

    // Get bookings for all rooms in the date range (excluding cancelled/no_show)
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .where('booking.roomId IN (:...roomIds)', { roomIds })
      .andWhere('booking.checkIn < :dateTo', { dateTo })
      .andWhere('booking.checkOut > :dateFrom', { dateFrom })
      .andWhere('booking.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'no_show'],
      })
      .getMany();

    // Get room blocks in the date range
    const blocks = await this.dataSource
      .getRepository(RoomBlock)
      .createQueryBuilder('block')
      .where('block.roomId IN (:...roomIds)', { roomIds })
      .andWhere('block.dateFrom < :dateTo', { dateTo })
      .andWhere('block.dateTo > :dateFrom', { dateFrom })
      .getMany();

    // Group bookings and blocks by room
    const bookingsByRoom = new Map<number, Booking[]>();
    for (const booking of bookings) {
      const list = bookingsByRoom.get(booking.roomId) ?? [];
      list.push(booking);
      bookingsByRoom.set(booking.roomId, list);
    }

    const blocksByRoom = new Map<number, RoomBlock[]>();
    for (const block of blocks) {
      const list = blocksByRoom.get(block.roomId) ?? [];
      list.push(block);
      blocksByRoom.set(block.roomId, list);
    }

    // Build calendar response
    const calendarRooms = rooms.map((room) => {
      const roomBookings = bookingsByRoom.get(room.id) ?? [];
      const roomBlocks = blocksByRoom.get(room.id) ?? [];

      return {
        id: room.id,
        name: room.name,
        type: room.roomType,
        bookings: roomBookings.map((b) => ({
          id: b.id,
          booking_number: b.bookingNumber,
          check_in: b.checkIn,
          check_out: b.checkOut,
          guest_name: b.guest
            ? `${b.guest.firstName} ${b.guest.lastName}`
            : 'Unknown',
          status: b.status,
          source: b.source,
          total_amount: Number(b.totalAmount),
        })),
        blocks: roomBlocks.map((bl) => ({
          date_from: bl.dateFrom,
          date_to: bl.dateTo,
          reason: bl.reason,
        })),
      };
    });

    return {
      rooms: calendarRooms,
      date_from: dateFrom,
      date_to: dateTo,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Validate check-in/check-out dates.
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
  }

  /**
   * Transform booking to list response format (snake_case).
   */
  private toListResponseFormat(booking: Booking): Record<string, unknown> {
    return {
      id: booking.id,
      booking_number: booking.bookingNumber,
      property_id: booking.propertyId,
      room_id: booking.roomId,
      room_name: booking.room?.name ?? null,
      guest_id: booking.guestId,
      guest_name: booking.guest
        ? `${booking.guest.firstName} ${booking.guest.lastName}`
        : null,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      total_amount: Number(booking.totalAmount),
      paid_amount: Number(booking.paidAmount),
      status: booking.status,
      source: booking.source,
      created_at: booking.createdAt,
      updated_at: booking.updatedAt,
    };
  }

  /**
   * Transform booking to detailed response format (snake_case) with relations.
   */
  private toDetailResponseFormat(booking: Booking): Record<string, unknown> {
    return {
      id: booking.id,
      booking_number: booking.bookingNumber,
      property_id: booking.propertyId,
      room_id: booking.roomId,
      guest_id: booking.guestId,
      rate_id: booking.rateId,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      total_amount: Number(booking.totalAmount),
      paid_amount: Number(booking.paidAmount),
      status: booking.status,
      source: booking.source,
      source_reference: booking.sourceReference,
      notes: booking.notes,
      cancelled_at: booking.cancelledAt,
      cancel_reason: booking.cancelReason,
      created_by: booking.createdBy,
      created_at: booking.createdAt,
      updated_at: booking.updatedAt,
      room: booking.room
        ? {
            id: booking.room.id,
            name: booking.room.name,
            room_type: booking.room.roomType,
            floor: booking.room.floor,
          }
        : null,
      guest: booking.guest
        ? {
            id: booking.guest.id,
            first_name: booking.guest.firstName,
            last_name: booking.guest.lastName,
            phone: booking.guest.phone,
            email: booking.guest.email,
            is_vip: booking.guest.isVip,
          }
        : null,
      rate: booking.rate
        ? {
            id: booking.rate.id,
            name: booking.rate.name,
            type: booking.rate.type,
          }
        : null,
      payments: booking.payments?.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        paid_at: p.paidAt,
        notes: p.notes,
        reference: p.reference,
        created_at: p.createdAt,
      })) ?? [],
      history: booking.history?.map((h) => ({
        id: h.id,
        user_id: h.userId,
        action: h.action,
        old_value: h.oldValue,
        new_value: h.newValue,
        created_at: h.createdAt,
      })) ?? [],
    };
  }
}
