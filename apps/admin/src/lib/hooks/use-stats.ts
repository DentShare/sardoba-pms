import { useQuery } from '@tanstack/react-query';
import { getStats, getMrrHistory } from '../api/stats';

export function useStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: getStats,
  });
}

export function useMrrHistory() {
  return useQuery({
    queryKey: ['admin-mrr-history'],
    queryFn: getMrrHistory,
  });
}
