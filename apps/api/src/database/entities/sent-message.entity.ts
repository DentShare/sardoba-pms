import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Property } from './property.entity';
import { MessageTemplate, type MessageChannel } from './message-template.entity';
import { NotificationTrigger } from './notification-trigger.entity';
import { Campaign } from './campaign.entity';

export type SentMessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

@Entity('sent_messages')
export class SentMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'template_id', nullable: true })
  templateId!: number | null;

  @Column({ type: 'int', name: 'trigger_id', nullable: true })
  triggerId!: number | null;

  @Column({ type: 'int', name: 'campaign_id', nullable: true })
  campaignId!: number | null;

  @Column({ type: 'varchar', length: 10 })
  channel!: MessageChannel;

  @Column({ type: 'varchar', length: 255 })
  recipient!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: SentMessageStatus;

  @Column({ type: 'varchar', length: 255, name: 'external_id', nullable: true })
  externalId!: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost!: number | null;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true })
  deliveredAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => MessageTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template!: MessageTemplate | null;

  @ManyToOne(() => NotificationTrigger, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trigger_id' })
  trigger!: NotificationTrigger | null;

  @ManyToOne(() => Campaign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign!: Campaign | null;
}
