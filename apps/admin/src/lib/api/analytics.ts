import { api } from '../api';

export async function getAdminAnalytics() {
  const { data } = await api.get('/admin/analytics/overview');
  return data;
}
