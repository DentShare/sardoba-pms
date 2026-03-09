'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import {
  useHKRoomStatuses,
  useHKStats,
  useHKTasks,
  useUpdateRoomStatus,
  useCreateTask,
  useUpdateTask,
  useAutoCreateTasks,
} from '@/lib/hooks/use-housekeeping';
import type {
  HKRoomStatus,
  HKTask,
  CleaningStatus,
  TaskStatus,
  TaskType,
  Priority,
} from '@/lib/api/housekeeping';

// ─── Types ──────────────────────────────────────────────────────────────────

type TabId = 'rooms' | 'tasks';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CleaningStatus, { label: string; bg: string; text: string; dot: string }> = {
  clean:            { label: 'Чисто',         bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  dirty:            { label: 'Грязно',        bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500' },
  cleaning:         { label: 'Уборка',        bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  inspection:       { label: 'Инспекция',     bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  do_not_disturb:   { label: 'Не беспокоить', bg: 'bg-gray-50',     text: 'text-gray-700',    dot: 'bg-gray-500' },
  out_of_order:     { label: 'Не в строю',    bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-500' },
};

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Ожидает',     bg: 'bg-gray-100',    text: 'text-gray-700' },
  assigned:    { label: 'Назначена',   bg: 'bg-blue-100',    text: 'text-blue-700' },
  in_progress: { label: 'В процессе', bg: 'bg-amber-100',   text: 'text-amber-700' },
  completed:   { label: 'Завершена',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
  verified:    { label: 'Проверена',   bg: 'bg-purple-100',  text: 'text-purple-700' },
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  standard: 'Стандартная',
  checkout: 'Выезд',
  deep: 'Генеральная',
};

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string }> = {
  low:    { label: 'Низкий',  bg: 'bg-gray-100',   text: 'text-gray-600' },
  normal: { label: 'Обычный', bg: 'bg-blue-100',   text: 'text-blue-700' },
  high:   { label: 'Высокий', bg: 'bg-orange-100', text: 'text-orange-700' },
  urgent: { label: 'Срочный', bg: 'bg-red-100',    text: 'text-red-700' },
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'rooms', label: 'Номера' },
  { id: 'tasks', label: 'Задачи' },
];

// ─── Icons ──────────────────────────────────────────────────────────────────

function SearchIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function XIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function ClockIcon({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CameraIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function UploadIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PlusIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function RefreshIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function FilterIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HousekeepingPage() {
  const propertyId = usePropertyId();

  // API data
  const { data: roomStatuses, isLoading: roomsLoading, refetch: refetchRooms } = useHKRoomStatuses(propertyId);
  const { data: stats } = useHKStats(propertyId);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const { data: tasksResult, isLoading: tasksLoading } = useHKTasks(propertyId, {
    task_status: taskStatusFilter !== 'all' ? (taskStatusFilter as TaskStatus) : undefined,
    per_page: 50,
  });

  // Mutations
  const updateStatusMutation = useUpdateRoomStatus();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const autoCreateMutation = useAutoCreateTasks();

  const [activeTab, setActiveTab] = useState<TabId>('rooms');

  // Room filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Room side panel
  const [selectedRoom, setSelectedRoom] = useState<HKRoomStatus | null>(null);
  const [inspectionPhotos, setInspectionPhotos] = useState<Record<number, string[]>>({});
  const [uploadingInspection, setUploadingInspection] = useState(false);
  const inspectionPhotoRef = useRef<HTMLInputElement>(null);

  // Task create modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskRoom, setNewTaskRoom] = useState<string>('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('standard');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('normal');

  // ─── Computed ──────────────────────────────────────────────────────────

  const rooms = roomStatuses ?? [];
  const tasks = tasksResult?.data ?? [];

  const computedStats = useMemo(() => ({
    clean: stats?.roomStatuses.clean ?? rooms.filter((r) => r.cleaningStatus === 'clean').length,
    dirty: stats?.roomStatuses.dirty ?? rooms.filter((r) => r.cleaningStatus === 'dirty').length,
    cleaning: stats?.roomStatuses.cleaning ?? rooms.filter((r) => r.cleaningStatus === 'cleaning').length,
    inspection: stats?.roomStatuses.inspection ?? rooms.filter((r) => r.cleaningStatus === 'inspection').length,
  }), [stats, rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter !== 'all' && r.cleaningStatus !== statusFilter) return false;
      if (floorFilter !== 'all' && r.floor !== Number(floorFilter)) return false;
      if (search && !r.roomName.includes(search) && !r.roomType.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rooms, statusFilter, floorFilter, search]);

  const floors = useMemo(() => {
    const set = new Set(rooms.map((r) => r.floor));
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const selectedRoomTasks = useMemo(() => {
    if (!selectedRoom) return [];
    return tasks.filter((t) => t.roomId === selectedRoom.roomId);
  }, [tasks, selectedRoom]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const changeRoomStatus = useCallback((roomId: number, newStatus: CleaningStatus) => {
    if (!propertyId) return;
    updateStatusMutation.mutate(
      { propertyId, roomId, status: newStatus },
      {
        onSuccess: () => {
          setSelectedRoom((prev) => prev && prev.roomId === roomId ? { ...prev, cleaningStatus: newStatus } : prev);
        },
      },
    );
  }, [propertyId, updateStatusMutation]);

  const advanceTask = useCallback((task: HKTask) => {
    const flow: TaskStatus[] = ['pending', 'assigned', 'in_progress', 'completed', 'verified'];
    const idx = flow.indexOf(task.taskStatus);
    if (idx < flow.length - 1) {
      updateTaskMutation.mutate({
        taskId: task.id,
        payload: { task_status: flow[idx + 1] },
      });
    }
  }, [updateTaskMutation]);

  const handleCreateTask = useCallback(() => {
    if (!newTaskRoom || !propertyId) {
      toast.error('Выберите номер');
      return;
    }

    createTaskMutation.mutate(
      {
        propertyId,
        payload: {
          room_id: Number(newTaskRoom),
          task_type: newTaskType,
          priority: newTaskPriority,
        },
      },
      {
        onSuccess: () => {
          setShowTaskModal(false);
          setNewTaskRoom('');
          setNewTaskType('standard');
          setNewTaskPriority('normal');
        },
      },
    );
  }, [newTaskRoom, newTaskType, newTaskPriority, propertyId, createTaskMutation]);

  const handleInspectionPhotoUpload = useCallback(async (roomId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingInspection(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'inspection');
      try {
        const { data } = await api.post(`/rooms/${roomId}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setInspectionPhotos((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] || []), data.url],
        }));
      } catch {
        const localUrl = URL.createObjectURL(file);
        setInspectionPhotos((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] || []), localUrl],
        }));
      }
    }
    setUploadingInspection(false);
    toast.success('Фото инспекции загружено');
    if (inspectionPhotoRef.current) inspectionPhotoRef.current.value = '';
  }, []);

  const getActionLabel = (status: TaskStatus): string | null => {
    switch (status) {
      case 'pending': return 'Назначить';
      case 'assigned': return 'Начать';
      case 'in_progress': return 'Завершить';
      case 'completed': return 'Проверить';
      default: return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sardoba-blue" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
        <p className="text-sm text-gray-500 mt-1">Управление уборкой и задачами</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-sardoba-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: Номера
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'rooms' && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Чисто', value: computedStats.clean, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
              { label: 'Грязно', value: computedStats.dirty, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
              { label: 'Уборка', value: computedStats.cleaning, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
              { label: 'Инспекция', value: computedStats.inspection, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                  <span className="text-sm text-gray-500">{s.label}</span>
                </div>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по номеру..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white"
            >
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white"
            >
              <option value="all">Все этажи</option>
              {floors.map((f) => (
                <option key={f} value={f}>Этаж {f}</option>
              ))}
            </select>
            <button
              onClick={() => refetchRooms()}
              disabled={roomsLoading}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-sardoba-blue text-white hover:bg-sardoba-blue-light disabled:opacity-50',
              )}
            >
              <RefreshIcon size={14} className={roomsLoading ? 'animate-spin' : ''} />
              Обновить
            </button>
            <button
              onClick={() => autoCreateMutation.mutate(propertyId)}
              disabled={autoCreateMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              Авто-задачи (выезд)
            </button>
          </div>

          {/* Loading */}
          {roomsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sardoba-blue" />
            </div>
          )}

          {/* Room status grid */}
          {!roomsLoading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {filteredRooms.map((room) => {
                const cfg = STATUS_CONFIG[room.cleaningStatus] ?? STATUS_CONFIG.clean;
                return (
                  <button
                    key={room.roomId}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all hover:shadow-md cursor-pointer',
                      cfg.bg,
                      'border-gray-200',
                    )}
                  >
                    <div className={cn('text-lg font-bold', cfg.text)}>{room.roomName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{room.roomType}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                      <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
                    </div>
                  </button>
                );
              })}
              {filteredRooms.length === 0 && !roomsLoading && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  Нет номеров для отображения
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: Задачи
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Задачи на уборку</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FilterIcon size={14} className="text-gray-400" />
                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white"
                >
                  <option value="all">Все статусы</option>
                  {Object.entries(TASK_STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors"
              >
                <PlusIcon size={14} />
                Создать задачу
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Номер</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Тип</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Исполнитель</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Статус</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Приоритет</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Время</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasksLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-sardoba-blue" />
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      Нет задач
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const tsCfg = TASK_STATUS_CONFIG[task.taskStatus];
                    const priCfg = PRIORITY_CONFIG[task.priority];
                    const actionLabel = getActionLabel(task.taskStatus);
                    return (
                      <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{task.room?.name ?? `#${task.roomId}`}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {TASK_TYPE_LABELS[task.taskType]}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {task.assignee?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tsCfg.bg, tsCfg.text)}>
                            {tsCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', priCfg.bg, priCfg.text)}>
                            {priCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {task.durationMinutes ? (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                              <ClockIcon />
                              {task.durationMinutes} мин
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {actionLabel && (
                            <button
                              onClick={() => advanceTask(task)}
                              disabled={updateTaskMutation.isPending}
                              className="text-sm font-medium text-sardoba-blue hover:text-sardoba-blue-light transition-colors disabled:opacity-50"
                            >
                              {actionLabel}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Room detail side panel
          ═══════════════════════════════════════════════════════════════ */}
      {selectedRoom && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelectedRoom(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Номер {selectedRoom.roomName}</h3>
                <p className="text-sm text-gray-500">{selectedRoom.roomType} · Этаж {selectedRoom.floor}</p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Current status */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Текущий статус</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => changeRoomStatus(selectedRoom.roomId, key as CleaningStatus)}
                      disabled={updateStatusMutation.isPending}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50',
                        selectedRoom.cleaningStatus === key
                          ? cn(cfg.bg, cfg.text, 'border-current ring-1 ring-current/20')
                          : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task history for this room */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Задачи этого номера</h4>
                {selectedRoomTasks.length === 0 ? (
                  <p className="text-sm text-gray-400">Нет задач для этого номера</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRoomTasks.map((task) => {
                      const tsCfg = TASK_STATUS_CONFIG[task.taskStatus];
                      return (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{TASK_TYPE_LABELS[task.taskType]}</span>
                            {task.durationMinutes && (
                              <span className="text-xs text-gray-500 ml-2">{task.durationMinutes} мин</span>
                            )}
                            {task.assignee && (
                              <span className="text-xs text-gray-400 ml-2">{task.assignee.name}</span>
                            )}
                          </div>
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', tsCfg.bg, tsCfg.text)}>
                            {tsCfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inspection photos */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CameraIcon size={14} />
                  Фото инспекции
                </h4>
                {(inspectionPhotos[selectedRoom.roomId] || []).length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {(inspectionPhotos[selectedRoom.roomId] || []).map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setInspectionPhotos((prev) => ({
                            ...prev,
                            [selectedRoom.roomId]: (prev[selectedRoom.roomId] || []).filter((_, i) => i !== idx),
                          }))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => inspectionPhotoRef.current?.click()}
                  disabled={uploadingInspection}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-sardoba-blue hover:text-sardoba-blue transition-colors disabled:opacity-50"
                >
                  <UploadIcon size={14} />
                  {uploadingInspection ? 'Загрузка...' : 'Загрузить фото'}
                </button>
                <input
                  ref={inspectionPhotoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (selectedRoom) handleInspectionPhotoUpload(selectedRoom.roomId, e.target.files);
                  }}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Прикрепите фото состояния номера после уборки / инспекции
                </p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Create Task Modal
          ═══════════════════════════════════════════════════════════════ */}
      {showTaskModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowTaskModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Создать задачу</h3>
                <button onClick={() => setShowTaskModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <XIcon size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Номер</label>
                  <select
                    value={newTaskRoom}
                    onChange={(e) => setNewTaskRoom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white"
                  >
                    <option value="">Выберите номер...</option>
                    {rooms.map((r) => (
                      <option key={r.roomId} value={r.roomId}>{r.roomName} — {r.roomType}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Тип уборки</label>
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white"
                    >
                      {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white"
                    >
                      {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
