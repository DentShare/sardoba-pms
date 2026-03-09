'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchRoomStatuses,
  updateRoomStatus,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchHousekeepingStats,
  autoCreateTasks,
  type CleaningStatus,
  type CreateTaskPayload,
  type UpdateTaskPayload,
  type TaskFilter,
} from '@/lib/api/housekeeping';

const HK_ROOMS_KEY = 'housekeeping-rooms';
const HK_TASKS_KEY = 'housekeeping-tasks';
const HK_STATS_KEY = 'housekeeping-stats';

export function useHKRoomStatuses(propertyId: number | null) {
  return useQuery({
    queryKey: [HK_ROOMS_KEY, propertyId],
    queryFn: () => fetchRoomStatuses(propertyId!),
    enabled: propertyId !== null,
    refetchInterval: 30000,
  });
}

export function useHKStats(propertyId: number | null) {
  return useQuery({
    queryKey: [HK_STATS_KEY, propertyId],
    queryFn: () => fetchHousekeepingStats(propertyId!),
    enabled: propertyId !== null,
    refetchInterval: 30000,
  });
}

export function useHKTasks(propertyId: number | null, filter?: TaskFilter) {
  return useQuery({
    queryKey: [HK_TASKS_KEY, propertyId, filter],
    queryFn: () => fetchTasks(propertyId!, filter),
    enabled: propertyId !== null,
  });
}

export function useUpdateRoomStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      roomId,
      status,
    }: {
      propertyId: number;
      roomId: number;
      status: CleaningStatus;
    }) => updateRoomStatus(propertyId, roomId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK_ROOMS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_STATS_KEY] });
      toast.success('Статус обновлён');
    },
    onError: () => toast.error('Ошибка при обновлении статуса'),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      payload,
    }: {
      propertyId: number;
      payload: CreateTaskPayload;
    }) => createTask(propertyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK_TASKS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_ROOMS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_STATS_KEY] });
      toast.success('Задача создана');
    },
    onError: () => toast.error('Ошибка при создании задачи'),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number;
      payload: UpdateTaskPayload;
    }) => updateTask(taskId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK_TASKS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_ROOMS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_STATS_KEY] });
    },
    onError: () => toast.error('Ошибка при обновлении задачи'),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HK_TASKS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_STATS_KEY] });
      toast.success('Задача удалена');
    },
    onError: () => toast.error('Ошибка при удалении задачи'),
  });
}

export function useAutoCreateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: number) => autoCreateTasks(propertyId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [HK_TASKS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_ROOMS_KEY] });
      qc.invalidateQueries({ queryKey: [HK_STATS_KEY] });
      if (result.createdCount > 0) {
        toast.success(`Создано ${result.createdCount} задач на выезд`);
      } else {
        toast('Нет выездов на сегодня', { icon: 'ℹ️' });
      }
    },
    onError: () => toast.error('Ошибка при создании задач'),
  });
}
