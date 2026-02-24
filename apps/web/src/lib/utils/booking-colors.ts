import type { BookingStatus, BookingSource } from '@sardoba/shared';

interface StatusColor {
  bg: string;
  text: string;
  label: string;
}

/**
 * Color mapping for booking statuses.
 * Uses Tailwind CSS classes for consistency.
 */
export const BOOKING_COLORS: Record<BookingStatus, StatusColor> = {
  new: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'Новая',
  },
  confirmed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'Подтверждена',
  },
  checked_in: {
    bg: 'bg-sardoba-gold/20',
    text: 'text-sardoba-gold-dark',
    label: 'Заехал',
  },
  checked_out: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: 'Выехал',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Отменена',
  },
  no_show: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    label: 'Не заехал',
  },
};

interface SourceColor {
  bg: string;
  text: string;
  label: string;
}

/**
 * Color mapping for booking sources.
 */
export const SOURCE_COLORS: Record<BookingSource, SourceColor> = {
  direct: {
    bg: 'bg-sardoba-blue/10',
    text: 'text-sardoba-blue',
    label: 'Прямое',
  },
  booking_com: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Booking.com',
  },
  airbnb: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    label: 'Airbnb',
  },
  expedia: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'Expedia',
  },
  phone: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Телефон',
  },
  other: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: 'Другое',
  },
};

/**
 * Returns a human-readable label for a booking status.
 */
export function getStatusLabel(status: BookingStatus): string {
  return BOOKING_COLORS[status]?.label || status;
}

/**
 * Returns a human-readable label for a booking source.
 */
export function getSourceLabel(source: BookingSource): string {
  return SOURCE_COLORS[source]?.label || source;
}
