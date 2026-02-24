import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Property } from './property.entity';

export type RateType = 'base' | 'seasonal' | 'weekend' | 'longstay' | 'special';

@Entity('rates')
@Index('idx_rates_property', ['propertyId', 'isActive'])
@Check('"price" IS NOT NULL OR "discount_percent" IS NOT NULL')
export class Rate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: RateType;

  @Column({ type: 'bigint', nullable: true })
  price!: number | null;

  @Column({ type: 'smallint', name: 'discount_percent', nullable: true })
  discountPercent!: number | null;

  @Column({ type: 'date', name: 'date_from', nullable: true })
  dateFrom!: string | null;

  @Column({ type: 'date', name: 'date_to', nullable: true })
  dateTo!: string | null;

  @Column({ type: 'smallint', name: 'min_stay', default: 1 })
  minStay!: number;

  @Column({ type: 'int', array: true, name: 'applies_to_rooms', default: '{}' })
  appliesToRooms!: number[];

  @Column({ type: 'smallint', array: true, name: 'days_of_week', default: '{}' })
  daysOfWeek!: number[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.rates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
