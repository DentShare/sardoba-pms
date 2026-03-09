import { Injectable, Logger } from '@nestjs/common';
import { Invoice } from '@/database/entities/invoice.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Property } from '@/database/entities/property.entity';

/**
 * Service for generating invoice PDF documents.
 *
 * Uses pdfkit when available, falling back to a plain-text receipt
 * if the dependency is not installed.
 *
 * Invoice structure (Uzbekistan corporate format):
 * - Header: hotel name, address, phone
 * - Invoice number + date
 * - Client info: company name, INN, address, bank, account, MFO
 * - Service table: room name, dates, nights, price, total
 * - Total amount in UZS (converted from tiyin)
 * - Footer: signature lines
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  /**
   * Generate a PDF buffer for the given invoice.
   *
   * @param invoice - Invoice entity with company details
   * @param booking - Related booking with room relation loaded
   * @param property - Hotel property for header information
   * @returns Buffer containing PDF data
   */
  async generatePdf(
    invoice: Invoice,
    booking: Booking,
    property: Property,
  ): Promise<Buffer> {
    try {
      const PDFDocument = (await import('pdfkit')).default;
      return this.generatePdfWithPdfkit(PDFDocument, invoice, booking, property);
    } catch {
      this.logger.warn(
        'pdfkit not available, generating plain-text fallback invoice',
      );
      return this.generateTextFallback(invoice, booking, property);
    }
  }

  // ── pdfkit-based PDF generation ───────────────────────────────────────────

  /**
   * Generate a proper PDF using the pdfkit library.
   */
  private generatePdfWithPdfkit(
    PDFDocument: any,
    invoice: Invoice,
    booking: Booking,
    property: Property,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice ${invoice.invoiceNumber}`,
            Author: property.name,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const amountSom = Number(invoice.totalAmount) / 100;
        const roomName = booking.room?.name ?? `Room #${booking.roomId}`;
        const pricePerNight = booking.nights > 0
          ? amountSom / booking.nights
          : amountSom;

        // ── Header ────────────────────────────────────────────────────────
        doc.fontSize(18).text(property.name, { align: 'center' });
        doc.fontSize(10).text(property.address, { align: 'center' });
        doc.text(`Тел: ${property.phone}`, { align: 'center' });
        doc.moveDown(1.5);

        // ── Invoice title ─────────────────────────────────────────────────
        doc.fontSize(16).text(`СЧЁТ-ФАКТУРА №${invoice.invoiceNumber}`, {
          align: 'center',
        });
        doc.fontSize(10).text(
          `от ${this.formatDate(invoice.issuedAt)}`,
          { align: 'center' },
        );
        doc.moveDown(1.5);

        // ── Client info ───────────────────────────────────────────────────
        doc.fontSize(12).text('Заказчик:', { underline: true });
        doc.fontSize(10);
        doc.text(`Компания: ${invoice.companyName}`);
        if (invoice.companyInn) doc.text(`ИНН: ${invoice.companyInn}`);
        if (invoice.companyAddress) doc.text(`Адрес: ${invoice.companyAddress}`);
        if (invoice.companyBank) doc.text(`Банк: ${invoice.companyBank}`);
        if (invoice.companyAccount) doc.text(`Р/с: ${invoice.companyAccount}`);
        if (invoice.companyMfo) doc.text(`МФО: ${invoice.companyMfo}`);
        doc.moveDown(1);

        // ── Service table ─────────────────────────────────────────────────
        const tableTop = doc.y;
        const colX = [50, 280, 370, 430, 500];
        const colHeaders = ['Описание', 'Кол-во', 'Ед.', 'Цена', 'Сумма'];

        // Table header
        doc.fontSize(10).font('Helvetica-Bold');
        colHeaders.forEach((header, i) => {
          doc.text(header, colX[i], tableTop, { width: 80 });
        });
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table row
        const rowY = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        const description = `${roomName}\n${booking.checkIn} — ${booking.checkOut}`;
        doc.text(description, colX[0], rowY, { width: 220 });
        doc.text(String(booking.nights), colX[1], rowY, { width: 50 });
        doc.text('ночь', colX[2], rowY, { width: 50 });
        doc.text(this.formatMoney(pricePerNight), colX[3], rowY, { width: 60 });
        doc.text(this.formatMoney(amountSom), colX[4], rowY, { width: 60 });

        const afterRow = Math.max(doc.y, rowY + 30);
        doc.moveTo(50, afterRow).lineTo(550, afterRow).stroke();

        // ── Total ─────────────────────────────────────────────────────────
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(
          `ИТОГО: ${this.formatMoney(amountSom)} сум`,
          50,
          afterRow + 15,
          { align: 'right', width: 500 },
        );
        doc.moveDown(3);

        // ── Signatures ────────────────────────────────────────────────────
        doc.font('Helvetica').fontSize(10);
        const sigY = doc.y;

        doc.text('Исполнитель: _______________', 50, sigY);
        doc.text('Заказчик: _______________', 300, sigY);
        doc.moveDown(0.5);
        doc.fontSize(8);
        doc.text(`(${property.name})`, 50);

        doc.moveDown(2);
        doc.text('М.П.', 50);
        doc.text('М.П.', 300);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Plain-text fallback ───────────────────────────────────────────────────

  /**
   * Generate a plain-text invoice as a fallback when pdfkit is not installed.
   * Returns a UTF-8 text buffer.
   */
  private generateTextFallback(
    invoice: Invoice,
    booking: Booking,
    property: Property,
  ): Buffer {
    const amountSom = Number(invoice.totalAmount) / 100;
    const roomName = booking.room?.name ?? `Room #${booking.roomId}`;
    const pricePerNight = booking.nights > 0
      ? amountSom / booking.nights
      : amountSom;
    const sep = '='.repeat(60);
    const dash = '-'.repeat(60);

    const lines = [
      sep,
      this.center(property.name, 60),
      this.center(property.address, 60),
      this.center(`Тел: ${property.phone}`, 60),
      sep,
      '',
      this.center(`СЧЁТ-ФАКТУРА №${invoice.invoiceNumber}`, 60),
      this.center(`от ${this.formatDate(invoice.issuedAt)}`, 60),
      '',
      dash,
      'ЗАКАЗЧИК:',
      `  Компания: ${invoice.companyName}`,
      invoice.companyInn ? `  ИНН: ${invoice.companyInn}` : '',
      invoice.companyAddress ? `  Адрес: ${invoice.companyAddress}` : '',
      invoice.companyBank ? `  Банк: ${invoice.companyBank}` : '',
      invoice.companyAccount ? `  Р/с: ${invoice.companyAccount}` : '',
      invoice.companyMfo ? `  МФО: ${invoice.companyMfo}` : '',
      '',
      dash,
      'УСЛУГИ:',
      dash,
      `  ${roomName}`,
      `  Период: ${booking.checkIn} — ${booking.checkOut}`,
      `  Ночей: ${booking.nights}`,
      `  Цена за ночь: ${this.formatMoney(pricePerNight)} сум`,
      `  Сумма: ${this.formatMoney(amountSom)} сум`,
      dash,
      '',
      `  ИТОГО: ${this.formatMoney(amountSom)} сум`,
      '',
      sep,
      '',
      'Исполнитель: _______________    Заказчик: _______________',
      `(${property.name})`,
      '',
      'М.П.                            М.П.',
      '',
      sep,
    ].filter((line) => line !== ''); // Remove blank lines from optional fields

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Format a Date as DD.MM.YYYY (Uzbekistan/Russian standard).
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Format a number as money with space-separated thousands.
   * E.g., 1234567.89 → "1 234 567.89"
   */
  private formatMoney(value: number): string {
    const [intPart, decPart] = value.toFixed(2).split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return decPart === '00' ? formatted : `${formatted}.${decPart}`;
  }

  /**
   * Center a string within a given width.
   */
  private center(text: string, width: number): string {
    if (text.length >= width) return text;
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
  }
}
