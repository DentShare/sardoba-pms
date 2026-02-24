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

export type PriceType = 'per_booking' | 'per_night' | 'per_person';

@Entity('property_extras')
@Index('idx_property_extras_property', ['propertyId'])
export class PropertyExtra {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 200, name: 'name_uz', nullable: true })
  nameUz!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'bigint', default: 0 })
  price!: number; // tiyin, 0 = free

  @Column({ type: 'varchar', length: 20, name: 'price_type', default: 'per_booking' })
  priceType!: PriceType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon!: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'smallint', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (p) => p.extras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
