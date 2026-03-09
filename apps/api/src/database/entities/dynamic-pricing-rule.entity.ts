import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from './property.entity';

export type DynamicPricingTriggerType =
  | 'occupancy_high'
  | 'occupancy_low'
  | 'days_before'
  | 'day_of_week';

export type DynamicPricingActionType =
  | 'increase_percent'
  | 'decrease_percent'
  | 'set_fixed';

@Entity('dynamic_pricing_rules')
@Index('idx_dynamic_rules_property', ['propertyId', 'isActive'])
export class DynamicPricingRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 10 })
  priority!: number;

  @Column({ type: 'varchar', length: 50, name: 'trigger_type' })
  triggerType!: DynamicPricingTriggerType;

  @Column({ type: 'jsonb', name: 'trigger_config' })
  triggerConfig!: Record<string, number | number[]>;

  @Column({ type: 'varchar', length: 50, name: 'action_type' })
  actionType!: DynamicPricingActionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'action_value' })
  actionValue!: number;

  @Column({ type: 'varchar', length: 50, name: 'apply_to', default: 'all' })
  applyTo!: 'all' | 'room_type' | 'room';

  @Column({ type: 'uuid', array: true, name: 'room_ids', default: '{}' })
  roomIds!: string[];

  @Column({ type: 'bigint', name: 'min_price', nullable: true })
  minPrice!: number | null;

  @Column({ type: 'bigint', name: 'max_price', nullable: true })
  maxPrice!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
