'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  type CreateRoomDto,
  type UpdateRoomDto,
} from '@/lib/api/rooms';
import type { Room } from '@sardoba/shared';

const ROOMS_KEY = 'rooms';

/**
 * Fetch all rooms for a property.
 */
export function useRooms(
  propertyId: number | null,
  options?: Omit<UseQueryOptions<Room[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [ROOMS_KEY, propertyId],
    queryFn: () => listRooms(propertyId!),
    enabled: propertyId !== null,
    ...options,
  });
}

/**
 * Fetch a single room by ID.
 */
export function useRoom(
  id: number | null,
  options?: Omit<UseQueryOptions<Room>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: [ROOMS_KEY, 'detail', id],
    queryFn: () => getRoom(id!),
    enabled: id !== null,
    ...options,
  });
}

/**
 * Create a new room.
 */
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRoomDto) => createRoom(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROOMS_KEY] });
      toast.success('Номер создан');
    },
    onError: () => {
      toast.error('Ошибка при создании номера');
    },
  });
}

/**
 * Update an existing room.
 */
export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateRoomDto }) =>
      updateRoom(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ROOMS_KEY] });
      queryClient.setQueryData([ROOMS_KEY, 'detail', data.id], data);
      toast.success('Номер обновлен');
    },
    onError: () => {
      toast.error('Ошибка при обновлении номера');
    },
  });
}
