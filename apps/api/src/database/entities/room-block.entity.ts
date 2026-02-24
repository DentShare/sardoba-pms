import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Room } from './room.entity';
import { User } from './user.entity';

@Entity('room_blocks')
@Index('idx_room_blocks_room_dates', ['roomId', 'dateFrom', 'dateTo'])
@Check('"date_to" > "date_from"')
export class RoomBlock {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'date', name: 'date_from' })
  dateFrom!: string;

  @Column({ type: 'date', name: 'date_to' })
  dateTo!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'int', name: 'created_by' })
  createdBy!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Room, (room) => room.blocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;
}
