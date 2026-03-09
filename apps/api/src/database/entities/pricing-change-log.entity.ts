import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from './property.entity';
import { Room } from './room.entity';

@Entity('pricing_change_log')
@Index('idx_pricing_log_property_date', ['propertyId', 'createdAt'])
export class PricingChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'room_id', nullable: true })
  roomId!: number | null;

  @Column({ type: 'uuid', name: 'rule_id', nullable: true })
  ruleId!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'rule_name', nullable: true })
  ruleName!: string | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'bigint', name: 'old_price', nullable: true })
  oldPrice!: number | null;

  @Column({ type: 'bigint', name: 'new_price', nullable: true })
  newPrice!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'trigger_value', nullable: true })
  triggerValue!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room!: Room | null;
}
