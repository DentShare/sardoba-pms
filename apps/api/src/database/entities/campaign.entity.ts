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

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int', name: 'template_id' })
  templateId!: number;

  @Column({ type: 'varchar', length: 10, default: 'sms' })
  channel!: MessageChannel;

  @Column({ type: 'jsonb', name: 'segment_filters', default: '{}' })
  segmentFilters!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: CampaignStatus;

  @Column({ type: 'timestamptz', name: 'scheduled_at', nullable: true })
  scheduledAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', name: 'total_recipients', default: 0 })
  totalRecipients!: number;

  @Column({ type: 'int', name: 'sent_count', default: 0 })
  sentCount!: number;

  @Column({ type: 'int', name: 'delivered_count', default: 0 })
  deliveredCount!: number;

  @Column({ type: 'int', name: 'failed_count', default: 0 })
  failedCount!: number;

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

  @ManyToOne(() => MessageTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: MessageTemplate;
}
