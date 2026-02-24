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

@Entity('booking_history')
@Index('idx_booking_history_booking', ['bookingId'])
export class BookingHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'booking_id' })
  bookingId!: number;

  @Column({ type: 'int', name: 'user_id' })
  userId!: number;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ type: 'jsonb', name: 'old_value', nullable: true })
  oldValue!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'new_value', nullable: true })
  newValue!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Booking, (booking) => booking.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
