import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('notification_log')
@Index('idx_notification_log_property', ['propertyId', 'eventType'])
@Index('idx_notification_log_booking', ['bookingId'])
export class NotificationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'booking_id', nullable: true })
  bookingId!: number | null;

  @Column({ type: 'int', name: 'guest_id', nullable: true })
  guestId!: number | null;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'varchar', length: 20 })
  channel!: string;

  @Column({ type: 'varchar', length: 20, default: 'sent' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'sent_at' })
  sentAt!: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;
}
