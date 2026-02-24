import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1700000000001 implements MigrationInterface {
  name = 'CreateInitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════
    // PROPERTIES
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "properties" (
        "id"             SERIAL PRIMARY KEY,
        "name"           VARCHAR(100)  NOT NULL,
        "city"           VARCHAR(50)   NOT NULL,
        "address"        TEXT          NOT NULL,
        "phone"          VARCHAR(20)   NOT NULL,
        "currency"       VARCHAR(3)    NOT NULL DEFAULT 'UZS',
        "timezone"       VARCHAR(50)   NOT NULL DEFAULT 'Asia/Tashkent',
        "locale"         VARCHAR(5)    NOT NULL DEFAULT 'ru',
        "checkin_time"   VARCHAR(5)    NOT NULL DEFAULT '14:00',
        "checkout_time"  VARCHAR(5)    NOT NULL DEFAULT '12:00',
        "settings"       JSONB         NOT NULL DEFAULT '{}',
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    // ═══════════════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"             SERIAL PRIMARY KEY,
        "property_id"    INT           NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "name"           VARCHAR(100)  NOT NULL,
        "email"          VARCHAR(255)  NOT NULL,
        "password_hash"  VARCHAR(255)  NOT NULL,
        "role"           VARCHAR(20)   NOT NULL DEFAULT 'admin',
        "is_active"      BOOLEAN       NOT NULL DEFAULT TRUE,
        "refresh_token"  VARCHAR(500),
        "last_login_at"  TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE("property_id", "email")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_property" ON "users"("property_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users"("email")`);

    // ═══════════════════════════════════════════════════
    // ROOMS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id"                SERIAL PRIMARY KEY,
        "property_id"       INT           NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "name"              VARCHAR(100)  NOT NULL,
        "room_type"         VARCHAR(20)   NOT NULL,
        "floor"             SMALLINT,
        "capacity_adults"   SMALLINT      NOT NULL DEFAULT 2,
        "capacity_children" SMALLINT      NOT NULL DEFAULT 0,
        "base_price"        BIGINT        NOT NULL,
        "status"            VARCHAR(20)   NOT NULL DEFAULT 'active',
        "amenities"         TEXT[]        NOT NULL DEFAULT '{}',
        "description_ru"    TEXT,
        "description_uz"    TEXT,
        "photos"            TEXT[]        NOT NULL DEFAULT '{}',
        "sort_order"        SMALLINT      NOT NULL DEFAULT 0,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_rooms_property" ON "rooms"("property_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_rooms_status" ON "rooms"("property_id", "status")`,
    );

    // ═══════════════════════════════════════════════════
    // ROOM_BLOCKS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "room_blocks" (
        "id"          SERIAL PRIMARY KEY,
        "room_id"     INT         NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
        "date_from"   DATE        NOT NULL,
        "date_to"     DATE        NOT NULL,
        "reason"      VARCHAR(255),
        "created_by"  INT         NOT NULL REFERENCES "users"("id"),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK("date_to" > "date_from")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_room_blocks_room_dates" ON "room_blocks"("room_id", "date_from", "date_to")`,
    );

    // ═══════════════════════════════════════════════════
    // GUESTS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "guests" (
        "id"               SERIAL PRIMARY KEY,
        "property_id"      INT          NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "first_name"       VARCHAR(100) NOT NULL,
        "last_name"        VARCHAR(100) NOT NULL,
        "phone"            VARCHAR(20)  NOT NULL,
        "email"            VARCHAR(255),
        "nationality"      VARCHAR(2),
        "document_type"    VARCHAR(20),
        "document_number"  BYTEA,
        "date_of_birth"    DATE,
        "is_vip"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "notes"            TEXT,
        "total_revenue"    BIGINT       NOT NULL DEFAULT 0,
        "visit_count"      INT          NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE("property_id", "phone")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_guests_property" ON "guests"("property_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_guests_phone" ON "guests"("property_id", "phone")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_guests_name" ON "guests"("property_id", "last_name", "first_name")`,
    );

    // ═══════════════════════════════════════════════════
    // RATES
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "rates" (
        "id"                 SERIAL PRIMARY KEY,
        "property_id"        INT          NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "name"               VARCHAR(100) NOT NULL,
        "type"               VARCHAR(20)  NOT NULL,
        "price"              BIGINT,
        "discount_percent"   SMALLINT,
        "date_from"          DATE,
        "date_to"            DATE,
        "min_stay"           SMALLINT     NOT NULL DEFAULT 1,
        "applies_to_rooms"   INT[]        NOT NULL DEFAULT '{}',
        "days_of_week"       SMALLINT[]   NOT NULL DEFAULT '{}',
        "is_active"          BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CHECK("price" IS NOT NULL OR "discount_percent" IS NOT NULL)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_rates_property" ON "rates"("property_id", "is_active")`,
    );

    // ═══════════════════════════════════════════════════
    // BOOKINGS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id"                SERIAL PRIMARY KEY,
        "booking_number"    VARCHAR(20)  NOT NULL UNIQUE,
        "property_id"       INT          NOT NULL REFERENCES "properties"("id"),
        "room_id"           INT          NOT NULL REFERENCES "rooms"("id"),
        "guest_id"          INT          NOT NULL REFERENCES "guests"("id"),
        "rate_id"           INT          REFERENCES "rates"("id"),
        "check_in"          DATE         NOT NULL,
        "check_out"         DATE         NOT NULL,
        "nights"            SMALLINT     NOT NULL,
        "adults"            SMALLINT     NOT NULL DEFAULT 1,
        "children"          SMALLINT     NOT NULL DEFAULT 0,
        "total_amount"      BIGINT       NOT NULL,
        "paid_amount"       BIGINT       NOT NULL DEFAULT 0,
        "status"            VARCHAR(20)  NOT NULL DEFAULT 'new',
        "source"            VARCHAR(20)  NOT NULL DEFAULT 'direct',
        "source_reference"  VARCHAR(100),
        "notes"             TEXT,
        "cancelled_at"      TIMESTAMPTZ,
        "cancel_reason"     TEXT,
        "created_by"        INT          NOT NULL REFERENCES "users"("id"),
        "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CHECK("check_out" > "check_in"),
        CHECK("nights" = "check_out" - "check_in")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_property_dates" ON "bookings"("property_id", "check_in", "check_out")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_room_dates" ON "bookings"("room_id", "check_in", "check_out")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_bookings_guest" ON "bookings"("guest_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings"("property_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_number" ON "bookings"("booking_number")`,
    );

    // ═══════════════════════════════════════════════════
    // BOOKING_HISTORY
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "booking_history" (
        "id"          SERIAL PRIMARY KEY,
        "booking_id"  INT         NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "user_id"     INT         NOT NULL REFERENCES "users"("id"),
        "action"      VARCHAR(50) NOT NULL,
        "old_value"   JSONB,
        "new_value"   JSONB,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_booking_history_booking" ON "booking_history"("booking_id")`,
    );

    // ═══════════════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"          SERIAL PRIMARY KEY,
        "booking_id"  INT         NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "amount"      BIGINT      NOT NULL,
        "method"      VARCHAR(20) NOT NULL,
        "paid_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "notes"       VARCHAR(255),
        "reference"   VARCHAR(100),
        "created_by"  INT         NOT NULL REFERENCES "users"("id"),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_booking" ON "payments"("booking_id")`,
    );

    // ═══════════════════════════════════════════════════
    // CHANNELS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "channels" (
        "id"           SERIAL PRIMARY KEY,
        "property_id"  INT          NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
        "type"         VARCHAR(20)  NOT NULL,
        "is_active"    BOOLEAN      NOT NULL DEFAULT TRUE,
        "credentials"  BYTEA        NOT NULL,
        "last_sync_at" TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE("property_id", "type")
      )
    `);

    // ═══════════════════════════════════════════════════
    // ROOM_MAPPINGS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "room_mappings" (
        "id"           SERIAL PRIMARY KEY,
        "room_id"      INT          NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
        "channel_id"   INT          NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "external_id"  VARCHAR(100) NOT NULL,
        UNIQUE("room_id", "channel_id")
      )
    `);

    // ═══════════════════════════════════════════════════
    // SYNC_LOGS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "sync_logs" (
        "id"            SERIAL PRIMARY KEY,
        "channel_id"    INT          NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "event_type"    VARCHAR(50)  NOT NULL,
        "status"        VARCHAR(10)  NOT NULL,
        "payload"       JSONB,
        "error_message" TEXT,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sync_logs_channel" ON "sync_logs"("channel_id", "created_at" DESC)`,
    );

    // ═══════════════════════════════════════════════════
    // NOTIFICATION_SETTINGS
    // ═══════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "notification_settings" (
        "id"                    SERIAL PRIMARY KEY,
        "property_id"           INT     NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE UNIQUE,
        "telegram_recipients"   JSONB   NOT NULL DEFAULT '[]',
        "event_new_booking"     BOOLEAN NOT NULL DEFAULT TRUE,
        "event_cancellation"    BOOLEAN NOT NULL DEFAULT TRUE,
        "event_daily_digest"    BOOLEAN NOT NULL DEFAULT TRUE,
        "daily_digest_time"     VARCHAR(5) NOT NULL DEFAULT '08:00',
        "event_payment"         BOOLEAN NOT NULL DEFAULT TRUE,
        "event_sync_error"      BOOLEAN NOT NULL DEFAULT TRUE,
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_mappings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channels" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "guests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_blocks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "properties" CASCADE`);
  }
}
