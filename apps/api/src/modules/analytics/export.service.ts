import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AnalyticsService } from './analytics.service';

/**
 * Source label mapping for human-readable Excel output.
 */
const SOURCE_LABELS: Record<string, string> = {
  direct: 'Прямое бронирование',
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  expedia: 'Expedia',
  phone: 'По телефону',
  other: 'Другое',
};

/**
 * Booking status label mapping for human-readable Excel output.
 */
const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  confirmed: 'Подтверждено',
  checked_in: 'Заселён',
  checked_out: 'Выселен',
  cancelled: 'Отменено',
  no_show: 'Неявка',
};

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Generate a multi-sheet Excel workbook with analytics data.
   *
   * Sheet 1: "Сводка" - summary metrics (occupancy, ADR, RevPAR, revenue)
   * Sheet 2: "Бронирования" - all bookings for the period
   * Sheet 3: "По номерам" - room stats (revenue, nights, occupancy per room)
   * Sheet 4: "По источникам" - source breakdown
   *
   * @returns Buffer containing the xlsx file
   */
  async generateExcel(
    propertyId: number,
    dateFrom: string,
    dateTo: string,
    propertyName: string,
  ): Promise<Buffer> {
    this.logger.log(
      `Generating Excel report for property ${propertyId} (${dateFrom} - ${dateTo})`,
    );

    // Fetch all data in parallel
    const [summary, bookings, roomStats, sources] = await Promise.all([
      this.analyticsService.getSummary(propertyId, dateFrom, dateTo),
      this.analyticsService.getBookingsForExport(propertyId, dateFrom, dateTo),
      this.analyticsService.getRoomStats(propertyId, dateFrom, dateTo),
      this.analyticsService.getSources(propertyId, dateFrom, dateTo),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sardoba PMS';
    workbook.created = new Date();

    // ── Sheet 1: Сводка ───────────────────────────────────────────────────

    const summarySheet = workbook.addWorksheet('Сводка');
    this.buildSummarySheet(summarySheet, summary, propertyName, dateFrom, dateTo);

    // ── Sheet 2: Бронирования ─────────────────────────────────────────────

    const bookingsSheet = workbook.addWorksheet('Бронирования');
    this.buildBookingsSheet(bookingsSheet, bookings);

    // ── Sheet 3: По номерам ───────────────────────────────────────────────

    const roomsSheet = workbook.addWorksheet('По номерам');
    this.buildRoomsSheet(roomsSheet, roomStats);

    // ── Sheet 4: По источникам ────────────────────────────────────────────

    const sourcesSheet = workbook.addWorksheet('По источникам');
    this.buildSourcesSheet(sourcesSheet, sources);

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── Sheet builders ──────────────────────────────────────────────────────

  private buildSummarySheet(
    sheet: ExcelJS.Worksheet,
    summary: any,
    propertyName: string,
    dateFrom: string,
    dateTo: string,
  ): void {
    // Title row
    sheet.mergeCells('A1:B1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Отчёт: ${propertyName}`;
    titleCell.font = { bold: true, size: 14 };

    // Period row
    sheet.mergeCells('A2:B2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Период: ${this.formatDateRu(dateFrom)} — ${this.formatDateRu(dateTo)}`;
    periodCell.font = { size: 11, italic: true };

    // Blank row
    sheet.getRow(3).values = [];

    // Metrics table header
    const headerRow = sheet.getRow(4);
    headerRow.values = ['Показатель', 'Значение'];
    headerRow.font = { bold: true };
    this.styleHeaderRow(headerRow, 2);

    // Metrics data
    const metricsData: Array<[string, string]> = [
      ['Загрузка (%)', `${summary.occupancy_rate}%`],
      ['Выручка (сум)', this.formatMoney(summary.revenue)],
      ['ADR (сум)', this.formatMoney(summary.adr)],
      ['RevPAR (сум)', this.formatMoney(summary.revpar)],
      ['Всего бронирований', String(summary.total_bookings)],
      ['Среднее проживание (ночей)', String(summary.avg_stay_nights)],
      ['Топ-источник', summary.top_source ? (SOURCE_LABELS[summary.top_source] ?? summary.top_source) : '—'],
    ];

    metricsData.forEach((row, idx) => {
      const excelRow = sheet.getRow(5 + idx);
      excelRow.values = row;
    });

    // Auto-width columns
    this.autoWidthColumns(sheet);
  }

  private buildBookingsSheet(
    sheet: ExcelJS.Worksheet,
    bookings: Array<{
      booking_number: string;
      guest_name: string;
      room_name: string;
      check_in: string;
      check_out: string;
      nights: number;
      total_amount: number;
      paid_amount: number;
      status: string;
      source: string;
    }>,
  ): void {
    // Header
    const headers = [
      '№ Брони',
      'Гость',
      'Номер',
      'Заезд',
      'Выезд',
      'Ночей',
      'Сумма (сум)',
      'Оплачено (сум)',
      'Статус',
      'Источник',
    ];

    const headerRow = sheet.getRow(1);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    this.styleHeaderRow(headerRow, headers.length);

    // Data rows
    bookings.forEach((booking, idx) => {
      const row = sheet.getRow(idx + 2);
      row.values = [
        booking.booking_number,
        booking.guest_name,
        booking.room_name,
        this.formatDateRu(booking.check_in),
        this.formatDateRu(booking.check_out),
        booking.nights,
        this.formatMoney(booking.total_amount),
        this.formatMoney(booking.paid_amount),
        STATUS_LABELS[booking.status] ?? booking.status,
        SOURCE_LABELS[booking.source] ?? booking.source,
      ];
    });

    // Auto-width columns
    this.autoWidthColumns(sheet);
  }

  private buildRoomsSheet(
    sheet: ExcelJS.Worksheet,
    roomStats: Array<{
      room_id: number;
      room_name: string;
      room_type: string;
      revenue: number;
      nights_sold: number;
      occupancy_rate: number;
    }>,
  ): void {
    const headers = ['Номер', 'Тип', 'Ночей продано', 'Выручка (сум)', 'Загрузка (%)'];

    const headerRow = sheet.getRow(1);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    this.styleHeaderRow(headerRow, headers.length);

    roomStats.forEach((room, idx) => {
      const row = sheet.getRow(idx + 2);
      row.values = [
        room.room_name,
        room.room_type,
        room.nights_sold,
        this.formatMoney(room.revenue),
        `${room.occupancy_rate}%`,
      ];
    });

    this.autoWidthColumns(sheet);
  }

  private buildSourcesSheet(
    sheet: ExcelJS.Worksheet,
    sources: Array<{
      source: string;
      count: number;
      revenue: number;
      percentage: number;
    }>,
  ): void {
    const headers = ['Источник', 'Бронирований', 'Выручка (сум)', 'Доля (%)'];

    const headerRow = sheet.getRow(1);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    this.styleHeaderRow(headerRow, headers.length);

    sources.forEach((source, idx) => {
      const row = sheet.getRow(idx + 2);
      row.values = [
        SOURCE_LABELS[source.source] ?? source.source,
        source.count,
        this.formatMoney(source.revenue),
        `${source.percentage}%`,
      ];
    });

    this.autoWidthColumns(sheet);
  }

  // ── Formatting helpers ──────────────────────────────────────────────────

  /**
   * Style a header row with background fill and borders.
   */
  private styleHeaderRow(row: ExcelJS.Row, columnCount: number): void {
    for (let i = 1; i <= columnCount; i++) {
      const cell = row.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  /**
   * Auto-size columns based on content width.
   */
  private autoWidthColumns(sheet: ExcelJS.Worksheet): void {
    sheet.columns.forEach((column) => {
      if (!column || !column.eachCell) return;
      let maxLength = 10;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value?.toString() ?? '';
        maxLength = Math.max(maxLength, cellValue.length + 2);
      });
      column.width = Math.min(maxLength, 40);
    });
  }

  /**
   * Format a YYYY-MM-DD date string to DD.MM.YYYY (Russian format).
   */
  private formatDateRu(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  /**
   * Format money from tiyin to "# ##0 сум" display format.
   * Example: 150000 tiyin => "1 500 сум"
   */
  private formatMoney(tiyin: number): string {
    const sum = Math.round(tiyin / 100);
    const formatted = sum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} сум`;
  }
}
