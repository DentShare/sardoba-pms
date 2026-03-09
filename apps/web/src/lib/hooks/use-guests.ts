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
  addGuestTags,
  removeGuestTags,
  blacklistGuest,
  unblacklistGuest,
  getGuestTips,
  passportOcr,
  type GuestFilters,
  type CreateGuestDto,
  type UpdateGuestDto,
  type GuestTip,
  type PassportOcrResult,
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
  propertyId: number,
  options?: Omit<UseQueryOptions<Guest[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [GUESTS_KEY, 'search', query, propertyId],
    queryFn: () => searchGuests(query, propertyId),
    enabled: query.length >= 2,
    ...options,
  });
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export function useAddGuestTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guestId, tags }: { guestId: number; tags: string[] }) =>
      addGuestTags(guestId, tags),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [GUESTS_KEY] });
      queryClient.setQueryData([GUESTS_KEY, data.id], data);
      toast.success('Теги добавлены');
    },
    onError: () => toast.error('Ошибка при добавлении тегов'),
  });
}

export function useRemoveGuestTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guestId, tags }: { guestId: number; tags: string[] }) =>
      removeGuestTags(guestId, tags),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [GUESTS_KEY] });
      queryClient.setQueryData([GUESTS_KEY, data.id], data);
      toast.success('Тег удалён');
    },
    onError: () => toast.error('Ошибка при удалении тега'),
  });
}

// ── Blacklist ─────────────────────────────────────────────────────────────────

export function useBlacklistGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guestId, reason }: { guestId: number; reason: string }) =>
      blacklistGuest(guestId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [GUESTS_KEY] });
      queryClient.setQueryData([GUESTS_KEY, data.id], data);
      toast.success('Гость добавлен в чёрный список');
    },
    onError: () => toast.error('Ошибка'),
  });
}

export function useUnblacklistGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guestId: number) => unblacklistGuest(guestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [GUESTS_KEY] });
      queryClient.setQueryData([GUESTS_KEY, data.id], data);
      toast.success('Гость удалён из чёрного списка');
    },
    onError: () => toast.error('Ошибка'),
  });
}

// ── AI Tips ───────────────────────────────────────────────────────────────────

export function useGuestTips(guestId: number | null) {
  return useQuery({
    queryKey: [GUESTS_KEY, guestId, 'tips'],
    queryFn: () => getGuestTips(guestId!),
    enabled: guestId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Passport OCR ──────────────────────────────────────────────────────────────

export function usePassportOcr() {
  return useMutation({
    mutationFn: (file: File) => passportOcr(file),
    onSuccess: () => toast.success('Паспорт распознан'),
    onError: () => toast.error('Ошибка распознавания паспорта'),
  });
}
