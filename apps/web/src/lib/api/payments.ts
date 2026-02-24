import { api } from '@/lib/api';
import type { Payment } from '@sardoba/shared';

export interface CreatePaymentDto {
  booking_id: number;
  amount: number;
  method: string;
  notes?: string;
  reference?: string;
}

/**
 * List payments for a booking.
 */
export async function listPayments(bookingId: number): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>('/payments', {
    params: { booking_id: bookingId },
  });
  return data;
}

/**
 * Create a new payment.
 */
export async function createPayment(dto: CreatePaymentDto): Promise<Payment> {
  const { data } = await api.post<Payment>('/payments', dto);
  return data;
}
