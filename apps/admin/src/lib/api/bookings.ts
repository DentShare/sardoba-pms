import { api } from '../api';

export interface AdminBookingsFilters {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  source?: string;
  propertyId?: number;
}

export async function listAdminBookings(filters: AdminBookingsFilters = {}) {
  const { data } = await api.get('/admin/bookings', { params: filters });
  return data;
}
