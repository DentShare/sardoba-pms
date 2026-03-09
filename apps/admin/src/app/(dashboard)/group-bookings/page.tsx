'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  LogIn,
  FileText,
  Ban,
  Plus,
  Check,
  CheckCircle2,
  DollarSign,
  CalendarDays,
  Phone,
  Mail,
  Building2,
  ArrowRight,
  UserCheck,
  Bed,
  User,
  Printer,
} from 'lucide-react';
import {
  hotels,
  generateHotelRooms,
  ROOM_TYPE_NAMES,
  ROOM_TYPE_PRICES,
  formatUZS,
  formatDate,
  type Hotel,
  type HotelRoom,
  type HotelRoomType,
} from '@/lib/mock-data';

// ── Types ──────────────────────────────────────────────────────────────────

type GroupStatus = 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

interface GroupGuest {
  id: number;
  roomNumber: string;
  guestName: string;
  phone: string;
  passport: string;
  status: 'pending' | 'checked_in' | 'checked_out';
}

interface GroupBooking {
  id: number;
  groupNumber: string;
  groupName: string;
  agency: string | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  checkIn: string;
  checkOut: string;
  roomsCount: number;
  guestsCount: number;
  status: GroupStatus;
  totalAmount: number;
  paidAmount: number;
  guests: GroupGuest[];
  createdAt: string;
  notes: string;
}

interface GuestAssignment {
  roomId: number;
  roomNumber: string;
  roomType: HotelRoomType;
  basePrice: number;
  guestName: string;
  phone: string;
  passport: string;
}

// ── Labels & badges ────────────────────────────────────────────────────────

const statusLabels: Record<GroupStatus, string> = {
  tentative: 'Предварительная',
  confirmed: 'Подтверждена',
  checked_in: 'Заехали',
  checked_out: 'Выехали',
  cancelled: 'Отменена',
};

const statusBadge: Record<GroupStatus, string> = {
  tentative: 'badge badge-yellow',
  confirmed: 'badge badge-purple',
  checked_in: 'badge badge-green',
  checked_out: 'badge badge-gray',
  cancelled: 'badge badge-red',
};

const guestStatusLabels: Record<GroupGuest['status'], string> = {
  pending: 'Ожидание',
  checked_in: 'Заехал',
  checked_out: 'Выехал',
};

const guestStatusBadge: Record<GroupGuest['status'], string> = {
  pending: 'badge badge-yellow',
  checked_in: 'badge badge-green',
  checked_out: 'badge badge-gray',
};

const occupancyLabels: Record<string, string> = {
  occupied: 'Занят',
  vacant: 'Свободен',
  checkout_today: 'Выезд сегодня',
  checkin_today: 'Заезд сегодня',
};

// ── Mock data helpers ──────────────────────────────────────────────────────

const activeHotels = hotels.filter(h => h.status === 'active' || h.status === 'trial');
const defaultHotel = activeHotels[0] || hotels[0];
const defaultRooms = generateHotelRooms(defaultHotel).filter(r => r.status === 'active');

const agencies = ['TUI Uzbekistan', 'Silk Road Adventures', 'Anur Tour', 'Central Asia Travel', 'Uzbekistan Travel', null];

const guestNamePool = [
  'Мюллер Ханс', 'Шмидт Клаус', 'Фишер Анна', 'Вебер Петер', 'Браун Михаэль',
  'Иванов Сергей', 'Петрова Мария', 'Ким Су-Джин', 'Танака Юки', 'Росси Марко',
  'Дюбуа Пьер', 'Гарсия Мария', 'Уильямс Джон', 'Ли Мин-Хо', 'Мартин Софи',
  'Сидоров Пётр', 'Кузнецова Ольга', 'Попов Алексей', 'Новикова Елена', 'Морозов Дмитрий',
  'Волков Андрей', 'Лебедева Наталья', 'Козлов Михаил', 'Зайцева Татьяна', 'Соколов Артём',
];

const passportPrefixes = ['DE', 'RU', 'KR', 'JP', 'IT', 'FR', 'ES', 'US', 'GB', 'UZ'];

function generateGuests(roomsCount: number, status: GroupStatus): GroupGuest[] {
  const gStatus: GroupGuest['status'] =
    status === 'checked_in' ? 'checked_in' :
    status === 'checked_out' ? 'checked_out' : 'pending';

  return Array.from({ length: roomsCount }, (_, i) => {
    const mixedStatus: GroupGuest['status'] =
      status === 'checked_in' && i >= roomsCount - 2 ? 'pending' : gStatus;
    const prefix = passportPrefixes[i % passportPrefixes.length];
    const room = defaultRooms.length > 0 ? defaultRooms[i % defaultRooms.length] : null;
    return {
      id: i + 1,
      roomNumber: room ? room.number : `${100 + Math.floor(i / 3) * 100 + (i % 3) + 1}`,
      guestName: guestNamePool[i % guestNamePool.length],
      phone: `+998${90 + (i % 10)}${String(1000000 + i * 137593).slice(0, 7)}`,
      passport: `${prefix}${String(10000000 + i * 734291).slice(0, 8)}`,
      status: mixedStatus,
    };
  });
}

const groupDefs: { name: string; agencyIdx: number; rooms: number; status: GroupStatus; dayOffset: number; nights: number; paidPercent: number; notes: string }[] = [
  { name: 'Группа Германия #42', agencyIdx: 0, rooms: 12, status: 'confirmed', dayOffset: 3, nights: 5, paidPercent: 0.6, notes: 'Завтрак включён. Трансфер из аэропорта.' },
  { name: 'Корпоратив Samsung', agencyIdx: 5, rooms: 8, status: 'checked_in', dayOffset: 0, nights: 3, paidPercent: 1, notes: 'Конференц-зал на 3 дня. Кофе-брейк.' },
  { name: 'Тур Золотое кольцо', agencyIdx: 1, rooms: 15, status: 'tentative', dayOffset: 7, nights: 4, paidPercent: 0.3, notes: 'Ожидается подтверждение до 01.03.' },
  { name: 'Делегация Японии', agencyIdx: 3, rooms: 6, status: 'confirmed', dayOffset: 5, nights: 7, paidPercent: 0.5, notes: 'Нужен переводчик. Вегетарианское меню.' },
  { name: 'Свадьба Каримовых', agencyIdx: 5, rooms: 10, status: 'checked_out', dayOffset: -5, nights: 2, paidPercent: 1, notes: 'Банкетный зал на 200 персон.' },
  { name: 'Группа Италия #17', agencyIdx: 4, rooms: 9, status: 'confirmed', dayOffset: 10, nights: 6, paidPercent: 0.4, notes: 'Полупансион. Экскурсии в Регистан.' },
  { name: 'Школьная экскурсия ТашГУ', agencyIdx: 2, rooms: 5, status: 'tentative', dayOffset: 14, nights: 3, paidPercent: 0, notes: 'Студенты. Минимальный бюджет.' },
  { name: 'Конференция IT-Forum', agencyIdx: 5, rooms: 14, status: 'checked_in', dayOffset: -1, nights: 4, paidPercent: 0.8, notes: 'Wi-Fi обязателен. Проектор в каждом номере.' },
  { name: 'Тур Франция-Узбекистан', agencyIdx: 1, rooms: 11, status: 'cancelled', dayOffset: 2, nights: 5, paidPercent: 0, notes: 'Отменено из-за изменения маршрута.' },
  { name: 'Бизнес-группа Корея', agencyIdx: 3, rooms: 7, status: 'confirmed', dayOffset: 8, nights: 4, paidPercent: 0.7, notes: 'VIP-размещение. Ранний заезд.' },
  { name: 'Группа Россия #88', agencyIdx: 4, rooms: 13, status: 'tentative', dayOffset: 12, nights: 6, paidPercent: 0.2, notes: 'Групповая виза. Нужны копии паспортов.' },
  { name: 'Медицинский конгресс', agencyIdx: 2, rooms: 4, status: 'checked_out', dayOffset: -7, nights: 3, paidPercent: 1, notes: 'Партнёр — Минздрав РУз.' },
];

const initialGroupBookings: GroupBooking[] = groupDefs.map((def, i) => {
  const baseDate = new Date('2026-02-25');
  const checkInDate = new Date(baseDate);
  checkInDate.setDate(baseDate.getDate() + def.dayOffset);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkInDate.getDate() + def.nights);

  const pricePerRoom = 800000 + Math.floor(Math.random() * 1200000);
  const total = pricePerRoom * def.rooms * def.nights;
  const guests = generateGuests(def.rooms, def.status);

  return {
    id: i + 1,
    groupNumber: `GRP-2026-${String(i + 1).padStart(3, '0')}`,
    groupName: def.name,
    agency: agencies[def.agencyIdx],
    contactPerson: guestNamePool[i % guestNamePool.length],
    contactPhone: `+998${90 + (i % 10)}${String(1000000 + i * 234567).slice(0, 7)}`,
    contactEmail: `contact${i + 1}@${def.agencyIdx < 5 ? 'agency' : 'mail'}.uz`,
    checkIn: checkInDate.toISOString().split('T')[0],
    checkOut: checkOutDate.toISOString().split('T')[0],
    roomsCount: def.rooms,
    guestsCount: guests.length,
    status: def.status,
    totalAmount: total,
    paidAmount: Math.floor(total * def.paidPercent),
    guests,
    createdAt: `2026-02-${String(Math.max(1, 20 + i - 12)).padStart(2, '0')}T10:00:00Z`,
    notes: def.notes,
  };
});

function formatNights(n: number): string {
  if (n === 0) return '0 ночей';
  const lastTwo = n % 100;
  const lastOne = n % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return `${n} ночей`;
  if (lastOne === 1) return `${n} ночь`;
  if (lastOne >= 2 && lastOne <= 4) return `${n} ночи`;
  return `${n} ночей`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GroupBookingsPage() {
  // Hotel
  const [selectedHotelId, setSelectedHotelId] = useState(defaultHotel.id);

  // Groups (mutable for actions)
  const [groups, setGroups] = useState<GroupBooking[]>(initialGroupBookings);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Detail panel & overlays
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [moveGuestId, setMoveGuestId] = useState<number | null>(null);
  const [invoiceGroupId, setInvoiceGroupId] = useState<number | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newGroup, setNewGroup] = useState({
    name: '', agency: '', contactPerson: '', contactPhone: '', contactEmail: '', checkIn: '', checkOut: '', notes: '',
  });
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [guestAssignments, setGuestAssignments] = useState<GuestAssignment[]>([]);

  const PAGE_SIZE = 10;

  // ── Derived data ─────────────────────────────────────────────────────────

  const selectedHotel = useMemo(() =>
    activeHotels.find(h => h.id === selectedHotelId) || defaultHotel,
    [selectedHotelId]
  );

  const hotelRooms = useMemo(() =>
    generateHotelRooms(selectedHotel).filter(r => r.status === 'active'),
    [selectedHotel]
  );

  const selectedGroup = useMemo(() =>
    selectedGroupId !== null ? groups.find(g => g.id === selectedGroupId) ?? null : null,
    [selectedGroupId, groups]
  );

  const invoiceGroup = useMemo(() =>
    invoiceGroupId !== null ? groups.find(g => g.id === invoiceGroupId) ?? null : null,
    [invoiceGroupId, groups]
  );

  const uniqueAgencies = useMemo(() => {
    const set = new Set<string>();
    groups.forEach(g => { if (g.agency) set.add(g.agency); });
    return Array.from(set).sort();
  }, [groups]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        g.groupName.toLowerCase().includes(q) ||
        g.groupNumber.toLowerCase().includes(q) ||
        (g.agency?.toLowerCase().includes(q) ?? false) ||
        g.contactPerson.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || g.status === statusFilter;
      const matchAgency =
        agencyFilter === 'all' ||
        (agencyFilter === 'direct' ? g.agency === null : g.agency === agencyFilter);
      const matchDateFrom = !dateFrom || g.checkIn >= dateFrom;
      const matchDateTo = !dateTo || g.checkIn <= dateTo;
      return matchSearch && matchStatus && matchAgency && matchDateFrom && matchDateTo;
    });
  }, [groups, search, statusFilter, agencyFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: groups.length,
    confirmed: groups.filter(g => g.status === 'confirmed').length,
    checkedIn: groups.filter(g => g.status === 'checked_in').length,
    totalRevenue: groups.reduce((a, g) => a + g.totalAmount, 0),
  }), [groups]);

  const nights = useMemo(() => {
    if (!newGroup.checkIn || !newGroup.checkOut) return 0;
    const diff = new Date(newGroup.checkOut).getTime() - new Date(newGroup.checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [newGroup.checkIn, newGroup.checkOut]);

  const selectedRoomDetails = useMemo(() =>
    hotelRooms.filter(r => selectedRoomIds.includes(r.id)),
    [hotelRooms, selectedRoomIds]
  );

  const newGroupTotal = useMemo(() =>
    selectedRoomDetails.reduce((sum, r) => sum + r.basePrice * nights, 0),
    [selectedRoomDetails, nights]
  );

  const moveGuest = useMemo(() => {
    if (moveGuestId === null || !selectedGroup) return null;
    return selectedGroup.guests.find(g => g.id === moveGuestId) ?? null;
  }, [moveGuestId, selectedGroup]);

  const vacantRooms = useMemo(() =>
    hotelRooms.filter(r => r.occupancy === 'vacant'),
    [hotelRooms]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  function resetCreateModal() {
    setShowCreateModal(false);
    setCreateStep(1);
    setNewGroup({ name: '', agency: '', contactPerson: '', contactPhone: '', contactEmail: '', checkIn: '', checkOut: '', notes: '' });
    setSelectedRoomIds([]);
    setGuestAssignments([]);
  }

  function toggleRoom(roomId: number) {
    setSelectedRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  }

  function initGuestAssignments() {
    setGuestAssignments(
      selectedRoomDetails.map(room => ({
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        basePrice: room.basePrice,
        guestName: '',
        phone: '',
        passport: '',
      }))
    );
  }

  function updateAssignment(roomId: number, field: 'guestName' | 'phone' | 'passport', value: string) {
    setGuestAssignments(prev =>
      prev.map(a => a.roomId === roomId ? { ...a, [field]: value } : a)
    );
  }

  function goToStep(step: number) {
    if (step === 3 && createStep === 2) initGuestAssignments();
    setCreateStep(step);
  }

  function handleCreateGroup() {
    const newId = Math.max(...groups.map(g => g.id), 0) + 1;
    const booking: GroupBooking = {
      id: newId,
      groupNumber: `GRP-2026-${String(newId).padStart(3, '0')}`,
      groupName: newGroup.name,
      agency: newGroup.agency || null,
      contactPerson: newGroup.contactPerson,
      contactPhone: newGroup.contactPhone,
      contactEmail: newGroup.contactEmail,
      checkIn: newGroup.checkIn,
      checkOut: newGroup.checkOut,
      roomsCount: guestAssignments.length,
      guestsCount: guestAssignments.length,
      status: 'tentative',
      totalAmount: newGroupTotal,
      paidAmount: 0,
      guests: guestAssignments.map((a, i) => ({
        id: i + 1,
        roomNumber: a.roomNumber,
        guestName: a.guestName || 'Не указан',
        phone: a.phone,
        passport: a.passport,
        status: 'pending' as const,
      })),
      createdAt: new Date().toISOString(),
      notes: newGroup.notes,
    };
    setGroups(prev => [booking, ...prev]);
    resetCreateModal();
  }

  function handleConfirmGroup(id: number) {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, status: 'confirmed' as const } : g));
  }

  function handleCheckInAll(id: number) {
    setGroups(prev => prev.map(g =>
      g.id === id
        ? { ...g, status: 'checked_in' as const, guests: g.guests.map(gu => ({ ...gu, status: 'checked_in' as const })) }
        : g
    ));
  }

  function handleCancelGroup(id: number) {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, status: 'cancelled' as const } : g));
  }

  function handleCheckInGuest(groupId: number, guestId: number) {
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, guests: g.guests.map(gu => gu.id === guestId ? { ...gu, status: 'checked_in' as const } : gu) }
        : g
    ));
  }

  function handleMoveGuest(groupId: number, guestId: number, newRoom: string) {
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, guests: g.guests.map(gu => gu.id === guestId ? { ...gu, roomNumber: newRoom } : gu) }
        : g
    ));
    setMoveGuestId(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Групповые бронирования</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotel.name} — {selectedHotel.city}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedHotelId}
              onChange={(e) => { setSelectedHotelId(Number(e.target.value)); setSelectedRoomIds([]); }}
              className="input-field w-auto"
            >
              {activeHotels.map(h => (
                <option key={h.id} value={h.id}>{h.name} — {h.city} ({h.rooms} ном.)</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Новая группа
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Всего групп</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Подтверждены</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.confirmed}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Заехали</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.checkedIn}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Общая выручка</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatUZS(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по названию группы, номеру, контакту..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все статусы</option>
          <option value="tentative">Предварительная</option>
          <option value="confirmed">Подтверждена</option>
          <option value="checked_in">Заехали</option>
          <option value="checked_out">Выехали</option>
          <option value="cancelled">Отменена</option>
        </select>
        <select
          value={agencyFilter}
          onChange={(e) => { setAgencyFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все агентства</option>
          <option value="direct">Прямая (без агентства)</option>
          {uniqueAgencies.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="input-field w-auto"
          title="Дата заезда от"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="input-field w-auto"
          title="Дата заезда до"
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Группа</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Агентство</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Заезд / Выезд</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Номера / Гости</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Сумма</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((g) => (
                <tr key={g.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{g.groupName}</div>
                    <div className="text-xs text-gray-400 font-mono">{g.groupNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    {g.agency ? (
                      <span className="badge badge-blue">{g.agency}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Прямая</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{formatDate(g.checkIn)}</div>
                    <div className="text-xs text-gray-400">{formatDate(g.checkOut)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium">{g.roomsCount}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600">{g.guestsCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[g.status]}>{statusLabels[g.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatUZS(g.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors"
                        title="Подробности"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {g.status === 'confirmed' && (
                        <button
                          onClick={() => handleCheckInAll(g.id)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
                          title="Групповой заезд"
                        >
                          <LogIn className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setInvoiceGroupId(g.id)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Выставить счёт"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {g.status !== 'cancelled' && g.status !== 'checked_out' && (
                        <button
                          onClick={() => handleCancelGroup(g.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                          title="Отменить"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Групповые бронирования не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">Показано {paginated.length} из {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              {page} из {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Detail side panel ──────────────────────────────────────────────── */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setSelectedGroupId(null); setMoveGuestId(null); }}>
          <div
            className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold">{selectedGroup.groupName}</h2>
                <p className="text-xs text-gray-400 font-mono">{selectedGroup.groupNumber}</p>
              </div>
              <button onClick={() => { setSelectedGroupId(null); setMoveGuestId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Group info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Информация о группе
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Агентство</p>
                    <p className="font-medium">{selectedGroup.agency ?? 'Прямая бронь'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Контактное лицо</p>
                    <p className="font-medium">{selectedGroup.contactPerson}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedGroup.contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedGroup.contactEmail}</span>
                  </div>
                  <div>
                    <p className="text-gray-500">Заезд</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(selectedGroup.checkIn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Выезд</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(selectedGroup.checkOut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Статус</p>
                    <span className={statusBadge[selectedGroup.status]}>
                      {statusLabels[selectedGroup.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">Номеров / Гостей</p>
                    <p className="font-medium">{selectedGroup.roomsCount} / {selectedGroup.guestsCount}</p>
                  </div>
                </div>
                {selectedGroup.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Примечания: </span>
                    {selectedGroup.notes}
                  </div>
                )}
              </div>

              {/* Rooming list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  Список размещения ({selectedGroup.guests.length})
                </h3>
                <div className="table-container">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left px-3 py-2 font-medium text-gray-500">Номер</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">Гость</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">Паспорт</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">Статус</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-500">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.guests.map((guest) => (
                          <tr key={guest.id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <Bed className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-mono text-xs font-medium">{guest.roomNumber}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-sm">{guest.guestName}</div>
                              <div className="text-xs text-gray-400">{guest.phone}</div>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-600">{guest.passport}</td>
                            <td className="px-3 py-2">
                              <span className={guestStatusBadge[guest.status]}>
                                {guestStatusLabels[guest.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {guest.status === 'pending' && (selectedGroup.status === 'confirmed' || selectedGroup.status === 'checked_in') && (
                                  <button
                                    onClick={() => handleCheckInGuest(selectedGroup.id, guest.id)}
                                    className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                                    title="Заселить"
                                  >
                                    <span className="flex items-center gap-1">
                                      <LogIn className="w-3 h-3" />
                                      Заселить
                                    </span>
                                  </button>
                                )}
                                {(guest.status === 'pending' || guest.status === 'checked_in') && selectedGroup.status !== 'cancelled' && selectedGroup.status !== 'checked_out' && (
                                  <button
                                    onClick={() => setMoveGuestId(guest.id)}
                                    className="px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                                    title="Переселить"
                                  >
                                    <span className="flex items-center gap-1">
                                      <Bed className="w-3 h-3" />
                                      Переселить
                                    </span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Payment info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  Информация об оплате
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Итого</p>
                    <p className="text-sm font-bold mt-1">{formatUZS(selectedGroup.totalAmount)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-center">
                    <p className="text-xs text-emerald-600">Оплачено</p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">{formatUZS(selectedGroup.paidAmount)}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-xs text-red-600">Остаток</p>
                    <p className="text-sm font-bold text-red-700 mt-1">
                      {formatUZS(selectedGroup.totalAmount - selectedGroup.paidAmount)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (selectedGroup.paidAmount / selectedGroup.totalAmount) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {Math.round((selectedGroup.paidAmount / selectedGroup.totalAmount) * 100)}% оплачено
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {selectedGroup.status === 'tentative' && (
                  <button className="btn-primary" onClick={() => handleConfirmGroup(selectedGroup.id)}>
                    <CheckCircle2 className="w-4 h-4" />
                    Подтвердить
                  </button>
                )}
                {selectedGroup.status === 'confirmed' && (
                  <button className="btn-primary" onClick={() => handleCheckInAll(selectedGroup.id)}>
                    <UserCheck className="w-4 h-4" />
                    Групповой заезд
                  </button>
                )}
                <button className="btn-secondary" onClick={() => setInvoiceGroupId(selectedGroup.id)}>
                  <FileText className="w-4 h-4" />
                  Выставить счёт
                </button>
                {selectedGroup.status !== 'cancelled' && selectedGroup.status !== 'checked_out' && (
                  <button className="btn-danger" onClick={() => handleCancelGroup(selectedGroup.id)}>
                    <Ban className="w-4 h-4" />
                    Отменить группу
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Move room modal ────────────────────────────────────────────────── */}
      {moveGuestId !== null && selectedGroup && moveGuest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setMoveGuestId(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div>
                <h3 className="text-base font-bold">Переселить гостя</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {moveGuest.guestName} · Текущий номер: <span className="font-mono font-medium">{moveGuest.roomNumber}</span>
                </p>
              </div>
              <button onClick={() => setMoveGuestId(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <p className="text-sm text-gray-600 mb-3">Выберите свободный номер ({selectedHotel.name}):</p>
              {vacantRooms.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Нет свободных номеров</p>
              )}
              {vacantRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleMoveGuest(selectedGroup.id, moveGuest.id, room.number)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Bed className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Номер {room.number}</div>
                      <div className="text-xs text-gray-500">Этаж {room.floor} · {ROOM_TYPE_NAMES[room.type]}</div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">{formatUZS(room.basePrice)}/ночь</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice modal ──────────────────────────────────────────────────── */}
      {invoiceGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setInvoiceGroupId(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-gray-400" />
                <h3 className="text-base font-bold">Счёт-фактура</h3>
              </div>
              <button onClick={() => setInvoiceGroupId(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-center pb-4 border-b border-dashed">
                <p className="text-lg font-bold">{invoiceGroup.groupName}</p>
                <p className="text-xs font-mono text-gray-400">{invoiceGroup.groupNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Агентство</p>
                  <p className="font-medium">{invoiceGroup.agency ?? 'Прямая бронь'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Контакт</p>
                  <p className="font-medium">{invoiceGroup.contactPerson}</p>
                </div>
                <div>
                  <p className="text-gray-500">Заезд</p>
                  <p className="font-medium">{formatDate(invoiceGroup.checkIn)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Выезд</p>
                  <p className="font-medium">{formatDate(invoiceGroup.checkOut)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Размещение ({invoiceGroup.roomsCount} ном.)</h4>
                <div className="table-container">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Номер</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Гость</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Паспорт</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceGroup.guests.map((g) => (
                        <tr key={g.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{g.roomNumber}</td>
                          <td className="px-3 py-2">{g.guestName}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{g.passport}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-dashed pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Итого</span>
                  <span className="font-bold">{formatUZS(invoiceGroup.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Оплачено</span>
                  <span className="font-bold text-emerald-700">{formatUZS(invoiceGroup.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-red-600 font-medium">К оплате</span>
                  <span className="font-bold text-red-700 text-base">
                    {formatUZS(invoiceGroup.totalAmount - invoiceGroup.paidAmount)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button className="btn-secondary" onClick={() => setInvoiceGroupId(null)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create group modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={resetCreateModal}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold">Новая группа</h2>
                <p className="text-xs text-gray-500">
                  Шаг {createStep} из 4 · {selectedHotel.name}
                </p>
              </div>
              <button onClick={resetCreateModal} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
              {['Информация', 'Номера', 'Гости', 'Подтверждение'].map((label, idx) => {
                const step = idx + 1;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step < createStep
                          ? 'bg-emerald-500 text-white'
                          : step === createStep
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step < createStep ? <Check className="w-3.5 h-3.5" /> : step}
                      </div>
                      <span className={`text-xs hidden sm:inline ${step === createStep ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    </div>
                    {step < 4 && (
                      <div className={`flex-1 h-0.5 mx-2 ${step < createStep ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Step 1: Group info */}
              {createStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Название группы *</label>
                    <input
                      type="text"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup(p => ({ ...p, name: e.target.value }))}
                      placeholder="Например: Группа Германия #43"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Агентство / Туроператор</label>
                    <select
                      value={newGroup.agency}
                      onChange={(e) => setNewGroup(p => ({ ...p, agency: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Прямая бронь (без агентства)</option>
                      {uniqueAgencies.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо *</label>
                      <input
                        type="text"
                        value={newGroup.contactPerson}
                        onChange={(e) => setNewGroup(p => ({ ...p, contactPerson: e.target.value }))}
                        placeholder="ФИО"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
                      <input
                        type="tel"
                        value={newGroup.contactPhone}
                        onChange={(e) => setNewGroup(p => ({ ...p, contactPhone: e.target.value }))}
                        placeholder="+998..."
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newGroup.contactEmail}
                      onChange={(e) => setNewGroup(p => ({ ...p, contactEmail: e.target.value }))}
                      placeholder="email@agency.uz"
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Дата заезда *</label>
                      <input
                        type="date"
                        value={newGroup.checkIn}
                        onChange={(e) => setNewGroup(p => ({ ...p, checkIn: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Дата выезда *</label>
                      <input
                        type="date"
                        value={newGroup.checkOut}
                        onChange={(e) => setNewGroup(p => ({ ...p, checkOut: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>
                  {nights > 0 && (
                    <p className="text-sm text-brand-600 font-medium">{formatNights(nights)}</p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                    <textarea
                      value={newGroup.notes}
                      onChange={(e) => setNewGroup(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Дополнительная информация..."
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                </>
              )}

              {/* Step 2: Room selection */}
              {createStep === 2 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Выбрано: <span className="font-bold text-brand-600">{selectedRoomIds.length}</span> из {hotelRooms.length} номеров
                    </p>
                    {nights > 0 && (
                      <p className="text-sm text-gray-500">{formatNights(nights)}</p>
                    )}
                  </div>
                  {selectedRoomIds.length > 0 && nights > 0 && (
                    <div className="p-3 bg-brand-50 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-brand-800">Предварительная сумма</span>
                      <span className="text-base font-bold text-brand-700">{formatUZS(newGroupTotal)}</span>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {hotelRooms.map((room) => {
                      const isVacant = room.occupancy === 'vacant';
                      const isSelected = selectedRoomIds.includes(room.id);
                      return (
                        <label
                          key={room.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            !isVacant
                              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-brand-500 bg-brand-50 cursor-pointer'
                                : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => isVacant && toggleRoom(room.id)}
                            disabled={!isVacant}
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                          />
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Bed className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">№ {room.number}</span>
                              <span className="text-xs text-gray-400">Этаж {room.floor}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isVacant ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {occupancyLabels[room.occupancy] || room.occupancy}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {ROOM_TYPE_NAMES[room.type]}
                              {!isVacant && room.guestName && (
                                <span className="ml-2 text-gray-400">· {room.guestName}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-medium text-gray-700">{formatUZS(room.basePrice)}</div>
                            <div className="text-xs text-gray-400">/ ночь</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Step 3: Guest assignment (Rooming list) */}
              {createStep === 3 && (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Заполните данные гостей ({guestAssignments.length})
                    </h4>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {guestAssignments.map((a, idx) => (
                      <div key={a.roomId} className="p-4 border border-gray-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                              <span className="text-xs font-bold text-brand-700">{idx + 1}</span>
                            </div>
                            <div>
                              <span className="font-medium text-sm">Номер {a.roomNumber}</span>
                              <span className="text-xs text-gray-400 ml-2">{ROOM_TYPE_NAMES[a.roomType]}</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{formatUZS(a.basePrice)}/ночь</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">ФИО гостя</label>
                            <input
                              type="text"
                              value={a.guestName}
                              onChange={(e) => updateAssignment(a.roomId, 'guestName', e.target.value)}
                              placeholder="Фамилия Имя"
                              className="input-field text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Телефон</label>
                            <input
                              type="tel"
                              value={a.phone}
                              onChange={(e) => updateAssignment(a.roomId, 'phone', e.target.value)}
                              placeholder="+998..."
                              className="input-field text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Паспорт</label>
                            <input
                              type="text"
                              value={a.passport}
                              onChange={(e) => updateAssignment(a.roomId, 'passport', e.target.value)}
                              placeholder="AA1234567"
                              className="input-field text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Step 4: Confirmation */}
              {createStep === 4 && (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3 text-sm">
                    <h4 className="font-semibold text-gray-900">Сводка бронирования</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-500">Группа</p>
                        <p className="font-medium">{newGroup.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Агентство</p>
                        <p className="font-medium">{newGroup.agency || 'Прямая бронь'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Контакт</p>
                        <p className="font-medium">{newGroup.contactPerson || '—'}</p>
                        <p className="text-xs text-gray-400">{newGroup.contactPhone}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Даты</p>
                        <p className="font-medium">
                          {newGroup.checkIn ? formatDate(newGroup.checkIn) : '—'} — {newGroup.checkOut ? formatDate(newGroup.checkOut) : '—'}
                        </p>
                        <p className="text-xs text-gray-400">{formatNights(nights)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Отель</p>
                        <p className="font-medium">{selectedHotel.name}</p>
                        <p className="text-xs text-gray-400">{selectedHotel.city}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Номера и гости ({guestAssignments.length})
                    </h4>
                    {guestAssignments.map((a) => (
                      <div key={a.roomId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <Bed className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">№ {a.roomNumber} · {ROOM_TYPE_NAMES[a.roomType]}</div>
                            <div className="text-xs text-gray-500">
                              {a.guestName || 'Гость не указан'}
                              {a.passport && <span className="ml-1 text-gray-400 font-mono">· {a.passport}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="font-medium">{formatUZS(a.basePrice * nights)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-brand-50 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-900">Итого к оплате</span>
                    <span className="text-xl font-bold text-brand-700">{formatUZS(newGroupTotal)}</span>
                  </div>

                  {newGroup.notes && (
                    <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                      <span className="font-medium">Примечания: </span>{newGroup.notes}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
              {createStep > 1 ? (
                <button className="btn-secondary" onClick={() => goToStep(createStep - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
              ) : (
                <button className="btn-secondary" onClick={resetCreateModal}>Отмена</button>
              )}

              {createStep < 4 ? (
                <button
                  className="btn-primary"
                  onClick={() => goToStep(createStep + 1)}
                  disabled={
                    (createStep === 1 && (!newGroup.name || !newGroup.contactPerson || !newGroup.contactPhone || !newGroup.checkIn || !newGroup.checkOut)) ||
                    (createStep === 2 && selectedRoomIds.length === 0)
                  }
                >
                  {createStep === 3 ? 'Добавить в группу' : 'Далее'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleCreateGroup}
                >
                  <Check className="w-4 h-4" />
                  Создать группу
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
