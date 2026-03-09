import { useQuery } from '@tanstack/react-query';
import { getAdminAnalytics } from '../api/analytics';

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: getAdminAnalytics,
  });
}
