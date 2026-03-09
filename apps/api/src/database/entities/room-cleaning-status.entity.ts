import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from './property.entity';
import { Room } from './room.entity';

export type CleaningStatusValue =
  | 'clean'
  | 'dirty'
  | 'cleaning'
  | 'inspection'
  | 'do_not_disturb'
  | 'out_of_order';

@Entity('room_cleaning_statuses')
@Index('idx_room_cleaning_property_room', ['propertyId', 'roomId'], { unique: true })
export class RoomCleaningStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'varchar', length: 20, name: 'cleaning_status', default: 'clean' })
  cleaningStatus!: CleaningStatusValue;

  @Column({ type: 'timestamptz', name: 'last_cleaned_at', nullable: true })
  lastCleanedAt!: Date | null;

  @Column({ type: 'int', name: 'last_cleaned_by', nullable: true })
  lastCleanedBy!: number | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
