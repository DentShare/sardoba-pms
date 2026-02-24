import { api } from '@/lib/api';
import type { Room, PaginatedResponse } from '@sardoba/shared';

export interface CreateRoomDto {
  property_id: number;
  name: string;
  room_type: string;
  floor?: number;
  capacity_adults: number;
  capacity_children?: number;
  base_price: number;
  status?: string;
  amenities?: string[];
  description_ru?: string;
  description_uz?: string;
}

export interface UpdateRoomDto {
  name?: string;
  room_type?: string;
  floor?: number;
  capacity_adults?: number;
  capacity_children?: number;
  base_price?: number;
  status?: string;
  amenities?: string[];
  description_ru?: string;
  description_uz?: string;
}

/**
 * List all rooms for a property.
 */
export async function listRooms(propertyId: number): Promise<Room[]> {
  const { data } = await api.get<Room[]>('/rooms', {
    params: { property_id: propertyId },
  });
  return data;
}

/**
 * Get a single room by ID.
 */
export async function getRoom(id: number): Promise<Room> {
  const { data } = await api.get<Room>(`/rooms/${id}`);
  return data;
}

/**
 * Create a new room.
 */
export async function createRoom(dto: CreateRoomDto): Promise<Room> {
  const { data } = await api.post<Room>('/rooms', dto);
  return data;
}

/**
 * Update a room.
 */
export async function updateRoom(
  id: number,
  dto: UpdateRoomDto,
): Promise<Room> {
  const { data } = await api.patch<Room>(`/rooms/${id}`, dto);
  return data;
}

/**
 * Upload a photo for a room.
 */
export async function uploadRoomPhoto(
  id: number,
  file: File,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<{ url: string }>(
    `/rooms/${id}/photos`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return data;
}
