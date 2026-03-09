import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Property } from '../../database/entities/property.entity';
import { User } from '../../database/entities/user.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Payment } from '../../database/entities/payment.entity';
import { SyncLog } from '../../database/entities/sync-log.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import {
  AdminPropertiesQueryDto,
  AdminBookingsQueryDto,
  AdminUsersQueryDto,
  AdminLogsQueryDto,
} from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── PLATFORM STATS ──────────────────────────────────────────────────────────

  async getStats() {
    const [
      totalProperties,
      totalUsers,
      totalBookings,
      revenueResult,
      roomsResult,
    ] = await Promise.all([
      this.propertyRepo.count(),
      this.userRepo.count({ where: { role: ILike('%') as any } }),
      this.bookingRepo.count(),
      this.dataSource.query(`
        SELECT COALESCE(SUM(p.amount), 0)::bigint as total_revenue
        FROM payments p
      `),
      this.dataSource.query(`
        SELECT COUNT(*)::int as total_rooms FROM rooms WHERE status = 'active'
      `),
    ]);

    // Count users excluding super_admin
    const platformUsers = await this.userRepo.count({
      where: [
        { role: 'owner' as any },
        { role: 'admin' as any },
        { role: 'viewer' as any },
      ],
    });

    // Active bookings (checked_in)
    const activeBookings = await this.bookingRepo.count({
      where: { status: 'checked_in' as any },
    });

    // Current month revenue
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenueResult = await this.dataSource.query(`
      SELECT COALESCE(SUM(amount), 0)::bigint as monthly_revenue
      FROM payments
      WHERE paid_at >= $1
    `, [firstDayOfMonth.toISOString()]);

    return {
      total_hotels: totalProperties,
      total_users: platformUsers,
      total_rooms: roomsResult[0]?.total_rooms ?? 0,
      total_bookings: totalBookings,
      active_bookings: activeBookings,
      total_revenue: Number(revenueResult[0]?.total_revenue ?? 0),
      monthly_revenue: Number(monthRevenueResult[0]?.monthly_revenue ?? 0),
    };
  }

  // ─── MRR HISTORY ──────────────────────────────────────────────────────────────

  async getMrrHistory() {
    const result = await this.dataSource.query(`
      SELECT
        TO_CHAR(paid_at, 'YYYY-MM') as month,
        SUM(amount)::bigint as revenue,
        COUNT(DISTINCT b.property_id)::int as active_hotels
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE paid_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
      ORDER BY month ASC
    `);

    return result.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue),
      active_hotels: row.active_hotels,
    }));
  }

  // ─── PROPERTIES ───────────────────────────────────────────────────────────────

  async listProperties(query: AdminPropertiesQueryDto) {
    const { page = 1, perPage = 20, search, status, city } = query;

    const qb = this.dataSource
      .createQueryBuilder()
      .select('p.*')
      .addSelect('COUNT(DISTINCT r.id)::int', 'rooms_count')
      .addSelect('COUNT(DISTINCT u.id)::int', 'users_count')
      .addSelect('COUNT(DISTINCT b.id)::int', 'bookings_count')
      .from('properties', 'p')
      .leftJoin('rooms', 'r', 'r.property_id = p.id AND r.status = :roomStatus', { roomStatus: 'active' })
      .leftJoin('users', 'u', 'u.property_id = p.id')
      .leftJoin('bookings', 'b', 'b.property_id = p.id')
      .groupBy('p.id');

    if (search) {
      qb.andWhere('(p.name ILIKE :search OR p.city ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (city) {
      qb.andWhere('p.city = :city', { city });
    }

    // Count total
    const countQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)::int', 'total')
      .from('properties', 'p');

    if (search) {
      countQb.andWhere('(p.name ILIKE :search OR p.city ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (city) {
      countQb.andWhere('p.city = :city', { city });
    }

    const [rows, countResult] = await Promise.all([
      qb
        .orderBy('p.created_at', 'DESC')
        .offset((page - 1) * perPage)
        .limit(perPage)
        .getRawMany(),
      countQb.getRawOne(),
    ]);

    const total = countResult?.total ?? 0;

    return {
      data: rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        address: row.address,
        phone: row.phone,
        currency: row.currency,
        slug: row.slug,
        booking_enabled: row.booking_enabled,
        rooms_count: row.rooms_count,
        users_count: row.users_count,
        bookings_count: row.bookings_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  async getProperty(id: number) {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, undefined, 'Property not found');
    }

    const [roomsCount, usersCount, bookingsCount, revenueResult] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*)::int as count FROM rooms WHERE property_id = $1 AND status = 'active'`, [id]),
      this.dataSource.query(`SELECT COUNT(*)::int as count FROM users WHERE property_id = $1`, [id]),
      this.dataSource.query(`SELECT COUNT(*)::int as count FROM bookings WHERE property_id = $1`, [id]),
      this.dataSource.query(`
        SELECT COALESCE(SUM(p.amount), 0)::bigint as revenue
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE b.property_id = $1
      `, [id]),
    ]);

    return {
      ...property,
      rooms_count: roomsCount[0]?.count ?? 0,
      users_count: usersCount[0]?.count ?? 0,
      bookings_count: bookingsCount[0]?.count ?? 0,
      total_revenue: Number(revenueResult[0]?.revenue ?? 0),
    };
  }

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────────

  async listBookings(query: AdminBookingsQueryDto) {
    const { page = 1, perPage = 20, search, status, source, propertyId } = query;

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'property')
      .leftJoinAndSelect('b.guest', 'guest')
      .leftJoinAndSelect('b.room', 'room');

    if (search) {
      qb.andWhere(
        '(b.bookingNumber ILIKE :search OR guest.firstName ILIKE :search OR guest.lastName ILIKE :search OR guest.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere('b.status = :status', { status });
    }

    if (source) {
      qb.andWhere('b.source = :source', { source });
    }

    if (propertyId) {
      qb.andWhere('b.propertyId = :propertyId', { propertyId });
    }

    const [bookings, total] = await qb
      .orderBy('b.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: bookings.map((b) => ({
        id: b.id,
        booking_number: b.bookingNumber,
        property_id: b.propertyId,
        property_name: b.property?.name ?? null,
        guest_name: b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : null,
        guest_phone: b.guest?.phone ?? null,
        room_name: b.room?.name ?? null,
        check_in: b.checkIn,
        check_out: b.checkOut,
        nights: b.nights,
        total_amount: Number(b.totalAmount),
        paid_amount: Number(b.paidAmount),
        status: b.status,
        source: b.source,
        created_at: b.createdAt,
      })),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  // ─── USERS ────────────────────────────────────────────────────────────────────

  async listUsers(query: AdminUsersQueryDto) {
    const { page = 1, perPage = 20, search, role, status } = query;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.property', 'property')
      .where('u.role != :superRole', { superRole: 'super_admin' });

    if (search) {
      qb.andWhere(
        '(u.name ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      qb.andWhere('u.role = :role', { role });
    }

    if (status === 'active') {
      qb.andWhere('u.isActive = true');
    } else if (status === 'blocked') {
      qb.andWhere('u.isActive = false');
    }

    const [users, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        is_active: u.isActive,
        property_id: u.propertyId,
        property_name: u.property?.name ?? null,
        last_login_at: u.lastLoginAt,
        created_at: u.createdAt,
      })),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  async updateUserStatus(id: number, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new SardobaException(ErrorCode.NOT_FOUND, undefined, 'User not found');
    }
    if (user.role === 'super_admin') {
      throw new SardobaException(ErrorCode.FORBIDDEN, undefined, 'Cannot modify super admin');
    }

    await this.userRepo.update(id, { isActive });
    this.logger.log(`User ${id} status changed to ${isActive ? 'active' : 'blocked'}`);
    return { success: true };
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────────

  async getAnalyticsOverview() {
    const [
      revenueByMonth,
      bookingsBySource,
      hotelsByCity,
      topHotels,
    ] = await Promise.all([
      this.dataSource.query(`
        SELECT
          TO_CHAR(p.paid_at, 'YYYY-MM') as month,
          SUM(p.amount)::bigint as revenue,
          COUNT(DISTINCT p.id)::int as payments_count
        FROM payments p
        WHERE p.paid_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(p.paid_at, 'YYYY-MM')
        ORDER BY month ASC
      `),
      this.dataSource.query(`
        SELECT source, COUNT(*)::int as count
        FROM bookings
        GROUP BY source
        ORDER BY count DESC
      `),
      this.dataSource.query(`
        SELECT city, COUNT(*)::int as count
        FROM properties
        GROUP BY city
        ORDER BY count DESC
      `),
      this.dataSource.query(`
        SELECT
          pr.id, pr.name, pr.city,
          COUNT(DISTINCT b.id)::int as bookings_count,
          COALESCE(SUM(pay.amount), 0)::bigint as revenue
        FROM properties pr
        LEFT JOIN bookings b ON b.property_id = pr.id
        LEFT JOIN payments pay ON pay.booking_id = b.id
        GROUP BY pr.id, pr.name, pr.city
        ORDER BY revenue DESC
        LIMIT 15
      `),
    ]);

    return {
      revenue_by_month: revenueByMonth.map((r: any) => ({
        month: r.month,
        revenue: Number(r.revenue),
        payments_count: r.payments_count,
      })),
      bookings_by_source: bookingsBySource.map((r: any) => ({
        source: r.source,
        count: r.count,
      })),
      hotels_by_city: hotelsByCity.map((r: any) => ({
        city: r.city,
        count: r.count,
      })),
      top_hotels: topHotels.map((r: any) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        bookings_count: r.bookings_count,
        revenue: Number(r.revenue),
      })),
    };
  }

  // ─── LOGS ─────────────────────────────────────────────────────────────────────

  async listLogs(query: AdminLogsQueryDto) {
    const { page = 1, perPage = 25, level, service, propertyId, search } = query;

    // Use sync_logs as our log source for now
    const qb = this.syncLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.channel', 'channel');

    if (propertyId) {
      qb.andWhere('channel.propertyId = :propertyId', { propertyId });
    }

    if (level === 'error') {
      qb.andWhere('log.status = :status', { status: 'error' });
    } else if (level === 'success' || level === 'info') {
      qb.andWhere('log.status = :status', { status: 'success' });
    }

    if (search) {
      qb.andWhere('(log.eventType ILIKE :search OR log.errorMessage ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [logs, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: logs.map((log) => ({
        id: log.id,
        event_type: log.eventType,
        status: log.status,
        error_message: log.errorMessage,
        payload: log.payload,
        channel_id: log.channelId,
        created_at: log.createdAt,
      })),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  // ─── SYSTEM HEALTH ────────────────────────────────────────────────────────────

  async getSystemHealth() {
    const services = [];

    // Database check
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      services.push({
        name: 'PostgreSQL',
        status: 'healthy',
        response_time_ms: Date.now() - start,
      });
    } catch {
      services.push({ name: 'PostgreSQL', status: 'down', response_time_ms: 0 });
    }

    // Check tables count for general health
    try {
      const propsCount = await this.propertyRepo.count();
      const usersCount = await this.userRepo.count();
      const bookingsCount = await this.bookingRepo.count();
      services.push({
        name: 'Data Layer',
        status: 'healthy',
        details: {
          properties: propsCount,
          users: usersCount,
          bookings: bookingsCount,
        },
      });
    } catch {
      services.push({ name: 'Data Layer', status: 'degraded' });
    }

    // API status (always healthy if we got here)
    services.push({
      name: 'NestJS API',
      status: 'healthy',
      uptime: process.uptime(),
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });

    return { services, timestamp: new Date().toISOString() };
  }
}
