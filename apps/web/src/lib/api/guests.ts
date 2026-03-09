import { api } from '@/lib/api';
import type { Guest, PaginatedResponse } from '@sardoba/shared';

export interface GuestFilters {
  propertyId?: number;
  search?: string;
  isVip?: boolean;
  nationality?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isBlacklisted?: boolean;
  tag?: string;
}

export interface CreateGuestDto {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  nationality?: string;
  document_type?: string;
  document_number?: string;
  date_of_birth?: string;
  is_vip?: boolean;
  notes?: string;
}

export interface UpdateGuestDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  document_type?: string;
  document_number?: string;
  date_of_birth?: string;
  is_vip?: boolean;
  notes?: string;
}

/**
 * List guests with filters and pagination.
 */
export async function listGuests(
  filters: GuestFilters = {},
): Promise<PaginatedResponse<Guest>> {
  const params: Record<string, unknown> = {};

  if (filters.search) params.search = filters.search;
  if (filters.isVip !== undefined) params.is_vip = filters.isVip;
  if (filters.nationality) params.nationality = filters.nationality;
  if (filters.page) params.page = filters.page;
  if (filters.perPage) params.per_page = filters.perPage;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.sortOrder) params.sort_order = filters.sortOrder;
  if (filters.isBlacklisted !== undefined) params.is_blacklisted = filters.isBlacklisted;
  if (filters.tag) params.tag = filters.tag;

  const { data } = await api.get<PaginatedResponse<Guest>>(
    `/properties/${filters.propertyId}/guests`,
    { params },
  );
  return data;
}

/**
 * Get a single guest by ID.
 */
export async function getGuest(id: number): Promise<Guest> {
  const { data } = await api.get<Guest>(`/guests/${id}`);
  return data;
}

/**
 * Create a new guest.
 */
export async function createGuest(dto: CreateGuestDto): Promise<Guest> {
  const { data } = await api.post<Guest>('/guests', dto);
  return data;
}

/**
 * Update a guest.
 */
export async function updateGuest(
  id: number,
  dto: UpdateGuestDto,
): Promise<Guest> {
  const { data } = await api.put<Guest>(`/guests/${id}`, dto);
  return data;
}

/**
 * Search guests by query string (name, phone, email, document).
 */
export async function searchGuests(
  query: string,
  propertyId: number,
): Promise<Guest[]> {
  const { data } = await api.get<Guest[]>(
    `/properties/${propertyId}/guests/search`,
    { params: { q: query } },
  );
  return data;
}

/**
 * Upload a document/passport photo for a guest.
 */
export async function uploadGuestDocument(
  guestId: number,
  file: File,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<{ url: string }>(
    `/guests/${guestId}/documents`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

/**
 * Export OVIR report for a date range.
 */
export async function exportOvir(
  dateFrom: string,
  dateTo: string,
  propertyId: number,
): Promise<Blob> {
  const { data } = await api.get(
    `/properties/${propertyId}/guests/export`,
    {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
      },
      responseType: 'blob',
    },
  );
  return data;
}

// ── Guest Tags ────────────────────────────────────────────────────────────────

export async function addGuestTags(guestId: number, tags: string[]): Promise<Guest> {
  const { data } = await api.post<Guest>(`/guests/${guestId}/tags`, { tags });
  return data;
}

export async function removeGuestTags(guestId: number, tags: string[]): Promise<Guest> {
  const { data } = await api.delete<Guest>(`/guests/${guestId}/tags`, {
    data: { tags },
  });
  return data;
}

// ── Blacklist ─────────────────────────────────────────────────────────────────

export async function blacklistGuest(
  guestId: number,
  reason: string,
): Promise<Guest> {
  const { data } = await api.post<Guest>(`/guests/${guestId}/blacklist`, { reason });
  return data;
}

export async function unblacklistGuest(guestId: number): Promise<Guest> {
  const { data } = await api.delete<Guest>(`/guests/${guestId}/blacklist`);
  return data;
}

// ── AI Tips ───────────────────────────────────────────────────────────────────

export interface GuestTip {
  text: string;
  type: 'upsell' | 'preference' | 'warning' | 'general';
}

export async function getGuestTips(guestId: number): Promise<{ tips: GuestTip[] }> {
  const { data } = await api.get<{ tips: GuestTip[] }>(`/guests/${guestId}/tips`);
  return data;
}

// ── Passport OCR ──────────────────────────────────────────────────────────────

export interface PassportOcrResult {
  confidence: number;
  data: {
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
    birth_date: string | null;
    passport_number: string | null;
    nationality: string | null;
    expiry_date: string | null;
    gender: string | null;
  };
}

export async function passportOcr(file: File): Promise<PassportOcrResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<PassportOcrResult>(
    '/guests/passport-ocr',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
