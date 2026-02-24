import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CryptoService } from './crypto.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestFilterDto } from './dto/guest-filter.dto';

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly cryptoService: CryptoService,
  ) {}

  // ── List guests with pagination, search and filters ─────────────────────────

  async findAll(propertyId: number, query: GuestFilterDto) {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.guestRepository
      .createQueryBuilder('guest')
      .where('guest.propertyId = :propertyId', { propertyId });

    if (query.search) {
      qb.andWhere(
        '(guest.firstName ILIKE :search OR guest.lastName ILIKE :search OR guest.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.is_vip !== undefined) {
      qb.andWhere('guest.isVip = :isVip', { isVip: query.is_vip });
    }

    qb.orderBy('guest.lastName', 'ASC').addOrderBy('guest.firstName', 'ASC');

    const [guests, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: guests.map((guest) => this.toListFormat(guest)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  // ── Get single guest profile with decrypted document and bookings ──────────

  async findOne(id: number, propertyId: number) {
    const guest = await this.guestRepository.findOne({
      where: { id, propertyId },
    });

    if (!guest) {
      throw new SardobaException(
        ErrorCode.GUEST_NOT_FOUND,
        { id, property_id: propertyId },
        'Guest not found',
      );
    }

    // Load bookings with room info, ordered by check-in date descending
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .where('booking.guestId = :guestId', { guestId: id })
      .orderBy('booking.checkIn', 'DESC')
      .getMany();

    return this.toDetailFormat(guest, bookings);
  }

  // ── Create a new guest ──────────────────────────────────────────────────────

  async create(propertyId: number, dto: CreateGuestDto) {
    // Check phone uniqueness within property
    await this.checkPhoneUniqueness(propertyId, dto.phone);

    const guest = this.guestRepository.create({
      propertyId,
      firstName: dto.first_name,
      lastName: dto.last_name,
      phone: dto.phone,
      email: dto.email ?? null,
      nationality: dto.nationality?.toUpperCase() ?? null,
      documentType: dto.document_type ?? null,
      documentNumber: dto.document_number
        ? Buffer.from(this.cryptoService.encrypt(dto.document_number), 'hex')
        : null,
      dateOfBirth: dto.date_of_birth ?? null,
      isVip: dto.is_vip ?? false,
      notes: dto.notes ?? null,
      totalRevenue: 0,
      visitCount: 0,
    });

    const saved = await this.guestRepository.save(guest);
    return this.toListFormat(saved);
  }

  // ── Update an existing guest ────────────────────────────────────────────────

  async update(id: number, propertyId: number, dto: UpdateGuestDto) {
    const guest = await this.guestRepository.findOne({
      where: { id, propertyId },
    });

    if (!guest) {
      throw new SardobaException(
        ErrorCode.GUEST_NOT_FOUND,
        { id, property_id: propertyId },
        'Guest not found',
      );
    }

    // If phone is being changed, check uniqueness
    if (dto.phone !== undefined && dto.phone !== guest.phone) {
      await this.checkPhoneUniqueness(propertyId, dto.phone, id);
    }

    // Map snake_case DTO fields to camelCase entity fields
    if (dto.first_name !== undefined) guest.firstName = dto.first_name;
    if (dto.last_name !== undefined) guest.lastName = dto.last_name;
    if (dto.phone !== undefined) guest.phone = dto.phone;
    if (dto.email !== undefined) guest.email = dto.email ?? null;
    if (dto.nationality !== undefined) guest.nationality = dto.nationality?.toUpperCase() ?? null;
    if (dto.document_type !== undefined) guest.documentType = dto.document_type ?? null;
    if (dto.document_number !== undefined) {
      guest.documentNumber = dto.document_number
        ? Buffer.from(this.cryptoService.encrypt(dto.document_number), 'hex')
        : null;
    }
    if (dto.date_of_birth !== undefined) guest.dateOfBirth = dto.date_of_birth ?? null;
    if (dto.is_vip !== undefined) guest.isVip = dto.is_vip ?? false;
    if (dto.notes !== undefined) guest.notes = dto.notes ?? null;

    const saved = await this.guestRepository.save(guest);
    return this.toListFormat(saved);
  }

  // ── Autocomplete search for booking form ────────────────────────────────────

  async search(
    propertyId: number,
    query: string,
    limit: number = 10,
  ): Promise<Array<{ id: number; first_name: string; last_name: string; phone: string }>> {
    const guests = await this.guestRepository
      .createQueryBuilder('guest')
      .select(['guest.id', 'guest.firstName', 'guest.lastName', 'guest.phone'])
      .where('guest.propertyId = :propertyId', { propertyId })
      .andWhere(
        '(guest.firstName ILIKE :query OR guest.lastName ILIKE :query OR guest.phone ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('guest.lastName', 'ASC')
      .limit(limit)
      .getMany();

    return guests.map((g) => ({
      id: g.id,
      first_name: g.firstName,
      last_name: g.lastName,
      phone: g.phone,
    }));
  }

  // ── Export OVIR report as CSV ───────────────────────────────────────────────

  async exportOvir(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<string> {
    // Find all bookings for this property within the date range, with guest + room
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.room', 'room')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.checkIn < :dateTo', { dateTo })
      .andWhere('booking.checkOut > :dateFrom', { dateFrom })
      .andWhere('booking.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'no_show'],
      })
      .orderBy('booking.checkIn', 'ASC')
      .getMany();

    // CSV header
    const header = '\u2116;' +
      '\u0424\u0430\u043C\u0438\u043B\u0438\u044F;' +
      '\u0418\u043C\u044F;' +
      '\u0414\u0430\u0442\u0430\u0420\u043E\u0436\u0434\u0435\u043D\u0438\u044F;' +
      '\u0413\u0440\u0430\u0436\u0434\u0430\u043D\u0441\u0442\u0432\u043E;' +
      '\u0422\u0438\u043F\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430;' +
      '\u041D\u043E\u043C\u0435\u0440\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430;' +
      '\u0414\u0430\u0442\u0430\u0417\u0430\u0435\u0437\u0434\u0430;' +
      '\u0414\u0430\u0442\u0430\u0412\u044B\u0435\u0437\u0434\u0430;' +
      '\u041D\u043E\u043C\u0435\u0440';

    const rows = bookings.map((booking, index) => {
      const guest = booking.guest;
      let documentNumber = '';
      if (guest.documentNumber) {
        try {
          const hex = guest.documentNumber instanceof Buffer
            ? guest.documentNumber.toString('hex')
            : String(guest.documentNumber);
          documentNumber = this.cryptoService.decrypt(hex);
        } catch {
          documentNumber = '***';
        }
      }

      const documentTypeMap: Record<string, string> = {
        passport: '\u041F\u0430\u0441\u043F\u043E\u0440\u0442',
        id_card: 'ID \u043A\u0430\u0440\u0442\u0430',
        other: '\u0414\u0440\u0443\u0433\u043E\u0435',
      };

      return [
        index + 1,
        guest.lastName,
        guest.firstName,
        guest.dateOfBirth ?? '',
        guest.nationality ?? '',
        guest.documentType ? (documentTypeMap[guest.documentType] ?? guest.documentType) : '',
        documentNumber,
        booking.checkIn,
        booking.checkOut,
        booking.room?.name ?? '',
      ].join(';');
    });

    // UTF-8 BOM + header + rows
    const BOM = '\uFEFF';
    return BOM + [header, ...rows].join('\r\n');
  }

  // ── Find by phone or create new guest ───────────────────────────────────────

  async findOrCreate(
    propertyId: number,
    guestData: CreateGuestDto,
  ): Promise<Record<string, unknown>> {
    // Try to find existing guest by phone
    const existing = await this.guestRepository.findOne({
      where: { propertyId, phone: guestData.phone },
    });

    if (existing) {
      return this.toListFormat(existing);
    }

    return this.create(propertyId, guestData);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Check phone uniqueness within a property.
   * Optionally exclude a guest by ID (for update scenarios).
   */
  private async checkPhoneUniqueness(
    propertyId: number,
    phone: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.guestRepository
      .createQueryBuilder('guest')
      .where('guest.propertyId = :propertyId', { propertyId })
      .andWhere('guest.phone = :phone', { phone });

    if (excludeId !== undefined) {
      qb.andWhere('guest.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new SardobaException(
        ErrorCode.GUEST_DUPLICATE_PHONE,
        { phone, property_id: propertyId },
        'A guest with this phone number already exists in this property',
      );
    }
  }

  /**
   * Transform entity to snake_case list format (NO documentNumber).
   */
  private toListFormat(guest: Guest): Record<string, unknown> {
    return {
      id: guest.id,
      property_id: guest.propertyId,
      first_name: guest.firstName,
      last_name: guest.lastName,
      phone: guest.phone,
      email: guest.email,
      nationality: guest.nationality,
      document_type: guest.documentType,
      date_of_birth: guest.dateOfBirth,
      is_vip: guest.isVip,
      notes: guest.notes,
      total_revenue: Number(guest.totalRevenue),
      visit_count: guest.visitCount,
      created_at: guest.createdAt,
      updated_at: guest.updatedAt,
    };
  }

  /**
   * Transform entity to snake_case detail format WITH decrypted documentNumber and bookings.
   */
  private toDetailFormat(
    guest: Guest,
    bookings: Booking[],
  ): Record<string, unknown> {
    let decryptedDocumentNumber: string | null = null;

    if (guest.documentNumber) {
      try {
        const hex = guest.documentNumber instanceof Buffer
          ? guest.documentNumber.toString('hex')
          : String(guest.documentNumber);
        decryptedDocumentNumber = this.cryptoService.decrypt(hex);
      } catch {
        decryptedDocumentNumber = null;
      }
    }

    return {
      id: guest.id,
      property_id: guest.propertyId,
      first_name: guest.firstName,
      last_name: guest.lastName,
      phone: guest.phone,
      email: guest.email,
      nationality: guest.nationality,
      document_type: guest.documentType,
      document_number: decryptedDocumentNumber,
      date_of_birth: guest.dateOfBirth,
      is_vip: guest.isVip,
      notes: guest.notes,
      total_revenue: Number(guest.totalRevenue),
      visit_count: guest.visitCount,
      created_at: guest.createdAt,
      updated_at: guest.updatedAt,
      bookings: bookings.map((b) => ({
        id: b.id,
        booking_number: b.bookingNumber,
        room_name: b.room?.name ?? null,
        check_in: b.checkIn,
        check_out: b.checkOut,
        nights: b.nights,
        total_amount: Number(b.totalAmount),
        status: b.status,
        created_at: b.createdAt,
      })),
    };
  }
}
