import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Room } from './room.entity';
import { Guest } from './guest.entity';
import { Booking } from './booking.entity';
import { Rate } from './rate.entity';
import { Channel } from './channel.entity';
import { NotificationSettings } from './notification-settings.entity';
import { PropertyExtra } from './property-extra.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  city!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency!: string;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Tashkent' })
  timezone!: string;

  @Column({ type: 'varchar', length: 5, default: 'ru' })
  locale!: string;

  @Column({ type: 'varchar', length: 5, name: 'checkin_time', default: '14:00' })
  checkinTime!: string;

  @Column({ type: 'varchar', length: 5, name: 'checkout_time', default: '12:00' })
  checkoutTime!: string;

  @Column({ type: 'jsonb', default: '{}' })
  settings!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  slug!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true, name: 'description_uz' })
  descriptionUz!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'cover_photo' })
  coverPhoto!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  photos!: string[];

  @Column({ type: 'boolean', name: 'booking_enabled', default: false })
  bookingEnabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @OneToMany(() => User, (user) => user.property)
  users!: User[];

  @OneToMany(() => Room, (room) => room.property)
  rooms!: Room[];

  @OneToMany(() => Guest, (guest) => guest.property)
  guests!: Guest[];

  @OneToMany(() => Booking, (booking) => booking.property)
  bookings!: Booking[];

  @OneToMany(() => Rate, (rate) => rate.property)
  rates!: Rate[];

  @OneToMany(() => Channel, (channel) => channel.property)
  channels!: Channel[];

  @OneToMany(() => NotificationSettings, (ns) => ns.property)
  notificationSettings!: NotificationSettings[];

  @OneToMany(() => PropertyExtra, (extra) => extra.property)
  extras!: PropertyExtra[];
}
