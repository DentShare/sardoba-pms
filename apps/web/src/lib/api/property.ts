import { api } from '@/lib/api';

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface Property {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  currency: string;
  timezone: string;
  cover_photo: string | null;
  booking_enabled: boolean;
}

export interface UpdatePropertyDto {
  name?: string;
  slug?: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  currency?: string;
  timezone?: string;
  cover_photo?: string | null;
  booking_enabled?: boolean;
}

/* ── API calls ───────────────────────────────────────────────────────────── */

/**
 * Get property by ID.
 */
export async function getProperty(id: number): Promise<Property> {
  const { data } = await api.get<Property>(`/properties/${id}`);
  return data;
}

/**
 * Update property.
 */
export async function updateProperty(
  id: number,
  dto: UpdatePropertyDto,
): Promise<Property> {
  const { data } = await api.patch<Property>(`/properties/${id}`, dto);
  return data;
}

/**
 * Upload a cover photo for a property.
 */
export async function uploadPropertyPhoto(
  id: number,
  file: File,
  type: 'cover' | 'gallery' = 'cover',
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const { data } = await api.post<{ url: string }>(
    `/properties/${id}/photos`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

/**
 * Delete a photo from a property.
 */
export async function deletePropertyPhoto(
  id: number,
  url: string,
  type: 'cover' | 'gallery' = 'cover',
): Promise<void> {
  await api.delete(`/properties/${id}/photos`, { data: { url, type } });
}
