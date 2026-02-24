import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Channel } from './channel.entity';

export type SyncStatus = 'success' | 'error' | 'pending';

@Entity('sync_logs')
@Index('idx_sync_logs_channel', ['channelId', 'createdAt'])
export class SyncLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'channel_id' })
  channelId!: number;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'varchar', length: 10 })
  status!: SyncStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Channel, (channel) => channel.syncLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;
}
