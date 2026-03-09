import { api } from '@/lib/api';

export interface Referral {
  id: number;
  propertyId: number;
  referrerGuestId: number;
  referredGuestId: number | null;
  bookingId: number | null;
  referralCode: string;
  bonusType: 'percent' | 'fixed' | 'free_night';
  bonusValue: number;
  bonusApplied: boolean;
  createdAt: string;
  usedAt: string | null;
}

export interface ReferralStats {
  totalReferrals: number;
  appliedBonuses: number;
  totalBonusValue: number;
}

export interface CreateReferralDto {
  referrer_guest_id: number;
  bonus_type?: 'percent' | 'fixed' | 'free_night';
  bonus_value?: number;
}

export async function listReferrals(propertyId: number): Promise<Referral[]> {
  const { data } = await api.get('/referrals', {
    params: { property_id: propertyId },
  });
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function createReferral(dto: CreateReferralDto): Promise<Referral> {
  const { data } = await api.post<Referral>('/referrals', dto);
  return data;
}

export async function getReferralStats(propertyId: number): Promise<ReferralStats> {
  const { data } = await api.get<ReferralStats>('/referrals/stats', {
    params: { property_id: propertyId },
  });
  return data;
}

export async function getReferralByCode(code: string): Promise<Referral> {
  const { data } = await api.get<Referral>(`/referrals/by-code/${code}`);
  return data;
}

export async function applyReferralBonus(referralId: number): Promise<void> {
  await api.post(`/referrals/${referralId}/apply-bonus`);
}
