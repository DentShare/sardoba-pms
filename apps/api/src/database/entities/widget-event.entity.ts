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

@Entity('widget_events')
@Index('idx_widget_events_property_date', ['propertyId', 'createdAt'])
export class WidgetEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'int', name: 'room_id', nullable: true })
  roomId!: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  meta!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, name: 'ip_hash', nullable: true })
  ipHash!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
