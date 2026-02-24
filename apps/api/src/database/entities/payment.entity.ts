import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'payme' | 'click' | 'other';

@Entity('payments')
@Index('idx_payments_booking', ['bookingId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'booking_id' })
  bookingId!: number;

  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'varchar', length: 20 })
  method!: PaymentMethod;

  @Column({ type: 'timestamptz', name: 'paid_at', default: () => 'NOW()' })
  paidAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference!: string | null;

  @Column({ type: 'int', name: 'created_by' })
  createdBy!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Booking, (booking) => booking.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;
}
