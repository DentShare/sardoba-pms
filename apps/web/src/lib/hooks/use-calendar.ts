'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getCalendar } from '@/lib/api/bookings';
import type { CalendarResponse } from '@sardoba/shared';

const CALENDAR_KEY = 'calendar';

/**
 * Fetch calendar data for a property within a date range.
 */
export function useCalendar(
  propertyId: number | null,
  dateFrom: string,
  dateTo: string,
  options?: Omit<UseQueryOptions<CalendarResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [CALENDAR_KEY, propertyId, dateFrom, dateTo],
    queryFn: () => getCalendar(propertyId!, dateFrom, dateTo),
    enabled: propertyId !== null && !!dateFrom && !!dateTo,
    // Calendar data changes often, keep it fresh
    staleTime: 30 * 1000,
    ...options,
  });
}
