import { api } from '../api';

export async function getSystemHealth() {
  const { data } = await api.get('/admin/system/health');
  return data;
}
