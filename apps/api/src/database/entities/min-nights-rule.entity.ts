import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('min_nights_rules')
@Index('idx_min_nights_rules_property', ['propertyId', 'isActive'])
export class MinNightsRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name!: string | null;

  @Column({ type: 'date', name: 'date_from' })
  dateFrom!: string;

  @Column({ type: 'date', name: 'date_to' })
  dateTo!: string;

  @Column({ type: 'smallint', name: 'min_nights', default: 1 })
  minNights!: number;

  @Column({ type: 'int', array: true, name: 'applies_to_rooms', default: '{}' })
  appliesToRooms!: number[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
