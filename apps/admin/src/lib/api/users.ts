import { api } from '../api';

export interface PlatformUsersFilters {
  page?: number;
  perPage?: number;
  search?: string;
  role?: string;
  status?: string;
}

export async function listPlatformUsers(filters: PlatformUsersFilters = {}) {
  const { data } = await api.get('/admin/users', { params: filters });
  return data;
}

export async function updateUserStatus(id: number, status: 'active' | 'blocked') {
  const { data } = await api.patch(`/admin/users/${id}/status`, { status });
  return data;
}
