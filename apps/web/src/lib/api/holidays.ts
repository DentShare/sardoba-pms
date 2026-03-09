import { api } from '@/lib/api';

export interface HolidayRule {
  id: number;
  propertyId: number;
  name: string;
  dateFrom: string;
  dateTo: string;
  priceBoostPercent: number;
  minNights: number;
  recurYearly: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayDto {
  name: string;
  date_from: string;
  date_to: string;
  price_boost_percent: number;
  min_nights?: number;
  recur_yearly?: boolean;
  is_active?: boolean;
}

export async function listHolidays(propertyId: number): Promise<HolidayRule[]> {
  const { data } = await api.get('/calendar/holidays', {
    params: { property_id: propertyId },
  });
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function createHoliday(dto: CreateHolidayDto): Promise<HolidayRule> {
  const { data } = await api.post<HolidayRule>('/calendar/holidays', dto);
  return data;
}

export async function updateHoliday(
  id: number,
  dto: Partial<CreateHolidayDto>,
): Promise<HolidayRule> {
  const { data } = await api.patch<HolidayRule>(`/calendar/holidays/${id}`, dto);
  return data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await api.delete(`/calendar/holidays/${id}`);
}

export async function seedHolidays(propertyId: number): Promise<void> {
  await api.post('/calendar/holidays/seed', { property_id: propertyId });
}
