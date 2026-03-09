import { api } from '@/lib/api';
import type { Rate, RateCalculation } from '@sardoba/shared';

export interface CreateRateDto {
  property_id: number;
  name: string;
  type: string;
  price?: number;
  discount_percent?: number;
  date_from?: string;
  date_to?: string;
  min_stay?: number;
  applies_to_rooms?: number[];
  days_of_week?: number[];
}

export interface UpdateRateDto {
  name?: string;
  type?: string;
  price?: number;
  discount_percent?: number;
  date_from?: string;
  date_to?: string;
  min_stay?: number;
  applies_to_rooms?: number[];
  days_of_week?: number[];
}

/**
 * List all rates for a property.
 */
export async function listRates(propertyId: number): Promise<Rate[]> {
  const { data } = await api.get(
    `/properties/${propertyId}/rates`,
  );
  // API returns paginated { data: [...], meta: {...} }
  return data?.data ?? (Array.isArray(data) ? data : []);
}

/**
 * Create a new rate.
 */
export async function createRate(dto: CreateRateDto): Promise<Rate> {
  const { data } = await api.post<Rate>('/rates', dto);
  return data;
}

/**
 * Update a rate.
 */
export async function updateRate(
  id: number,
  dto: UpdateRateDto,
): Promise<Rate> {
  const { data } = await api.put<Rate>(`/rates/${id}`, dto);
  return data;
}

/**
 * Delete a rate.
 */
export async function deleteRate(id: number): Promise<void> {
  await api.delete(`/rates/${id}`);
}

/**
 * Calculate rate for a room and date range.
 */
export async function calculateRate(
  propertyId: number,
  roomId: number,
  checkIn: string,
  checkOut: string,
  rateId?: number,
): Promise<RateCalculation> {
  const { data } = await api.post<RateCalculation>(
    `/properties/${propertyId}/rates/calculate`,
    {
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      rate_id: rateId,
    },
  );
  return data;
}

// ── Min Nights Rules ──────────────────────────────────────────────────────────

export interface MinNightsRule {
  id: number;
  propertyId: number;
  dateFrom: string;
  dateTo: string;
  minNights: number;
  appliesToRooms: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMinNightsRuleDto {
  date_from: string;
  date_to: string;
  min_nights: number;
  applies_to_rooms?: number[];
  is_active?: boolean;
}

export async function listMinNightsRules(propertyId: number): Promise<MinNightsRule[]> {
  const { data } = await api.get('/rates/min-nights-rules', {
    params: { property_id: propertyId },
  });
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function createMinNightsRule(
  dto: CreateMinNightsRuleDto,
): Promise<MinNightsRule> {
  const { data } = await api.post<MinNightsRule>('/rates/min-nights-rules', dto);
  return data;
}

export async function updateMinNightsRule(
  id: number,
  dto: Partial<CreateMinNightsRuleDto>,
): Promise<MinNightsRule> {
  const { data } = await api.patch<MinNightsRule>(
    `/rates/min-nights-rules/${id}`,
    dto,
  );
  return data;
}

export async function deleteMinNightsRule(id: number): Promise<void> {
  await api.delete(`/rates/min-nights-rules/${id}`);
}
