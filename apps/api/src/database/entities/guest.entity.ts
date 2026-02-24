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
  Unique,
} from 'typeorm';
import { Property } from './property.entity';
import { Booking } from './booking.entity';

export type DocumentType = 'passport' | 'id_card' | 'other';

@Entity('guests')
@Unique(['property', 'phone'])
@Index('idx_guests_property', ['propertyId'])
@Index('idx_guests_phone', ['propertyId', 'phone'])
@Index('idx_guests_name', ['propertyId', 'lastName', 'firstName'])
export class Guest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName!: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  nationality!: string | null;

  @Column({ type: 'varchar', length: 20, name: 'document_type', nullable: true })
  documentType!: DocumentType | null;

  @Column({ type: 'bytea', name: 'document_number', nullable: true })
  documentNumber!: Buffer | null;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'boolean', name: 'is_vip', default: false })
  isVip!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'bigint', name: 'total_revenue', default: 0 })
  totalRevenue!: number;

  @Column({ type: 'int', name: 'visit_count', default: 0 })
  visitCount!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.guests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @OneToMany(() => Booking, (booking) => booking.guest)
  bookings!: Booking[];
}
