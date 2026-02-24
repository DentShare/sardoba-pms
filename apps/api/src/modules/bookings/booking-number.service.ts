import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Service for generating sequential, thread-safe booking numbers.
 * Format: BK-YYYY-NNNN (e.g., BK-2025-0001)
 *
 * Uses a database advisory lock to handle concurrent creation safely,
 * ensuring no duplicate booking numbers are generated even under load.
 */
@Injectable()
export class BookingNumberService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generate the next booking number for the current year.
   * Uses PostgreSQL advisory lock for thread safety.
   *
   * @returns The next booking number (e.g., BK-2025-0042)
   */
  async generate(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BK-${year}-`;

    // Use a query runner to get an advisory lock for safe concurrent access.
    // The lock key is derived from the year to scope it per year.
    const lockKey = 100000 + year; // e.g., 102025

    const result = await this.dataSource.query(
      `
      SELECT pg_advisory_xact_lock($1);

      SELECT COALESCE(
        MAX(
          CAST(
            SUBSTRING(booking_number FROM $2)
            AS INTEGER
          )
        ),
        0
      ) + 1 AS next_number
      FROM bookings
      WHERE booking_number LIKE $3;
      `,
      [lockKey, `^BK-${year}-(\\d+)$`, `${prefix}%`],
    );

    // The query returns an array of result sets; the SELECT with next_number
    // is the second statement. TypeORM returns results for the last statement
    // or may return an array of arrays. Handle both.
    let nextNumber: number;
    if (Array.isArray(result) && Array.isArray(result[1])) {
      nextNumber = parseInt(result[1][0]?.next_number ?? '1', 10);
    } else if (Array.isArray(result) && result.length > 0) {
      nextNumber = parseInt(result[0]?.next_number ?? '1', 10);
    } else {
      nextNumber = 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Generate a booking number within an existing transaction.
   * Uses the provided query runner so the advisory lock is part of
   * the caller's transaction scope.
   *
   * @param queryRunner - Active query runner from a transaction
   * @returns The next booking number
   */
  async generateInTransaction(
    manager: import('typeorm').EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BK-${year}-`;
    const lockKey = 100000 + year;

    // Advisory lock scoped to current transaction
    await manager.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

    const result = await manager.query(
      `
      SELECT COALESCE(
        MAX(
          CAST(
            SUBSTRING(booking_number FROM $1)
            AS INTEGER
          )
        ),
        0
      ) + 1 AS next_number
      FROM bookings
      WHERE booking_number LIKE $2;
      `,
      [`^BK-${year}-(\\d+)$`, `${prefix}%`],
    );

    const nextNumber = parseInt(result[0]?.next_number ?? '1', 10);

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }
}
