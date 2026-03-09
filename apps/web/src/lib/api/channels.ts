import { api } from '@/lib/api';
import type { Channel, ChannelType, RoomMapping, SyncLog, PaginatedResponse } from '@sardoba/shared';

export interface UpdateMappingDto {
  room_id: number;
  channel_id: number;
  external_id: string;
}

export interface CreateChannelDto {
  type: ChannelType;
  is_active?: boolean;
  credentials: Record<string, string>;
}

export interface UpdateChannelDto {
  is_active?: boolean;
  credentials?: Record<string, string>;
}

/**
 * List all channels for a property.
 */
export async function listChannels(propertyId: number): Promise<Channel[]> {
  const { data } = await api.get(
    `/properties/${propertyId}/channels`,
  );
  return data?.data ?? (Array.isArray(data) ? data : []);
}

/**
 * Create a new channel for a property.
 */
export async function createChannel(
  propertyId: number,
  dto: CreateChannelDto,
): Promise<Channel> {
  const { data } = await api.post<Channel>(
    `/properties/${propertyId}/channels`,
    dto,
  );
  return data;
}

/**
 * Update channel settings (credentials, active status).
 */
export async function updateChannel(
  channelId: number,
  dto: UpdateChannelDto,
): Promise<Channel> {
  const { data } = await api.put<Channel>(
    `/channels/${channelId}`,
    dto,
  );
  return data;
}

/**
 * Deactivate (soft-delete) a channel.
 */
export async function deactivateChannel(channelId: number): Promise<void> {
  await api.delete(`/channels/${channelId}`);
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
  const { data } = await api.get(
    `/channels/${channelId}/mappings`,
  );
  return data?.data ?? (Array.isArray(data) ? data : []);
}

/**
 * Update a single room mapping for a channel.
 */
export async function updateMapping(dto: UpdateMappingDto): Promise<RoomMapping[]> {
  const { data } = await api.put<RoomMapping[]>(
    `/channels/${dto.channel_id}/mappings`,
    { mappings: [dto] },
  );
  return data;
}

/**
 * Update room mappings for a channel.
 */
export async function updateMappings(
  channelId: number,
  mappings: UpdateMappingDto[],
): Promise<RoomMapping[]> {
  const { data } = await api.put<RoomMapping[]>(
    `/channels/${channelId}/mappings`,
    { mappings },
  );
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
