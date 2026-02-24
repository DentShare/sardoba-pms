import { api } from '@/lib/api';
import type { AnalyticsSummary } from '@sardoba/shared';

export interface AnalyticsParams {
  propertyId: number;
  dateFrom: string;
  dateTo: string;
  compareDateFrom?: string;
  compareDateTo?: string;
}

export interface OccupancyData {
  date: string;
  rate: number;
  occupied: number;
  total: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface SourceData {
  source: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface GuestStatsData {
  totalGuests: number;
  newGuests: number;
  returningGuests: number;
  avgStayNights: number;
  topNationalities: Array<{ nationality: string; count: number }>;
}

export interface RoomStatsData {
  roomId: number;
  roomName: string;
  occupancyRate: number;
  revenue: number;
  bookings: number;
}

export interface ExportParams extends AnalyticsParams {
  format: 'xlsx' | 'pdf';
  sections: string[];
}

function buildParams(params: AnalyticsParams): Record<string, unknown> {
  const result: Record<string, unknown> = {
    property_id: params.propertyId,
    date_from: params.dateFrom,
    date_to: params.dateTo,
  };
  if (params.compareDateFrom) result.compare_date_from = params.compareDateFrom;
  if (params.compareDateTo) result.compare_date_to = params.compareDateTo;
  return result;
}

/**
 * Get analytics summary (occupancy, revenue, ADR, RevPAR, etc.).
 */
export async function getSummary(
  params: AnalyticsParams,
): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>('/analytics/summary', {
    params: buildParams(params),
  });
  return data;
}

/**
 * Get daily occupancy data.
 */
export async function getOccupancy(
  params: AnalyticsParams,
): Promise<OccupancyData[]> {
  const { data } = await api.get<OccupancyData[]>('/analytics/occupancy', {
    params: buildParams(params),
  });
  return data;
}

/**
 * Get daily revenue data.
 */
export async function getRevenue(
  params: AnalyticsParams,
): Promise<RevenueData[]> {
  const { data } = await api.get<RevenueData[]>('/analytics/revenue', {
    params: buildParams(params),
  });
  return data;
}

/**
 * Get booking source distribution.
 */
export async function getSources(
  params: AnalyticsParams,
): Promise<SourceData[]> {
  const { data } = await api.get<SourceData[]>('/analytics/sources', {
    params: buildParams(params),
  });
  return data;
}

/**
 * Get guest statistics.
 */
export async function getGuestStats(
  params: AnalyticsParams,
): Promise<GuestStatsData> {
  const { data } = await api.get<GuestStatsData>('/analytics/guests', {
    params: buildParams(params),
  });
  return data;
}

/**
 * Get per-room statistics.
 */
export async function getRoomStats(
  params: AnalyticsParams,
): Promise<RoomStatsData[]> {
  const { data } = await api.get<RoomStatsData[]>('/analytics/rooms', {
    params: buildParams(params),
  });
  return data;
}

/**
 * Export analytics report.
 */
export async function exportReport(params: ExportParams): Promise<Blob> {
  const { data } = await api.get('/analytics/export', {
    params: {
      ...buildParams(params),
      format: params.format,
      sections: params.sections.join(','),
    },
    responseType: 'blob',
  });
  return data;
}
