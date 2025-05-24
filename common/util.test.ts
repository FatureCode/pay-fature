import { calculateLamportTransactionAmount, amountToString, validateTransactionUserVisibleId } from '../common/util';

describe('common/util.ts', () => {
  describe('calculateLamportTransactionAmount', () => {
    it('should calculate the correct lamport amount for a positive integer', () => {
      expect(calculateLamportTransactionAmount(5)).toBe(500000000);
    });

    it('should return 0 for an input of 0', () => {
      expect(calculateLamportTransactionAmount(0)).toBe(0);
    });

    it('should handle large numbers correctly', () => {
      expect(calculateLamportTransactionAmount(1000000)).toBe(100000000000000);
    });
  });

  describe('amountToString', () => {
    it('should convert a positive integer to a string', () => {
      expect(amountToString(10)).toBe('10');
    });

    it('should convert 0 to "0"', () => {
      expect(amountToString(0)).toBe('0');
    });

    it('should convert a decimal number to a string', () => {
      expect(amountToString(5.5)).toBe('5.5');
    });
  });

  describe('validateTransactionUserVisibleId', () => {
    it('should return true for a valid 8-character uppercase ID', () => {
      expect(validateTransactionUserVisibleId('ABCDEFGH')).toBe(true);
    });

    it('should return false for an ID that is too short', () => {
      expect(validateTransactionUserVisibleId('ABC')).toBe(false);
    });

    it('should return false for an ID that is too long', () => {
      expect(validateTransactionUserVisibleId('ABCDEFGHIJ')).toBe(false);
    });

    it('should return false for an ID with lowercase characters', () => {
      expect(validateTransactionUserVisibleId('abcdefgh')).toBe(false);
    });

    it('should return false for an ID with numbers', () => {
      expect(validateTransactionUserVisibleId('ABCDEF12')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(validateTransactionUserVisibleId('')).toBe(false);
    });

    // Assuming the function is designed to handle null/undefined gracefully,
    // otherwise this test might need adjustment based on actual behavior.
    // If it throws an error, the test should reflect that.
    it('should return false for null or undefined (or handle as per design)', () => {
      expect(validateTransactionUserVisibleId(null as any)).toBe(false); // Cast to any if TypeScript complains
      expect(validateTransactionUserVisibleId(undefined as any)).toBe(false); // Cast to any if TypeScript complains
    });
  });
});
