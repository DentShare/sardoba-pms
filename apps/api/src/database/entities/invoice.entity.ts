import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Property } from './property.entity';
import { Booking } from './booking.entity';

@Entity('invoices')
@Index('idx_invoices_property', ['propertyId'])
@Index('idx_invoices_booking', ['bookingId'])
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'property_id' })
  propertyId!: number;

  @Column({ type: 'int', name: 'booking_id' })
  bookingId!: number;

  @Column({ type: 'varchar', length: 30, name: 'invoice_number', unique: true })
  invoiceNumber!: string;

  @Column({ type: 'varchar', length: 255, name: 'company_name' })
  companyName!: string;

  @Column({ type: 'varchar', length: 20, name: 'company_inn', nullable: true })
  companyInn!: string | null;

  @Column({ type: 'text', name: 'company_address', nullable: true })
  companyAddress!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'company_bank', nullable: true })
  companyBank!: string | null;

  @Column({ type: 'varchar', length: 30, name: 'company_account', nullable: true })
  companyAccount!: string | null;

  @Column({ type: 'varchar', length: 10, name: 'company_mfo', nullable: true })
  companyMfo!: string | null;

  @Column({ type: 'bigint', name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'timestamptz', name: 'issued_at', default: () => 'NOW()' })
  issuedAt!: Date;

  @Column({ type: 'varchar', length: 500, name: 'pdf_url', nullable: true })
  pdfUrl!: string | null;

  @Column({ type: 'int', name: 'created_by' })
  createdBy!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;
}
