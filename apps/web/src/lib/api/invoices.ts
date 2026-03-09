import { api } from '@/lib/api';

export interface CreateInvoiceDto {
  booking_id: number;
  company_name: string;
  company_inn?: string;
  company_address?: string;
  company_bank?: string;
  company_account?: string;
  company_mfo?: string;
}

export interface Invoice {
  id: number;
  bookingId: number;
  propertyId: number;
  invoiceNumber: string;
  companyName: string;
  companyInn: string | null;
  companyAddress: string | null;
  companyBank: string | null;
  companyAccount: string | null;
  companyMfo: string | null;
  totalAmount: number;
  pdfUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

export async function listInvoices(bookingId: number): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>('/invoices', {
    params: { booking_id: bookingId },
  });
  return Array.isArray(data) ? data : [];
}

export async function createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
  const { data } = await api.post<Invoice>('/invoices', dto);
  return data;
}

export async function downloadInvoicePdf(invoiceId: number): Promise<Blob> {
  const { data } = await api.get(`/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });
  return data;
}
