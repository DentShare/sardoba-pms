import {
  toMinorUnits,
  toMajorUnits,
  tiyinFromSum,
  sumFromTiyin,
  formatMoney,
  percentOf,
} from './money';

describe('money utils', () => {
  describe('toMinorUnits / tiyinFromSum', () => {
    it('should convert sum to tiyin', () => {
      expect(toMinorUnits(150000)).toBe(15000000);
      expect(tiyinFromSum(1)).toBe(100);
      expect(tiyinFromSum(0)).toBe(0);
    });

    it('should handle decimals by rounding', () => {
      expect(toMinorUnits(150000.555)).toBe(15000056);
    });
  });

  describe('toMajorUnits / sumFromTiyin', () => {
    it('should convert tiyin to sum', () => {
      expect(toMajorUnits(15000000)).toBe(150000);
      expect(sumFromTiyin(100)).toBe(1);
      expect(sumFromTiyin(0)).toBe(0);
    });
  });

  describe('formatMoney', () => {
    it('should format UZS', () => {
      const result = formatMoney(15000000, 'UZS');
      expect(result).toContain('150 000');
    });

    it('should format USD', () => {
      const result = formatMoney(1500, 'USD');
      expect(result).toBe('$15.00');
    });

    it('should format EUR', () => {
      const result = formatMoney(1500, 'EUR');
      expect(result).toContain('15.00');
    });
  });

  describe('percentOf', () => {
    it('should calculate percentage', () => {
      expect(percentOf(15000000, 10)).toBe(1500000);
      expect(percentOf(10000, 50)).toBe(5000);
      expect(percentOf(100, 0)).toBe(0);
    });
  });
});
