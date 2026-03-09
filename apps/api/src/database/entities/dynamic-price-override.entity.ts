import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('dynamic_price_overrides')
@Unique(['roomId', 'date'])
@Index('idx_dynamic_overrides_room_date', ['roomId', 'date'])
export class DynamicPriceOverride {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', name: 'room_id' })
  roomId!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'bigint' })
  price!: number;

  @Column({ type: 'uuid', array: true, name: 'rule_ids', default: '{}' })
  ruleIds!: string[];

  @Column({ type: 'timestamptz', name: 'calculated_at', default: () => 'NOW()' })
  calculatedAt!: Date;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;
}
