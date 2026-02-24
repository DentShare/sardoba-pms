import { api } from '@/lib/api';
import type { Channel, RoomMapping, SyncLog, PaginatedResponse } from '@sardoba/shared';

export interface UpdateMappingDto {
  room_id: number;
  channel_id: number;
  external_id: string;
}

/**
 * List all channels for a property.
 */
export async function listChannels(propertyId: number): Promise<Channel[]> {
  const { data } = await api.get<Channel[]>('/channels', {
    params: { property_id: propertyId },
  });
  return data;
}

/**
 * Trigger a manual sync for a channel.
 */
export async function syncChannel(
  channelId: number,
): Promise<{ status: string; message: string }> {
  const { data } = await api.post<{ status: string; message: string }>(
    `/channels/${channelId}/sync`,
  );
  return data;
}

/**
 * Get room mappings for a channel.
 */
export async function getMappings(channelId: number): Promise<RoomMapping[]> {
  const { data } = await api.get<RoomMapping[]>(
    `/channels/${channelId}/mappings`,
  );
  return data;
}

/**
 * Create or update a room mapping.
 */
export async function updateMapping(
  dto: UpdateMappingDto,
): Promise<RoomMapping> {
  const { data } = await api.put<RoomMapping>('/channels/mappings', dto);
  return data;
}

/**
 * Get sync logs for a channel.
 */
export async function getLogs(
  channelId: number,
  page: number = 1,
  perPage: number = 20,
): Promise<PaginatedResponse<SyncLog>> {
  const { data } = await api.get<PaginatedResponse<SyncLog>>(
    `/channels/${channelId}/logs`,
    {
      params: { page, per_page: perPage },
    },
  );
  return data;
}
