import { api } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HKRoomStatus {
  roomId: number;
  roomName: string;
  roomType: string;
  floor: number;
  cleaningStatus: CleaningStatus;
  lastCleanedAt: string | null;
  lastCleanedBy: number | null;
  updatedAt: string | null;
}

export interface HKTask {
  id: number;
  propertyId: number;
  roomId: number;
  assignedTo: number | null;
  taskType: TaskType;
  cleaningStatus: CleaningStatus;
  taskStatus: TaskStatus;
  priority: Priority;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: number;
    name: string;
    roomType: string;
    floor: number;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface HKStats {
  totalRooms: number;
  roomStatuses: Record<CleaningStatus, number>;
  taskStatuses: Record<TaskStatus, number>;
}

export type CleaningStatus = 'clean' | 'dirty' | 'cleaning' | 'inspection' | 'do_not_disturb' | 'out_of_order';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'verified';
export type TaskType = 'standard' | 'checkout' | 'deep';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateTaskPayload {
  room_id: number;
  task_type: TaskType;
  assigned_to?: number;
  priority?: Priority;
  notes?: string;
}

export interface UpdateTaskPayload {
  task_status?: TaskStatus;
  assigned_to?: number;
  priority?: Priority;
  notes?: string;
}

export interface TaskFilter {
  task_status?: TaskStatus;
  task_type?: TaskType;
  assigned_to?: number;
  room_id?: number;
  page?: number;
  per_page?: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function fetchRoomStatuses(propertyId: number): Promise<HKRoomStatus[]> {
  const { data } = await api.get(`/properties/${propertyId}/housekeeping/rooms`);
  return (data as { data: HKRoomStatus[] }).data ?? [];
}

export async function updateRoomStatus(
  propertyId: number,
  roomId: number,
  cleaningStatus: CleaningStatus,
): Promise<HKRoomStatus> {
  const { data } = await api.put(
    `/properties/${propertyId}/housekeeping/rooms/${roomId}/status`,
    { cleaning_status: cleaningStatus },
  );
  return data as HKRoomStatus;
}

export async function fetchTasks(
  propertyId: number,
  filter?: TaskFilter,
): Promise<{ data: HKTask[]; meta: { total: number; page: number; perPage: number; lastPage: number } }> {
  const params = new URLSearchParams();
  if (filter?.task_status) params.set('task_status', filter.task_status);
  if (filter?.task_type) params.set('task_type', filter.task_type);
  if (filter?.assigned_to) params.set('assigned_to', String(filter.assigned_to));
  if (filter?.room_id) params.set('room_id', String(filter.room_id));
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.per_page) params.set('per_page', String(filter.per_page));

  const { data } = await api.get(
    `/properties/${propertyId}/housekeeping/tasks?${params.toString()}`,
  );
  return data as { data: HKTask[]; meta: { total: number; page: number; perPage: number; lastPage: number } };
}

export async function createTask(
  propertyId: number,
  payload: CreateTaskPayload,
): Promise<HKTask> {
  const { data } = await api.post(
    `/properties/${propertyId}/housekeeping/tasks`,
    payload,
  );
  return data as HKTask;
}

export async function updateTask(
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<HKTask> {
  const { data } = await api.put(`/housekeeping/tasks/${taskId}`, payload);
  return data as HKTask;
}

export async function deleteTask(taskId: number): Promise<void> {
  await api.delete(`/housekeeping/tasks/${taskId}`);
}

export async function fetchHousekeepingStats(propertyId: number): Promise<HKStats> {
  const { data } = await api.get(`/properties/${propertyId}/housekeeping/stats`);
  return data as HKStats;
}

export async function autoCreateTasks(
  propertyId: number,
): Promise<{ createdCount: number; data: HKTask[] }> {
  const { data } = await api.post(
    `/properties/${propertyId}/housekeeping/auto-tasks`,
  );
  return data as { createdCount: number; data: HKTask[] };
}
