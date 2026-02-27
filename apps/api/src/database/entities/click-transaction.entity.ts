import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Click transaction states:
 *   'prepared'  = prepare callback received, waiting for complete
 *   'completed' = payment completed successfully
 *   'cancelled' = transaction cancelled (by user or error)
 */
export type ClickTransactionState = 'prepared' | 'completed' | 'cancelled';

@Entity('click_transactions')
@Index('idx_click_transactions_click_trans_id', ['clickTransId'], { unique: true })
@Index('idx_click_transactions_booking_id', ['bookingId'])
export class ClickTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', name: 'click_trans_id', unique: true })
  clickTransId!: number;

  @Column({ type: 'int', name: 'booking_id' })
  bookingId!: number;

  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'varchar', length: 20, default: 'prepared' })
  state!: ClickTransactionState;

  @Column({ type: 'smallint', nullable: true })
  error!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
