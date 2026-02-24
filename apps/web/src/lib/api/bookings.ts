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
  guest_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  rate_id?: number;
  total_amount: number;
  source: string;
  source_reference?: string;
  notes?: string;
}

export interface UpdateBookingDto {
  room_id?: number;
  check_in?: string;
  check_out?: string;
  adults?: number;
  children?: number;
  rate_id?: number;
  total_amount?: number;
  notes?: string;
}

/**
 * List bookings with filters and pagination.
 */
export async function listBookings(
  filters: BookingFilters = {},
): Promise<PaginatedResponse<Booking>> {
  const params: Record<string, unknown> = {};

  if (filters.propertyId) params.property_id = filters.propertyId;
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

  const { data } = await api.get<PaginatedResponse<Booking>>('/bookings', {
    params,
  });
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
 * Check in a booking.
 */
export async function checkinBooking(id: number): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/checkin`);
  return data;
}

/**
 * Check out a booking.
 */
export async function checkoutBooking(id: number): Promise<Booking> {
  const { data } = await api.post<Booking>(`/bookings/${id}/checkout`);
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
  const { data } = await api.get<CalendarResponse>('/bookings/calendar', {
    params: {
      property_id: propertyId,
      date_from: dateFrom,
      date_to: dateTo,
    },
  });
  return data;
}
