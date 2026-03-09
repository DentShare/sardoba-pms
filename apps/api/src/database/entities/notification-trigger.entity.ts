import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Property } from './property.entity';
import { MessageTemplate, type MessageChannel } from './message-template.entity';

export type TriggerEventType =
  | 'booking_confirmed'
  | 'pre_arrival'
  | 'check_in'
  | 'check_out'
  | 'post_stay'
  | 'payment_received';

@Entity('notification_triggers')
export class NotificationTrigger {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType!: TriggerEventType;

  @Column({ type: 'int', name: 'template_id' })
  templateId!: number;

  @Column({ type: 'varchar', length: 10, default: 'sms' })
  channel!: MessageChannel;

  @Column({ type: 'int', name: 'delay_minutes', default: 0 })
  delayMinutes!: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => MessageTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: MessageTemplate;
}
