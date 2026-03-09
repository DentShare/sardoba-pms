'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useRooms } from '@/lib/hooks/use-rooms';
import { useBookings } from '@/lib/hooks/use-bookings';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

type GroupStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
type GuestStatus = 'expected' | 'checked_in' | 'checked_out' | 'no_show';

interface GroupGuest {
  id: number;
  room: string;
  name: string;
  phone: string;
  passport: string;
  status: GuestStatus;
}

interface Group {
  id: number;
  name: string;
  agency: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  status: GroupStatus;
  amount: number;
  paid: number;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  guestList: GroupGuest[];
  allocatedRooms: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GROUP_STATUS_CONFIG: Record<GroupStatus, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Ожидает',     bg: 'bg-gray-100',    text: 'text-gray-700' },
  confirmed:   { label: 'Подтверждён', bg: 'bg-blue-100',    text: 'text-blue-700' },
  checked_in:  { label: 'Заезд',       bg: 'bg-emerald-100', text: 'text-emerald-700' },
  checked_out: { label: 'Выезд',       bg: 'bg-purple-100',  text: 'text-purple-700' },
  cancelled:   { label: 'Отменён',     bg: 'bg-red-100',     text: 'text-red-700' },
};

const GUEST_STATUS_CONFIG: Record<GuestStatus, { label: string; bg: string; text: string }> = {
  expected:    { label: 'Ожидается',   bg: 'bg-gray-100',    text: 'text-gray-700' },
  checked_in:  { label: 'Заехал',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
  checked_out: { label: 'Выехал',      bg: 'bg-purple-100',  text: 'text-purple-700' },
  no_show:     { label: 'Не явился',   bg: 'bg-red-100',     text: 'text-red-700' },
};

const AGENCIES = ['Silk Road Tours', 'Orient Express Travel', 'Samarkand Voyages', 'Bukhara Adventures', 'Aral Expeditions', 'Другое'];

const formatUZS = (amount: number) => new Intl.NumberFormat('uz-UZ').format(amount) + ' сум';

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Mock data ──────────────────────────────────────────────────────────────

function generateGroups(): Group[] {
  const statuses: GroupStatus[] = ['pending', 'confirmed', 'confirmed', 'checked_in', 'checked_in', 'checked_out', 'confirmed', 'pending', 'cancelled', 'checked_in'];
  const names = [
    'Делегация Германия 2026', 'Тур-группа Корея', 'Конференция IT Summit',
    'Свадьба Рахматуллаевых', 'Бизнес-тренинг Uzum', 'Группа Japan Travel',
    'Фестиваль «Шарк Тароналари»', 'Туристы из Франции', 'Отменённая группа',
    'Корпоратив BankTech',
  ];

  return names.map((name, i) => {
    const rooms = [5, 8, 12, 15, 6, 10, 20, 4, 7, 9][i];
    const guests = rooms + Math.floor(rooms * 0.3);
    const amount = rooms * [450000, 380000, 520000, 600000, 350000, 480000, 400000, 550000, 420000, 500000][i];
    const paidRatio = [0.5, 1, 0.7, 1, 0.3, 1, 0.8, 0, 0.2, 0.6][i];
    const checkInDay = [3, 5, 7, 1, 10, -2, 12, 15, 8, 2][i];

    const guestStatuses: GuestStatus[] = ['expected', 'checked_in', 'checked_out', 'no_show'];
    const guestList: GroupGuest[] = Array.from({ length: Math.min(guests, 8) }, (_, j) => ({
      id: i * 100 + j + 1,
      room: String(100 + j + 1),
      name: ['Иванов Пётр', 'Мюллер Ганс', 'Ким Сонхо', 'Танака Юки', 'Дюпон Жан', 'Алиев Бахтиёр', 'Смирнова Елена', 'Ли Мин-хо'][j % 8],
      phone: `+998 9${j}${i} ${100 + j * 11} ${20 + j * 3}${i}`,
      passport: `A${String(1000000 + i * 100000 + j * 1000).slice(0, 7)}`,
      status: statuses[i] === 'checked_in' ? guestStatuses[j % 3] : guestStatuses[0],
    }));

    return {
      id: i + 1,
      name,
      agency: AGENCIES[i % (AGENCIES.length - 1)],
      checkIn: `2026-03-${String(Math.max(1, 10 + checkInDay)).padStart(2, '0')}`,
      checkOut: `2026-03-${String(Math.max(4, 10 + checkInDay + 3)).padStart(2, '0')}`,
      rooms,
      guests,
      status: statuses[i],
      amount,
      paid: Math.round(amount * paidRatio),
      contactPerson: ['Герр Шмидт', 'Пак Минсу', 'Алишер Каримов', 'Нодир Рахматуллаев', 'Фаррух Юсупов', 'Сато Кэндзи', 'Мирзо Улугбек', 'Пьер Леклерк', 'Шухрат Нуров', 'Лазиз Абдуллаев'][i],
      contactPhone: `+998 9${i} 123 45 6${i}`,
      contactEmail: `contact${i + 1}@mail.uz`,
      notes: i === 3 ? 'Нужно оформление зала' : '',
      guestList,
      allocatedRooms: Array.from({ length: rooms }, (_, j) => String(100 + j + 1)),
    };
  });
}

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

function PlusIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function PrintIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function FileIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UserPlusIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function CheckAllIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GroupBookingsPage() {
  const propertyId = usePropertyId();
  const { data: apiRooms } = useRooms(propertyId);

  const [groups, setGroups] = useState<Group[]>(() => generateGroups());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formAgency, setFormAgency] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSelectedRooms, setFormSelectedRooms] = useState<string[]>([]);
  const [formGuests, setFormGuests] = useState<Omit<GroupGuest, 'id' | 'status'>[]>([]);

  // Add guest form
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPassport, setGuestPassport] = useState('');
  const [guestRoom, setGuestRoom] = useState('');

  // Available rooms from API
  const availableRooms = useMemo(() => {
    if (apiRooms && apiRooms.length > 0) {
      return apiRooms.map(r => ({ id: r.id, name: r.name, type: r.roomType, floor: r.floor }));
    }
    return Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: String(Math.floor(i / 10 + 1) * 100 + (i % 10) + 1),
      type: ['standard', 'deluxe', 'suite', 'family', 'economy'][i % 5],
      floor: Math.floor(i / 10) + 1,
    }));
  }, [apiRooms]);

  // Fetch bookings overlapping with selected dates to determine occupied rooms
  const { data: overlappingBookings } = useBookings(
    {
      propertyId: propertyId ?? undefined,
      dateFrom: formCheckIn || undefined,
      dateTo: formCheckOut || undefined,
      perPage: 500,
    },
    { enabled: !!propertyId && !!formCheckIn && !!formCheckOut },
  );

  const occupiedRoomIds = useMemo(() => {
    const ids = new Set<number>();
    if (!overlappingBookings?.data || !formCheckIn || !formCheckOut) return ids;
    for (const b of overlappingBookings.data) {
      if (b.status === 'cancelled' || b.status === 'no_show') continue;
      // Check date overlap: booking overlaps if checkIn < formCheckOut AND checkOut > formCheckIn
      if (b.checkIn < formCheckOut && b.checkOut > formCheckIn) {
        ids.add(b.roomId);
      }
    }
    return ids;
  }, [overlappingBookings, formCheckIn, formCheckOut]);

  // ─── Computed ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = groups.length;
    const pending = groups.filter((g) => g.status === 'pending').length;
    const confirmed = groups.filter((g) => g.status === 'confirmed').length;
    const checkedIn = groups.filter((g) => g.status === 'checked_in').length;
    const totalGuests = groups.reduce((sum, g) => sum + g.guests, 0);
    const revenue = groups.reduce((sum, g) => sum + g.paid, 0);
    const totalAmount = groups.reduce((sum, g) => sum + g.amount, 0);
    return { total, pending, confirmed, checkedIn, totalGuests, revenue, totalAmount };
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (agencyFilter !== 'all' && g.agency !== agencyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!g.name.toLowerCase().includes(q) && !g.agency.toLowerCase().includes(q) && !g.contactPerson.toLowerCase().includes(q)) return false;
      }
      if (dateFrom && g.checkIn < dateFrom) return false;
      if (dateTo && g.checkOut > dateTo) return false;
      return true;
    });
  }, [groups, statusFilter, agencyFilter, search, dateFrom, dateTo]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const updateGroupStatus = useCallback((groupId: number, newStatus: GroupStatus) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, status: newStatus } : g));
    setSelectedGroup((prev) => prev && prev.id === groupId ? { ...prev, status: newStatus } : prev);
    const labels: Record<GroupStatus, string> = { pending: 'Ожидает', confirmed: 'Подтверждён', checked_in: 'Заселена', checked_out: 'Выехала', cancelled: 'Отменена' };
    toast.success(`Группа: ${labels[newStatus]}`);
  }, []);

  const updateGuestStatus = useCallback((groupId: number, guestId: number, newStatus: GuestStatus) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, guestList: g.guestList.map(guest => guest.id === guestId ? { ...guest, status: newStatus } : guest) };
    }));
    setSelectedGroup((prev) => {
      if (!prev || prev.id !== groupId) return prev;
      return { ...prev, guestList: prev.guestList.map(guest => guest.id === guestId ? { ...guest, status: newStatus } : guest) };
    });
  }, []);

  const checkInAll = useCallback((groupId: number) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, status: 'checked_in', guestList: g.guestList.map(guest => guest.status === 'expected' ? { ...guest, status: 'checked_in' } : guest) };
    }));
    setSelectedGroup((prev) => {
      if (!prev || prev.id !== groupId) return prev;
      return { ...prev, status: 'checked_in', guestList: prev.guestList.map(guest => guest.status === 'expected' ? { ...guest, status: 'checked_in' } : guest) };
    });
    toast.success('Все гости заселены');
  }, []);

  const checkOutAll = useCallback((groupId: number) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, status: 'checked_out', guestList: g.guestList.map(guest => ({ ...guest, status: 'checked_out' as GuestStatus })) };
    }));
    setSelectedGroup((prev) => {
      if (!prev || prev.id !== groupId) return prev;
      return { ...prev, status: 'checked_out', guestList: prev.guestList.map(guest => ({ ...guest, status: 'checked_out' as GuestStatus })) };
    });
    toast.success('Группа выехала');
  }, []);

  const resetCreateForm = useCallback(() => {
    setFormName(''); setFormAgency(''); setFormCheckIn(''); setFormCheckOut('');
    setFormContact(''); setFormContactPhone(''); setFormContactEmail('');
    setFormNotes(''); setFormSelectedRooms([]); setFormGuests([]); setCreateStep(1);
  }, []);

  const handleCreateGroup = useCallback(() => {
    if (!formName || !formCheckIn || !formCheckOut) {
      toast.error('Заполните обязательные поля');
      return;
    }
    const newGroup: Group = {
      id: Math.max(0, ...groups.map(g => g.id)) + 1,
      name: formName,
      agency: formAgency || 'Прямая',
      checkIn: formCheckIn,
      checkOut: formCheckOut,
      rooms: formSelectedRooms.length,
      guests: formGuests.length,
      status: 'pending',
      amount: formSelectedRooms.length * 450000,
      paid: 0,
      contactPerson: formContact,
      contactPhone: formContactPhone,
      contactEmail: formContactEmail,
      notes: formNotes,
      allocatedRooms: formSelectedRooms,
      guestList: formGuests.map((g, i) => ({ ...g, id: Date.now() + i, status: 'expected' as GuestStatus })),
    };
    setGroups((prev) => [newGroup, ...prev]);
    setShowCreateModal(false);
    resetCreateForm();
    toast.success('Группа создана');
  }, [groups, formName, formAgency, formCheckIn, formCheckOut, formContact, formContactPhone, formContactEmail, formNotes, formSelectedRooms, formGuests, resetCreateForm]);

  const addGuestToForm = useCallback(() => {
    if (!guestName) { toast.error('Введите имя гостя'); return; }
    setFormGuests((prev) => [...prev, { room: guestRoom || '', name: guestName, phone: guestPhone, passport: guestPassport }]);
    setGuestName(''); setGuestPhone(''); setGuestPassport(''); setGuestRoom('');
    setShowAddGuestModal(false);
  }, [guestName, guestPhone, guestPassport, guestRoom]);

  const addGuestToGroup = useCallback((groupId: number) => {
    if (!guestName) { toast.error('Введите имя гостя'); return; }
    const newGuest: GroupGuest = {
      id: Date.now(),
      room: guestRoom || '',
      name: guestName,
      phone: guestPhone,
      passport: guestPassport,
      status: 'expected',
    };
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, guestList: [...g.guestList, newGuest], guests: g.guests + 1 };
    }));
    setSelectedGroup((prev) => {
      if (!prev || prev.id !== groupId) return prev;
      return { ...prev, guestList: [...prev.guestList, newGuest], guests: prev.guests + 1 };
    });
    setGuestName(''); setGuestPhone(''); setGuestPassport(''); setGuestRoom('');
    setShowAddGuestModal(false);
    toast.success('Гость добавлен');
  }, [guestName, guestPhone, guestPassport, guestRoom]);

  const printRoomingList = useCallback((group: Group) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Rooming List - ${group.name}</title>
      <style>body{font-family:Arial;padding:30px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;} h1{font-size:18px;} .info{display:flex;gap:30px;margin-top:10px;} .info div{font-size:13px;}</style>
      </head><body>
      <h1>${group.name}</h1>
      <div class="info">
        <div><b>Агентство:</b> ${group.agency}</div>
        <div><b>Заезд:</b> ${formatDate(group.checkIn)}</div>
        <div><b>Выезд:</b> ${formatDate(group.checkOut)}</div>
        <div><b>Контакт:</b> ${group.contactPerson} (${group.contactPhone})</div>
      </div>
      <table>
        <thead><tr><th>№</th><th>Номер</th><th>Гость</th><th>Телефон</th><th>Паспорт</th><th>Статус</th></tr></thead>
        <tbody>${group.guestList.map((g, i) => `<tr><td>${i + 1}</td><td>${g.room}</td><td>${g.name}</td><td>${g.phone}</td><td>${g.passport}</td><td>${GUEST_STATUS_CONFIG[g.status].label}</td></tr>`).join('')}</tbody>
      </table>
      <p style="margin-top:20px;font-size:12px;color:#999;">Всего: ${group.guestList.length} гостей · ${group.rooms} номеров · Сумма: ${formatUZS(group.amount)}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }, []);

  const toggleRoom = useCallback((roomName: string) => {
    setFormSelectedRooms((prev) =>
      prev.includes(roomName) ? prev.filter(r => r !== roomName) : [...prev, roomName]
    );
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Групповые бронирования</h1>
          <p className="text-sm text-gray-500 mt-1">Управление группами, турагентствами и rooming lists</p>
        </div>
        <button
          onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors"
        >
          <PlusIcon />
          Создать группу
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Всего групп',  value: String(stats.total),     color: 'text-gray-900' },
          { label: 'Ожидают',      value: String(stats.pending),    color: 'text-amber-600' },
          { label: 'Подтверждено', value: String(stats.confirmed),  color: 'text-blue-600' },
          { label: 'Проживают',    value: String(stats.checkedIn),  color: 'text-emerald-600' },
          { label: 'Всего гостей', value: String(stats.totalGuests), color: 'text-violet-600' },
          { label: 'Оплачено',    value: formatUZS(stats.revenue), color: 'text-sardoba-blue', small: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('font-bold', s.color, (s as { small?: boolean }).small ? 'text-sm' : 'text-xl')}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, контакту..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white">
          <option value="all">Все статусы</option>
          {Object.entries(GROUP_STATUS_CONFIG).map(([key, cfg]) => (<option key={key} value={key}>{cfg.label}</option>))}
        </select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white">
          <option value="all">Все агентства</option>
          {AGENCIES.map((a) => (<option key={a} value={a}>{a}</option>))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white" />
      </div>

      {/* Groups table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Группа</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Агентство</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Заезд</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Выезд</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Номера</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Гости</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Статус</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Оплата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGroups.map((group) => {
                const sCfg = GROUP_STATUS_CONFIG[group.status];
                const paidPct = Math.round((group.paid / group.amount) * 100);
                return (
                  <tr key={group.id} onClick={() => setSelectedGroup(group)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{group.name}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{group.contactPerson}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{group.agency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{formatDate(group.checkIn)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{formatDate(group.checkOut)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{group.rooms}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{group.guests}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', sCfg.bg, sCfg.text)}>{sCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <div className="text-sm font-medium text-gray-900">{formatUZS(group.paid)}</div>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                          <div className={cn('h-full rounded-full', paidPct >= 100 ? 'bg-emerald-500' : 'bg-sardoba-blue')} style={{ width: `${Math.min(100, paidPct)}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{paidPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredGroups.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Нет групп по заданным фильтрам</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create Group Modal ─── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Создать группу</h2>
                  <p className="text-sm text-gray-500">Шаг {createStep} из 3</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><XIcon /></button>
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b">
                {[{ n: 1, label: 'Информация' }, { n: 2, label: 'Номера' }, { n: 3, label: 'Гости' }].map((step) => (
                  <button key={step.n} onClick={() => setCreateStep(step.n)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      createStep === step.n ? 'bg-sardoba-blue text-white' : createStep > step.n ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500')}>
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{step.n}</span>
                    {step.label}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {/* Step 1: Group info */}
                {createStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Название группы *</label>
                      <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Делегация Германия 2026"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Агентство</label>
                        <select value={formAgency} onChange={(e) => setFormAgency(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white">
                          <option value="">Прямая</option>
                          {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо</label>
                        <input value={formContact} onChange={(e) => setFormContact(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Заезд *</label>
                        <input type="date" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Выезд *</label>
                        <input type="date" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="+998..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
                      <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue resize-none" />
                    </div>
                  </>
                )}

                {/* Step 2: Room allocation */}
                {createStep === 2 && (
                  <>
                    <p className="text-sm text-gray-600">
                      Выберите номера для группы ({formSelectedRooms.length} выбрано)
                      {formCheckIn && formCheckOut && (
                        <span className="ml-2 text-gray-400">
                          — {formCheckIn} → {formCheckOut}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded border border-gray-200 bg-white" /> Свободен</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-sardoba-blue/30 border border-sardoba-blue" /> Выбран</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" /> Занят</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[350px] overflow-y-auto">
                      {availableRooms.map((room) => {
                        const selected = formSelectedRooms.includes(room.name);
                        const occupied = occupiedRoomIds.has(room.id);
                        return (
                          <button
                            key={room.id}
                            onClick={() => !occupied && toggleRoom(room.name)}
                            disabled={occupied}
                            title={occupied ? `Номер ${room.name} занят на выбранные даты` : room.type}
                            className={cn(
                              'p-2 rounded-lg border text-center transition-all text-sm relative',
                              occupied
                                ? 'bg-red-50 border-red-300 text-red-400 cursor-not-allowed opacity-75'
                                : selected
                                  ? 'bg-sardoba-blue/10 border-sardoba-blue text-sardoba-blue font-medium'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
                            )}
                          >
                            {room.name}
                            {occupied && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center leading-none">✕</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {occupiedRoomIds.size > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        {occupiedRoomIds.size} {occupiedRoomIds.size === 1 ? 'номер занят' : occupiedRoomIds.size < 5 ? 'номера заняты' : 'номеров занято'} на выбранные даты
                      </p>
                    )}
                  </>
                )}

                {/* Step 3: Guest list */}
                {createStep === 3 && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{formGuests.length} гостей добавлено</p>
                      <button onClick={() => setShowAddGuestModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors">
                        <UserPlusIcon size={14} /> Добавить гостя
                      </button>
                    </div>
                    {formGuests.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Номер</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Гость</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Телефон</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Паспорт</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {formGuests.map((g, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 text-gray-700">{g.room || '—'}</td>
                                <td className="px-3 py-2 font-medium text-gray-900">{g.name}</td>
                                <td className="px-3 py-2 text-gray-500">{g.phone || '—'}</td>
                                <td className="px-3 py-2 text-gray-500">{g.passport || '—'}</td>
                                <td className="px-3 py-2 text-right">
                                  <button onClick={() => setFormGuests(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 text-xs">Убрать</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {formGuests.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">Добавьте гостей в группу</div>
                    )}
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                <button onClick={() => { if (createStep > 1) setCreateStep(s => s - 1); else setShowCreateModal(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                  {createStep > 1 ? 'Назад' : 'Отмена'}
                </button>
                {createStep < 3 ? (
                  <button onClick={() => {
                    if (createStep === 1 && (!formCheckIn || !formCheckOut)) {
                      toast.error('Укажите даты заезда и выезда');
                      return;
                    }
                    if (createStep === 1) {
                      const occupiedNames = new Set(
                        availableRooms.filter(r => occupiedRoomIds.has(r.id)).map(r => r.name)
                      );
                      if (occupiedNames.size > 0) {
                        setFormSelectedRooms(prev => prev.filter(name => !occupiedNames.has(name)));
                      }
                    }
                    setCreateStep(s => s + 1);
                  }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors">
                    Далее
                  </button>
                ) : (
                  <button onClick={handleCreateGroup}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                    Создать группу
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Add Guest Modal (for both create and existing group) ─── */}
      {showAddGuestModal && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowAddGuestModal(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Добавить гостя</h3>
                <button onClick={() => setShowAddGuestModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><XIcon size={18} /></button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Фамилия Имя"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Номер комнаты</label>
                  <select value={guestRoom} onChange={(e) => setGuestRoom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue bg-white">
                    <option value="">Не назначен</option>
                    {(selectedGroup ? selectedGroup.allocatedRooms : formSelectedRooms).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Паспорт</label>
                  <input value={guestPassport} onChange={(e) => setGuestPassport(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+998..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sardoba-blue/20 focus:border-sardoba-blue" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddGuestModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={() => selectedGroup ? addGuestToGroup(selectedGroup.id) : addGuestToForm()}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors">Добавить</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Group Detail Side Panel ─── */}
      {selectedGroup && !showCreateModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedGroup(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">{selectedGroup.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-gray-500">{selectedGroup.agency}</span>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', GROUP_STATUS_CONFIG[selectedGroup.status].bg, GROUP_STATUS_CONFIG[selectedGroup.status].text)}>
                    {GROUP_STATUS_CONFIG[selectedGroup.status].label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"><XIcon /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Group info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Заезд</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedGroup.checkIn)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Выезд</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedGroup.checkOut)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Контактное лицо</p>
                  <p className="font-medium text-gray-900">{selectedGroup.contactPerson}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Телефон</p>
                  <p className="font-medium text-gray-900">{selectedGroup.contactPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Номера</p>
                  <p className="font-medium text-gray-900">{selectedGroup.rooms}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Гости</p>
                  <p className="font-medium text-gray-900">{selectedGroup.guests}</p>
                </div>
              </div>

              {/* Payment summary */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Оплата</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Оплачено</span>
                    <span className="text-sm font-medium text-gray-900">{formatUZS(selectedGroup.paid)} / {formatUZS(selectedGroup.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={cn('h-2.5 rounded-full transition-all', selectedGroup.paid >= selectedGroup.amount ? 'bg-emerald-500' : 'bg-sardoba-blue')}
                      style={{ width: `${Math.min(100, (selectedGroup.paid / selectedGroup.amount) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {Math.round((selectedGroup.paid / selectedGroup.amount) * 100)}% оплачено
                    {selectedGroup.paid < selectedGroup.amount && (
                      <span className="text-red-500 ml-1">· Долг: {formatUZS(selectedGroup.amount - selectedGroup.paid)}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Rooming list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Список проживающих</h4>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setGuestName(''); setGuestPhone(''); setGuestPassport(''); setGuestRoom(''); setShowAddGuestModal(true); }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-sardoba-blue hover:bg-sardoba-blue/5 transition-colors">
                      <UserPlusIcon size={12} /> Добавить
                    </button>
                    <button onClick={() => printRoomingList(selectedGroup)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                      <PrintIcon size={12} /> Печать
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Номер</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Гость</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 hidden sm:table-cell">Паспорт</th>
                        <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Статус</th>
                        <th className="text-right text-xs font-medium text-gray-500 px-3 py-2">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedGroup.guestList.map((guest) => {
                        const gCfg = GUEST_STATUS_CONFIG[guest.status];
                        return (
                          <tr key={guest.id}>
                            <td className="px-3 py-2 font-medium text-gray-900">{guest.room}</td>
                            <td className="px-3 py-2">
                              <div className="text-gray-700">{guest.name}</div>
                              <div className="text-xs text-gray-400">{guest.phone}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-500 hidden sm:table-cell font-mono text-xs">{guest.passport}</td>
                            <td className="px-3 py-2">
                              <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium', gCfg.bg, gCfg.text)}>{gCfg.label}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {guest.status === 'expected' && (
                                <button onClick={() => updateGuestStatus(selectedGroup.id, guest.id, 'checked_in')}
                                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Заселить</button>
                              )}
                              {guest.status === 'checked_in' && (
                                <button onClick={() => updateGuestStatus(selectedGroup.id, guest.id, 'checked_out')}
                                  className="text-xs font-medium text-purple-600 hover:text-purple-800">Выселить</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedGroup.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Примечания</h4>
                  <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-3 border border-amber-200">{selectedGroup.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedGroup.status === 'pending' && (
                    <button onClick={() => updateGroupStatus(selectedGroup.id, 'confirmed')}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-sardoba-blue text-white hover:bg-sardoba-blue-light transition-colors">
                      Подтвердить
                    </button>
                  )}
                  {selectedGroup.status === 'confirmed' && (
                    <button onClick={() => checkInAll(selectedGroup.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                      <CheckAllIcon size={14} /> Заселить всех
                    </button>
                  )}
                  {selectedGroup.status === 'checked_in' && (
                    <button onClick={() => checkOutAll(selectedGroup.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                      <CheckAllIcon size={14} /> Выселить всех
                    </button>
                  )}
                  {(selectedGroup.status === 'confirmed' || selectedGroup.status === 'checked_in') && (
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                      <FileIcon size={14} /> Счёт
                    </button>
                  )}
                  <button onClick={() => printRoomingList(selectedGroup)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                    <PrintIcon size={14} /> Rooming List
                  </button>
                </div>
                {selectedGroup.status !== 'cancelled' && selectedGroup.status !== 'checked_out' && (
                  <button onClick={() => updateGroupStatus(selectedGroup.id, 'cancelled')}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Отменить группу
                  </button>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
