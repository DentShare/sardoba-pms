import { api } from '@/lib/api';

export interface PromoCode {
  id: number;
  propertyId: number;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minNights: number;
  minAmount: number;
  appliesToRooms: number[];
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoCodeDto {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses?: number | null;
  min_nights?: number;
  min_amount?: number;
  applies_to_rooms?: number[];
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean;
}

export interface ValidatePromoResult {
  valid: boolean;
  discount: number;
  discountType: string;
  message?: string;
}

export async function listPromoCodes(propertyId: number): Promise<PromoCode[]> {
  const { data } = await api.get('/promo-codes', {
    params: { property_id: propertyId },
  });
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function createPromoCode(dto: CreatePromoCodeDto): Promise<PromoCode> {
  const { data } = await api.post<PromoCode>('/promo-codes', dto);
  return data;
}

export async function updatePromoCode(
  id: number,
  dto: Partial<CreatePromoCodeDto>,
): Promise<PromoCode> {
  const { data } = await api.patch<PromoCode>(`/promo-codes/${id}`, dto);
  return data;
}

export async function deletePromoCode(id: number): Promise<void> {
  await api.delete(`/promo-codes/${id}`);
}

export async function validatePromoCode(payload: {
  code: string;
  nights: number;
  amount: number;
  room_id?: number;
}): Promise<ValidatePromoResult> {
  const { data } = await api.post<ValidatePromoResult>('/promo-codes/validate', payload);
  return data;
}
