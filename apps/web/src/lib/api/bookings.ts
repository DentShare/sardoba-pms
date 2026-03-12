import { api } from '@/lib/api';
import type {
  Booking,
  PaginatedResponse,
  CalendarResponse,
} from '@sardoba/shared';

export interface BookingFilters {
  propertyId?: number;
  status?: string;
  source?: string;
  roomId?: number;
  guestId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateBookingDto {
  property_id: number;
  room_id: number;
  guest_id?: number;
  guest?: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    nationality?: string;
  };
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  rate_id?: number;
  source?: string;
  source_reference?: string;
  notes?: string;
  promo_code?: string;
}

export interface UpdateBookingDto {
  room_id?: number;
  check_in?: string;
  check_out?: string;
  adults?: number;
  children?: number;
  rate_id?: number;
  notes?: string;
}

/**
 * List bookings with filters and pagination.
 */
export async function listBookings(
  filters: BookingFilters = {},
): Promise<PaginatedResponse<Booking>> {
  const params: Record<string, unknown> = {};

  if (filters.status) params.status = filters.status;
  if (filters.source) params.source = filters.source;
  if (filters.roomId) params.room_id = filters.roomId;
  if (filters.guestId) params.guest_id = filters.guestId;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.perPage) params.per_page = filters.perPage;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.sortOrder) params.sort_order = filters.sortOrder;

  const { data } = await api.get<PaginatedResponse<Booking>>(
    `/properties/${filters.propertyId}/bookings`,
    { params },
  );
  return data;
}

/**
 * Get a single booking by ID.
 */
export async function getBooking(id: number): Promise<Booking> {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

/**
 * Create a new booking.
 */
export async function createBooking(dto: CreateBookingDto): Promise<Booking> {
  const { data } = await api.post<Booking>('/bookings', dto);
  return data;
}

/**
 * Update a booking.
 */
export async function updateBooking(
  id: number,
  dto: UpdateBookingDto,
): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}`, dto);
  return data;
}

/**
 * Cancel a booking with a reason.
 */
export async function cancelBooking(
  id: number,
  reason: string,
): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/cancel`, {
    reason,
  });
  return data;
}

/**
 * Confirm a booking (new -> confirmed).
 */
export async function confirmBooking(id: number): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/confirm`);
  return data;
}

/**
 * Check in a booking.
 */
export async function checkinBooking(id: number): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/check-in`);
  return data;
}

/**
 * Check out a booking.
 */
export async function checkoutBooking(id: number): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/check-out`);
  return data;
}

/**
 * Get today's dashboard summary.
 */
export interface TodaySummaryBooking {
  id: number;
  bookingNumber: string;
  guestName: string | null;
  guestPhone: string | null;
  roomName: string | null;
  roomId: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  source: string;
  adults: number;
  children: number;
}

export interface TodaySummary {
  stats: {
    totalRooms: number;
    occupiedRooms: number;
    occupancyPercent: number;
    arrivalsCount: number;
    departuresCount: number;
    inHouseCount: number;
    todayRevenue: number;
  };
  guestCounts: {
    inHouseAdults: number;
    inHouseChildren: number;
    inHouseTotal: number;
    breakfastToday: number;
    breakfastTomorrow: number;
  };
  arrivals: TodaySummaryBooking[];
  departures: TodaySummaryBooking[];
  inHouse: TodaySummaryBooking[];
}

export async function getTodaySummary(propertyId: number): Promise<TodaySummary> {
  const { data } = await api.get<TodaySummary>(`/properties/${propertyId}/today`);
  return data;
}

/**
 * Get calendar data for a property within a date range.
 */
export async function getCalendar(
  propertyId: number,
  dateFrom: string,
  dateTo: string,
): Promise<CalendarResponse> {
  const { data } = await api.get<CalendarResponse>(
    `/properties/${propertyId}/calendar`,
    {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
      },
    },
  );
  return data;
}

// ── Flexibility (Early check-in / Late check-out) ─────────────────────────────

export interface FlexibilityOptions {
  earlyCheckin: {
    available: boolean;
    earliestTime?: string;
    price?: number;
  };
  lateCheckout: {
    available: boolean;
    latestTime?: string;
    price?: number;
  };
}

export async function getFlexibilityOptions(bookingId: number): Promise<FlexibilityOptions> {
  const { data } = await api.get<FlexibilityOptions>(
    `/bookings/${bookingId}/flexibility-options`,
  );
  return data;
}

export async function setEarlyCheckin(
  bookingId: number,
  time: string,
  price: number,
): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${bookingId}/early-checkin`, {
    time,
    price,
  });
  return data;
}

export async function removeEarlyCheckin(bookingId: number): Promise<Booking> {
  const { data } = await api.delete<Booking>(`/bookings/${bookingId}/early-checkin`);
  return data;
}

export async function setLateCheckout(
  bookingId: number,
  time: string,
  price: number,
): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${bookingId}/late-checkout`, {
    time,
    price,
  });
  return data;
}

export async function removeLateCheckout(bookingId: number): Promise<Booking> {
  const { data } = await api.delete<Booking>(`/bookings/${bookingId}/late-checkout`);
  return data;
}
