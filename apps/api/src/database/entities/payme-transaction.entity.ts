import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Payme transaction states:
 *   1 = created (waiting for payment)
 *   2 = completed (payment performed)
 *  -1 = cancelled after creation (before perform)
 *  -2 = cancelled after completion (after perform)
 */
export type PaymeTransactionState = 1 | 2 | -1 | -2;

@Entity('payme_transactions')
@Index('idx_payme_transactions_transaction_id', ['transactionId'], { unique: true })
@Index('idx_payme_transactions_booking_id', ['bookingId'])
export class PaymeTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, name: 'transaction_id', unique: true })
  transactionId!: string;

  @Column({ type: 'int', name: 'booking_id' })
  bookingId!: number;

  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'smallint' })
  state!: PaymeTransactionState;

  @Column({ type: 'bigint', name: 'create_time' })
  createTime!: number;

  @Column({ type: 'bigint', name: 'perform_time', nullable: true })
  performTime!: number | null;

  @Column({ type: 'bigint', name: 'cancel_time', nullable: true })
  cancelTime!: number | null;

  @Column({ type: 'smallint', name: 'cancel_reason', nullable: true })
  cancelReason!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
