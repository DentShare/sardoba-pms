import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupBooking } from '@/database/entities/group-booking.entity';
import { GroupBookingRoom } from '@/database/entities/group-booking-room.entity';
import { Agency } from '@/database/entities/agency.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupFilterDto } from './dto/group-filter.dto';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@Injectable()
export class GroupBookingsService {
  constructor(
    @InjectRepository(GroupBooking)
    private readonly groupRepository: Repository<GroupBooking>,
    @InjectRepository(GroupBookingRoom)
    private readonly groupRoomRepository: Repository<GroupBookingRoom>,
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  // ── List groups with pagination and filters ──────────────────────────────

  async findAllGroups(propertyId: number, filter: GroupFilterDto) {
    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.groupRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.agency', 'agency')
      .where('g.propertyId = :propertyId', { propertyId });

    if (filter.status) {
      qb.andWhere('g.status = :status', { status: filter.status });
    }

    if (filter.agency_id) {
      qb.andWhere('g.agencyId = :agencyId', { agencyId: filter.agency_id });
    }

    if (filter.search) {
      qb.andWhere(
        '(g.groupName ILIKE :search OR g.groupNumber ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter.date_from) {
      qb.andWhere('g.checkOut >= :dateFrom', { dateFrom: filter.date_from });
    }

    if (filter.date_to) {
      qb.andWhere('g.checkIn <= :dateTo', { dateTo: filter.date_to });
    }

    qb.orderBy('g.checkIn', 'DESC');

    const [groups, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: groups.map((g) => this.toGroupResponse(g)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  // ── Get single group with full details ───────────────────────────────────

  async findOneGroup(groupId: number): Promise<Record<string, unknown>> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['agency', 'rooms', 'rooms.room'],
    });

    if (!group) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'group_booking',
        id: groupId,
      });
    }

    return this.toGroupResponse(group);
  }

  // ── Create a new group booking ───────────────────────────────────────────

  async createGroup(
    propertyId: number,
    dto: CreateGroupDto,
    userId: number,
  ): Promise<Record<string, unknown>> {
    if (dto.check_in >= dto.check_out) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { check_in: dto.check_in, check_out: dto.check_out },
        'Check-in must be before check-out',
      );
    }

    if (dto.agency_id) {
      const agency = await this.agencyRepository.findOne({
        where: { id: dto.agency_id, propertyId, isActive: true },
      });
      if (!agency) {
        throw new SardobaException(ErrorCode.NOT_FOUND, {
          resource: 'agency',
          id: dto.agency_id,
        });
      }
    }

    const roomIds = dto.rooms.map((r) => r.room_id);
    const rooms = await this.roomRepository
      .createQueryBuilder('room')
      .where('room.id IN (:...roomIds)', { roomIds })
      .andWhere('room.propertyId = :propertyId', { propertyId })
      .getMany();

    if (rooms.length !== roomIds.length) {
      const foundIds = rooms.map((r) => r.id);
      const missing = roomIds.filter((id) => !foundIds.includes(id));
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'rooms',
        missing_ids: missing,
      });
    }

    const checkIn = new Date(dto.check_in);
    const checkOut = new Date(dto.check_out);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    let totalAmount = 0;
    for (const roomDto of dto.rooms) {
      totalAmount += Number(roomDto.price_per_night) * nights;
    }

    const groupNumber = await this.generateGroupNumber();

    const group = this.groupRepository.create({
      propertyId,
      groupName: dto.group_name,
      groupNumber,
      agencyId: dto.agency_id ?? null,
      contactPerson: dto.contact_person ?? null,
      contactPhone: dto.contact_phone ?? null,
      contactEmail: dto.contact_email ?? null,
      checkIn: dto.check_in,
      checkOut: dto.check_out,
      roomsCount: dto.rooms.length,
      guestsCount: dto.rooms.length,
      totalAmount,
      paidAmount: 0,
      status: 'tentative',
      notes: dto.notes ?? null,
      createdBy: userId,
    });

    const savedGroup = await this.groupRepository.save(group);

    const groupRooms = dto.rooms.map((roomDto) =>
      this.groupRoomRepository.create({
        groupBookingId: savedGroup.id,
        roomId: roomDto.room_id,
        guestName: roomDto.guest_name ?? null,
        guestPhone: roomDto.guest_phone ?? null,
        guestPassport: roomDto.guest_passport ?? null,
        pricePerNight: roomDto.price_per_night,
        status: 'pending',
      }),
    );

    await this.groupRoomRepository.save(groupRooms);

    return this.findOneGroup(savedGroup.id);
  }

  // ── Update group details ─────────────────────────────────────────────────

  async updateGroup(
    groupId: number,
    dto: UpdateGroupDto,
  ): Promise<Record<string, unknown>> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'group_booking',
        id: groupId,
      });
    }

    if (dto.group_name !== undefined) group.groupName = dto.group_name;
    if (dto.agency_id !== undefined) group.agencyId = dto.agency_id;
    if (dto.contact_person !== undefined) group.contactPerson = dto.contact_person;
    if (dto.contact_phone !== undefined) group.contactPhone = dto.contact_phone;
    if (dto.contact_email !== undefined) group.contactEmail = dto.contact_email;
    if (dto.check_in !== undefined) group.checkIn = dto.check_in;
    if (dto.check_out !== undefined) group.checkOut = dto.check_out;
    if (dto.status !== undefined) group.status = dto.status;
    if (dto.notes !== undefined) group.notes = dto.notes;

    await this.groupRepository.save(group);
    return this.findOneGroup(groupId);
  }

  // ── Confirm a group ──────────────────────────────────────────────────────

  async confirmGroup(
    groupId: number,
    _userId: number,
  ): Promise<Record<string, unknown>> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['rooms'],
    });

    if (!group) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'group_booking',
        id: groupId,
      });
    }

    if (group.status !== 'tentative') {
      throw new SardobaException(ErrorCode.GROUP_INVALID_STATUS, {
        current_status: group.status,
        required_status: 'tentative',
      });
    }

    group.status = 'confirmed';
    await this.groupRepository.save(group);

    for (const room of group.rooms) {
      if (room.status === 'pending') {
        room.status = 'confirmed';
      }
    }
    await this.groupRoomRepository.save(group.rooms);

    return this.findOneGroup(groupId);
  }

  // ── Bulk check-in all rooms ──────────────────────────────────────────────

  async checkInGroup(
    groupId: number,
    _userId: number,
  ): Promise<Record<string, unknown>> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['rooms'],
    });

    if (!group) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'group_booking',
        id: groupId,
      });
    }

    if (group.status !== 'confirmed') {
      throw new SardobaException(ErrorCode.GROUP_INVALID_STATUS, {
        current_status: group.status,
        required_status: 'confirmed',
      });
    }

    group.status = 'checked_in';
    await this.groupRepository.save(group);

    for (const room of group.rooms) {
      if (room.status === 'confirmed' || room.status === 'pending') {
        room.status = 'checked_in';
      }
    }
    await this.groupRoomRepository.save(group.rooms);

    return this.findOneGroup(groupId);
  }

  // ── Cancel group and all rooms ───────────────────────────────────────────

  async cancelGroup(
    groupId: number,
    _userId: number,
  ): Promise<Record<string, unknown>> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['rooms'],
    });

    if (!group) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'group_booking',
        id: groupId,
      });
    }

    if (group.status === 'checked_in' || group.status === 'checked_out') {
      throw new SardobaException(ErrorCode.GROUP_INVALID_STATUS, {
        current_status: group.status,
        reason: 'Cannot cancel a group that is already checked in or checked out',
      });
    }

    group.status = 'cancelled';
    await this.groupRepository.save(group);

    for (const room of group.rooms) {
      if (room.status !== 'checked_out') {
        room.status = 'cancelled';
      }
    }
    await this.groupRoomRepository.save(group.rooms);

    return this.findOneGroup(groupId);
  }

  // ── Group statistics ─────────────────────────────────────────────────────

  async getGroupStats(propertyId: number) {
    const stats = await this.groupRepository
      .createQueryBuilder('g')
      .select('g.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(g.totalAmount), 0)::bigint', 'total_amount')
      .where('g.propertyId = :propertyId', { propertyId })
      .groupBy('g.status')
      .getRawMany();

    const result: Record<string, { count: number; total_amount: number }> = {};
    let totalGroups = 0;
    let totalRevenue = 0;

    for (const row of stats) {
      result[row.status] = {
        count: Number(row.count),
        total_amount: Number(row.total_amount),
      };
      totalGroups += Number(row.count);
      totalRevenue += Number(row.total_amount);
    }

    return {
      by_status: result,
      total_groups: totalGroups,
      total_revenue: totalRevenue,
    };
  }

  // ── Agency CRUD ──────────────────────────────────────────────────────────

  async findAllAgencies(propertyId: number) {
    const agencies = await this.agencyRepository.find({
      where: { propertyId, isActive: true },
      order: { name: 'ASC' },
    });

    return agencies.map((a) => this.toAgencyResponse(a));
  }

  async createAgency(
    propertyId: number,
    dto: CreateAgencyDto,
  ): Promise<Record<string, unknown>> {
    const agency = this.agencyRepository.create({
      propertyId,
      name: dto.name,
      contactPerson: dto.contact_person ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      commission: dto.commission ?? 0,
      notes: dto.notes ?? null,
      isActive: true,
    });

    const saved = await this.agencyRepository.save(agency);
    return this.toAgencyResponse(saved);
  }

  async updateAgency(
    agencyId: number,
    dto: UpdateAgencyDto,
  ): Promise<Record<string, unknown>> {
    const agency = await this.agencyRepository.findOne({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'agency',
        id: agencyId,
      });
    }

    if (dto.name !== undefined) agency.name = dto.name;
    if (dto.contact_person !== undefined) agency.contactPerson = dto.contact_person;
    if (dto.phone !== undefined) agency.phone = dto.phone;
    if (dto.email !== undefined) agency.email = dto.email;
    if (dto.commission !== undefined) agency.commission = dto.commission;
    if (dto.notes !== undefined) agency.notes = dto.notes;
    if (dto.is_active !== undefined) agency.isActive = dto.is_active;

    const saved = await this.agencyRepository.save(agency);
    return this.toAgencyResponse(saved);
  }

  async deleteAgency(agencyId: number): Promise<void> {
    const agency = await this.agencyRepository.findOne({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'agency',
        id: agencyId,
      });
    }

    agency.isActive = false;
    await this.agencyRepository.save(agency);
  }

  // ── Verify group belongs to property ─────────────────────────────────────

  async verifyGroupProperty(
    groupId: number,
    propertyId: number,
  ): Promise<GroupBooking> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'group_booking',
        id: groupId,
      });
    }

    if (group.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Group booking does not belong to your property',
      });
    }

    return group;
  }

  async verifyAgencyProperty(
    agencyId: number,
    propertyId: number,
  ): Promise<Agency> {
    const agency = await this.agencyRepository.findOne({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'agency',
        id: agencyId,
      });
    }

    if (agency.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Agency does not belong to your property',
      });
    }

    return agency;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async generateGroupNumber(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `GRP-${yy}${mm}${dd}`;

    const latest = await this.groupRepository
      .createQueryBuilder('g')
      .where('g.groupNumber LIKE :prefix', { prefix: `${prefix}-%` })
      .orderBy('g.groupNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (latest) {
      const parts = latest.groupNumber.split('-');
      seq = parseInt(parts[2], 10) + 1;
    }

    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  private toGroupResponse(group: GroupBooking): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: group.id,
      property_id: group.propertyId,
      group_name: group.groupName,
      group_number: group.groupNumber,
      agency_id: group.agencyId,
      contact_person: group.contactPerson,
      contact_phone: group.contactPhone,
      contact_email: group.contactEmail,
      check_in: group.checkIn,
      check_out: group.checkOut,
      rooms_count: group.roomsCount,
      guests_count: group.guestsCount,
      total_amount: Number(group.totalAmount),
      paid_amount: Number(group.paidAmount),
      status: group.status,
      notes: group.notes,
      created_by: group.createdBy,
      created_at: group.createdAt,
      updated_at: group.updatedAt,
    };

    if (group.agency) {
      response.agency = this.toAgencyResponse(group.agency);
    }

    if (group.rooms) {
      response.rooms = group.rooms.map((r) => this.toGroupRoomResponse(r));
    }

    return response;
  }

  private toGroupRoomResponse(
    room: GroupBookingRoom,
  ): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: room.id,
      group_booking_id: room.groupBookingId,
      room_id: room.roomId,
      booking_id: room.bookingId,
      guest_name: room.guestName,
      guest_phone: room.guestPhone,
      guest_passport: room.guestPassport,
      status: room.status,
      price_per_night: Number(room.pricePerNight),
      created_at: room.createdAt,
    };

    if (room.room) {
      response.room = {
        id: room.room.id,
        name: room.room.name,
        room_type: room.room.roomType,
      };
    }

    return response;
  }

  private toAgencyResponse(agency: Agency): Record<string, unknown> {
    return {
      id: agency.id,
      property_id: agency.propertyId,
      name: agency.name,
      contact_person: agency.contactPerson,
      phone: agency.phone,
      email: agency.email,
      commission: Number(agency.commission),
      notes: agency.notes,
      is_active: agency.isActive,
      created_at: agency.createdAt,
      updated_at: agency.updatedAt,
    };
  }
}
