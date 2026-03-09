import axios from 'axios';

/**
 * Public axios instance for booking pages.
 * Routes through the Next.js API proxy (/api/proxy) so that requests go
 * server-to-server and bypass browser CORS restrictions.
 * Does NOT include JWT interceptors -- these endpoints are fully public.
 */
const publicApi = axios.create({
  baseURL: '/api/proxy',
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
  description_ru?: string | null;
  description_uz?: string | null;
  photos: string[];
  floor?: number;
  available?: boolean;
  price?: {
    total: number;
    price_per_night: number;
    nights: number;
    rate_applied: string;
  } | null;
}

export interface HotelExtra {
  id: number;
  name: string;
  description: string | null;
  price: number;
  price_type: 'per_booking' | 'per_night' | 'per_person';
  icon: string | null;
}

export interface MiniSiteConfig {
  display_name?: string;
  about?: string;
  logo_url?: string;
  cover_image_url?: string;
  gallery?: string[];
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
  google_maps_link?: string;
  google_maps_url?: string;
  theme_preset?: string;
  primary_color?: string;
  show_prices?: boolean;
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
  mini_site_config?: MiniSiteConfig;
}

export interface ExtrasBreakdownItem {
  extra_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  price_type: string;
  total: number;
}

export interface PriceCalculation {
  room_price: number;
  extras_price: number;
  total: number;
  nights: number;
  price_per_night: number;
  rate_applied: string;
  extras_breakdown: ExtrasBreakdownItem[];
}

export interface BookingConfirmation {
  booking_id?: number;
  booking_number: string;
  status: string;
  property_name?: string;
  room_name?: string;
  room?: { name: string; room_type: string } | null;
  check_in: string;
  check_out: string;
  nights: number;
  adults?: number;
  children?: number;
  total_amount: number;
  paid_amount?: number;
  currency?: string;
  guest_name?: string;
  guest?: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  } | null;
  extras: Array<{ name?: string; quantity?: number; unit_price?: number; total_price: number; property_extra_id?: number }>;
  notes?: string | null;
  created_at?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  url: string | null;
  enabled: boolean;
}

export interface PaymentInfo {
  booking_id: number;
  booking_number: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  currency: string;
  fully_paid: boolean;
  methods: PaymentMethod[];
}

export interface CreateBookingPayload {
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
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
    publicApi.get(`/book/${slug}`).then((r) => {
      const { property, rooms, extras } = r.data;
      const config = property.mini_site_config || {};

      // Map description_ru to description for rooms
      const mappedRooms = (rooms || []).map((room: any) => ({
        ...room,
        description: room.description ?? room.description_ru ?? null,
      }));

      // Sync: prefer mini_site_config values (user-edited in settings) over property defaults
      const coverPhoto = config.cover_image_url || property.cover_photo || null;
      const photos = (config.gallery?.length > 0)
        ? config.gallery
        : (property.photos || []);
      const description = config.about || property.description || null;

      return {
        ...property,
        cover_photo: coverPhoto,
        photos,
        description,
        rooms: mappedRooms,
        extras,
        mini_site_config: config,
      };
    }),

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
      .then((r) => {
        // API returns { check_in, check_out, rooms: [...] }
        const rooms = r.data.rooms ?? r.data;
        return (Array.isArray(rooms) ? rooms : []).map((room: any) => ({
          ...room,
          description: room.description ?? room.description_ru ?? null,
          // Flatten price for base_price display when available
          base_price: room.base_price ?? room.price?.price_per_night ?? 0,
        }));
      }),

  /** Calculate total price for selected room and extras. */
  calculatePrice: (
    slug: string,
    data: CalculatePricePayload,
  ): Promise<PriceCalculation> =>
    publicApi.post(`/book/${slug}/calculate`, data).then((r) => {
      const d = r.data;
      // Map API response { room: { total, ... }, extras: [...], extras_total, grand_total }
      // to frontend PriceCalculation { room_price, extras_price, total, nights, extras_breakdown }
      return {
        room_price: d.room?.total ?? 0,
        extras_price: d.extras_total ?? 0,
        total: d.grand_total ?? 0,
        nights: d.room?.nights ?? 0,
        price_per_night: d.room?.price_per_night ?? 0,
        rate_applied: d.room?.rate_applied ?? 'base',
        extras_breakdown: (d.extras ?? []).map((ext: any) => ({
          extra_id: ext.extra_id,
          name: ext.name,
          quantity: ext.quantity,
          unit_price: ext.unit_price,
          price_type: ext.price_type,
          total: ext.total,
        })),
      };
    }),

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

  /** Get available payment methods and URLs for a booking. */
  getPaymentInfo: (
    slug: string,
    bookingNumber: string,
  ): Promise<PaymentInfo> =>
    publicApi
      .get(`/book/${slug}/payment-info/${bookingNumber}`)
      .then((r) => r.data),
};
