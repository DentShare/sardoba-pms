import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupBooking } from './group-booking.entity';
import { Room } from './room.entity';
import { Booking } from './booking.entity';

export type GroupBookingRoomStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

@Entity('group_booking_rooms')
export class GroupBookingRoom {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'group_booking_id' })
  groupBookingId!: number;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'int', name: 'booking_id', nullable: true })
  bookingId!: number | null;

  @Column({ type: 'varchar', length: 255, name: 'guest_name', nullable: true })
  guestName!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'guest_phone', nullable: true })
  guestPhone!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'guest_passport', nullable: true })
  guestPassport!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: GroupBookingRoomStatus;

  @Column({ type: 'bigint', name: 'price_per_night' })
  pricePerNight!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => GroupBooking, (group) => group.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_booking_id' })
  group!: GroupBooking;

  @ManyToOne(() => Room, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking | null;
}
