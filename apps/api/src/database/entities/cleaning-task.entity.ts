import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from './property.entity';
import { Room } from './room.entity';
import { User } from './user.entity';

export type TaskType = 'standard' | 'checkout' | 'deep';

export type CleaningStatus =
  | 'clean'
  | 'dirty'
  | 'cleaning'
  | 'inspection'
  | 'do_not_disturb'
  | 'out_of_order';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'verified';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

@Entity('cleaning_tasks')
@Index('idx_cleaning_tasks_property', ['propertyId'])
@Index('idx_cleaning_tasks_room', ['roomId'])
@Index('idx_cleaning_tasks_status', ['propertyId', 'taskStatus'])
export class CleaningTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'int', name: 'assigned_to', nullable: true })
  assignedTo!: number | null;

  @Column({ type: 'varchar', length: 20, name: 'task_type' })
  taskType!: TaskType;

  @Column({ type: 'varchar', length: 20, name: 'cleaning_status' })
  cleaningStatus!: CleaningStatus;

  @Column({ type: 'varchar', length: 20, name: 'task_status', default: 'pending' })
  taskStatus!: TaskStatus;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  priority!: TaskPriority;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', name: 'duration_minutes', nullable: true })
  durationMinutes!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee!: User | null;
}
