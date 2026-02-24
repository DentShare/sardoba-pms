import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Room } from '@/database/entities/room.entity';
import { RoomBlock } from '@/database/entities/room-block.entity';
import { Booking } from '@/database/entities/booking.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { CreateRoomBlockDto } from './dto/create-room-block.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomBlock)
    private readonly roomBlockRepository: Repository<RoomBlock>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  // ── List rooms with pagination and filters ────────────────────────────────

  async findAll(propertyId: number, query: RoomQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.roomRepository
      .createQueryBuilder('room')
      .where('room.propertyId = :propertyId', { propertyId });

    if (query.room_type) {
      qb.andWhere('room.roomType = :roomType', { roomType: query.room_type });
    }

    if (query.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    if (query.floor !== undefined) {
      qb.andWhere('room.floor = :floor', { floor: query.floor });
    }

    qb.orderBy('room.sortOrder', 'ASC').addOrderBy('room.name', 'ASC');

    const [rooms, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: rooms.map((room) => this.toResponseFormat(room)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  // ── Get single room by ID ─────────────────────────────────────────────────

  async findOne(roomId: number): Promise<Record<string, unknown>> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['blocks'],
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    return this.toResponseFormat(room);
  }

  // ── Create a new room ─────────────────────────────────────────────────────

  async create(
    propertyId: number,
    dto: CreateRoomDto,
  ): Promise<Record<string, unknown>> {
    const room = this.roomRepository.create({
      propertyId,
      name: dto.name,
      roomType: dto.room_type,
      floor: dto.floor ?? null,
      capacityAdults: dto.capacity_adults,
      capacityChildren: dto.capacity_children ?? 0,
      basePrice: dto.base_price,
      amenities: dto.amenities ?? [],
      descriptionRu: dto.description_ru ?? null,
      descriptionUz: dto.description_uz ?? null,
      sortOrder: dto.sort_order ?? 0,
      status: 'active',
      photos: [],
    });

    const saved = await this.roomRepository.save(room);
    return this.toResponseFormat(saved);
  }

  // ── Update an existing room ───────────────────────────────────────────────

  async update(
    roomId: number,
    dto: UpdateRoomDto,
  ): Promise<Record<string, unknown>> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    // Map snake_case DTO fields to camelCase entity fields
    if (dto.name !== undefined) room.name = dto.name;
    if (dto.room_type !== undefined) room.roomType = dto.room_type;
    if (dto.floor !== undefined) room.floor = dto.floor;
    if (dto.capacity_adults !== undefined) room.capacityAdults = dto.capacity_adults;
    if (dto.capacity_children !== undefined) room.capacityChildren = dto.capacity_children;
    if (dto.base_price !== undefined) room.basePrice = dto.base_price;
    if (dto.status !== undefined) room.status = dto.status;
    if (dto.amenities !== undefined) room.amenities = dto.amenities;
    if (dto.description_ru !== undefined) room.descriptionRu = dto.description_ru;
    if (dto.description_uz !== undefined) room.descriptionUz = dto.description_uz;
    if (dto.sort_order !== undefined) room.sortOrder = dto.sort_order;

    const saved = await this.roomRepository.save(room);
    return this.toResponseFormat(saved);
  }

  // ── Delete a room (only if no active bookings) ────────────────────────────

  async remove(roomId: number): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    // Check for active bookings (not cancelled/checked_out/no_show)
    const activeBookingsCount = await this.bookingRepository.count({
      where: {
        roomId,
        status: Not(In(['cancelled', 'checked_out', 'no_show'])),
      },
    });

    if (activeBookingsCount > 0) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        {
          reason: 'Cannot delete room with active bookings',
          active_bookings: activeBookingsCount,
        },
        'Cannot delete room with active bookings',
      );
    }

    await this.roomRepository.remove(room);
  }

  // ── Check availability for a date range ───────────────────────────────────

  async checkAvailability(
    roomId: number,
    from: string,
    to: string,
  ): Promise<{
    available: boolean;
    blocked_dates: string[];
    booked_dates: string[];
  }> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    // Validate date range
    if (from >= to) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { from, to },
        'Start date must be before end date',
      );
    }

    // Find overlapping blocks
    const blocks = await this.roomBlockRepository
      .createQueryBuilder('block')
      .where('block.roomId = :roomId', { roomId })
      .andWhere('block.dateFrom < :to', { to })
      .andWhere('block.dateTo > :from', { from })
      .getMany();

    // Find overlapping bookings (not cancelled/no_show)
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.roomId = :roomId', { roomId })
      .andWhere('booking.checkIn < :to', { to })
      .andWhere('booking.checkOut > :from', { from })
      .andWhere('booking.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'no_show'],
      })
      .getMany();

    // Collect blocked dates
    const blockedDates = this.collectDatesFromRanges(
      blocks.map((b) => ({ from: b.dateFrom, to: b.dateTo })),
      from,
      to,
    );

    // Collect booked dates
    const bookedDates = this.collectDatesFromRanges(
      bookings.map((b) => ({ from: b.checkIn, to: b.checkOut })),
      from,
      to,
    );

    const available = blockedDates.length === 0 && bookedDates.length === 0;

    return {
      available,
      blocked_dates: blockedDates,
      booked_dates: bookedDates,
    };
  }

  // ── Create a room block ───────────────────────────────────────────────────

  async createBlock(
    roomId: number,
    dto: CreateRoomBlockDto,
    userId: number,
  ): Promise<Record<string, unknown>> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    // Validate date range
    if (dto.date_from >= dto.date_to) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dto.date_from, date_to: dto.date_to },
        'date_from must be before date_to',
      );
    }

    // Check for overlapping blocks
    const existingBlock = await this.roomBlockRepository
      .createQueryBuilder('block')
      .where('block.roomId = :roomId', { roomId })
      .andWhere('block.dateFrom < :dateTo', { dateTo: dto.date_to })
      .andWhere('block.dateTo > :dateFrom', { dateFrom: dto.date_from })
      .getOne();

    if (existingBlock) {
      throw new SardobaException(
        ErrorCode.ROOM_NOT_AVAILABLE,
        {
          existing_block_id: existingBlock.id,
          existing_from: existingBlock.dateFrom,
          existing_to: existingBlock.dateTo,
        },
        'Room already has a block overlapping with the given dates',
      );
    }

    const block = this.roomBlockRepository.create({
      roomId,
      dateFrom: dto.date_from,
      dateTo: dto.date_to,
      reason: dto.reason ?? null,
      createdBy: userId,
    });

    const saved = await this.roomBlockRepository.save(block);
    return this.blockToResponseFormat(saved);
  }

  // ── Remove a room block ───────────────────────────────────────────────────

  async removeBlock(roomId: number, blockId: number): Promise<void> {
    const block = await this.roomBlockRepository.findOne({
      where: { id: blockId, roomId },
    });

    if (!block) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room_block',
        id: blockId,
        room_id: roomId,
      });
    }

    await this.roomBlockRepository.remove(block);
  }

  // ── Verify room belongs to property (for guards/controller) ───────────────

  async verifyRoomProperty(roomId: number, propertyId: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    if (room.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Room does not belong to your property',
      });
    }

    return room;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Collect individual dates from ranges, bounded by the query range.
   */
  private collectDatesFromRanges(
    ranges: Array<{ from: string; to: string }>,
    queryFrom: string,
    queryTo: string,
  ): string[] {
    const dates = new Set<string>();

    for (const range of ranges) {
      const start = range.from > queryFrom ? range.from : queryFrom;
      const end = range.to < queryTo ? range.to : queryTo;

      let current = new Date(start);
      const endDate = new Date(end);

      while (current < endDate) {
        dates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    return Array.from(dates).sort();
  }

  /**
   * Transform entity to snake_case response format per API conventions.
   */
  private toResponseFormat(room: Room): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: room.id,
      property_id: room.propertyId,
      name: room.name,
      room_type: room.roomType,
      floor: room.floor,
      capacity_adults: room.capacityAdults,
      capacity_children: room.capacityChildren,
      base_price: Number(room.basePrice),
      status: room.status,
      amenities: room.amenities,
      description_ru: room.descriptionRu,
      description_uz: room.descriptionUz,
      photos: room.photos,
      sort_order: room.sortOrder,
      created_at: room.createdAt,
      updated_at: room.updatedAt,
    };

    // Include blocks if they were loaded via relation
    if (room.blocks) {
      response.blocks = room.blocks.map((b) => this.blockToResponseFormat(b));
    }

    return response;
  }

  /**
   * Transform block entity to snake_case response format.
   */
  private blockToResponseFormat(block: RoomBlock): Record<string, unknown> {
    return {
      id: block.id,
      room_id: block.roomId,
      date_from: block.dateFrom,
      date_to: block.dateTo,
      reason: block.reason,
      created_by: block.createdBy,
      created_at: block.createdAt,
    };
  }
}
