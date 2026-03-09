'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Bed,
  SprayCan,
  CheckCircle,
  AlertTriangle,
  X,
  Clock,
  User,
  Search,
  Eye,
  Play,
  UserCheck,
  ShieldCheck,
  BedDouble,
  Ban,
  Sparkles,
  ClipboardList,
  History,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Phone,
  CalendarDays,
  LogIn,
  LogOut,
  ChevronDown,
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  Send,
  ToggleLeft,
  ToggleRight,
  Zap,
  Info,
} from 'lucide-react';
import {
  hotels,
  generateHotelRooms,
  generateHotelStaff,
  ROOM_TYPE_NAMES,
  type Hotel,
  type HotelRoom,
  type HotelStaffMember,
  type HotelRoomType,
  type HotelRoomCleaningStatus,
} from '@/lib/mock-data';

// ── Types ──────────────────────────────────────────────────────────────

type TabId = 'rooms' | 'tasks' | 'staff' | 'notifications';
type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'verified';
type TaskType = 'standard' | 'checkout' | 'deep';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface CleaningTask {
  id: number;
  roomId: number;
  roomNumber: string;
  taskType: TaskType;
  assignedTo: number | null;
  status: TaskStatus;
  priority: Priority;
  duration: number | null;
  createdAt: string;
  notes: string;
}

// ── Labels & Mappings ──────────────────────────────────────────────────

const CLEANING_STATUS_LABELS: Record<HotelRoomCleaningStatus, string> = {
  clean: 'Чисто',
  dirty: 'Грязно',
  cleaning: 'Уборка',
  inspection: 'Проверка',
  do_not_disturb: 'Не беспокоить',
  out_of_order: 'Не в работе',
};

const CLEANING_STATUS_COLORS: Record<HotelRoomCleaningStatus, string> = {
  clean: 'border-emerald-300 bg-emerald-50',
  dirty: 'border-red-300 bg-red-50',
  cleaning: 'border-amber-300 bg-amber-50',
  inspection: 'border-blue-300 bg-blue-50',
  do_not_disturb: 'border-gray-300 bg-gray-100',
  out_of_order: 'border-gray-400 bg-gray-200',
};

const CLEANING_STATUS_DOT: Record<HotelRoomCleaningStatus, string> = {
  clean: 'bg-emerald-500',
  dirty: 'bg-red-500',
  cleaning: 'bg-amber-500',
  inspection: 'bg-blue-500',
  do_not_disturb: 'bg-gray-400',
  out_of_order: 'bg-gray-600',
};

const CLEANING_STATUS_BADGE: Record<HotelRoomCleaningStatus, string> = {
  clean: 'badge badge-green',
  dirty: 'badge badge-red',
  cleaning: 'badge badge-yellow',
  inspection: 'badge badge-blue',
  do_not_disturb: 'badge badge-gray',
  out_of_order: 'badge badge-gray',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Ожидает',
  assigned: 'Назначена',
  in_progress: 'В процессе',
  completed: 'Завершена',
  verified: 'Проверена',
};

const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  pending: 'badge badge-gray',
  assigned: 'badge badge-blue',
  in_progress: 'badge badge-yellow',
  completed: 'badge badge-green',
  verified: 'badge badge-purple',
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  standard: 'Стандарт',
  checkout: 'Checkout',
  deep: 'Генеральная',
};

const TASK_TYPE_BADGE: Record<TaskType, string> = {
  standard: 'badge badge-gray',
  checkout: 'badge badge-yellow',
  deep: 'badge badge-red',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

const PRIORITY_BADGE: Record<Priority, string> = {
  low: 'badge badge-gray',
  medium: 'badge badge-blue',
  high: 'badge badge-yellow',
  urgent: 'badge badge-red',
};

const ROLE_LABELS: Record<HotelStaffMember['role'], string> = {
  maid: 'Горничная',
  supervisor: 'Супервайзер',
  maintenance: 'Техник',
};

const ROLE_BADGE: Record<HotelStaffMember['role'], string> = {
  maid: 'badge badge-blue',
  supervisor: 'badge badge-purple',
  maintenance: 'badge badge-gray',
};

const SHIFT_LABELS: Record<HotelStaffMember['shift'], string> = {
  morning: 'Утренняя',
  evening: 'Вечерняя',
  night: 'Ночная',
};

const SHIFT_BADGE: Record<HotelStaffMember['shift'], string> = {
  morning: 'badge badge-yellow',
  evening: 'badge badge-blue',
  night: 'badge badge-gray',
};

const OCCUPANCY_LABELS = {
  occupied: 'Проживает',
  vacant: 'Свободен',
  checkout_today: 'Выезд сегодня',
  checkin_today: 'Заезд сегодня',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────

const activeHotels = hotels.filter((h) => h.status === 'active' || h.status === 'trial');

function generateTasksFromRooms(rooms: HotelRoom[], staff: HotelStaffMember[]): CleaningTask[] {
  const maids = staff.filter((s) => s.role === 'maid');
  const tasks: CleaningTask[] = [];
  let taskId = 1;

  for (const room of rooms) {
    if (room.cleaningStatus === 'clean' && taskId % 5 !== 0) continue;
    if (room.cleaningStatus === 'do_not_disturb') continue;

    const taskType: TaskType =
      room.occupancy === 'checkout_today' ? 'checkout'
        : room.cleaningStatus === 'out_of_order' ? 'deep'
          : 'standard';

    let status: TaskStatus;
    if (room.cleaningStatus === 'cleaning') status = 'in_progress';
    else if (room.cleaningStatus === 'inspection') status = 'completed';
    else if (room.cleaningStatus === 'clean' && taskId % 5 === 0) status = 'verified';
    else if (room.cleaningStatus === 'dirty' && maids.length > 0 && taskId % 2 === 0) status = 'assigned';
    else status = 'pending';

    const priority: Priority =
      room.cleaningStatus === 'out_of_order' ? 'urgent'
        : room.occupancy === 'checkin_today' ? 'high'
          : room.occupancy === 'checkout_today' ? 'medium'
            : 'low';

    const assignedMaid = (status !== 'pending' && maids.length > 0)
      ? maids[taskId % maids.length].id
      : null;

    const duration = (status === 'completed' || status === 'verified' || status === 'in_progress')
      ? 15 + (taskId % 4) * 10 : null;

    const hour = 8 + (taskId % 6);
    const minute = (taskId * 7) % 60;

    tasks.push({
      id: taskId,
      roomId: room.id,
      roomNumber: room.number,
      taskType,
      assignedTo: assignedMaid,
      status,
      priority,
      duration,
      createdAt: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      notes: '',
    });
    taskId++;
    if (tasks.length >= 30) break;
  }
  return tasks;
}

// ── Component ──────────────────────────────────────────────────────────

export default function HousekeepingPage() {
  const defaultHotel = activeHotels[0] || hotels[0];

  const [selectedHotelId, setSelectedHotelId] = useState<number>(defaultHotel.id);
  const [activeTab, setActiveTab] = useState<TabId>('rooms');

  const selectedHotel = useMemo(
    () => hotels.find((h) => h.id === selectedHotelId) || defaultHotel,
    [selectedHotelId, defaultHotel],
  );

  const [rooms, setRooms] = useState<HotelRoom[]>(() => generateHotelRooms(defaultHotel));
  const [staff, setStaff] = useState<HotelStaffMember[]>(() => generateHotelStaff(defaultHotel));
  const [tasks, setTasks] = useState<CleaningTask[]>(() =>
    generateTasksFromRooms(generateHotelRooms(defaultHotel), generateHotelStaff(defaultHotel)),
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Panels & modals
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<HotelStaffMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    telegram: { enabled: true, chatLinked: true, chatId: '@sardoba_hotel_bot' },
    sms: { enabled: false, provider: 'eskiz' },
    events: {
      taskCreated: true,
      taskAssigned: true,
      taskCompleted: true,
      roomStatusChanged: false,
      dailyReport: true,
      dailyReportTime: '08:00',
      urgentOnly: false,
    },
    recipients: [
      { id: 1, name: 'Старший администратор', channel: 'telegram' as const, target: 'Chat ID: 123456', events: ['all'], active: true },
      { id: 2, name: 'Супервайзер этажа', channel: 'telegram' as const, target: 'Chat ID: 789012', events: ['taskCreated', 'taskCompleted'], active: true },
      { id: 3, name: 'Горничная (общий чат)', channel: 'telegram' as const, target: 'Group: -100123456', events: ['taskAssigned'], active: true },
    ],
  });

  const toggleNotifEvent = (key: keyof typeof notifSettings.events) => {
    setNotifSettings(prev => ({
      ...prev,
      events: { ...prev.events, [key]: !prev.events[key] },
    }));
  };

  const toggleRecipientActive = (id: number) => {
    setNotifSettings(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => r.id === id ? { ...r, active: !r.active } : r),
    }));
  };

  // Task form
  const [taskForm, setTaskForm] = useState({
    roomId: 0,
    taskType: 'standard' as TaskType,
    assignedTo: 0,
    priority: 'medium' as Priority,
    notes: '',
  });

  // Staff form
  const [staffForm, setStaffForm] = useState({
    name: '',
    phone: '+998',
    role: 'maid' as HotelStaffMember['role'],
    shift: 'morning' as HotelStaffMember['shift'],
    assignedFloor: '',
  });

  // ── Hotel switch ────────────────────────────────────────────────────

  const handleHotelChange = useCallback((hotelId: number) => {
    const hotel = hotels.find((h) => h.id === hotelId);
    if (!hotel) return;
    setSelectedHotelId(hotelId);
    const newRooms = generateHotelRooms(hotel);
    const newStaff = generateHotelStaff(hotel);
    setRooms(newRooms);
    setStaff(newStaff);
    setTasks(generateTasksFromRooms(newRooms, newStaff));
    setSelectedRoom(null);
    setStatusFilter('all');
    setFloorFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  }, []);

  // ── Derived data ────────────────────────────────────────────────────

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b),
    [rooms],
  );

  const roomTypes = useMemo(
    () => [...new Set(rooms.map((r) => r.type))] as HotelRoomType[],
    [rooms],
  );

  const stats = useMemo(() => ({
    total: rooms.length,
    clean: rooms.filter((r) => r.cleaningStatus === 'clean').length,
    dirty: rooms.filter((r) => r.cleaningStatus === 'dirty').length,
    cleaning: rooms.filter((r) => r.cleaningStatus === 'cleaning').length,
  }), [rooms]);

  const staffStats = useMemo(() => ({
    total: staff.length,
    onShift: staff.filter((s) => s.isActive).length,
    tasksCompleted: staff.reduce((a, s) => a + s.tasksCompleted, 0),
  }), [staff]);

  const activeMaids = useMemo(
    () => staff.filter((s) => s.role === 'maid' && s.isActive),
    [staff],
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter !== 'all' && r.cleaningStatus !== statusFilter) return false;
      if (floorFilter !== 'all' && r.floor !== Number(floorFilter)) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.number.includes(q)
          || r.guestName?.toLowerCase().includes(q)
          || ROOM_TYPE_NAMES[r.type].toLowerCase().includes(q);
      }
      return true;
    });
  }, [rooms, statusFilter, floorFilter, typeFilter, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter((t) => {
      const maid = staff.find((s) => s.id === t.assignedTo);
      return t.roomNumber.includes(q) || maid?.name.toLowerCase().includes(q);
    });
  }, [tasks, searchQuery, staff]);

  // ── Handlers ────────────────────────────────────────────────────────

  const getStaffName = useCallback(
    (id: number | null) => {
      if (!id) return null;
      return staff.find((s) => s.id === id)?.name ?? null;
    },
    [staff],
  );

  const handleStatusChange = useCallback((roomId: number, newStatus: HotelRoomCleaningStatus) => {
    setRooms((prev) => prev.map((r) =>
      r.id === roomId ? { ...r, cleaningStatus: newStatus } : r,
    ));
    setSelectedRoom((prev) => prev?.id === roomId ? { ...prev, cleaningStatus: newStatus } : prev);
  }, []);

  const handleAssignMaid = useCallback((roomId: number, maidId: number | null) => {
    setTasks((prev) => prev.map((t) =>
      t.roomId === roomId ? { ...t, assignedTo: maidId, status: maidId ? 'assigned' : 'pending' } : t,
    ));
  }, []);

  const handleTaskAction = useCallback((taskId: number, action: 'assign' | 'start' | 'complete' | 'verify') => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      switch (action) {
        case 'assign': {
          const maid = activeMaids[t.id % activeMaids.length];
          return { ...t, status: 'assigned', assignedTo: maid?.id ?? null };
        }
        case 'start':
          handleStatusChange(t.roomId, 'cleaning');
          return { ...t, status: 'in_progress' };
        case 'complete':
          handleStatusChange(t.roomId, 'inspection');
          return { ...t, status: 'completed', duration: 25 + (t.id % 3) * 10 };
        case 'verify':
          handleStatusChange(t.roomId, 'clean');
          return { ...t, status: 'verified' };
        default:
          return t;
      }
    }));
  }, [activeMaids, handleStatusChange]);

  const handleTaskAssign = useCallback((taskId: number, maidId: number) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, assignedTo: maidId, status: t.status === 'pending' ? 'assigned' : t.status } : t,
    ));
  }, []);

  const handleCreateTask = useCallback(() => {
    const room = rooms.find((r) => r.id === taskForm.roomId);
    if (!room) return;
    const newId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const now = new Date();
    setTasks((prev) => [...prev, {
      id: newId,
      roomId: room.id,
      roomNumber: room.number,
      taskType: taskForm.taskType,
      assignedTo: taskForm.assignedTo || null,
      status: taskForm.assignedTo ? 'assigned' : 'pending',
      priority: taskForm.priority,
      duration: null,
      createdAt: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      notes: taskForm.notes,
    }]);
    setShowTaskModal(false);
    setTaskForm({ roomId: 0, taskType: 'standard', assignedTo: 0, priority: 'medium', notes: '' });
  }, [rooms, tasks, taskForm]);

  const openStaffCreate = useCallback(() => {
    setEditingStaff(null);
    setStaffForm({ name: '', phone: '+998', role: 'maid', shift: 'morning', assignedFloor: '' });
    setShowStaffModal(true);
  }, []);

  const openStaffEdit = useCallback((member: HotelStaffMember) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      phone: member.phone,
      role: member.role,
      shift: member.shift,
      assignedFloor: member.assignedFloor?.toString() ?? '',
    });
    setShowStaffModal(true);
  }, []);

  const handleSaveStaff = useCallback(() => {
    if (!staffForm.name.trim() || !staffForm.phone.trim()) return;
    if (editingStaff) {
      setStaff((prev) => prev.map((s) =>
        s.id === editingStaff.id
          ? {
            ...s,
            name: staffForm.name,
            phone: staffForm.phone,
            role: staffForm.role,
            shift: staffForm.shift,
            assignedFloor: staffForm.assignedFloor ? Number(staffForm.assignedFloor) : null,
          }
          : s,
      ));
    } else {
      const newId = Math.max(0, ...staff.map((s) => s.id)) + 1;
      setStaff((prev) => [...prev, {
        id: newId,
        hotelId: selectedHotelId,
        name: staffForm.name,
        phone: staffForm.phone,
        role: staffForm.role,
        shift: staffForm.shift,
        isActive: true,
        assignedFloor: staffForm.assignedFloor ? Number(staffForm.assignedFloor) : null,
        tasksToday: 0,
        tasksCompleted: 0,
      }]);
    }
    setShowStaffModal(false);
    setEditingStaff(null);
  }, [editingStaff, staff, staffForm, selectedHotelId]);

  const handleDeleteStaff = useCallback((id: number) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setTasks((prev) => prev.map((t) => t.assignedTo === id ? { ...t, assignedTo: null, status: 'pending' } : t));
    setDeleteConfirm(null);
  }, []);

  const handleToggleStaffActive = useCallback((id: number) => {
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
  }, []);

  // ── Tabs config ─────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'rooms', label: 'Номера', icon: <BedDouble className="w-4 h-4" /> },
    { id: 'tasks', label: 'Задачи', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'staff', label: 'Персонал', icon: <Users className="w-4 h-4" /> },
    { id: 'notifications', label: 'Уведомления', icon: <Bell className="w-4 h-4" /> },
  ];

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хаускипинг</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotel.name} — управление уборкой и персоналом
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedHotelId}
              onChange={(e) => handleHotelChange(Number(e.target.value))}
              className="input-field pl-10 pr-10 w-auto min-w-[240px] appearance-none"
            >
              {activeHotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.rooms} ном.)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ TAB: ROOMS ═══════════════════ */}
      {activeTab === 'rooms' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Всего номеров</p>
                <BedDouble className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Чистые</p>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.clean}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Грязные</p>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.dirty}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">На уборке</p>
                <SprayCan className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.cleaning}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по номеру, гостю, типу..."
                className="input-field pl-10"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
              <option value="all">Все статусы</option>
              {(Object.keys(CLEANING_STATUS_LABELS) as HotelRoomCleaningStatus[]).map((s) => (
                <option key={s} value={s}>{CLEANING_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className="input-field w-auto">
              <option value="all">Все этажи</option>
              {floors.map((f) => (
                <option key={f} value={f}>{f} этаж</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field w-auto">
              <option value="all">Все типы</option>
              {roomTypes.map((t) => (
                <option key={t} value={t}>{ROOM_TYPE_NAMES[t]}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            {(Object.keys(CLEANING_STATUS_LABELS) as HotelRoomCleaningStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${CLEANING_STATUS_DOT[s]}`} />
                <span>{CLEANING_STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>

          {/* Room Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredRooms.map((room) => {
              const maidForRoom = tasks.find((t) => t.roomId === room.id)?.assignedTo;
              const maidName = getStaffName(maidForRoom ?? null);
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md hover:scale-[1.02] ${CLEANING_STATUS_COLORS[room.cleaningStatus]}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg font-bold text-gray-900">{room.number}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${CLEANING_STATUS_DOT[room.cleaningStatus]}`} />
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{ROOM_TYPE_NAMES[room.type]}</div>

                  {room.guestName ? (
                    <div className="flex items-center gap-1 text-xs text-gray-700 mb-1 truncate">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{room.guestName}</span>
                    </div>
                  ) : room.occupancy === 'checkin_today' ? (
                    <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                      <LogIn className="w-3 h-3 shrink-0" />
                      <span>Заезд сегодня</span>
                    </div>
                  ) : null}

                  {room.occupancy === 'checkout_today' && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 mb-1">
                      <LogOut className="w-3 h-3 shrink-0" />
                      <span>Выезд сегодня</span>
                    </div>
                  )}

                  {maidName ? (
                    <div className="flex items-center gap-1 text-xs text-blue-600 truncate">
                      <SprayCan className="w-3 h-3 shrink-0" />
                      <span className="truncate">{maidName}</span>
                    </div>
                  ) : !room.guestName && room.occupancy !== 'checkin_today' && room.occupancy !== 'checkout_today' ? (
                    <div className="text-xs text-gray-400 italic">Свободен</div>
                  ) : null}
                </button>
              );
            })}
            {filteredRooms.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400">
                <Bed className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Номера не найдены
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ TAB: TASKS ═══════════════════ */}
      {activeTab === 'tasks' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>Всего задач: <strong className="text-gray-900">{tasks.length}</strong></span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Ожидает: {tasks.filter((t) => t.status === 'pending').length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                В процессе: {tasks.filter((t) => t.status === 'in_progress').length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Завершено: {tasks.filter((t) => t.status === 'completed' || t.status === 'verified').length}
              </span>
            </div>
            <button
              onClick={() => {
                setTaskForm({ roomId: rooms[0]?.id ?? 0, taskType: 'standard', assignedTo: 0, priority: 'medium', notes: '' });
                setShowTaskModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Создать задачу
            </button>
          </div>

          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Номер</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Тип уборки</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Назначена</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Приоритет</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Длительность</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Создана</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{task.roomNumber}</td>
                      <td className="px-4 py-3">
                        <span className={TASK_TYPE_BADGE[task.taskType]}>{TASK_TYPE_LABELS[task.taskType]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {task.status === 'pending' || task.status === 'assigned' ? (
                          <select
                            value={task.assignedTo ?? ''}
                            onChange={(e) => {
                              const maidId = Number(e.target.value);
                              if (maidId) handleTaskAssign(task.id, maidId);
                            }}
                            className="input-field w-auto text-xs py-1 px-2"
                          >
                            <option value="">— выбрать —</option>
                            {activeMaids.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-700">{getStaffName(task.assignedTo) ?? <span className="text-gray-400 italic">—</span>}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={TASK_STATUS_BADGE[task.status]}>{TASK_STATUS_LABELS[task.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={PRIORITY_BADGE[task.priority]}>{PRIORITY_LABELS[task.priority]}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {task.duration ? `${task.duration} мин` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{task.createdAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {task.status === 'pending' && (
                            <button onClick={() => handleTaskAction(task.id, 'assign')} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Назначить">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {task.status === 'assigned' && (
                            <button onClick={() => handleTaskAction(task.id, 'start')} className="rounded p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Начать">
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button onClick={() => handleTaskAction(task.id, 'complete')} className="rounded p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Завершить">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {task.status === 'completed' && (
                            <button onClick={() => handleTaskAction(task.id, 'verify')} className="rounded p-1.5 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors" title="Проверить">
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const room = rooms.find((r) => r.id === task.roomId);
                              if (room) { setSelectedRoom(room); setActiveTab('rooms'); }
                            }}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            title="Просмотр"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Задачи не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════ TAB: STAFF ═══════════════════ */}
      {activeTab === 'staff' && (
        <>
          {/* Staff Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Всего сотрудников</p>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold mt-1">{staffStats.total}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">На смене сегодня</p>
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{staffStats.onShift}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Задач выполнено</p>
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{staffStats.tasksCompleted}</p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button onClick={openStaffCreate} className="btn-primary">
              <Plus className="w-4 h-4" />
              Добавить сотрудника
            </button>
          </div>

          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Имя</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Телефон</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Роль</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Смена</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Этаж</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Задачи</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Статус</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {member.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={ROLE_BADGE[member.role]}>{ROLE_LABELS[member.role]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={SHIFT_BADGE[member.shift]}>{SHIFT_LABELS[member.shift]}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {member.assignedFloor ? `${member.assignedFloor} этаж` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="font-medium">{member.tasksCompleted}</span>
                        <span className="text-gray-400"> / {member.tasksToday}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleStaffActive(member.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            member.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {member.isActive ? 'Активен' : 'Неактивен'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openStaffEdit(member)}
                            className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(member.id)}
                            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Сотрудники не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════ TAB: NOTIFICATIONS ═══════════════════ */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Как работают оповещения Housekeeping</p>
              <p className="text-blue-700">
                Система автоматически отправляет уведомления при создании, назначении и завершении задач уборки.
                Горничные могут управлять задачами из Telegram-бота: <code className="bg-blue-100 px-1 rounded">/tasks</code>, <code className="bg-blue-100 px-1 rounded">/room 102</code>, <code className="bg-blue-100 px-1 rounded">/done 102</code>.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Каналы оповещений</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-900">Telegram</span>
                  </div>
                  <button onClick={() => setNotifSettings(p => ({ ...p, telegram: { ...p.telegram, enabled: !p.telegram.enabled } }))}>
                    {notifSettings.telegram.enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">Мгновенные уведомления через Telegram-бот</p>
                {notifSettings.telegram.chatLinked ? <span className="badge badge-green">Подключён</span> : <span className="badge badge-yellow">Не привязан</span>}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400 mb-1">Команды для горничных:</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-gray-600"><code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">/tasks</code><span>— задачи на сегодня</span></div>
                    <div className="flex items-center gap-2 text-gray-600"><code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">/room 102</code><span>— статус номера</span></div>
                    <div className="flex items-center gap-2 text-gray-600"><code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">/done 102</code><span>— завершить уборку</span></div>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-semibold text-gray-900">SMS</span>
                  </div>
                  <button onClick={() => setNotifSettings(p => ({ ...p, sms: { ...p.sms, enabled: !p.sms.enabled } }))}>
                    {notifSettings.sms.enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">SMS через Eskiz.uz для сотрудников без Telegram</p>
                {notifSettings.sms.enabled ? <span className="badge badge-green">Активен</span> : <span className="badge badge-gray">Выключен</span>}
                <div className="mt-3 pt-3 border-t text-xs text-gray-400">Стоимость: ~50 сум/SMS. Только для срочных задач.</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-semibold text-gray-900">Push / In-app</span>
                  </div>
                  <ToggleRight className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-xs text-gray-500 mb-2">Уведомления в браузере и мобильном приложении</p>
                <span className="badge badge-green">Всегда активен</span>
                <div className="mt-3 pt-3 border-t text-xs text-gray-400">Работает для всех авторизованных пользователей.</div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Триггеры событий</h2>
            <div className="table-container">
              <div className="divide-y">
                {([
                  { key: 'taskCreated' as const, icon: <Plus className="w-4 h-4 text-blue-500" />, title: 'Создана новая задача', desc: 'Уведомление при создании задачи уборки' },
                  { key: 'taskAssigned' as const, icon: <UserCheck className="w-4 h-4 text-purple-500" />, title: 'Задача назначена', desc: 'Горничная получает уведомление о назначении' },
                  { key: 'taskCompleted' as const, icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, title: 'Уборка завершена', desc: 'Супервайзер получает уведомление о завершении' },
                  { key: 'roomStatusChanged' as const, icon: <Sparkles className="w-4 h-4 text-amber-500" />, title: 'Статус номера изменён', desc: 'При любом изменении статуса номера' },
                  { key: 'dailyReport' as const, icon: <CalendarDays className="w-4 h-4 text-gray-500" />, title: 'Ежедневный отчёт', desc: 'Утренняя сводка по housekeeping' },
                ]).map(({ key, icon, title, desc }) => (
                  <div key={key} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{icon}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {key === 'dailyReport' && notifSettings.events.dailyReport && (
                        <input
                          type="time"
                          value={notifSettings.events.dailyReportTime}
                          onChange={(e) => setNotifSettings(p => ({ ...p, events: { ...p.events, dailyReportTime: e.target.value } }))}
                          className="input-field w-auto text-xs"
                        />
                      )}
                      <button onClick={() => toggleNotifEvent(key)}>
                        {notifSettings.events[key] ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Получатели</h2>
              <button className="btn-primary text-sm"><Plus className="w-4 h-4" />Добавить получателя</button>
            </div>
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Имя / Роль</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Канал</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Адрес</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">События</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {notifSettings.recipients.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3"><span className="badge badge-blue">Telegram</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.target}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.events.map(e => (
                            <span key={e} className="badge badge-gray text-[10px]">
                              {e === 'all' ? 'Все' : e === 'taskCreated' ? 'Создание' : e === 'taskAssigned' ? 'Назначение' : e === 'taskCompleted' ? 'Завершение' : e}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleRecipientActive(r.id)}>
                          {r.active ? <ToggleRight className="w-7 h-7 text-emerald-500 mx-auto" /> : <ToggleLeft className="w-7 h-7 text-gray-300 mx-auto" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" />
              Подключение Telegram-бота для горничных
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">1</span>
                <p>Горничная открывает бот <strong>@sardoba_pms_bot</strong> в Telegram</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">2</span>
                <p>Вводит <code className="bg-white px-1.5 py-0.5 rounded border text-xs font-mono">/start TOKEN</code> — токен генерируется в настройках</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">3</span>
                <p>Бот привязывается к отелю и начинает отправлять уведомления</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">4</span>
                <div>
                  <p className="mb-1">Команды:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-white rounded-lg border p-2.5">
                      <code className="text-xs font-mono text-blue-600 font-bold">/tasks</code>
                      <p className="text-xs text-gray-500 mt-1">Список задач на сегодня</p>
                    </div>
                    <div className="bg-white rounded-lg border p-2.5">
                      <code className="text-xs font-mono text-blue-600 font-bold">/room 102</code>
                      <p className="text-xs text-gray-500 mt-1">Статус конкретного номера</p>
                    </div>
                    <div className="bg-white rounded-lg border p-2.5">
                      <code className="text-xs font-mono text-blue-600 font-bold">/done 102</code>
                      <p className="text-xs text-gray-500 mt-1">Завершить уборку номера</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ ROOM DETAIL PANEL ═══════════════════ */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRoom(null)} />
          <div className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">Номер {selectedRoom.number}</h2>
                <span className={CLEANING_STATUS_BADGE[selectedRoom.cleaningStatus]}>
                  {CLEANING_STATUS_LABELS[selectedRoom.cleaningStatus]}
                </span>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Room Info */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Информация</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Тип номера</p>
                    <p className="text-sm font-semibold">{ROOM_TYPE_NAMES[selectedRoom.type]}</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Этаж</p>
                    <p className="text-sm font-semibold">{selectedRoom.floor}</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3 col-span-2">
                    <p className="text-xs text-gray-500">Статус занятости</p>
                    <p className="text-sm font-semibold">{OCCUPANCY_LABELS[selectedRoom.occupancy]}</p>
                  </div>
                </div>
              </div>

              {/* Guest Info */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Гость</h3>
                {selectedRoom.guestName ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedRoom.guestName}</p>
                        <p className="text-xs text-gray-500">{OCCUPANCY_LABELS[selectedRoom.occupancy]}</p>
                      </div>
                    </div>
                    {selectedRoom.guestCheckIn && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Заезд: {selectedRoom.guestCheckIn}</span>
                        </div>
                        {selectedRoom.guestCheckOut && (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Выезд: {selectedRoom.guestCheckOut}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Номер свободен</p>
                )}
              </div>

              {/* Maid Assignment */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Горничная</h3>
                <select
                  value={tasks.find((t) => t.roomId === selectedRoom.id)?.assignedTo ?? ''}
                  onChange={(e) => handleAssignMaid(selectedRoom.id, Number(e.target.value) || null)}
                  className="input-field"
                >
                  <option value="">Не назначена</option>
                  {activeMaids.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Change Status */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Изменить статус</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CLEANING_STATUS_LABELS) as HotelRoomCleaningStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedRoom.id, s)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selectedRoom.cleaningStatus === s
                          ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/20'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${CLEANING_STATUS_DOT[s]}`} />
                      {CLEANING_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Быстрые действия</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleStatusChange(selectedRoom.id, 'cleaning')} className="btn-secondary text-xs">
                    <SprayCan className="w-3.5 h-3.5" />
                    Начать уборку
                  </button>
                  <button onClick={() => handleStatusChange(selectedRoom.id, 'clean')} className="btn-primary text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    Отметить чистым
                  </button>
                  <button onClick={() => handleStatusChange(selectedRoom.id, 'out_of_order')} className="btn-danger text-xs">
                    <Ban className="w-3.5 h-3.5" />
                    Вывести из работы
                  </button>
                </div>
              </div>

              {/* Cleaning History */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  История уборок
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const taskTypes: TaskType[] = ['standard', 'checkout', 'standard'];
                    const roomSeed = selectedRoom.id;
                    return [
                      { date: '25.02.2026 14:30', maid: staff[(roomSeed + 2) % Math.max(1, staff.length)]?.name ?? '—', type: taskTypes[0], duration: 25 },
                      { date: '24.02.2026 11:15', maid: staff[(roomSeed + 1) % Math.max(1, staff.length)]?.name ?? '—', type: taskTypes[1], duration: 40 },
                      { date: '23.02.2026 09:45', maid: staff[roomSeed % Math.max(1, staff.length)]?.name ?? '—', type: taskTypes[2], duration: 20 },
                    ].map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.maid}</span>
                            <span className={entry.type === 'checkout' ? 'badge badge-yellow' : 'badge badge-gray'}>
                              {TASK_TYPE_LABELS[entry.type]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{entry.date}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs shrink-0">
                          <Clock className="w-3 h-3" />
                          {entry.duration} мин
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ CREATE TASK MODAL ═══════════════════ */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTaskModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Создать задачу</h2>
              <button onClick={() => setShowTaskModal(false)} className="rounded p-2 text-gray-500 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Номер комнаты</label>
                <select
                  value={taskForm.roomId}
                  onChange={(e) => setTaskForm((f) => ({ ...f, roomId: Number(e.target.value) }))}
                  className="input-field"
                >
                  <option value={0}>Выберите номер</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} — {ROOM_TYPE_NAMES[r.type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип уборки</label>
                <select
                  value={taskForm.taskType}
                  onChange={(e) => setTaskForm((f) => ({ ...f, taskType: e.target.value as TaskType }))}
                  className="input-field"
                >
                  {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((t) => (
                    <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Горничная</label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm((f) => ({ ...f, assignedTo: Number(e.target.value) }))}
                  className="input-field"
                >
                  <option value={0}>Не назначена</option>
                  {activeMaids.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                  className="input-field"
                >
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                <textarea
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="Дополнительные комментарии..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setShowTaskModal(false)} className="btn-secondary">Отмена</button>
                <button
                  onClick={handleCreateTask}
                  disabled={!taskForm.roomId}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ STAFF CREATE/EDIT MODAL ═══════════════════ */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowStaffModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingStaff ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
              </h2>
              <button onClick={() => setShowStaffModal(false)} className="rounded p-2 text-gray-500 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  placeholder="Имя Фамилия"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field"
                  placeholder="+998XXXXXXXXX"
                  pattern="\+998\d{9}"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value as HotelStaffMember['role'] }))}
                  className="input-field"
                >
                  <option value="maid">Горничная</option>
                  <option value="supervisor">Супервайзер</option>
                  <option value="maintenance">Техник</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Смена</label>
                <select
                  value={staffForm.shift}
                  onChange={(e) => setStaffForm((f) => ({ ...f, shift: e.target.value as HotelStaffMember['shift'] }))}
                  className="input-field"
                >
                  <option value="morning">Утренняя</option>
                  <option value="evening">Вечерняя</option>
                  <option value="night">Ночная</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Этаж (необязательно)</label>
                <input
                  type="number"
                  value={staffForm.assignedFloor}
                  onChange={(e) => setStaffForm((f) => ({ ...f, assignedFloor: e.target.value }))}
                  className="input-field"
                  placeholder="Номер этажа"
                  min={1}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setShowStaffModal(false)} className="btn-secondary">Отмена</button>
                <button
                  onClick={handleSaveStaff}
                  disabled={!staffForm.name.trim() || !staffForm.phone.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingStaff ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Сохранить
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Добавить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ DELETE CONFIRMATION ═══════════════════ */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Удалить сотрудника?</h3>
              <p className="text-sm text-gray-500 mb-6">
                {staff.find((s) => s.id === deleteConfirm)?.name} будет удалён. Все назначенные задачи будут сброшены.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Отмена</button>
                <button onClick={() => handleDeleteStaff(deleteConfirm)} className="btn-danger">
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
