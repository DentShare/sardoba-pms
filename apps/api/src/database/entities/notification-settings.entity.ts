import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id', unique: true })
  propertyId!: number;

  @Column({ type: 'jsonb', name: 'telegram_recipients', default: '[]' })
  telegramRecipients!: Array<{
    name: string;
    chatId: string;
    isActive: boolean;
  }>;

  @Column({ type: 'boolean', name: 'event_new_booking', default: true })
  eventNewBooking!: boolean;

  @Column({ type: 'boolean', name: 'event_cancellation', default: true })
  eventCancellation!: boolean;

  @Column({ type: 'boolean', name: 'event_daily_digest', default: true })
  eventDailyDigest!: boolean;

  @Column({ type: 'varchar', length: 5, name: 'daily_digest_time', default: '08:00' })
  dailyDigestTime!: string;

  @Column({ type: 'boolean', name: 'event_payment', default: true })
  eventPayment!: boolean;

  @Column({ type: 'boolean', name: 'event_sync_error', default: true })
  eventSyncError!: boolean;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.notificationSettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
