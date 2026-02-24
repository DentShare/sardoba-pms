/**
 * Money utilities for Sardoba PMS.
 *
 * All monetary values in the system are stored and transmitted as integers
 * in the smallest currency unit:
 *   - UZS: tiyin (1 sum = 100 tiyin)
 *   - USD: cents (1 dollar = 100 cents)
 *   - EUR: cents (1 euro = 100 cents)
 */

const MINOR_UNIT_FACTOR = 100;

/**
 * Convert a major unit amount (e.g. sum, dollars) to minor units (e.g. tiyin, cents).
 * @example tiyinFromSum(150000) => 15000000
 */
export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * MINOR_UNIT_FACTOR);
}

/**
 * Alias: convert sum to tiyin.
 */
export const tiyinFromSum = toMinorUnits;

/**
 * Convert minor units (tiyin, cents) to major units (sum, dollars).
 * @example sumFromTiyin(15000000) => 150000
 */
export function toMajorUnits(minorAmount: number): number {
  return minorAmount / MINOR_UNIT_FACTOR;
}

/**
 * Alias: convert tiyin to sum.
 */
export const sumFromTiyin = toMajorUnits;

/**
 * Format a tiyin amount for display.
 * @example formatMoney(15000000, 'UZS') => "150 000 сум"
 * @example formatMoney(1500, 'USD') => "5.00"
 */
export function formatMoney(
  minorAmount: number,
  currency: 'UZS' | 'USD' | 'EUR' = 'UZS',
): string {
  const majorAmount = toMajorUnits(minorAmount);

  switch (currency) {
    case 'UZS':
      return formatUZS(majorAmount);
    case 'USD':
      return formatUSD(majorAmount);
    case 'EUR':
      return formatEUR(majorAmount);
    default:
      return majorAmount.toFixed(2);
  }
}

function formatUZS(sum: number): string {
  const formatted = Math.floor(sum)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return formatted + ' сум';
}

function formatUSD(dollars: number): string {
  return '$' + dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatEUR(euros: number): string {
  return euros.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' €';
}

/**
 * Calculate percentage of an amount in minor units.
 * @example percentOf(15000000, 10) => 1500000 (10% of 150,000 sum)
 */
export function percentOf(minorAmount: number, percent: number): number {
  return Math.round((minorAmount * percent) / 100);
}
