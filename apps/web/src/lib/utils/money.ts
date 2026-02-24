/**
 * Formats amount in tiyin to a human-readable string.
 * 1 sum = 100 tiyin.
 *
 * @example formatMoney(15000000) => "150 000 сум"
 * @example formatMoney(15000000, 'USD') => "$150,000.00"
 */
export function formatMoney(
  tiyin: number,
  currency: 'UZS' | 'USD' | 'EUR' = 'UZS',
): string {
  const amount = tiyin / 100;

  if (currency === 'UZS') {
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} сум`;
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  return `${amount}`;
}

/**
 * Formats compact money (e.g., 1.5M sum, 250K sum).
 */
export function formatMoneyCompact(
  tiyin: number,
  currency: 'UZS' | 'USD' | 'EUR' = 'UZS',
): string {
  const amount = tiyin / 100;

  if (currency === 'UZS') {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн сум`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)} тыс сум`;
    }
    return `${Math.round(amount)} сум`;
  }

  return formatMoney(tiyin, currency);
}

/**
 * Converts sum to tiyin.
 */
export function toTiyin(sum: number): number {
  return Math.round(sum * 100);
}

/**
 * Converts tiyin to sum.
 */
export function toSum(tiyin: number): number {
  return tiyin / 100;
}
