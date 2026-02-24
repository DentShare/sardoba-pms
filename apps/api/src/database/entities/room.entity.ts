import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Property } from './property.entity';
import { Booking } from './booking.entity';
import { RoomBlock } from './room-block.entity';
import { RoomMapping } from './room-mapping.entity';

export type RoomType = 'single' | 'double' | 'family' | 'suite' | 'dorm';
export type RoomStatus = 'active' | 'maintenance' | 'inactive';

@Entity('rooms')
@Index('idx_rooms_property', ['propertyId'])
@Index('idx_rooms_status', ['propertyId', 'status'])
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, name: 'room_type' })
  roomType!: RoomType;

  @Column({ type: 'smallint', nullable: true })
  floor!: number | null;

  @Column({ type: 'smallint', name: 'capacity_adults', default: 2 })
  capacityAdults!: number;

  @Column({ type: 'smallint', name: 'capacity_children', default: 0 })
  capacityChildren!: number;

  @Column({ type: 'bigint', name: 'base_price' })
  basePrice!: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: RoomStatus;

  @Column({ type: 'text', array: true, default: '{}' })
  amenities!: string[];

  @Column({ type: 'text', name: 'description_ru', nullable: true })
  descriptionRu!: string | null;

  @Column({ type: 'text', name: 'description_uz', nullable: true })
  descriptionUz!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  photos!: string[];

  @Column({ type: 'smallint', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings!: Booking[];

  @OneToMany(() => RoomBlock, (block) => block.room)
  blocks!: RoomBlock[];

  @OneToMany(() => RoomMapping, (mapping) => mapping.room)
  mappings!: RoomMapping[];
}
