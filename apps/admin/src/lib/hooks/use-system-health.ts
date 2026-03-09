import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from '../api/system-health';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin-system-health'],
    queryFn: getSystemHealth,
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}
