import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

/**
 * Public axios instance for booking pages.
 * Does NOT include JWT interceptors -- these endpoints are fully public.
 */
const publicApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Response types ──────────────────────────────────────────────────────── */

export interface HotelRoom {
  id: number;
  name: string;
  room_type: string;
  capacity_adults: number;
  capacity_children: number;
  base_price: number;
  amenities: string[];
  description: string | null;
  photos: string[];
}

export interface HotelExtra {
  id: number;
  name: string;
  description: string | null;
  price: number;
  price_type: 'per_booking' | 'per_night' | 'per_person';
  icon: string | null;
}

export interface HotelPublicInfo {
  name: string;
  city: string;
  address: string;
  phone: string;
  currency: string;
  checkin_time: string;
  checkout_time: string;
  description: string | null;
  cover_photo: string | null;
  photos: string[];
  rooms: HotelRoom[];
  extras: HotelExtra[];
}

export interface PriceBreakdownItem {
  date: string;
  price: number;
  rate_name: string;
}

export interface ExtrasBreakdownItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PriceCalculation {
  room_price: number;
  extras_price: number;
  total: number;
  nights: number;
  breakdown: PriceBreakdownItem[];
  extras_breakdown: ExtrasBreakdownItem[];
}

export interface BookingConfirmation {
  booking_number: string;
  status: string;
  room_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_amount: number;
  guest_name: string;
  extras: Array<{ name: string; total_price: number }>;
}

export interface CreateBookingPayload {
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_phone: string;
  guest_email?: string;
  notes?: string;
  extras?: Array<{ extra_id: number; quantity: number }>;
}

export interface CalculatePricePayload {
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  extras?: Array<{ extra_id: number; quantity: number }>;
}

/* ── API methods ─────────────────────────────────────────────────────────── */

export const publicBookingApi = {
  /** Get public hotel information (rooms, extras, photos). */
  getHotel: (slug: string): Promise<HotelPublicInfo> =>
    publicApi.get(`/book/${slug}`).then((r) => r.data),

  /** Get available rooms for the given date range. */
  getAvailableRooms: (
    slug: string,
    checkIn: string,
    checkOut: string,
  ): Promise<HotelRoom[]> =>
    publicApi
      .get(`/book/${slug}/rooms`, {
        params: { check_in: checkIn, check_out: checkOut },
      })
      .then((r) => r.data),

  /** Calculate total price for selected room and extras. */
  calculatePrice: (
    slug: string,
    data: CalculatePricePayload,
  ): Promise<PriceCalculation> =>
    publicApi.post(`/book/${slug}/calculate`, data).then((r) => r.data),

  /** Create a new booking. */
  createBooking: (
    slug: string,
    data: CreateBookingPayload,
  ): Promise<BookingConfirmation> =>
    publicApi.post(`/book/${slug}`, data).then((r) => r.data),

  /** Get booking confirmation details. */
  getConfirmation: (
    slug: string,
    bookingNumber: string,
  ): Promise<BookingConfirmation> =>
    publicApi
      .get(`/book/${slug}/confirmation/${bookingNumber}`)
      .then((r) => r.data),
};
