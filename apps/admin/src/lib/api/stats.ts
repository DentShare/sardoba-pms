import { api } from '../api';

export async function getStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

export async function getMrrHistory() {
  const { data } = await api.get('/admin/stats/mrr-history');
  return data;
}
