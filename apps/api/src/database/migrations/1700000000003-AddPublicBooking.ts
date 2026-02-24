import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicBooking1700000000003 implements MigrationInterface {
  name = 'AddPublicBooking1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════
    // ADD COLUMNS TO PROPERTIES
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD COLUMN "slug" VARCHAR(100) UNIQUE,
        ADD COLUMN "description" TEXT,
        ADD COLUMN "description_uz" TEXT,
        ADD COLUMN "cover_photo" VARCHAR(500),
        ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN "booking_enabled" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // Partial unique index on slug (only where slug IS NOT NULL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_properties_slug"
        ON "properties"("slug")
        WHERE "slug" IS NOT NULL
    `);

    // ═══════════════════════════════════════════════════
    // PROPERTY_EXTRAS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "property_extras" (
        "id"          SERIAL PRIMARY KEY,
        "property_id" INT          NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "name"        VARCHAR(200) NOT NULL,
        "name_uz"     VARCHAR(200),
        "description" TEXT,
        "price"       BIGINT       NOT NULL DEFAULT 0,
        "price_type"  VARCHAR(20)  NOT NULL DEFAULT 'per_booking',
        "icon"        VARCHAR(500),
        "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
        "sort_order"  SMALLINT     NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_property_extras_property"
        ON "property_extras"("property_id")
    `);

    // ═══════════════════════════════════════════════════
    // BOOKING_EXTRAS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "booking_extras" (
        "id"                SERIAL PRIMARY KEY,
        "booking_id"        INT      NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "property_extra_id" INT      NOT NULL REFERENCES "property_extras"("id") ON DELETE RESTRICT,
        "quantity"          SMALLINT NOT NULL DEFAULT 1,
        "unit_price"        BIGINT   NOT NULL,
        "total_price"       BIGINT   NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_booking_extras_booking"
        ON "booking_extras"("booking_id")
    `);

    // ═══════════════════════════════════════════════════
    // REMOVE FK CONSTRAINT ON bookings.created_by
    // Allow created_by = 0 for public/website bookings
    // (no matching user row for system-created bookings)
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$
      DECLARE
        fk_name TEXT;
      BEGIN
        SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'bookings'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'created_by';

        IF fk_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(fk_name);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop booking_extras
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_extras" CASCADE`);

    // Drop property_extras
    await queryRunner.query(`DROP TABLE IF EXISTS "property_extras" CASCADE`);

    // Drop partial index on slug
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_properties_slug"`);

    // Remove added columns from properties
    await queryRunner.query(`
      ALTER TABLE "properties"
        DROP COLUMN IF EXISTS "slug",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "description_uz",
        DROP COLUMN IF EXISTS "cover_photo",
        DROP COLUMN IF EXISTS "photos",
        DROP COLUMN IF EXISTS "booking_enabled"
    `);

    // Re-add foreign key constraint on bookings.created_by
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD CONSTRAINT "fk_bookings_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id")
          ON DELETE RESTRICT
    `);
  }
}
