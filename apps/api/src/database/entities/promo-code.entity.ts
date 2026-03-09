import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Property } from './property.entity';

export type DiscountType = 'percent' | 'fixed';

@Entity('promo_codes')
@Index('idx_promo_codes_property', ['propertyId', 'isActive'])
export class PromoCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 20, name: 'discount_type', default: 'percent' })
  discountType!: DiscountType;

  @Column({ type: 'bigint', name: 'discount_value' })
  discountValue!: number;

  @Column({ type: 'int', name: 'max_uses', nullable: true })
  maxUses!: number | null;

  @Column({ type: 'int', name: 'used_count', default: 0 })
  usedCount!: number;

  @Column({ type: 'smallint', name: 'min_nights', default: 1 })
  minNights!: number;

  @Column({ type: 'bigint', name: 'min_amount', default: 0 })
  minAmount!: number;

  @Column({ type: 'int', array: true, name: 'applies_to_rooms', default: '{}' })
  appliesToRooms!: number[];

  @Column({ type: 'date', name: 'valid_from', nullable: true })
  validFrom!: string | null;

  @Column({ type: 'date', name: 'valid_to', nullable: true })
  validTo!: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
