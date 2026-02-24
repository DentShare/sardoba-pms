'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  checkinBooking,
  checkoutBooking,
  type BookingFilters,
  type CreateBookingDto,
  type UpdateBookingDto,
} from '@/lib/api/bookings';
import type { Booking, PaginatedResponse } from '@sardoba/shared';

const BOOKINGS_KEY = 'bookings';

/**
 * Fetch paginated list of bookings with filters.
 */
export function useBookings(
  filters: BookingFilters = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Booking>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: [BOOKINGS_KEY, filters],
    queryFn: () => listBookings(filters),
    ...options,
  });
}

/**
 * Fetch a single booking by ID.
 */
export function useBooking(
  id: number | null,
  options?: Omit<UseQueryOptions<Booking>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [BOOKINGS_KEY, id],
    queryFn: () => getBooking(id!),
    enabled: id !== null,
    ...options,
  });
}

/**
 * Create a new booking.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBookingDto) => createBooking(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Бронирование создано');
    },
    onError: () => {
      toast.error('Ошибка при создании бронирования');
    },
  });
}

/**
 * Update an existing booking.
 */
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateBookingDto }) =>
      updateBooking(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.setQueryData([BOOKINGS_KEY, data.id], data);
      toast.success('Бронирование обновлено');
    },
    onError: () => {
      toast.error('Ошибка при обновлении бронирования');
    },
  });
}

/**
 * Cancel a booking.
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      cancelBooking(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.setQueryData([BOOKINGS_KEY, data.id], data);
      toast.success('Бронирование отменено');
    },
    onError: () => {
      toast.error('Ошибка при отмене бронирования');
    },
  });
}

/**
 * Check in a booking.
 */
export function useCheckinBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => checkinBooking(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.setQueryData([BOOKINGS_KEY, data.id], data);
      toast.success('Гость заселен');
    },
    onError: () => {
      toast.error('Ошибка при заселении');
    },
  });
}

/**
 * Check out a booking.
 */
export function useCheckoutBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => checkoutBooking(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.setQueryData([BOOKINGS_KEY, data.id], data);
      toast.success('Гость выселен');
    },
    onError: () => {
      toast.error('Ошибка при выселении');
    },
  });
}
