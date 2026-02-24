'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  listGuests,
  getGuest,
  createGuest,
  updateGuest,
  searchGuests,
  type GuestFilters,
  type CreateGuestDto,
  type UpdateGuestDto,
} from '@/lib/api/guests';
import type { Guest, PaginatedResponse } from '@sardoba/shared';

const GUESTS_KEY = 'guests';

/**
 * Fetch paginated list of guests with filters.
 */
export function useGuests(
  filters: GuestFilters = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Guest>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: [GUESTS_KEY, filters],
    queryFn: () => listGuests(filters),
    ...options,
  });
}

/**
 * Fetch a single guest by ID.
 */
export function useGuest(
  id: number | null,
  options?: Omit<UseQueryOptions<Guest>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [GUESTS_KEY, id],
    queryFn: () => getGuest(id!),
    enabled: id !== null,
    ...options,
  });
}

/**
 * Create a new guest.
 */
export function useCreateGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateGuestDto) => createGuest(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GUESTS_KEY] });
      toast.success('Гость добавлен');
    },
    onError: () => {
      toast.error('Ошибка при добавлении гостя');
    },
  });
}

/**
 * Update an existing guest.
 */
export function useUpdateGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateGuestDto }) =>
      updateGuest(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [GUESTS_KEY] });
      queryClient.setQueryData([GUESTS_KEY, data.id], data);
      toast.success('Данные гостя обновлены');
    },
    onError: () => {
      toast.error('Ошибка при обновлении данных гостя');
    },
  });
}

/**
 * Search guests by query string (debounced in the component).
 */
export function useSearchGuests(
  query: string,
  propertyId?: number,
  options?: Omit<UseQueryOptions<Guest[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [GUESTS_KEY, 'search', query, propertyId],
    queryFn: () => searchGuests(query, propertyId),
    enabled: query.length >= 2,
    ...options,
  });
}
