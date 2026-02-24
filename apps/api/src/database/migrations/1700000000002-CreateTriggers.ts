import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggers1700000000002 implements MigrationInterface {
  name = 'CreateTriggers1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════
    // TRIGGER: Auto-update paid_amount in bookings
    // when a payment is inserted, updated, or deleted
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_booking_paid_amount()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE "bookings"
        SET "paid_amount" = (
          SELECT COALESCE(SUM("amount"), 0)
          FROM "payments"
          WHERE "booking_id" = COALESCE(NEW."booking_id", OLD."booking_id")
        )
        WHERE "id" = COALESCE(NEW."booking_id", OLD."booking_id");
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_payments_update_booking"
      AFTER INSERT OR UPDATE OR DELETE ON "payments"
      FOR EACH ROW EXECUTE FUNCTION update_booking_paid_amount()
    `);

    // ═══════════════════════════════════════════════════
    // TRIGGER: Auto-update total_revenue and visit_count
    // in guests when bookings change
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_guest_stats()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE "guests"
        SET
          "total_revenue" = (
            SELECT COALESCE(SUM("total_amount"), 0)
            FROM "bookings"
            WHERE "guest_id" = COALESCE(NEW."guest_id", OLD."guest_id")
              AND "status" != 'cancelled'
          ),
          "visit_count" = (
            SELECT COUNT(*)
            FROM "bookings"
            WHERE "guest_id" = COALESCE(NEW."guest_id", OLD."guest_id")
              AND "status" = 'checked_out'
          )
        WHERE "id" = COALESCE(NEW."guest_id", OLD."guest_id");
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_bookings_update_guest"
      AFTER INSERT OR UPDATE OR DELETE ON "bookings"
      FOR EACH ROW EXECUTE FUNCTION update_guest_stats()
    `);

    // ═══════════════════════════════════════════════════
    // TRIGGER: Auto-update updated_at timestamp
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updated_at" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Apply updated_at trigger to all tables that have it
    const tablesWithUpdatedAt = [
      'properties',
      'users',
      'rooms',
      'guests',
      'bookings',
      'rates',
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryRunner.query(`
        CREATE TRIGGER "set_updated_at"
        BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    const tablesWithUpdatedAt = [
      'properties',
      'users',
      'rooms',
      'guests',
      'bookings',
      'rates',
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS "set_updated_at" ON "${table}"`);
    }

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_bookings_update_guest" ON "bookings"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_payments_update_booking" ON "payments"`,
    );

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_guest_stats()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_booking_paid_amount()`);
  }
}
