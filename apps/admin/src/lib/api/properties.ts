import { api } from '../api';

export interface PropertiesFilters {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  city?: string;
}

export async function listProperties(filters: PropertiesFilters = {}) {
  const { data } = await api.get('/admin/properties', { params: filters });
  return data;
}

export async function getProperty(id: number) {
  const { data } = await api.get(`/admin/properties/${id}`);
  return data;
}
