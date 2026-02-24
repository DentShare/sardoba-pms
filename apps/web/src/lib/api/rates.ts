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
  const { data } = await api.get<Rate[]>('/rates', {
    params: { property_id: propertyId },
  });
  return data;
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
  const { data } = await api.patch<Rate>(`/rates/${id}`, dto);
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
  roomId: number,
  checkIn: string,
  checkOut: string,
): Promise<RateCalculation> {
  const { data } = await api.get<RateCalculation>('/rates/calculate', {
    params: {
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
    },
  });
  return data;
}
