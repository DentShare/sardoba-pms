import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Check,
} from 'typeorm';
import { Property } from './property.entity';
import { Room } from './room.entity';
import { Guest } from './guest.entity';
import { Rate } from './rate.entity';
import { User } from './user.entity';
import { BookingHistory } from './booking-history.entity';
import { Payment } from './payment.entity';
import { BookingExtra } from './booking-extra.entity';

export type BookingStatus =
  | 'new'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type BookingSource =
  | 'direct'
  | 'booking_com'
  | 'airbnb'
  | 'expedia'
  | 'phone'
  | 'website'
  | 'other';

@Entity('bookings')
@Index('idx_bookings_property_dates', ['propertyId', 'checkIn', 'checkOut'])
@Index('idx_bookings_room_dates', ['roomId', 'checkIn', 'checkOut'])
@Index('idx_bookings_guest', ['guestId'])
@Index('idx_bookings_status', ['propertyId', 'status'])
@Index('idx_bookings_number', ['bookingNumber'])
@Check('"check_out" > "check_in"')
@Check('"nights" = "check_out" - "check_in"')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20, name: 'booking_number', unique: true })
  bookingNumber!: string;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'int', name: 'guest_id' })
  guestId!: number;

  @Column({ type: 'int', name: 'rate_id', nullable: true })
  rateId!: number | null;

  @Column({ type: 'date', name: 'check_in' })
  checkIn!: string;

  @Column({ type: 'date', name: 'check_out' })
  checkOut!: string;

  @Column({ type: 'smallint' })
  nights!: number;

  @Column({ type: 'smallint', default: 1 })
  adults!: number;

  @Column({ type: 'smallint', default: 0 })
  children!: number;

  @Column({ type: 'bigint', name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'bigint', name: 'paid_amount', default: 0 })
  paidAmount!: number;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status!: BookingStatus;

  @Column({ type: 'varchar', length: 20, default: 'direct' })
  source!: BookingSource;

  @Column({ type: 'varchar', length: 100, name: 'source_reference', nullable: true })
  sourceReference!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'text', name: 'cancel_reason', nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'int', name: 'created_by' })
  createdBy!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.bookings)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => Room, (room) => room.bookings)
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => Guest, (guest) => guest.bookings)
  @JoinColumn({ name: 'guest_id' })
  guest!: Guest;

  @ManyToOne(() => Rate, { nullable: true })
  @JoinColumn({ name: 'rate_id' })
  rate!: Rate | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User | null;

  @OneToMany(() => BookingHistory, (history) => history.booking)
  history!: BookingHistory[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments!: Payment[];

  @OneToMany(() => BookingExtra, (extra) => extra.booking)
  extras!: BookingExtra[];
}
