import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFeatures1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TABLE guests
    await queryRunner.query(`
      ALTER TABLE guests
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS blacklist_reason TEXT,
        ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guests_blacklisted ON guests(property_id, is_blacklisted) WHERE is_blacklisted = true`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guests_birthday ON guests(property_id, date_of_birth)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_guests_tags ON guests USING GIN (tags)`);

    // ALTER TABLE bookings
    await queryRunner.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS discount_amount BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS promo_code_id INTEGER,
        ADD COLUMN IF NOT EXISTS early_checkin_time VARCHAR(5),
        ADD COLUMN IF NOT EXISTS early_checkin_price BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS late_checkout_time VARCHAR(5),
        ADD COLUMN IF NOT EXISTS late_checkout_price BIGINT DEFAULT 0
    `);

    // ALTER TABLE properties
    await queryRunner.query(`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS google_review_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS tripadvisor_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS booking_com_review_url VARCHAR(500)
    `);

    // ALTER TABLE notification_settings
    await queryRunner.query(`
      ALTER TABLE notification_settings
        ADD COLUMN IF NOT EXISTS event_birthday BOOLEAN DEFAULT true
    `);

    // CREATE TABLE promo_codes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
        discount_value BIGINT NOT NULL,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        min_nights SMALLINT DEFAULT 1,
        min_amount BIGINT DEFAULT 0,
        applies_to_rooms INTEGER[] DEFAULT '{}',
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(property_id, code)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_promo_codes_property ON promo_codes(property_id, is_active)`);

    // CREATE TABLE invoices
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        invoice_number VARCHAR(30) NOT NULL UNIQUE,
        company_name VARCHAR(255) NOT NULL,
        company_inn VARCHAR(20),
        company_address TEXT,
        company_bank VARCHAR(255),
        company_account VARCHAR(30),
        company_mfo VARCHAR(10),
        total_amount BIGINT NOT NULL,
        issued_at TIMESTAMPTZ DEFAULT NOW(),
        pdf_url VARCHAR(500),
        created_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_invoices_property ON invoices(property_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id)`);

    // CREATE TABLE review_scores
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS review_scores (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        platform VARCHAR(30) NOT NULL,
        score DECIMAL(3,1) NOT NULL,
        review_count INTEGER DEFAULT 0,
        fetched_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_review_scores_property_platform ON review_scores(property_id, platform)`);

    // CREATE TABLE holiday_rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS holiday_rules (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        price_boost_percent SMALLINT DEFAULT 0,
        min_nights SMALLINT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        recur_yearly BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_holiday_rules_property ON holiday_rules(property_id, is_active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_holiday_rules_dates ON holiday_rules(property_id, date_from, date_to)`);

    // CREATE TABLE min_nights_rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS min_nights_rules (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(100),
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        min_nights SMALLINT NOT NULL DEFAULT 1,
        applies_to_rooms INTEGER[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_min_nights_rules_property ON min_nights_rules(property_id, is_active)`);

    // CREATE TABLE referrals
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        referrer_guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
        referred_guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
        referral_code VARCHAR(50) NOT NULL,
        referred_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        bonus_type VARCHAR(20) DEFAULT 'discount',
        bonus_value BIGINT DEFAULT 0,
        bonus_applied BOOLEAN DEFAULT false,
        bonus_applied_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_referrals_property ON referrals(property_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code)`);

    // CREATE TABLE notification_log
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL,
        booking_id INTEGER,
        guest_id INTEGER,
        event_type VARCHAR(50) NOT NULL,
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'sent',
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notification_log_property ON notification_log(property_id, event_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notification_log_booking ON notification_log(booking_id)`);

    // FK: bookings.promo_code_id -> promo_codes.id
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_promo_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK
    await queryRunner.query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_promo_code`);

    // Drop new tables
    await queryRunner.query(`DROP TABLE IF EXISTS notification_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS referrals`);
    await queryRunner.query(`DROP TABLE IF EXISTS min_nights_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS holiday_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS review_scores`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS promo_codes`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE notification_settings DROP COLUMN IF EXISTS event_birthday`);
    await queryRunner.query(`ALTER TABLE properties DROP COLUMN IF EXISTS google_review_url, DROP COLUMN IF EXISTS tripadvisor_url, DROP COLUMN IF EXISTS booking_com_review_url`);
    await queryRunner.query(`ALTER TABLE bookings DROP COLUMN IF EXISTS discount_amount, DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS early_checkin_time, DROP COLUMN IF EXISTS early_checkin_price, DROP COLUMN IF EXISTS late_checkout_time, DROP COLUMN IF EXISTS late_checkout_price`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_guests_tags`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_guests_birthday`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_guests_blacklisted`);
    await queryRunner.query(`ALTER TABLE guests DROP COLUMN IF EXISTS tags, DROP COLUMN IF EXISTS is_blacklisted, DROP COLUMN IF EXISTS blacklist_reason, DROP COLUMN IF EXISTS blacklisted_at`);
  }
}
