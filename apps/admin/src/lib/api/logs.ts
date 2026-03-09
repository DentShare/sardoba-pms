import { api } from '../api';

export interface LogsFilters {
  page?: number;
  perPage?: number;
  level?: string;
  service?: string;
  propertyId?: number;
  search?: string;
}

export async function listLogs(filters: LogsFilters = {}) {
  const { data } = await api.get('/admin/logs', { params: filters });
  return data;
}
