import { api } from '@/lib/api';
import type { Payment } from '@sardoba/shared';

export interface CreatePaymentDto {
  booking_id: number;
  amount: number;
  method: string;
  paid_at?: string;
  notes?: string;
  reference?: string;
}

export interface PaymentsResponse {
  data: Payment[];
  bookingId: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
}

/**
 * List payments for a booking.
 */
export async function listPayments(bookingId: number): Promise<PaymentsResponse> {
  const { data } = await api.get<PaymentsResponse>(
    `/bookings/${bookingId}/payments`,
  );
  return data;
}

/**
 * Create a new payment.
 */
export async function createPayment(dto: CreatePaymentDto): Promise<Payment> {
  const { booking_id, ...body } = dto;
  const { data } = await api.post<Payment>(
    `/bookings/${booking_id}/payments`,
    body,
  );
  return data;
}

/**
 * Delete a payment (owner/admin only).
 */
export async function deletePayment(id: number): Promise<void> {
  await api.delete(`/payments/${id}`);
}

// ── Payme QR ──────────────────────────────────────────────────────────────────

export interface PaymeQrResponse {
  qrUrl: string;
  checkoutUrl: string;
  amount: number;
  bookingId: number;
}

export async function generatePaymeQr(
  bookingId: number,
  amount: number,
): Promise<PaymeQrResponse> {
  const { data } = await api.post<PaymeQrResponse>('/payments/payme-qr', {
    booking_id: bookingId,
    amount,
  });
  return data;
}

export async function getPaymeQrStatus(
  bookingId: number,
): Promise<{ status: string; paid: boolean }> {
  const { data } = await api.get<{ status: string; paid: boolean }>(
    `/payments/payme-qr/${bookingId}/status`,
  );
  return data;
}
