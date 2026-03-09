import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('holiday_rules')
@Index('idx_holiday_rules_property', ['propertyId', 'isActive'])
@Index('idx_holiday_rules_dates', ['propertyId', 'dateFrom', 'dateTo'])
export class HolidayRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'date', name: 'date_from' })
  dateFrom!: string;

  @Column({ type: 'date', name: 'date_to' })
  dateTo!: string;

  @Column({ type: 'smallint', name: 'price_boost_percent', default: 0 })
  priceBoostPercent!: number;

  @Column({ type: 'smallint', name: 'min_nights', default: 1 })
  minNights!: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', name: 'recur_yearly', default: false })
  recurYearly!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
