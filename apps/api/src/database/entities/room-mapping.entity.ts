import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Room } from './room.entity';
import { Channel } from './channel.entity';

@Entity('room_mappings')
@Unique(['room', 'channel'])
export class RoomMapping {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'int', name: 'channel_id' })
  channelId!: number;

  @Column({ type: 'varchar', length: 100, name: 'external_id' })
  externalId!: string;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Room, (room) => room.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => Channel, (channel) => channel.roomMappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;
}
