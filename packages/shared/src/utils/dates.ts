/**
 * Date utilities for Sardoba PMS.
 *
 * Dates in the system:
 *   - Date strings: YYYY-MM-DD format (check_in, check_out, etc.)
 *   - Datetime strings: ISO 8601 UTC (YYYY-MM-DDTHH:MM:SSZ)
 *   - Default timezone: Asia/Tashkent (UTC+5)
 */

const TASHKENT_TZ = 'Asia/Tashkent';

/**
 * Calculate number of nights between two date strings.
 * @example nightsBetween('2025-03-10', '2025-03-13') => 3
 */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a date string is today or in the future (Tashkent timezone).
 */
export function isTodayOrFuture(dateStr: string): boolean {
  const today = todayInTashkent();
  return dateStr >= today;
}

/**
 * Get today as YYYY-MM-DD in Tashkent timezone.
 */
export function todayInTashkent(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TASHKENT_TZ });
}

/**
 * Get current datetime as ISO string in Tashkent timezone awareness.
 */
export function nowInTashkent(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: TASHKENT_TZ }),
  );
}

/**
 * Format a date string for display in Russian locale.
 * @example formatDateRu('2025-03-10') => '10 марта 2025'
 */
export function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TASHKENT_TZ,
  });
}

/**
 * Format a date string for short display.
 * @example formatDateShort('2025-03-10') => '10.03.2025'
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TASHKENT_TZ,
  });
}

/**
 * Generate an array of date strings between two dates (inclusive start, exclusive end).
 * @example dateRange('2025-03-10', '2025-03-13') => ['2025-03-10', '2025-03-11', '2025-03-12']
 */
export function dateRange(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(fromDate);
  const end = new Date(toDate);

  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Check if two date ranges overlap.
 * Ranges are [startA, endA) and [startB, endB) — end date is exclusive (checkout day).
 */
export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && startB < endA;
}
