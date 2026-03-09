import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Invoice } from '@/database/entities/invoice.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Property } from '@/database/entities/property.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicePdfService } from './pdf/invoice-pdf.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  // ── findAll ─────────────────────────────────────────────────────────────

  /**
   * List all invoices for a property, ordered by newest first.
   */
  async findAll(propertyId: number) {
    const invoices = await this.invoiceRepository.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
      relations: ['booking'],
    });

    return {
      data: invoices.map((inv) => this.toResponseFormat(inv)),
      total: invoices.length,
    };
  }

  // ── findOne ─────────────────────────────────────────────────────────────

  /**
   * Get a single invoice by ID, scoped to a property.
   */
  async findOne(propertyId: number, id: number) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, propertyId },
      relations: ['booking'],
    });

    if (!invoice) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'invoice', id },
        'Invoice not found',
      );
    }

    return this.toResponseFormat(invoice);
  }

  // ── create ──────────────────────────────────────────────────────────────

  /**
   * Create a new corporate invoice for a booking.
   *
   * - Verifies the booking belongs to the property
   * - Generates a sequential invoice number (INV-YYYY-NNNN)
   * - Stores company details for the invoice
   * - Uses the booking's totalAmount as the invoice amount
   */
  async create(propertyId: number, userId: number, dto: CreateInvoiceDto) {
    // Verify booking belongs to this property
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId, propertyId },
      relations: ['room'],
    });

    if (!booking) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'booking', id: dto.bookingId },
        'Booking not found',
      );
    }

    // Generate sequential invoice number
    const invoiceNumber = await this.generateInvoiceNumber(propertyId);

    const invoice = this.invoiceRepository.create({
      propertyId,
      bookingId: dto.bookingId,
      invoiceNumber,
      companyName: dto.companyName,
      companyInn: dto.companyInn ?? null,
      companyAddress: dto.companyAddress ?? null,
      companyBank: dto.companyBank ?? null,
      companyAccount: dto.companyAccount ?? null,
      companyMfo: dto.companyMfo ?? null,
      totalAmount: Number(booking.totalAmount),
      createdBy: userId,
    });

    const saved = await this.invoiceRepository.save(invoice);

    this.logger.log(
      `Invoice ${invoiceNumber} created for booking #${dto.bookingId} by user #${userId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── generateInvoiceNumber ───────────────────────────────────────────────

  /**
   * Generate a sequential invoice number in the format INV-YYYY-NNNN.
   *
   * The sequence is per-property, per-year. For example:
   *   INV-2026-0001, INV-2026-0002, ...
   *
   * Uses a count of existing invoices for the same property and year
   * to determine the next number.
   */
  async generateInvoiceNumber(propertyId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Count existing invoices for this property in the current year
    const count = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.property_id = :propertyId', { propertyId })
      .andWhere('invoice.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();

    const nextNumber = String(count + 1).padStart(4, '0');
    return `${prefix}${nextNumber}`;
  }

  // ── generatePdf ─────────────────────────────────────────────────────────

  /**
   * Generate a PDF for the given invoice.
   *
   * Loads the booking (with room relation) and property data,
   * then delegates to InvoicePdfService for actual PDF generation.
   *
   * @returns Buffer containing the PDF data
   */
  async generatePdf(propertyId: number, id: number): Promise<Buffer> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, propertyId },
    });

    if (!invoice) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'invoice', id },
        'Invoice not found',
      );
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: invoice.bookingId },
      relations: ['room'],
    });

    if (!booking) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'booking', id: invoice.bookingId },
        'Related booking not found',
      );
    }

    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'property', id: propertyId },
        'Property not found',
      );
    }

    return this.invoicePdfService.generatePdf(invoice, booking, property);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Transform invoice entity to snake_case response format.
   */
  private toResponseFormat(invoice: Invoice): Record<string, unknown> {
    return {
      id: invoice.id,
      property_id: invoice.propertyId,
      booking_id: invoice.bookingId,
      invoice_number: invoice.invoiceNumber,
      company_name: invoice.companyName,
      company_inn: invoice.companyInn,
      company_address: invoice.companyAddress,
      company_bank: invoice.companyBank,
      company_account: invoice.companyAccount,
      company_mfo: invoice.companyMfo,
      total_amount: Number(invoice.totalAmount),
      issued_at: invoice.issuedAt,
      pdf_url: invoice.pdfUrl,
      created_by: invoice.createdBy,
      created_at: invoice.createdAt,
    };
  }
}
