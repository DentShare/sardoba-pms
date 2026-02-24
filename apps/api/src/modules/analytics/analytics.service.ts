import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { Room } from '../../database/entities/room.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Response interfaces ─────────────────────────────────────────────────────

export interface SummaryResult {
  period: { date_from: string; date_to: string };
  occupancy_rate: number;
  revenue: number;
  adr: number;
  revpar: number;
  total_bookings: number;
  avg_stay_nights: number;
  top_source: string | null;
  compare?: {
    occupancy_rate: number;
    revenue: number;
    adr: number;
    revpar: number;
    total_bookings: number;
    avg_stay_nights: number;
    top_source: string | null;
  };
  delta?: {
    occupancy_rate: number;
    revenue: number;
    adr: number;
    revpar: number;
    total_bookings: number;
    avg_stay_nights: number;
  };
}

export interface OccupancyRow {
  date: string;
  bookings_count: number;
  occupied_rooms: number;
  total_rooms: number;
  occupancy_rate: number;
}

export interface RevenueRow {
  month: string;
  revenue: number;
  bookings_count: number;
}

export interface SourceRow {
  source: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface GuestStats {
  total_guests: number;
  new_guests: number;
  returning_guests: number;
  by_nationality: Array<{ nationality: string; count: number }>;
}

export interface RoomStatsRow {
  room_id: number;
  room_name: string;
  room_type: string;
  revenue: number;
  nights_sold: number;
  occupancy_rate: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    private dataSource: DataSource,
  ) {}

  // ── Summary ───────────────────────────────────────────────────────────────

  /**
   * Get a summary of key hotel metrics for a given period.
   *
   * Formulas:
   *   occupancyRate = (occupiedNights / availableNights) * 100
   *   ADR = roomRevenue / occupiedNights
   *   RevPAR = ADR * (occupancyRate / 100)
   *
   * If compare dates are provided, calculates the same metrics for the
   * comparison period and returns delta percentages.
   */
  async getSummary(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
    compareFrom?: string,
    compareTo?: string,
  ): Promise<SummaryResult> {
    this.validateDateRange(dateFrom, dateTo);

    const primary = await this.calculateSummaryMetrics(propertyId, dateFrom, dateTo);

    const result: SummaryResult = {
      period: { date_from: dateFrom, date_to: dateTo },
      ...primary,
    };

    if (compareFrom && compareTo) {
      this.validateDateRange(compareFrom, compareTo);
      const comparison = await this.calculateSummaryMetrics(propertyId, compareFrom, compareTo);

      result.compare = comparison;
      result.delta = {
        occupancy_rate: this.calcDelta(primary.occupancy_rate, comparison.occupancy_rate),
        revenue: this.calcDelta(primary.revenue, comparison.revenue),
        adr: this.calcDelta(primary.adr, comparison.adr),
        revpar: this.calcDelta(primary.revpar, comparison.revpar),
        total_bookings: this.calcDelta(primary.total_bookings, comparison.total_bookings),
        avg_stay_nights: this.calcDelta(primary.avg_stay_nights, comparison.avg_stay_nights),
      };
    }

    return result;
  }

  /**
   * Internal: calculate summary metrics for a single period.
   */
  private async calculateSummaryMetrics(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<{
    occupancy_rate: number;
    revenue: number;
    adr: number;
    revpar: number;
    total_bookings: number;
    avg_stay_nights: number;
    top_source: string | null;
  }> {
    // Count active rooms for this property
    const roomCountResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total_rooms
       FROM rooms
       WHERE property_id = $1 AND status = 'active'`,
      [propertyId],
    );
    const totalRooms: number = roomCountResult[0]?.total_rooms ?? 0;

    if (totalRooms === 0) {
      return {
        occupancy_rate: 0,
        revenue: 0,
        adr: 0,
        revpar: 0,
        total_bookings: 0,
        avg_stay_nights: 0,
        top_source: null,
      };
    }

    // Calculate the number of days in the period
    const totalDays = this.daysBetween(dateFrom, dateTo);
    const availableNights = totalRooms * totalDays;

    // Main metrics query: revenue, bookings count, total occupied nights, avg stay
    const metricsResult = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(b.total_amount), 0)::bigint AS revenue,
         COUNT(b.id)::int AS total_bookings,
         COALESCE(SUM(
           LEAST(b.check_out::date, $2::date) - GREATEST(b.check_in::date, $1::date)
         ), 0)::int AS occupied_nights,
         COALESCE(ROUND(AVG(b.nights), 1), 0)::float AS avg_stay_nights
       FROM bookings b
       WHERE b.property_id = $3
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date`,
      [dateFrom, dateTo, propertyId],
    );

    const metrics = metricsResult[0];
    const revenue = Number(metrics.revenue);
    const totalBookings: number = metrics.total_bookings;
    const occupiedNights: number = metrics.occupied_nights;
    const avgStayNights: number = Number(metrics.avg_stay_nights);

    // Calculate derived metrics
    const occupancyRate =
      availableNights > 0
        ? Math.round((occupiedNights / availableNights) * 1000) / 10
        : 0;

    const adr =
      occupiedNights > 0
        ? Math.round(revenue / occupiedNights)
        : 0;

    const revpar = Math.round(adr * (occupancyRate / 100));

    // Top booking source
    const topSourceResult = await this.dataSource.query(
      `SELECT b.source, COUNT(*)::int AS cnt
       FROM bookings b
       WHERE b.property_id = $3
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date
       GROUP BY b.source
       ORDER BY cnt DESC
       LIMIT 1`,
      [dateFrom, dateTo, propertyId],
    );

    const topSource: string | null = topSourceResult[0]?.source ?? null;

    return {
      occupancy_rate: occupancyRate,
      revenue,
      adr,
      revpar,
      total_bookings: totalBookings,
      avg_stay_nights: avgStayNights,
      top_source: topSource,
    };
  }

  // ── Occupancy ─────────────────────────────────────────────────────────────

  /**
   * Get daily occupancy data for a date range.
   * Uses generate_series to produce one row per day with room counts.
   */
  async getOccupancy(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<OccupancyRow[]> {
    this.validateDateRange(dateFrom, dateTo);

    const rows = await this.dataSource.query(
      `SELECT
         d::date AS date,
         COUNT(DISTINCT b.id)::int AS bookings_count,
         COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN r.id END)::int AS occupied_rooms,
         COUNT(DISTINCT r.id)::int AS total_rooms,
         CASE
           WHEN COUNT(DISTINCT r.id) = 0 THEN 0
           ELSE ROUND(
             COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN r.id END)::decimal
             / COUNT(DISTINCT r.id) * 100,
             1
           )
         END AS occupancy_rate
       FROM generate_series($1::date, $2::date - interval '1 day', '1 day') d
       CROSS JOIN rooms r
       LEFT JOIN bookings b
         ON b.room_id = r.id
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in <= d
         AND b.check_out > d
       WHERE r.property_id = $3
         AND r.status = 'active'
       GROUP BY d
       ORDER BY d`,
      [dateFrom, dateTo, propertyId],
    );

    return rows.map((row: any) => ({
      date: this.formatDate(row.date),
      bookings_count: row.bookings_count,
      occupied_rooms: row.occupied_rooms,
      total_rooms: row.total_rooms,
      occupancy_rate: Number(row.occupancy_rate),
    }));
  }

  // ── Revenue ───────────────────────────────────────────────────────────────

  /**
   * Get monthly revenue breakdown for a date range.
   * Groups by calendar month, returns revenue in tiyin and booking counts.
   */
  async getRevenue(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<RevenueRow[]> {
    this.validateDateRange(dateFrom, dateTo);

    const rows = await this.dataSource.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', b.check_in::date), 'YYYY-MM') AS month,
         COALESCE(SUM(b.total_amount), 0)::bigint AS revenue,
         COUNT(b.id)::int AS bookings_count
       FROM bookings b
       WHERE b.property_id = $3
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date
       GROUP BY DATE_TRUNC('month', b.check_in::date)
       ORDER BY DATE_TRUNC('month', b.check_in::date)`,
      [dateFrom, dateTo, propertyId],
    );

    return rows.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue),
      bookings_count: row.bookings_count,
    }));
  }

  // ── Sources ───────────────────────────────────────────────────────────────

  /**
   * Get booking source breakdown for a date range.
   * Returns count, revenue, and percentage of total for each source.
   */
  async getSources(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<SourceRow[]> {
    this.validateDateRange(dateFrom, dateTo);

    const rows = await this.dataSource.query(
      `WITH source_data AS (
         SELECT
           b.source,
           COUNT(b.id)::int AS count,
           COALESCE(SUM(b.total_amount), 0)::bigint AS revenue
         FROM bookings b
         WHERE b.property_id = $3
           AND b.status NOT IN ('cancelled', 'no_show')
           AND b.check_in < $2::date
           AND b.check_out > $1::date
         GROUP BY b.source
       ),
       total AS (
         SELECT COALESCE(SUM(count), 0) AS total_count FROM source_data
       )
       SELECT
         sd.source,
         sd.count,
         sd.revenue,
         CASE
           WHEN t.total_count = 0 THEN 0
           ELSE ROUND(sd.count::decimal / t.total_count * 100, 1)
         END AS percentage
       FROM source_data sd
       CROSS JOIN total t
       ORDER BY sd.count DESC`,
      [dateFrom, dateTo, propertyId],
    );

    return rows.map((row: any) => ({
      source: row.source,
      count: row.count,
      revenue: Number(row.revenue),
      percentage: Number(row.percentage),
    }));
  }

  // ── Guest Stats ───────────────────────────────────────────────────────────

  /**
   * Get guest statistics for a date range.
   * Includes total guests, new vs returning guests, and nationality breakdown.
   */
  async getGuestStats(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<GuestStats> {
    this.validateDateRange(dateFrom, dateTo);

    // Total unique guests with bookings in the period
    const guestCountResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT b.guest_id)::int AS total_guests
       FROM bookings b
       WHERE b.property_id = $3
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date`,
      [dateFrom, dateTo, propertyId],
    );
    const totalGuests: number = guestCountResult[0]?.total_guests ?? 0;

    // New guests: guests whose first booking at this property falls in the period
    const newGuestsResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT b.guest_id)::int AS new_guests
       FROM bookings b
       WHERE b.property_id = $3
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date
         AND NOT EXISTS (
           SELECT 1 FROM bookings prev
           WHERE prev.guest_id = b.guest_id
             AND prev.property_id = b.property_id
             AND prev.status NOT IN ('cancelled', 'no_show')
             AND prev.check_in < $1::date
         )`,
      [dateFrom, dateTo, propertyId],
    );
    const newGuests: number = newGuestsResult[0]?.new_guests ?? 0;
    const returningGuests = totalGuests - newGuests;

    // Nationality breakdown
    const nationalityRows = await this.dataSource.query(
      `SELECT
         COALESCE(g.nationality, 'unknown') AS nationality,
         COUNT(DISTINCT g.id)::int AS count
       FROM guests g
       INNER JOIN bookings b ON b.guest_id = g.id
       WHERE b.property_id = $3
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date
       GROUP BY g.nationality
       ORDER BY count DESC`,
      [dateFrom, dateTo, propertyId],
    );

    return {
      total_guests: totalGuests,
      new_guests: newGuests,
      returning_guests: returningGuests,
      by_nationality: nationalityRows.map((row: any) => ({
        nationality: row.nationality,
        count: row.count,
      })),
    };
  }

  // ── Room Stats ────────────────────────────────────────────────────────────

  /**
   * Get per-room revenue ranking for a date range.
   * Returns room revenue, nights sold, and individual occupancy rate.
   */
  async getRoomStats(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<RoomStatsRow[]> {
    this.validateDateRange(dateFrom, dateTo);

    const totalDays = this.daysBetween(dateFrom, dateTo);

    const rows = await this.dataSource.query(
      `SELECT
         r.id AS room_id,
         r.name AS room_name,
         r.room_type,
         COALESCE(SUM(b.total_amount), 0)::bigint AS revenue,
         COALESCE(SUM(
           LEAST(b.check_out::date, $2::date) - GREATEST(b.check_in::date, $1::date)
         ), 0)::int AS nights_sold,
         CASE
           WHEN $4::int = 0 THEN 0
           ELSE ROUND(
             COALESCE(SUM(
               LEAST(b.check_out::date, $2::date) - GREATEST(b.check_in::date, $1::date)
             ), 0)::decimal / $4::int * 100,
             1
           )
         END AS occupancy_rate
       FROM rooms r
       LEFT JOIN bookings b
         ON b.room_id = r.id
         AND b.status NOT IN ('cancelled', 'no_show')
         AND b.check_in < $2::date
         AND b.check_out > $1::date
       WHERE r.property_id = $3
         AND r.status = 'active'
       GROUP BY r.id, r.name, r.room_type
       ORDER BY revenue DESC`,
      [dateFrom, dateTo, propertyId, totalDays],
    );

    return rows.map((row: any) => ({
      room_id: row.room_id,
      room_name: row.room_name,
      room_type: row.room_type,
      revenue: Number(row.revenue),
      nights_sold: row.nights_sold,
      occupancy_rate: Number(row.occupancy_rate),
    }));
  }

  // ── Bookings for export ───────────────────────────────────────────────────

  /**
   * Get all bookings with guest and room info for a period (used by export).
   */
  async getBookingsForExport(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<
    Array<{
      booking_number: string;
      guest_name: string;
      room_name: string;
      check_in: string;
      check_out: string;
      nights: number;
      total_amount: number;
      paid_amount: number;
      status: string;
      source: string;
    }>
  > {
    const rows = await this.dataSource.query(
      `SELECT
         b.booking_number,
         CONCAT(g.last_name, ' ', g.first_name) AS guest_name,
         r.name AS room_name,
         b.check_in,
         b.check_out,
         b.nights,
         b.total_amount::bigint,
         b.paid_amount::bigint,
         b.status,
         b.source
       FROM bookings b
       INNER JOIN guests g ON g.id = b.guest_id
       INNER JOIN rooms r ON r.id = b.room_id
       WHERE b.property_id = $3
         AND b.check_in < $2::date
         AND b.check_out > $1::date
       ORDER BY b.check_in ASC, b.booking_number ASC`,
      [dateFrom, dateTo, propertyId],
    );

    return rows.map((row: any) => ({
      booking_number: row.booking_number,
      guest_name: row.guest_name,
      room_name: row.room_name,
      check_in: this.formatDate(row.check_in),
      check_out: this.formatDate(row.check_out),
      nights: row.nights,
      total_amount: Number(row.total_amount),
      paid_amount: Number(row.paid_amount),
      status: row.status,
      source: row.source,
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Calculate percentage delta between two values.
   * Returns change as a percentage rounded to 1 decimal.
   * Positive means current > previous, negative means current < previous.
   */
  private calcDelta(current: number, previous: number): number {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  }

  /**
   * Validate that date_from < date_to.
   */
  private validateDateRange(dateFrom: string, dateTo: string): void {
    if (dateFrom >= dateTo) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dateFrom, date_to: dateTo },
        'date_from must be before date_to',
      );
    }
  }

  /**
   * Calculate the number of days between two YYYY-MM-DD dates.
   */
  private daysBetween(dateFrom: string, dateTo: string): number {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Format a Date or date string to YYYY-MM-DD.
   */
  private formatDate(value: Date | string): string {
    if (typeof value === 'string') {
      // If already YYYY-MM-DD, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // Parse ISO string or other formats
      value = new Date(value);
    }
    const d = value as Date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
