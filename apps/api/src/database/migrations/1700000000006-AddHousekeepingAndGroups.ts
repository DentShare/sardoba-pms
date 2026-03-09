import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHousekeepingAndGroups1700000000006 implements MigrationInterface {
  name = 'AddHousekeepingAndGroups1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE agencies (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        commission DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_agencies_property ON agencies(property_id);
    `);

    await queryRunner.query(`
      CREATE TABLE group_bookings (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        group_name VARCHAR(255) NOT NULL,
        group_number VARCHAR(50) NOT NULL UNIQUE,
        agency_id INT REFERENCES agencies(id) ON DELETE SET NULL,
        contact_person VARCHAR(255),
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        rooms_count INT NOT NULL DEFAULT 0,
        guests_count INT NOT NULL DEFAULT 0,
        total_amount BIGINT NOT NULL DEFAULT 0,
        paid_amount BIGINT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'tentative',
        notes TEXT,
        created_by INT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_group_bookings_property ON group_bookings(property_id);
      CREATE INDEX idx_group_bookings_status ON group_bookings(property_id, status);
    `);

    await queryRunner.query(`
      CREATE TABLE group_booking_rooms (
        id SERIAL PRIMARY KEY,
        group_booking_id INT NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
        room_id INT NOT NULL REFERENCES rooms(id),
        booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
        guest_name VARCHAR(255),
        guest_phone VARCHAR(50),
        guest_passport VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        price_per_night BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_group_booking_rooms_group ON group_booking_rooms(group_booking_id);
      CREATE INDEX idx_group_booking_rooms_room ON group_booking_rooms(room_id);
    `);

    await queryRunner.query(`
      CREATE TABLE room_cleaning_statuses (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        cleaning_status VARCHAR(30) NOT NULL DEFAULT 'clean',
        last_cleaned_at TIMESTAMPTZ,
        last_cleaned_by INT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(property_id, room_id)
      );
      CREATE INDEX idx_room_cleaning_property_room ON room_cleaning_statuses(property_id, room_id);
    `);

    await queryRunner.query(`
      CREATE TABLE cleaning_tasks (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        room_id INT NOT NULL REFERENCES rooms(id),
        assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
        task_type VARCHAR(20) NOT NULL DEFAULT 'standard',
        cleaning_status VARCHAR(30) NOT NULL DEFAULT 'dirty',
        task_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        priority VARCHAR(10) NOT NULL DEFAULT 'normal',
        notes TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        duration_minutes INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_cleaning_tasks_property ON cleaning_tasks(property_id);
      CREATE INDEX idx_cleaning_tasks_room ON cleaning_tasks(room_id);
      CREATE INDEX idx_cleaning_tasks_status ON cleaning_tasks(property_id, task_status);
    `);

    await queryRunner.query(`
      CREATE TABLE message_templates (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        channel VARCHAR(10) NOT NULL DEFAULT 'sms',
        language VARCHAR(5) NOT NULL DEFAULT 'ru',
        subject VARCHAR(500),
        body TEXT NOT NULL,
        variables TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_message_templates_property ON message_templates(property_id);
    `);

    await queryRunner.query(`
      CREATE TABLE notification_triggers (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        template_id INT NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
        channel VARCHAR(10) NOT NULL DEFAULT 'sms',
        delay_minutes INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_notification_triggers_property ON notification_triggers(property_id);
      CREATE INDEX idx_notification_triggers_event ON notification_triggers(property_id, event_type);
    `);

    await queryRunner.query(`
      CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        template_id INT NOT NULL REFERENCES message_templates(id),
        channel VARCHAR(10) NOT NULL DEFAULT 'sms',
        segment_filters JSONB DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        scheduled_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        delivered_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        created_by INT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_campaigns_property ON campaigns(property_id);
      CREATE INDEX idx_campaigns_status ON campaigns(property_id, status);
    `);

    await queryRunner.query(`
      CREATE TABLE sent_messages (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        template_id INT REFERENCES message_templates(id) ON DELETE SET NULL,
        trigger_id INT REFERENCES notification_triggers(id) ON DELETE SET NULL,
        campaign_id INT REFERENCES campaigns(id) ON DELETE SET NULL,
        channel VARCHAR(10) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        body TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        external_id VARCHAR(255),
        error_message TEXT,
        cost DECIMAL(10,2),
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_sent_messages_property ON sent_messages(property_id);
      CREATE INDEX idx_sent_messages_status ON sent_messages(property_id, status);
      CREATE INDEX idx_sent_messages_campaign ON sent_messages(campaign_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sent_messages CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaigns CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_triggers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_templates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cleaning_tasks CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS room_cleaning_statuses CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_booking_rooms CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_bookings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS agencies CASCADE`);
  }
}
