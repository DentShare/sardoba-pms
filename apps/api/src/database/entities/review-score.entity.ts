import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Property } from './property.entity';

export type ReviewPlatform = 'google' | 'booking_com' | 'tripadvisor' | 'airbnb';

@Entity('review_scores')
@Unique('idx_review_scores_property_platform', ['propertyId', 'platform'])
export class ReviewScore {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 30 })
  platform!: ReviewPlatform;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  score!: number;

  @Column({ type: 'int', name: 'review_count', default: 0 })
  reviewCount!: number;

  @Column({ type: 'timestamptz', name: 'fetched_at', default: () => 'NOW()' })
  fetchedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
