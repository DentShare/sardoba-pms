import { useQuery } from '@tanstack/react-query';
import { listLogs, LogsFilters } from '../api/logs';

export function useLogs(filters: LogsFilters = {}) {
  return useQuery({
    queryKey: ['admin-logs', filters],
    queryFn: () => listLogs(filters),
  });
}
