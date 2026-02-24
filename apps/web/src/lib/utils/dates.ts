import {
  format,
  parseISO,
  differenceInDays,
  isToday as dfIsToday,
  isPast as dfIsPast,
  isFuture as dfIsFuture,
  isValid,
  startOfDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Parses a date string or Date to a Date object.
 */
function toDate(date: string | Date): Date {
  if (typeof date === 'string') {
    return parseISO(date);
  }
  return date;
}

/**
 * Formats a date using date-fns with Russian locale.
 *
 * @example formatDate('2025-01-15') => "15.01.2025"
 * @example formatDate('2025-01-15', 'd MMMM yyyy') => "15 января 2025"
 * @example formatDate('2025-01-15', 'dd MMM') => "15 янв."
 */
export function formatDate(
  date: string | Date,
  formatStr: string = 'dd.MM.yyyy',
): string {
  const d = toDate(date);
  if (!isValid(d)) return '—';
  return format(d, formatStr, { locale: ru });
}

/**
 * Formats a date range.
 *
 * @example formatDateRange('2025-01-15', '2025-01-18') => "15.01 — 18.01.2025"
 */
export function formatDateRange(
  from: string | Date,
  to: string | Date,
): string {
  const fromDate = toDate(from);
  const toDate_ = toDate(to);

  if (!isValid(fromDate) || !isValid(toDate_)) return '—';

  const fromYear = format(fromDate, 'yyyy');
  const toYear = format(toDate_, 'yyyy');

  if (fromYear === toYear) {
    return `${format(fromDate, 'dd.MM', { locale: ru })} — ${format(toDate_, 'dd.MM.yyyy', { locale: ru })}`;
  }

  return `${format(fromDate, 'dd.MM.yyyy', { locale: ru })} — ${format(toDate_, 'dd.MM.yyyy', { locale: ru })}`;
}

/**
 * Returns the number of nights between check-in and check-out.
 */
export function getNights(checkIn: string | Date, checkOut: string | Date): number {
  const from = startOfDay(toDate(checkIn));
  const to = startOfDay(toDate(checkOut));
  return Math.max(0, differenceInDays(to, from));
}

/**
 * Returns true if the date is today.
 */
export function isToday(date: string | Date): boolean {
  return dfIsToday(toDate(date));
}

/**
 * Returns true if the date is in the past.
 */
export function isPast(date: string | Date): boolean {
  return dfIsPast(startOfDay(toDate(date)));
}

/**
 * Returns true if the date is in the future.
 */
export function isFuture(date: string | Date): boolean {
  return dfIsFuture(startOfDay(toDate(date)));
}

/**
 * Formats a datetime in a relative-friendly way.
 *
 * @example formatDateTime('2025-01-15T14:30:00Z') => "15.01.2025 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = toDate(date);
  if (!isValid(d)) return '—';
  return format(d, 'dd.MM.yyyy HH:mm', { locale: ru });
}

/**
 * Formats a time only.
 *
 * @example formatTime('14:30') => "14:30"
 */
export function formatTime(date: string | Date): string {
  const d = toDate(date);
  if (!isValid(d)) return '—';
  return format(d, 'HH:mm');
}
