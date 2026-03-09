import { useQuery } from '@tanstack/react-query';
import { listProperties, getProperty, PropertiesFilters } from '../api/properties';

export function useProperties(filters: PropertiesFilters = {}) {
  return useQuery({
    queryKey: ['admin-properties', filters],
    queryFn: () => listProperties(filters),
  });
}

export function useProperty(id: number | null) {
  return useQuery({
    queryKey: ['admin-property', id],
    queryFn: () => getProperty(id!),
    enabled: !!id,
  });
}
