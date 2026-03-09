'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getFlexibilityOptions,
  setEarlyCheckin,
  removeEarlyCheckin,
  setLateCheckout,
  removeLateCheckout,
} from '@/lib/api/bookings';

const FLEX_KEY = 'flexibility';
const BOOKINGS_KEY = 'bookings';

export function useFlexibilityOptions(bookingId: number | null) {
  return useQuery({
    queryKey: [FLEX_KEY, bookingId],
    queryFn: () => getFlexibilityOptions(bookingId!),
    enabled: bookingId !== null,
  });
}

export function useSetEarlyCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      time,
      price,
    }: {
      bookingId: number;
      time: string;
      price: number;
    }) => setEarlyCheckin(bookingId, time, price),
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: [FLEX_KEY, bookingId] });
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY, bookingId] });
      toast.success('Ранний заезд установлен');
    },
    onError: () => toast.error('Ошибка при установке раннего заезда'),
  });
}

export function useRemoveEarlyCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => removeEarlyCheckin(bookingId),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: [FLEX_KEY, bookingId] });
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY, bookingId] });
      toast.success('Ранний заезд отменён');
    },
    onError: () => toast.error('Ошибка'),
  });
}

export function useSetLateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      time,
      price,
    }: {
      bookingId: number;
      time: string;
      price: number;
    }) => setLateCheckout(bookingId, time, price),
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: [FLEX_KEY, bookingId] });
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY, bookingId] });
      toast.success('Поздний выезд установлен');
    },
    onError: () => toast.error('Ошибка при установке позднего выезда'),
  });
}

export function useRemoveLateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => removeLateCheckout(bookingId),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: [FLEX_KEY, bookingId] });
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY, bookingId] });
      toast.success('Поздний выезд отменён');
    },
    onError: () => toast.error('Ошибка'),
  });
}
