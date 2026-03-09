import { useQuery } from '@tanstack/react-query';
import { listAdminBookings, AdminBookingsFilters } from '../api/bookings';

export function useAdminBookings(filters: AdminBookingsFilters = {}) {
  return useQuery({
    queryKey: ['admin-bookings', filters],
    queryFn: () => listAdminBookings(filters),
  });
}
