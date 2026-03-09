// ─── PROPERTY ──────────────────────────────────────────────────────────────
export interface Property {
  id: number;
  name: string;
  city: 'Samarkand' | 'Bukhara' | 'Khiva' | 'Tashkent' | 'Fergana' | string;
  address: string;
  phone: string; // format: +998XXXXXXXXX
  currency: 'UZS' | 'USD' | 'EUR';
  timezone: string; // Asia/Tashkent
  locale: 'ru' | 'uz' | 'en';
  checkinTime: string; // HH:MM
  checkoutTime: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── ROOM ──────────────────────────────────────────────────────────────────
export type RoomType = 'single' | 'double' | 'family' | 'suite' | 'dorm';
export type RoomStatus = 'active' | 'maintenance' | 'inactive';
export type RoomAmenity =
  | 'wifi'
  | 'ac'
  | 'tv'
  | 'fridge'
  | 'balcony'
  | 'view'
  | 'bathtub'
  | 'shower'
  | 'safe'
  | 'minibar'
  | 'kettle';

export interface Room {
  id: number;
  propertyId: number;
  name: string;
  roomType: RoomType;
  floor?: number;
  capacityAdults: number;
  capacityChildren: number;
  basePrice: number; // in tiyin (1 sum = 100 tiyin)
  status: RoomStatus;
  amenities: RoomAmenity[];
  descriptionRu?: string;
  descriptionUz?: string;
  photos: string[]; // Cloudinary URLs
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomBlock {
  id: number;
  roomId: number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  reason?: string;
  createdBy: number; // userId
}

// ─── GUEST ─────────────────────────────────────────────────────────────────
export type DocumentType = 'passport' | 'id_card' | 'other';

export interface Guest {
  id: number;
  propertyId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  nationality?: string; // ISO 3166-1 alpha-2: UZ, RU, DE
  documentType?: DocumentType;
  documentNumber?: string; // encrypted in DB
  dateOfBirth?: string; // YYYY-MM-DD
  isVip: boolean;
  notes?: string;
  totalRevenue: number; // denormalized, updated by trigger
  visitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── BOOKING ───────────────────────────────────────────────────────────────
export type BookingStatus =
  | 'new'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type BookingSource =
  | 'direct'
  | 'direct_widget'
  | 'booking_com'
  | 'airbnb'
  | 'expedia'
  | 'phone'
  | 'website'
  | 'other';

export interface Booking {
  id: number;
  bookingNumber: string; // BK-2025-0001
  propertyId: number;
  roomId: number;
  guestId: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  nights: number; // computed
  adults: number;
  children: number;
  rateId?: number;
  totalAmount: number; // tiyin
  paidAmount: number; // denormalized, updated by trigger
  status: BookingStatus;
  source: BookingSource;
  sourceReference?: string; // ID in OTA
  notes?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdBy: number; // userId
  createdAt: Date;
  updatedAt: Date;
}

// ─── BOOKING EXTRA ──────────────────────────────────────────────────────
export interface BookingExtra {
  id: number;
  bookingId: number;
  propertyExtraId: number;
  name: string;
  quantity: number;
  unitPrice: number; // tiyin
  totalPrice: number; // tiyin
}

// ─── PROPERTY EXTRA ─────────────────────────────────────────────────────
export type PropertyExtraPriceType = 'per_booking' | 'per_night' | 'per_person';

export interface PropertyExtra {
  id: number;
  propertyId: number;
  name: string;
  description?: string;
  price: number; // tiyin
  priceType: PropertyExtraPriceType;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingHistory {
  id: number;
  bookingId: number;
  userId: number;
  action: string; // STATUS_CHANGED, PAYMENT_ADDED, etc.
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  createdAt: Date;
}

// ─── RATE ──────────────────────────────────────────────────────────────────
export type RateType = 'base' | 'seasonal' | 'weekend' | 'longstay' | 'special';

export interface Rate {
  id: number;
  propertyId: number;
  name: string;
  type: RateType;
  price?: number; // tiyin per night (if not discount)
  discountPercent?: number; // percent of base price
  dateFrom?: string; // YYYY-MM-DD (for seasonal)
  dateTo?: string;
  minStay?: number; // minimum nights
  appliesToRooms: number[]; // [] = all rooms
  daysOfWeek: number[]; // [] = all days, 0=Mon..6=Sun
  createdAt: Date;
  updatedAt: Date;
}

export interface RateCalculation {
  nights: number;
  rateApplied: string;
  pricePerNight: number;
  total: number;
  breakdown: Array<{ date: string; price: number; rateName: string }>;
}

// ─── PAYMENT ───────────────────────────────────────────────────────────────
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer'
  | 'payme'
  | 'click'
  | 'other';

export interface Payment {
  id: number;
  bookingId: number;
  amount: number; // tiyin
  method: PaymentMethod;
  paidAt: Date;
  notes?: string;
  reference?: string; // transaction number for online payments
  createdBy: number;
  createdAt: Date;
}

// ─── CHANNEL MANAGER ───────────────────────────────────────────────────────
export type ChannelType =
  | 'booking_com'
  | 'airbnb'
  | 'expedia'
  | 'hotels_com'
  | 'ostrovok';

export type SyncStatus = 'success' | 'error' | 'pending';

export interface Channel {
  id: number;
  propertyId: number;
  type: ChannelType;
  isActive: boolean;
  credentials: Record<string, string>; // encrypted
  lastSyncAt?: Date;
  createdAt: Date;
}

export interface RoomMapping {
  id: number;
  roomId: number;
  channelId: number;
  externalId: string; // listing ID on OTA
}

export interface SyncLog {
  id: number;
  channelId: number;
  eventType: string; // BOOKING_RECEIVED, AVAILABILITY_UPDATED, PRICE_UPDATED
  status: SyncStatus;
  payload?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
}

// ─── USER & AUTH ───────────────────────────────────────────────────────────
export type UserRole = 'owner' | 'admin' | 'viewer' | 'super_admin';

export interface User {
  id: number;
  propertyId: number | null;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
export interface TelegramRecipient {
  name: string;
  chatId: string;
  isActive: boolean;
}

export interface NotificationSettings {
  id?: number;
  propertyId: number;
  telegramRecipients: TelegramRecipient[];
  eventNewBooking: boolean;
  eventCancellation: boolean;
  eventDailyDigest: boolean;
  dailyDigestTime: string; // HH:MM
  eventPayment: boolean;
  eventSyncError: boolean;
  updatedAt?: Date;
}

// ─── ANALYTICS ─────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  occupancyRate: number; // 0-100
  revenue: number; // tiyin
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
  totalBookings: number;
  avgStayNights: number;
  topSource: BookingSource;
  compare?: Partial<AnalyticsSummary>;
}

// ─── FLOOR PLAN ───────────────────────────────────────────────────────────
export type CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type FloorCellType =
  | 'empty'
  | 'room'
  | 'stairs'
  | 'elevator'
  | 'corridor'
  | 'reception'
  | 'wall'
  | 'restroom'
  | 'storage'
  | 'other';

export interface FloorPlanCell {
  row: number;
  col: number;
  type: FloorCellType;
  roomId?: number;
  label?: string;
  colSpan?: number;
  rowSpan?: number;
}

export interface FloorPlan {
  floor: number;
  name: string;
  rows: number;
  cols: number;
  compass: CompassDirection;
  cells: FloorPlanCell[];
  updatedAt: string;
}

export interface FloorPlansConfig {
  version: 1;
  floors: FloorPlan[];
}

// ─── API RESPONSE WRAPPERS ─────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── CALENDAR ──────────────────────────────────────────────────────────────
export interface CalendarRoom {
  id: number;
  name: string;
  type: RoomType;
  bookings: Array<{
    id: number;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    status: BookingStatus;
    source: BookingSource;
    totalAmount: number;
  }>;
  blocks: Array<{
    dateFrom: string;
    dateTo: string;
    reason?: string;
  }>;
}

export interface CalendarResponse {
  rooms: CalendarRoom[];
  dateFrom: string;
  dateTo: string;
}

// ─── PUBLIC BOOKING / MINI-SITE (Agent 15) ──────────────────────────────────

export interface PublicHotelInfo {
  id: string;
  slug: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  whatsapp?: string;
  mini_site_config: MiniSiteConfig;
  rooms: PublicRoomInfo[];
}

export interface MiniSiteConfig {
  hero_title?: string;
  hero_subtitle?: string;
  primary_color?: string;
  theme_preset?: string;
  show_prices?: boolean;
  google_maps_link?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  languages?: ('ru' | 'uz' | 'en')[];
}

export interface PublicRoomInfo {
  id: number;
  name: string;
  type: RoomType;
  capacity: number;
  description?: string;
  amenities: string[];
  photos: string[];
  base_price: number;
}

export interface PublicAvailabilityResult {
  check_in: string;
  check_out: string;
  nights: number;
  available_rooms: PublicAvailableRoom[];
}

export interface PublicAvailableRoom extends PublicRoomInfo {
  price_per_night: number;
  total_price: number;
  rate_name: string;
  breakfast_included: boolean;
  available: boolean;
}

export interface CreatePublicBookingDto {
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  guest: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    citizenship?: string;
  };
  special_requests?: string;
  payment_method: 'on_arrival' | 'online';
}

// ─── DYNAMIC PRICING (Agent 16) ────────────────────────────────────────────

export type DynamicPricingTriggerType =
  | 'occupancy_high'
  | 'occupancy_low'
  | 'days_before'
  | 'day_of_week';

export type DynamicPricingActionType =
  | 'increase_percent'
  | 'decrease_percent'
  | 'set_fixed';

export interface DynamicPricingRule {
  id: string;
  property_id: number;
  name: string;
  is_active: boolean;
  priority: number;
  trigger_type: DynamicPricingTriggerType;
  trigger_config: Record<string, number | number[]>;
  action_type: DynamicPricingActionType;
  action_value: number;
  apply_to: 'all' | 'room_type' | 'room';
  room_ids?: string[];
  min_price?: number;
  max_price?: number;
}

export interface PricingChangeLog {
  id: string;
  room_id: number;
  room_name: string;
  rule_id: string;
  rule_name: string;
  date: string;
  old_price: number;
  new_price: number;
  change_percent: number;
  trigger_value: number;
  created_at: string;
}

// ─── PUSH NOTIFICATIONS (Agent 17) ──────────────────────────────────────────

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    booking_id?: string;
  };
}
