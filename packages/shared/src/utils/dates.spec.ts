import {
  nightsBetween,
  dateRange,
  datesOverlap,
} from './dates';

describe('dates utils', () => {
  describe('nightsBetween', () => {
    it('should calculate nights correctly', () => {
      expect(nightsBetween('2025-03-10', '2025-03-13')).toBe(3);
      expect(nightsBetween('2025-03-10', '2025-03-11')).toBe(1);
      expect(nightsBetween('2025-03-10', '2025-03-10')).toBe(0);
    });
  });

  describe('dateRange', () => {
    it('should generate correct date array', () => {
      const range = dateRange('2025-03-10', '2025-03-13');
      expect(range).toHaveLength(3);
      expect(range[0]).toBe('2025-03-10');
      expect(range[1]).toBe('2025-03-11');
      expect(range[2]).toBe('2025-03-12');
    });

    it('should return empty array for same dates', () => {
      const range = dateRange('2025-03-10', '2025-03-10');
      expect(range).toHaveLength(0);
    });
  });

  describe('datesOverlap', () => {
    it('should detect overlap', () => {
      expect(datesOverlap('2025-03-10', '2025-03-15', '2025-03-13', '2025-03-18')).toBe(true);
    });

    it('should detect no overlap when touching', () => {
      // checkout day = next checkin day is NOT an overlap
      expect(datesOverlap('2025-03-10', '2025-03-15', '2025-03-15', '2025-03-20')).toBe(false);
    });

    it('should detect no overlap when separate', () => {
      expect(datesOverlap('2025-03-10', '2025-03-12', '2025-03-14', '2025-03-16')).toBe(false);
    });
  });
});
