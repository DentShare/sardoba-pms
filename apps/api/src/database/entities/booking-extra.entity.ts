import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { PropertyExtra } from './property-extra.entity';

@Entity('booking_extras')
@Index('idx_booking_extras_booking', ['bookingId'])
export class BookingExtra {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'booking_id' })
  bookingId!: number;

  @Column({ type: 'int', name: 'property_extra_id' })
  propertyExtraId!: number;

  @Column({ type: 'smallint', default: 1 })
  quantity!: number;

  @Column({ type: 'bigint', name: 'unit_price' })
  unitPrice!: number; // tiyin, snapshot at booking time

  @Column({ type: 'bigint', name: 'total_price' })
  totalPrice!: number; // tiyin

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Booking, (b) => b.extras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => PropertyExtra, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'property_extra_id' })
  propertyExtra!: PropertyExtra;
}
