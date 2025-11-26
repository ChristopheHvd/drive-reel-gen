import { describe, it, expect } from 'vitest';

/**
 * Fonction helper testée (extraite du webhook)
 */
const safeTimestampToISO = (timestamp: number | undefined | null): string | null => {
  if (timestamp === undefined || timestamp === null || isNaN(timestamp)) {
    return null;
  }
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

describe('safeTimestampToISO', () => {
  it('should convert valid Unix timestamp to ISO string', () => {
    const timestamp = 1704067200; // 2024-01-01T00:00:00.000Z
    const result = safeTimestampToISO(timestamp);
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should handle recent timestamp (2024)', () => {
    const timestamp = 1764163467; // Timestamp from the Stripe payload
    const result = safeTimestampToISO(timestamp);
    expect(result).toMatch(/2025-01-26/); // Should be in January 2025
    expect(result).not.toBeNull();
  });

  it('should return null for undefined', () => {
    const result = safeTimestampToISO(undefined);
    expect(result).toBeNull();
  });

  it('should return null for null', () => {
    const result = safeTimestampToISO(null);
    expect(result).toBeNull();
  });

  it('should return null for NaN', () => {
    const result = safeTimestampToISO(NaN);
    expect(result).toBeNull();
  });

  it('should return null for Infinity', () => {
    const result = safeTimestampToISO(Infinity);
    expect(result).toBeNull();
  });

  it('should return null for negative Infinity', () => {
    const result = safeTimestampToISO(-Infinity);
    expect(result).toBeNull();
  });

  it('should handle zero timestamp (Unix epoch)', () => {
    const timestamp = 0;
    const result = safeTimestampToISO(timestamp);
    expect(result).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should handle negative timestamps (before Unix epoch)', () => {
    const timestamp = -86400; // 1 day before Unix epoch
    const result = safeTimestampToISO(timestamp);
    expect(result).toBe('1969-12-31T00:00:00.000Z');
  });
});
