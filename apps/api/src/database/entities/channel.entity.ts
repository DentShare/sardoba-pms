import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Property } from './property.entity';
import { RoomMapping } from './room-mapping.entity';
import { SyncLog } from './sync-log.entity';

export type ChannelType =
  | 'booking_com'
  | 'airbnb'
  | 'expedia'
  | 'hotels_com'
  | 'ostrovok';

@Entity('channels')
@Unique(['property', 'type'])
export class Channel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: ChannelType;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'bytea' })
  credentials!: Buffer;

  @Column({ type: 'timestamptz', name: 'last_sync_at', nullable: true })
  lastSyncAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.channels, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @OneToMany(() => RoomMapping, (mapping) => mapping.channel)
  roomMappings!: RoomMapping[];

  @OneToMany(() => SyncLog, (log) => log.channel)
  syncLogs!: SyncLog[];
}
