import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWidgetPricingPwa1700000000005 implements MigrationInterface {
  name = 'AddWidgetPricingPwa1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Agent 15: Widget & Mini-Site ──────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS mini_site_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS mini_site_config JSONB DEFAULT '{}'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS widget_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        room_id INTEGER,
        meta JSONB DEFAULT '{}',
        ip_hash VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_widget_events_property_date
        ON widget_events(property_id, created_at)
    `);

    // ── Agent 16: Dynamic Pricing ─────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 10,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_config JSONB NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        action_value DECIMAL(10, 2) NOT NULL,
        apply_to VARCHAR(50) DEFAULT 'all',
        room_ids UUID[] DEFAULT '{}',
        min_price BIGINT,
        max_price BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dynamic_rules_property
        ON dynamic_pricing_rules(property_id, is_active)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_change_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
        rule_id UUID REFERENCES dynamic_pricing_rules(id) ON DELETE SET NULL,
        rule_name VARCHAR(255),
        date DATE NOT NULL,
        old_price BIGINT,
        new_price BIGINT,
        trigger_value DECIMAL(10, 2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_log_property_date
        ON pricing_change_log(property_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dynamic_price_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        price BIGINT NOT NULL,
        rule_ids UUID[] DEFAULT '{}',
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (room_id, date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dynamic_overrides_room_date
        ON dynamic_price_overrides(room_id, date)
    `);

    // ── Agent 17: Push Subscriptions ──────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (endpoint)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subs_property
        ON push_subscriptions(property_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS dynamic_price_overrides`);
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_change_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS dynamic_pricing_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS widget_events`);
    await queryRunner.query(`
      ALTER TABLE properties
        DROP COLUMN IF EXISTS widget_enabled,
        DROP COLUMN IF EXISTS mini_site_enabled,
        DROP COLUMN IF EXISTS mini_site_config
    `);
  }
}
