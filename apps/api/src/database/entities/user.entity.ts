import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Property } from './property.entity';

export type UserRole = 'owner' | 'admin' | 'viewer';

@Entity('users')
@Unique(['property', 'email'])
@Index('idx_users_property', ['propertyId'])
@Index('idx_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: 'admin' })
  role!: UserRole;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 500, name: 'refresh_token', nullable: true })
  refreshToken!: string | null;

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Property, (property) => property.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;
}
