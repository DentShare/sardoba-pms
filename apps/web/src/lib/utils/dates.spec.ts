import { formatDate, formatDateRange, getNights, formatDateTime, formatTime } from './dates';

describe('formatDate', () => {
  // ─── Default format (dd.MM.yyyy) ──────────────────────────────────────

  it('formats date string with default format', () => {
    expect(formatDate('2025-01-15')).toBe('15.01.2025');
  });

  it('formats Date object with default format', () => {
    expect(formatDate(new Date(2025, 0, 15))).toBe('15.01.2025');
  });

  it('formats date with leading zeros', () => {
    expect(formatDate('2025-03-05')).toBe('05.03.2025');
  });

  // ─── Custom formats ──────────────────────────────────────────────────

  it('formats date with custom format "d MMMM yyyy"', () => {
    const result = formatDate('2025-01-15', 'd MMMM yyyy');
    expect(result).toBe('15 января 2025');
  });

  it('formats date with "dd MMM" format', () => {
    const result = formatDate('2025-01-15', 'dd MMM');
    // Russian short month for January
    expect(result).toContain('15');
    expect(result).toContain('янв');
  });

  it('formats date with year-month format', () => {
    const result = formatDate('2025-06-20', 'yyyy-MM');
    expect(result).toBe('2025-06');
  });

  // ─── Invalid dates ───────────────────────────────────────────────────

  it('returns dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('returns dash for invalid Date object', () => {
    expect(formatDate(new Date('invalid'))).toBe('—');
  });

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('handles end of year date', () => {
    expect(formatDate('2025-12-31')).toBe('31.12.2025');
  });

  it('handles leap year date', () => {
    expect(formatDate('2024-02-29')).toBe('29.02.2024');
  });
});

describe('formatDateRange', () => {
  it('formats date range within the same year', () => {
    const result = formatDateRange('2025-01-15', '2025-01-18');
    expect(result).toBe('15.01 — 18.01.2025');
  });

  it('formats date range across years', () => {
    const result = formatDateRange('2024-12-28', '2025-01-03');
    expect(result).toBe('28.12.2024 — 03.01.2025');
  });

  it('returns dash for invalid from date', () => {
    expect(formatDateRange('invalid', '2025-01-18')).toBe('—');
  });

  it('returns dash for invalid to date', () => {
    expect(formatDateRange('2025-01-15', 'invalid')).toBe('—');
  });

  it('handles Date objects', () => {
    const result = formatDateRange(
      new Date(2025, 5, 1), // June 1
      new Date(2025, 5, 5), // June 5
    );
    expect(result).toBe('01.06 — 05.06.2025');
  });
});

describe('getNights', () => {
  // ─── Normal cases ─────────────────────────────────────────────────────

  it('calculates nights for a 3-night stay', () => {
    expect(getNights('2025-01-15', '2025-01-18')).toBe(3);
  });

  it('calculates 1 night', () => {
    expect(getNights('2025-01-15', '2025-01-16')).toBe(1);
  });

  it('calculates nights across months', () => {
    expect(getNights('2025-01-30', '2025-02-02')).toBe(3);
  });

  it('calculates nights across years', () => {
    expect(getNights('2024-12-30', '2025-01-02')).toBe(3);
  });

  // ─── Same day ─────────────────────────────────────────────────────────

  it('returns 0 for same day check-in and check-out', () => {
    expect(getNights('2025-01-15', '2025-01-15')).toBe(0);
  });

  // ─── Negative (check-out before check-in) ────────────────────────────

  it('returns 0 when check-out is before check-in', () => {
    expect(getNights('2025-01-18', '2025-01-15')).toBe(0);
  });

  // ─── Date objects ─────────────────────────────────────────────────────

  it('works with Date objects', () => {
    const checkIn = new Date(2025, 0, 15);
    const checkOut = new Date(2025, 0, 20);
    expect(getNights(checkIn, checkOut)).toBe(5);
  });

  // ─── Long stays ──────────────────────────────────────────────────────

  it('calculates a 30-night stay', () => {
    expect(getNights('2025-01-01', '2025-01-31')).toBe(30);
  });

  it('calculates a 365-night stay', () => {
    expect(getNights('2025-01-01', '2026-01-01')).toBe(365);
  });
});

describe('formatDateTime', () => {
  it('formats ISO datetime string', () => {
    // Note: The result depends on timezone handling
    const result = formatDateTime('2025-01-15T14:30:00');
    expect(result).toContain('15.01.2025');
    expect(result).toContain('14:30');
  });

  it('returns dash for invalid datetime', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('formats Date object', () => {
    const date = new Date(2025, 0, 15, 14, 30);
    const result = formatDateTime(date);
    expect(result).toBe('15.01.2025 14:30');
  });
});

describe('formatTime', () => {
  it('formats time from Date object', () => {
    const date = new Date(2025, 0, 15, 9, 5);
    expect(formatTime(date)).toBe('09:05');
  });

  it('formats time from ISO string', () => {
    const result = formatTime('2025-01-15T14:30:00');
    expect(result).toBe('14:30');
  });

  it('returns dash for invalid time', () => {
    expect(formatTime('invalid')).toBe('—');
  });
});
