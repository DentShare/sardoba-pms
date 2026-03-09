import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Property } from './property.entity';
import { Guest } from './guest.entity';
import { Booking } from './booking.entity';

export type BonusType = 'discount' | 'free_night' | 'credit';

@Entity('referrals')
@Index('idx_referrals_property', ['propertyId'])
@Index('idx_referrals_code', ['referralCode'])
export class Referral {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'referrer_guest_id' })
  referrerGuestId!: number;

  @Column({ type: 'int', name: 'referred_guest_id', nullable: true })
  referredGuestId!: number | null;

  @Column({ type: 'varchar', length: 50, name: 'referral_code' })
  referralCode!: string;

  @Column({ type: 'int', name: 'referred_booking_id', nullable: true })
  referredBookingId!: number | null;

  @Column({ type: 'varchar', length: 20, name: 'bonus_type', default: 'discount' })
  bonusType!: BonusType;

  @Column({ type: 'bigint', name: 'bonus_value', default: 0 })
  bonusValue!: number;

  @Column({ type: 'boolean', name: 'bonus_applied', default: false })
  bonusApplied!: boolean;

  @Column({ type: 'timestamptz', name: 'bonus_applied_at', nullable: true })
  bonusAppliedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => Guest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_guest_id' })
  referrerGuest!: Guest;

  @ManyToOne(() => Guest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_guest_id' })
  referredGuest!: Guest | null;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_booking_id' })
  referredBooking!: Booking | null;
}
