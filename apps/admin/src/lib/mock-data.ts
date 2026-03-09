export type PlanId = 'starter' | 'standard' | 'professional' | 'enterprise';

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  yearlyPrice: number;
  maxRooms: number | null;
  maxUsers: number | null;
  maxOtaChannels: number | null;
  features: string[];
  color: string;
  badgeClass: string;
}

export const planConfigs: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 150000,
    yearlyPrice: 1440000,
    maxRooms: 15,
    maxUsers: 1,
    maxOtaChannels: 0,
    features: [
      'Шахматка (30 дней)',
      'Базовые бронирования',
      'WhatsApp-подтверждения',
      'Telegram-уведомления (новая бронь)',
      'Простая аналитика загрузки',
    ],
    color: '#6B7280',
    badgeClass: 'badge badge-gray',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 350000,
    yearlyPrice: 3360000,
    maxRooms: 50,
    maxUsers: 3,
    maxOtaChannels: 2,
    features: [
      'Шахматка (90 дней, drag & drop)',
      'Channel Manager (Booking + Airbnb)',
      'Полная CRM / карточка гостя',
      'Payme / Click',
      'Дашборд аналитики (ADR, RevPAR)',
      'Экспорт ОВИР',
      'Все Telegram-уведомления',
      '2 роли (владелец + администратор)',
    ],
    color: '#2563EB',
    badgeClass: 'badge badge-blue',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 700000,
    yearlyPrice: 6720000,
    maxRooms: 150,
    maxUsers: 10,
    maxOtaChannels: 10,
    features: [
      'Housekeeping (статусы, задачи)',
      'Групповые бронирования',
      'Виджет онлайн-бронирования',
      'До 10 OTA-каналов',
      'SMS/Email-рассылки',
      'P&L отчёт',
      'Фискальные регистраторы',
      'Логи действий пользователей',
      '3+ роли',
    ],
    color: '#7C3AED',
    badgeClass: 'badge badge-purple',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    yearlyPrice: 0,
    maxRooms: null,
    maxUsers: null,
    maxOtaChannels: null,
    features: [
      'Revenue Management',
      'Мульти-объект (сети отелей)',
      '50+ OTA-каналов',
      'Интеграция с 1С',
      'Электронные замки',
      'Складской учёт',
      'Готовый сайт-конструктор',
      'Кастомизируемые отчёты',
      '2FA, без лимита пользователей',
    ],
    color: '#059669',
    badgeClass: 'badge badge-green',
  },
};

export interface Hotel {
  id: number;
  name: string;
  city: string;
  address: string;
  owner: string;
  ownerPhone: string;
  ownerEmail: string;
  rooms: number;
  plan: PlanId;
  status: 'active' | 'suspended' | 'trial' | 'inactive';
  trialEndsAt: string | null;
  createdAt: string;
  lastActivity: string;
  occupancy: number;
  monthlyRevenue: number;
  totalBookings: number;
  channelManagerEnabled: boolean;
  telegramConnected: boolean;
  syncErrors: number;
}

export interface Booking {
  id: number;
  bookingNumber: string;
  hotelId: number;
  hotelName: string;
  guestName: string;
  guestPhone: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'new';
  source: 'direct' | 'booking.com' | 'airbnb' | 'expedia';
  amount: number;
  currency: string;
  createdAt: string;
}

export interface SystemLog {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  hotelId: number | null;
  hotelName: string | null;
  details: string;
  userId: number | null;
  requestId: string;
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'admin' | 'viewer';
  hotelId: number;
  hotelName: string;
  status: 'active' | 'blocked' | 'pending';
  lastLogin: string;
  createdAt: string;
}

export interface Subscription {
  id: number;
  hotelId: number;
  hotelName: string;
  plan: PlanId;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startDate: string;
  endDate: string;
  amount: number;
  paymentMethod: string;
  autoRenew: boolean;
  roomsUsed: number;
  usersCount: number;
  otaChannelsUsed: number;
}

const cities = ['Самарканд', 'Бухара', 'Хива', 'Ташкент', 'Фергана', 'Нукус', 'Навои', 'Шахрисабз'];
const hotelPrefixes = ['Grand', 'Royal', 'Old City', 'Silk Road', 'Amir', 'Orient', 'Caravanserai', 'Registan', 'Ichan-Qala', 'Labi-Hauz', 'Ark', 'Minzifa', 'Bibi-Khanym', 'Ulugbek', 'Nadir'];
const hotelSuffixes = ['Hotel', 'Guest House', 'B&B', 'Boutique', 'Inn', 'Residence'];
const ownerNames = ['Камолов Азиз', 'Рахимова Нилуфар', 'Холматов Шерзод', 'Каримова Дилноза', 'Усманов Бахтиёр', 'Мирзаев Отабек', 'Алиева Гулнора', 'Насруллаев Джасур', 'Турсунов Нодир', 'Ахмедова Зарина', 'Салимов Улугбек', 'Раджабов Фаррух', 'Юсупова Мадина', 'Бобоев Сардор', 'Муминов Ильхом'];
const guestNames = ['Ахмедов Алишер', 'Петров Иван', 'Schmidt Hans', 'Tanaka Yuki', 'Kim Soo-Jin', 'Rossi Marco', 'Dubois Pierre', 'Garcia Maria', 'Brown James', 'Müller Thomas', 'Сидоров Пётр', 'Williams John', 'Lee Min-ho', 'Иванова Елена', 'Martin Sophie'];

export const hotels: Hotel[] = Array.from({ length: 47 }, (_, i) => {
  const city = cities[i % cities.length];
  const plan = (['starter', 'standard', 'professional', 'enterprise'] as const)[Math.floor(Math.random() * 4)];
  const status = i < 3 ? 'trial' as const : (['active', 'active', 'active', 'active', 'suspended', 'inactive'] as const)[Math.floor(Math.random() * 6)];
  return {
    id: i + 1,
    name: `${hotelPrefixes[i % hotelPrefixes.length]} ${hotelSuffixes[i % hotelSuffixes.length]}`,
    city,
    address: `ул. ${['Регистан', 'Тимура', 'Навои', 'Мустакиллик', 'Шахрисабз', 'Бухоро'][i % 6]}, ${10 + i}`,
    owner: ownerNames[i % ownerNames.length],
    ownerPhone: `+998${90 + (i % 10)}${String(1000000 + Math.floor(Math.random() * 9000000)).slice(0, 7)}`,
    ownerEmail: `owner${i + 1}@mail.uz`,
    rooms: 5 + Math.floor(Math.random() * 30),
    plan,
    status,
    trialEndsAt: status === 'trial' ? '2026-03-15' : null,
    createdAt: `2025-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
    lastActivity: `2026-02-${String(1 + Math.floor(Math.random() * 25)).padStart(2, '0')}T${String(8 + Math.floor(Math.random() * 14)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
    occupancy: 20 + Math.floor(Math.random() * 75),
    monthlyRevenue: Math.floor(5000000 + Math.random() * 95000000),
    totalBookings: Math.floor(10 + Math.random() * 500),
    channelManagerEnabled: Math.random() > 0.3,
    telegramConnected: Math.random() > 0.25,
    syncErrors: Math.floor(Math.random() * 10),
  };
});

export const bookings: Booking[] = Array.from({ length: 200 }, (_, i) => {
  const hotel = hotels[i % hotels.length];
  const day = 1 + Math.floor(Math.random() * 25);
  const nights = 1 + Math.floor(Math.random() * 7);
  return {
    id: i + 1,
    bookingNumber: `BK-2026-${String(i + 1).padStart(4, '0')}`,
    hotelId: hotel.id,
    hotelName: hotel.name,
    guestName: guestNames[i % guestNames.length],
    guestPhone: `+998${90 + (i % 10)}${String(1000000 + Math.floor(Math.random() * 9000000)).slice(0, 7)}`,
    roomName: `${100 + Math.floor(Math.random() * 20)}`,
    checkIn: `2026-02-${String(day).padStart(2, '0')}`,
    checkOut: `2026-02-${String(Math.min(day + nights, 28)).padStart(2, '0')}`,
    status: (['confirmed', 'checked_in', 'checked_out', 'cancelled', 'new'] as const)[Math.floor(Math.random() * 5)],
    source: (['direct', 'booking.com', 'airbnb', 'expedia'] as const)[Math.floor(Math.random() * 4)],
    amount: Math.floor(10000000 + Math.random() * 90000000),
    currency: 'UZS',
    createdAt: `2026-02-${String(Math.max(1, day - 3)).padStart(2, '0')}T10:00:00Z`,
  };
});

const logMessages: { level: SystemLog['level']; service: string; message: string; details: string }[] = [
  { level: 'info', service: 'auth', message: 'Пользователь авторизован', details: 'IP: 195.158.1.xx, UA: Chrome/120' },
  { level: 'info', service: 'booking', message: 'Бронирование создано', details: 'Источник: direct, номер: 102' },
  { level: 'info', service: 'channel-manager', message: 'Синхронизация завершена', details: 'Booking.com: 12 номеров обновлено' },
  { level: 'warning', service: 'channel-manager', message: 'Задержка синхронизации', details: 'Airbnb API ответил за 8.2с (порог: 5с)' },
  { level: 'warning', service: 'payment', message: 'Payme webhook повторная попытка', details: 'Attempt 2/3, transaction_id: TXN-9823' },
  { level: 'warning', service: 'auth', message: 'Множественные неудачные попытки входа', details: '5 попыток за 10 минут, IP: 195.158.2.xx' },
  { level: 'error', service: 'channel-manager', message: 'Ошибка синхронизации Booking.com', details: 'HTTP 503: Service Unavailable. Rate mapping failed for room_id=15' },
  { level: 'error', service: 'payment', message: 'Ошибка обработки платежа Click', details: 'Timeout after 30s, order_id: ORD-4521' },
  { level: 'error', service: 'api', message: 'Внутренняя ошибка сервера', details: 'TypeError: Cannot read property "id" of undefined at BookingService.create()' },
  { level: 'error', service: 'telegram', message: 'Не удалось отправить уведомление', details: 'Bot token expired, hotel_id: 23' },
  { level: 'critical', service: 'database', message: 'Превышен лимит соединений БД', details: 'Active connections: 98/100, queue: 15 pending' },
  { level: 'critical', service: 'api', message: 'Высокая задержка API', details: 'p99 latency: 4.2s, average: 1.8s, affected endpoints: /bookings, /calendar' },
  { level: 'info', service: 'booking', message: 'Статус бронирования изменён', details: 'BK-2026-0042: confirmed → checked_in' },
  { level: 'warning', service: 'storage', message: 'Дисковое пространство заканчивается', details: 'Использовано 87% из 100GB' },
  { level: 'error', service: 'channel-manager', message: 'Airbnb iCal ошибка парсинга', details: 'Invalid DTSTART format in calendar feed, property_id: 31' },
  { level: 'info', service: 'cron', message: 'Ежедневное резервное копирование завершено', details: 'Размер: 2.3GB, время: 12 мин' },
  { level: 'info', service: 'notification', message: 'Утренний дайджест отправлен', details: '38 отелей получили уведомления в Telegram' },
  { level: 'error', service: 'api', message: 'Rate limit exceeded', details: 'Client IP: 195.158.3.xx, 150 requests in 60s' },
];

export const systemLogs: SystemLog[] = Array.from({ length: 500 }, (_, i) => {
  const entry = logMessages[i % logMessages.length];
  const hotel = Math.random() > 0.3 ? hotels[Math.floor(Math.random() * hotels.length)] : null;
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  const day = 1 + Math.floor(i / 20);
  return {
    id: i + 1,
    timestamp: `2026-02-${String(Math.min(day, 25)).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}Z`,
    level: entry.level,
    service: entry.service,
    message: entry.message,
    hotelId: hotel?.id ?? null,
    hotelName: hotel?.name ?? null,
    details: entry.details,
    userId: Math.random() > 0.5 ? Math.floor(Math.random() * 80) + 1 : null,
    requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
  };
}).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export const platformUsers: PlatformUser[] = Array.from({ length: 82 }, (_, i) => {
  const hotel = hotels[i % hotels.length];
  const role = i % 3 === 0 ? 'owner' as const : i % 3 === 1 ? 'admin' as const : 'viewer' as const;
  return {
    id: i + 1,
    name: ownerNames[i % ownerNames.length],
    email: `user${i + 1}@mail.uz`,
    phone: `+998${90 + (i % 10)}${String(1000000 + Math.floor(Math.random() * 9000000)).slice(0, 7)}`,
    role,
    hotelId: hotel.id,
    hotelName: hotel.name,
    status: (['active', 'active', 'active', 'blocked', 'pending'] as const)[Math.floor(Math.random() * 5)],
    lastLogin: `2026-02-${String(1 + Math.floor(Math.random() * 25)).padStart(2, '0')}T${String(8 + Math.floor(Math.random() * 14)).padStart(2, '0')}:00:00Z`,
    createdAt: `2025-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-15`,
  };
});

export const subscriptions: Subscription[] = hotels.map((h, i) => {
  const config = planConfigs[h.plan];
  const maxRooms = config.maxRooms ?? 200;
  return {
    id: i + 1,
    hotelId: h.id,
    hotelName: h.name,
    plan: h.plan,
    status: h.status === 'trial' ? 'trial' as const : h.status === 'active' ? 'active' as const : h.status === 'suspended' ? 'expired' as const : 'cancelled' as const,
    startDate: h.createdAt,
    endDate: `2026-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-28`,
    amount: config.price,
    paymentMethod: (['Payme', 'Click', 'Карта', 'Перевод'] as const)[Math.floor(Math.random() * 4)],
    autoRenew: Math.random() > 0.3,
    roomsUsed: Math.min(h.rooms, maxRooms),
    usersCount: 1 + Math.floor(Math.random() * (config.maxUsers ?? 20)),
    otaChannelsUsed: Math.min(Math.floor(Math.random() * 4), config.maxOtaChannels ?? 50),
  };
});

// ── Hotel Room Registry (per-hotel rooms) ─────────────────────────────────

export type HotelRoomType = 'single' | 'double' | 'family' | 'suite' | 'dorm';
export type HotelRoomCleaningStatus = 'clean' | 'dirty' | 'cleaning' | 'inspection' | 'do_not_disturb' | 'out_of_order';
export type BookingOccupancy = 'occupied' | 'vacant' | 'checkout_today' | 'checkin_today';

export interface HotelRoom {
  id: number;
  hotelId: number;
  number: string;
  floor: number;
  type: HotelRoomType;
  basePrice: number;
  status: 'active' | 'maintenance';
  cleaningStatus: HotelRoomCleaningStatus;
  occupancy: BookingOccupancy;
  guestName: string | null;
  guestCheckIn: string | null;
  guestCheckOut: string | null;
}

export interface HotelStaffMember {
  id: number;
  hotelId: number;
  name: string;
  phone: string;
  role: 'maid' | 'supervisor' | 'maintenance';
  shift: 'morning' | 'evening' | 'night';
  isActive: boolean;
  assignedFloor: number | null;
  tasksToday: number;
  tasksCompleted: number;
}

const roomTypeNames: Record<HotelRoomType, string> = {
  single: 'Стандарт',
  double: 'Двухместный',
  family: 'Семейный',
  suite: 'Люкс',
  dorm: 'Дормитори',
};

const roomTypePrices: Record<HotelRoomType, number> = {
  single: 400000,
  double: 600000,
  family: 900000,
  suite: 1500000,
  dorm: 200000,
};

const staffNames = [
  'Гулнора Каримова', 'Дилноза Рахимова', 'Зарина Усманова', 'Нигора Алиева', 'Шахло Мирзаева',
  'Мавлуда Ахмедова', 'Фарида Исмаилова', 'Назира Хасанова', 'Барно Турсунова', 'Озода Султанова',
  'Бахтиёр Жураев', 'Шерзод Бобоев', 'Улугбек Норматов',
];

export function generateHotelRooms(hotel: Hotel): HotelRoom[] {
  const roomCount = hotel.rooms;
  const floors = Math.max(1, Math.ceil(roomCount / 10));
  const types: HotelRoomType[] = ['single', 'double', 'family', 'suite', 'dorm'];
  const cleaningStatuses: HotelRoomCleaningStatus[] = ['clean', 'dirty', 'cleaning', 'inspection', 'do_not_disturb', 'out_of_order'];
  const occupancies: BookingOccupancy[] = ['occupied', 'vacant', 'checkout_today', 'checkin_today'];

  const rooms: HotelRoom[] = [];
  for (let i = 0; i < roomCount; i++) {
    const floor = Math.floor(i / Math.ceil(roomCount / floors)) + 1;
    const roomInFloor = (i % Math.ceil(roomCount / floors)) + 1;
    const seed = hotel.id * 100 + i;
    const type = types[i % types.length];
    const cleaningIdx = Math.abs(Math.floor(Math.sin(seed * 3.7) * 100)) % 6;
    const occupancyIdx = Math.abs(Math.floor(Math.cos(seed * 2.3) * 100)) % 4;
    const occ = occupancies[occupancyIdx];
    const hasGuest = occ === 'occupied' || occ === 'checkout_today';

    rooms.push({
      id: hotel.id * 1000 + i + 1,
      hotelId: hotel.id,
      number: `${floor}${String(roomInFloor).padStart(2, '0')}`,
      floor,
      type,
      basePrice: roomTypePrices[type],
      status: cleaningStatuses[cleaningIdx] === 'out_of_order' && i % 7 === 0 ? 'maintenance' : 'active',
      cleaningStatus: cleaningStatuses[cleaningIdx],
      occupancy: occ,
      guestName: hasGuest ? guestNames[seed % guestNames.length] : null,
      guestCheckIn: hasGuest ? `2026-02-${String(20 + (seed % 5)).padStart(2, '0')}` : null,
      guestCheckOut: hasGuest ? `2026-02-${String(25 + (seed % 4)).padStart(2, '0')}` : null,
    });
  }
  return rooms;
}

export function generateHotelStaff(hotel: Hotel): HotelStaffMember[] {
  const staffCount = Math.max(2, Math.ceil(hotel.rooms / 5));
  const shifts: HotelStaffMember['shift'][] = ['morning', 'evening', 'night'];
  const roles: HotelStaffMember['role'][] = ['maid', 'maid', 'maid', 'supervisor', 'maintenance'];
  const floors = Math.max(1, Math.ceil(hotel.rooms / 10));

  return Array.from({ length: staffCount }, (_, i) => ({
    id: hotel.id * 100 + i + 1,
    hotelId: hotel.id,
    name: staffNames[i % staffNames.length],
    phone: `+998${90 + (i % 10)}${String(3000000 + hotel.id * 1000 + i * 137).slice(0, 7)}`,
    role: roles[i % roles.length],
    shift: shifts[i % shifts.length],
    isActive: i < staffCount - 1 || Math.random() > 0.2,
    assignedFloor: roles[i % roles.length] === 'maid' ? (i % floors) + 1 : null,
    tasksToday: Math.floor(Math.random() * 8) + 1,
    tasksCompleted: Math.floor(Math.random() * 6),
  }));
}

export const ROOM_TYPE_NAMES = roomTypeNames;
export const ROOM_TYPE_PRICES = roomTypePrices;

export function formatUZS(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' сум';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export const platformStats = {
  totalHotels: hotels.length,
  activeHotels: hotels.filter(h => h.status === 'active').length,
  trialHotels: hotels.filter(h => h.status === 'trial').length,
  suspendedHotels: hotels.filter(h => h.status === 'suspended').length,
  totalRooms: hotels.reduce((acc, h) => acc + h.rooms, 0),
  totalBookings: bookings.length,
  totalUsers: platformUsers.length,
  totalRevenue: hotels.reduce((acc, h) => acc + h.monthlyRevenue, 0),
  avgOccupancy: Math.round(hotels.reduce((acc, h) => acc + h.occupancy, 0) / hotels.length),
  errorsToday: systemLogs.filter(l => l.level === 'error' && l.timestamp.startsWith('2026-02-25')).length,
  criticalErrors: systemLogs.filter(l => l.level === 'critical').length,
  channelManagerActive: hotels.filter(h => h.channelManagerEnabled).length,
  mrr: subscriptions.reduce((acc, s) => acc + s.amount, 0),
  arr: subscriptions.reduce((acc, s) => acc + s.amount, 0) * 12,
  churnRate: 4.2,
  trialConversion: 68,
  avgLtv: 5_040_000,
  nps: 72,
};

export interface SystemHealthService {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  lastIncident: string | null;
  requestsPerMin: number;
}

export const systemHealth: SystemHealthService[] = [
  { name: 'API Gateway', status: 'healthy', uptime: 99.97, responseTime: 42, lastIncident: null, requestsPerMin: 1250 },
  { name: 'База данных', status: 'healthy', uptime: 99.99, responseTime: 8, lastIncident: '2026-02-18', requestsPerMin: 3400 },
  { name: 'Channel Manager', status: 'degraded', uptime: 98.5, responseTime: 320, lastIncident: '2026-02-25', requestsPerMin: 85 },
  { name: 'Платежи (Payme/Click)', status: 'healthy', uptime: 99.95, responseTime: 180, lastIncident: '2026-02-10', requestsPerMin: 12 },
  { name: 'Telegram Bot', status: 'healthy', uptime: 99.8, responseTime: 95, lastIncident: '2026-02-20', requestsPerMin: 45 },
  { name: 'SMS Gateway', status: 'healthy', uptime: 99.6, responseTime: 210, lastIncident: '2026-02-22', requestsPerMin: 8 },
  { name: 'Redis / Кэш', status: 'healthy', uptime: 99.99, responseTime: 1, lastIncident: null, requestsPerMin: 5200 },
  { name: 'File Storage', status: 'healthy', uptime: 99.95, responseTime: 55, lastIncident: null, requestsPerMin: 32 },
];

export const mrrHistory = [
  { month: 'Сен 25', mrr: 2_100_000, hotels: 12, newHotels: 4, churned: 1 },
  { month: 'Окт 25', mrr: 3_500_000, hotels: 18, newHotels: 7, churned: 1 },
  { month: 'Ноя 25', mrr: 5_200_000, hotels: 22, newHotels: 5, churned: 1 },
  { month: 'Дек 25', mrr: 6_800_000, hotels: 25, newHotels: 4, churned: 1 },
  { month: 'Янв 26', mrr: 9_500_000, hotels: 32, newHotels: 8, churned: 1 },
  { month: 'Фев 26', mrr: 13_400_000, hotels: 47, newHotels: 17, churned: 2 },
];

export interface SupportTicket {
  id: number;
  hotelName: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export const supportTickets: SupportTicket[] = [
  { id: 1, hotelName: 'Grand Hotel', subject: 'Не работает синхронизация Booking.com', priority: 'high', status: 'in_progress', createdAt: '2026-02-25T09:30:00Z' },
  { id: 2, hotelName: 'Silk Road Inn', subject: 'Ошибка при импорте номеров', priority: 'medium', status: 'open', createdAt: '2026-02-25T08:15:00Z' },
  { id: 3, hotelName: 'Old City B&B', subject: 'Telegram бот не отправляет уведомления', priority: 'high', status: 'open', createdAt: '2026-02-24T16:45:00Z' },
  { id: 4, hotelName: 'Registan Boutique', subject: 'Как подключить Click оплату?', priority: 'low', status: 'in_progress', createdAt: '2026-02-24T14:20:00Z' },
  { id: 5, hotelName: 'Amir Residence', subject: 'Виджет бронирования не отображается на сайте', priority: 'critical', status: 'open', createdAt: '2026-02-25T10:00:00Z' },
];

export const hotelsNeedingAttention = hotels
  .filter(h => h.syncErrors > 3 || h.status === 'suspended' || (h.status === 'trial' && h.trialEndsAt))
  .slice(0, 8);

export const revenueByMonth = [
  { month: 'Сен 25', revenue: 18500000, hotels: 12 },
  { month: 'Окт 25', revenue: 24800000, hotels: 18 },
  { month: 'Ноя 25', revenue: 21300000, hotels: 22 },
  { month: 'Дек 25', revenue: 19700000, hotels: 25 },
  { month: 'Янв 26', revenue: 28900000, hotels: 32 },
  { month: 'Фев 26', revenue: 35400000, hotels: 47 },
];

export const bookingsBySource = [
  { source: 'Прямые', count: 89, percent: 44.5 },
  { source: 'Booking.com', count: 62, percent: 31 },
  { source: 'Airbnb', count: 35, percent: 17.5 },
  { source: 'Expedia', count: 14, percent: 7 },
];

export const hotelsByCity = [
  { city: 'Самарканд', count: 15 },
  { city: 'Бухара', count: 12 },
  { city: 'Ташкент', count: 8 },
  { city: 'Хива', count: 6 },
  { city: 'Фергана', count: 3 },
  { city: 'Другие', count: 3 },
];

export const errorsByService = [
  { service: 'channel-manager', count: 34, trend: 'up' as const },
  { service: 'api', count: 21, trend: 'down' as const },
  { service: 'payment', count: 15, trend: 'stable' as const },
  { service: 'telegram', count: 8, trend: 'down' as const },
  { service: 'database', count: 5, trend: 'up' as const },
  { service: 'auth', count: 3, trend: 'stable' as const },
];

export const dailyActiveUsers = [
  { date: '19 фев', users: 34 },
  { date: '20 фев', users: 38 },
  { date: '21 фев', users: 41 },
  { date: '22 фев', users: 29 },
  { date: '23 фев', users: 31 },
  { date: '24 фев', users: 45 },
  { date: '25 фев', users: 52 },
];
