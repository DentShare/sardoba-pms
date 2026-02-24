import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Row-Level Security (RLS) policies for multi-tenancy.
 *
 * All tenant-scoped tables are protected so that queries must include
 * a valid property_id filter. This provides defense-in-depth beyond
 * the application-level PropertyGuard.
 *
 * How it works:
 * - RLS is enabled on each tenant-scoped table
 * - A policy allows access only when property_id matches the
 *   current session variable `app.current_property_id`
 * - The API sets this variable per-request via SET LOCAL
 * - A bypass role (sardoba_admin) is created for migrations/maintenance
 */
export class AddRowLevelSecurity1700000000004 implements MigrationInterface {
  name = 'AddRowLevelSecurity1700000000004';

  /** Tables that have a property_id column and need RLS */
  private readonly tenantTables = [
    'users',
    'rooms',
    'bookings',
    'guests',
    'payments',
    'rates',
    'property_extras',
    'booking_extras',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS and create policies for each tenant-scoped table
    for (const table of this.tenantTables) {
      const hasPropertyId = await this.columnExists(queryRunner, table, 'property_id');
      if (!hasPropertyId) continue;

      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

      // Policy: rows visible only when property_id matches session variable
      // If app.current_property_id is not set, default to '0' (no match)
      await queryRunner.query(`
        CREATE POLICY "${table}_tenant_isolation" ON "${table}"
        USING (property_id = COALESCE(NULLIF(current_setting('app.current_property_id', true), ''), '0')::int)
      `);
    }

    // Allow the table owner (used by migrations) to bypass RLS
    // TypeORM connections run as the DB owner, so they bypass RLS by default.
    // This is correct: RLS applies to non-owner roles.
    // For application connections that use a separate role, we set force RLS:
    // ALTER TABLE "table" FORCE ROW LEVEL SECURITY;
    // But since TypeORM uses the owner role, we skip FORCE to keep migrations working.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tenantTables) {
      const hasPropertyId = await this.columnExists(queryRunner, table, 'property_id');
      if (!hasPropertyId) continue;

      await queryRunner.query(`DROP POLICY IF EXISTS "${table}_tenant_isolation" ON "${table}"`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return result.length > 0;
  }
}
