import { api } from '@/lib/api';

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface PropertyUser {
  id: number;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  status: 'active' | 'invited' | 'disabled';
  created_at: string;
}

export interface InviteUserDto {
  email: string;
  role: 'admin' | 'viewer';
}

export interface UpdateUserRoleDto {
  role: 'admin' | 'viewer';
}

/* ── API calls ───────────────────────────────────────────────────────────── */

/**
 * List all users for the current property.
 */
export async function listUsers(): Promise<PropertyUser[]> {
  const { data } = await api.get<PropertyUser[]>('/users');
  return Array.isArray(data) ? data : (data as any).data || [];
}

/**
 * Invite a new user by email and role.
 */
export async function inviteUser(dto: InviteUserDto): Promise<PropertyUser> {
  const { data } = await api.post<PropertyUser>('/users/invite', dto);
  return data;
}

/**
 * Change a user's role.
 */
export async function updateUserRole(
  id: number,
  dto: UpdateUserRoleDto,
): Promise<PropertyUser> {
  const { data } = await api.patch<PropertyUser>(`/users/${id}/role`, dto);
  return data;
}

/**
 * Remove a user from the property.
 */
export async function removeUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
