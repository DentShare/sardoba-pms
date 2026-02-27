import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTransactions1700000000007 implements MigrationInterface {
  name = 'AddPaymentTransactions1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Payme Transactions ──────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payme_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(255) NOT NULL UNIQUE,
        booking_id INTEGER NOT NULL,
        amount BIGINT NOT NULL,
        state SMALLINT NOT NULL DEFAULT 1,
        create_time BIGINT NOT NULL,
        perform_time BIGINT,
        cancel_time BIGINT,
        cancel_reason SMALLINT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payme_transactions_transaction_id
        ON payme_transactions(transaction_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payme_transactions_booking_id
        ON payme_transactions(booking_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payme_transactions_create_time
        ON payme_transactions(create_time)
    `);

    // ── Click Transactions ──────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS click_transactions (
        id SERIAL PRIMARY KEY,
        click_trans_id BIGINT NOT NULL UNIQUE,
        booking_id INTEGER NOT NULL,
        amount BIGINT NOT NULL,
        state VARCHAR(20) NOT NULL DEFAULT 'prepared',
        error SMALLINT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_click_transactions_click_trans_id
        ON click_transactions(click_trans_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_click_transactions_booking_id
        ON click_transactions(booking_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS click_transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS payme_transactions`);
  }
}
