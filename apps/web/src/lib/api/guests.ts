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
