import { formatMoney, formatMoneyCompact, toTiyin, toSum } from './money';

describe('formatMoney', () => {
  // ─── UZS (default) ────────────────────────────────────────────────────

  it('formats zero amount', () => {
    expect(formatMoney(0)).toBe('0 сум');
  });

  it('formats small amount in UZS', () => {
    expect(formatMoney(10000)).toBe('100 сум');
  });

  it('formats amount with thousands separator', () => {
    expect(formatMoney(15000000)).toBe('150 000 сум');
  });

  it('formats large amount with spaces as thousands separators', () => {
    expect(formatMoney(100000000)).toBe('1 000 000 сум');
  });

  it('formats amount and rounds to whole sum', () => {
    // 15050 tiyin = 150.5 sum → rounds to 151
    expect(formatMoney(15050)).toBe('151 сум');
  });

  it('formats very small amount (less than 100 tiyin)', () => {
    expect(formatMoney(50)).toBe('1 сум'); // 0.5 → rounds to 1
  });

  it('formats single tiyin correctly', () => {
    expect(formatMoney(1)).toBe('0 сум'); // 0.01 → rounds to 0
  });

  // ─── USD ──────────────────────────────────────────────────────────────

  it('formats amount in USD', () => {
    const result = formatMoney(15000000, 'USD');
    // Intl.NumberFormat for en-US should produce "$150,000.00"
    expect(result).toBe('$150,000.00');
  });

  it('formats small USD amount', () => {
    const result = formatMoney(10000, 'USD');
    expect(result).toBe('$100.00');
  });

  it('formats zero USD', () => {
    const result = formatMoney(0, 'USD');
    expect(result).toBe('$0.00');
  });

  it('formats USD with cents', () => {
    const result = formatMoney(9999, 'USD');
    expect(result).toBe('$99.99');
  });

  // ─── EUR ──────────────────────────────────────────────────────────────

  it('formats amount in EUR', () => {
    const result = formatMoney(15000000, 'EUR');
    // Intl.NumberFormat for de-DE uses comma as decimal separator
    // Result format depends on runtime locale support
    expect(result).toContain('150');
    // Intl.NumberFormat may produce euro sign or "EUR" depending on runtime
    expect(result.length).toBeGreaterThan(3);
  });

  it('formats zero EUR', () => {
    const result = formatMoney(0, 'EUR');
    expect(result).toContain('0');
  });
});

describe('formatMoneyCompact', () => {
  // ─── UZS compact ─────────────────────────────────────────────────────

  it('formats millions as "млн сум"', () => {
    expect(formatMoneyCompact(150000000)).toBe('1.5 млн сум');
  });

  it('formats exact millions without decimal', () => {
    expect(formatMoneyCompact(100000000)).toBe('1 млн сум');
  });

  it('formats thousands as "тыс сум"', () => {
    expect(formatMoneyCompact(25000000)).toBe('250 тыс сум');
  });

  it('formats small amounts without abbreviation', () => {
    expect(formatMoneyCompact(50000)).toBe('500 сум');
  });

  it('formats zero compact', () => {
    expect(formatMoneyCompact(0)).toBe('0 сум');
  });

  // ─── Non-UZS falls back to formatMoney ────────────────────────────────

  it('falls back to formatMoney for USD', () => {
    const result = formatMoneyCompact(15000000, 'USD');
    expect(result).toBe('$150,000.00');
  });

  it('falls back to formatMoney for EUR', () => {
    const result = formatMoneyCompact(15000000, 'EUR');
    expect(result).toContain('150');
  });
});

describe('toTiyin', () => {
  it('converts whole sum to tiyin', () => {
    expect(toTiyin(100)).toBe(10000);
  });

  it('converts decimal sum to tiyin', () => {
    expect(toTiyin(150.50)).toBe(15050);
  });

  it('converts zero', () => {
    expect(toTiyin(0)).toBe(0);
  });

  it('handles floating point precision', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    // Math.round should handle this
    expect(toTiyin(0.01)).toBe(1);
  });

  it('rounds to nearest tiyin', () => {
    // 1.005 * 100 = 100.49999... in IEEE 754, so Math.round gives 100
    expect(toTiyin(1.005)).toBe(100);
  });

  it('converts large amounts', () => {
    expect(toTiyin(1000000)).toBe(100000000);
  });
});

describe('toSum', () => {
  it('converts tiyin to sum', () => {
    expect(toSum(10000)).toBe(100);
  });

  it('converts with decimal result', () => {
    expect(toSum(15050)).toBe(150.50);
  });

  it('converts zero', () => {
    expect(toSum(0)).toBe(0);
  });

  it('converts single tiyin', () => {
    expect(toSum(1)).toBe(0.01);
  });

  it('is the inverse of toTiyin', () => {
    const originalSum = 1234.56;
    expect(toSum(toTiyin(originalSum))).toBeCloseTo(originalSum, 2);
  });
});
