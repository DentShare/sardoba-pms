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
  property_id: number;
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

  if (filters.propertyId) params.property_id = filters.propertyId;
  if (filters.search) params.search = filters.search;
  if (filters.isVip !== undefined) params.is_vip = filters.isVip;
  if (filters.nationality) params.nationality = filters.nationality;
  if (filters.page) params.page = filters.page;
  if (filters.perPage) params.per_page = filters.perPage;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.sortOrder) params.sort_order = filters.sortOrder;

  const { data } = await api.get<PaginatedResponse<Guest>>('/guests', {
    params,
  });
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
  const { data } = await api.patch<Guest>(`/guests/${id}`, dto);
  return data;
}

/**
 * Search guests by query string (name, phone, email, document).
 */
export async function searchGuests(
  query: string,
  propertyId?: number,
): Promise<Guest[]> {
  const params: Record<string, unknown> = { q: query };
  if (propertyId) params.property_id = propertyId;

  const { data } = await api.get<Guest[]>('/guests/search', { params });
  return data;
}

/**
 * Export OVIR report for a date range.
 */
export async function exportOvir(
  dateFrom: string,
  dateTo: string,
  propertyId?: number,
): Promise<Blob> {
  const params: Record<string, unknown> = {
    date_from: dateFrom,
    date_to: dateTo,
  };
  if (propertyId) params.property_id = propertyId;

  const { data } = await api.get('/guests/ovir-export', {
    params,
    responseType: 'blob',
  });
  return data;
}
