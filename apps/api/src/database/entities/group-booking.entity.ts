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
} from 'typeorm';
import { Property } from './property.entity';
import { Agency } from './agency.entity';

export type GroupBookingStatus =
  | 'tentative'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

@Entity('group_bookings')
@Index('idx_group_bookings_property', ['propertyId'])
@Index('idx_group_bookings_status', ['propertyId', 'status'])
@Index('idx_group_bookings_number', ['groupNumber'], { unique: true })
export class GroupBooking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 255, name: 'group_name' })
  groupName!: string;

  @Column({ type: 'varchar', length: 50, name: 'group_number', unique: true })
  groupNumber!: string;

  @Column({ type: 'int', name: 'agency_id', nullable: true })
  agencyId!: number | null;

  @Column({ type: 'varchar', length: 255, name: 'contact_person', nullable: true })
  contactPerson!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'contact_phone', nullable: true })
  contactPhone!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'contact_email', nullable: true })
  contactEmail!: string | null;

  @Column({ type: 'date', name: 'check_in' })
  checkIn!: string;

  @Column({ type: 'date', name: 'check_out' })
  checkOut!: string;

  @Column({ type: 'int', name: 'rooms_count' })
  roomsCount!: number;

  @Column({ type: 'int', name: 'guests_count' })
  guestsCount!: number;

  @Column({ type: 'bigint', name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'bigint', name: 'paid_amount', default: 0 })
  paidAmount!: number;

  @Column({ type: 'varchar', length: 20, default: 'tentative' })
  status!: GroupBookingStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'int', name: 'created_by' })
  createdBy!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => Agency, (agency) => agency.groups, { nullable: true })
  @JoinColumn({ name: 'agency_id' })
  agency!: Agency | null;

  @OneToMany('GroupBookingRoom', 'group')
  rooms!: import('./group-booking-room.entity').GroupBookingRoom[];
}
