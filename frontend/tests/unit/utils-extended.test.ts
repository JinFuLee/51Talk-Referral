import { describe, it, expect } from 'vitest';
import { formatRate, formatCurrency, formatRevenue, formatUSDShort, formatUSD } from '@/lib/utils';

// ── formatRate ─────────────────────────────────────────────────────────────────
describe('formatRate', () => {
  it('formats 0.7532 → "75.3%"', () => {
    expect(formatRate(0.7532)).toBe('75.3%');
  });

  it('formats 1.0 (100%) → "100.0%"', () => {
    expect(formatRate(1.0)).toBe('100.0%');
  });

  it('formats 0 → "0.0%"', () => {
    expect(formatRate(0)).toBe('0.0%');
  });

  it('returns "0%" for null', () => {
    expect(formatRate(null)).toBe('0%');
  });

  it('returns "0%" for undefined', () => {
    expect(formatRate(undefined)).toBe('0%');
  });

  it('returns "0%" for NaN', () => {
    expect(formatRate(NaN)).toBe('0%');
  });

  it('formats small fraction 0.005 → "0.5%"', () => {
    expect(formatRate(0.005)).toBe('0.5%');
  });

  it('formats negative rate -0.05 → "-5.0%"', () => {
    expect(formatRate(-0.05)).toBe('-5.0%');
  });
});

// ── formatCurrency ─────────────────────────────────────────────────────────────
describe('formatCurrency', () => {
  it('returns both usd and thb fields', () => {
    const result = formatCurrency(1000);
    expect(result).toHaveProperty('usd');
    expect(result).toHaveProperty('thb');
  });

  it('formats 1000 with default rate 34', () => {
    const result = formatCurrency(1000);
    expect(result.usd).toBe('$1,000');
    expect(result.thb).toBe('฿34,000');
  });

  it('formats 0 → $0 and ฿0', () => {
    const result = formatCurrency(0);
    expect(result.usd).toBe('$0');
    expect(result.thb).toBe('฿0');
  });

  it('handles null as 0', () => {
    const result = formatCurrency(null);
    expect(result.usd).toBe('$0');
    expect(result.thb).toBe('฿0');
  });

  it('uses custom exchange rate', () => {
    const result = formatCurrency(100, 40);
    expect(result.usd).toBe('$100');
    expect(result.thb).toBe('฿4,000');
  });

  it('formats large value with commas', () => {
    const result = formatCurrency(1_000_000, 34);
    expect(result.usd).toBe('$1,000,000');
    expect(result.thb).toBe('฿34,000,000');
  });
});

// ── formatRevenue edge cases ──────────────────────────────────────────────────
describe('formatRevenue edge cases', () => {
  it('formats fractional USD — rounds to 0 decimals', () => {
    // 100.7 rounds to 101, 100.7 * 34 = 3423.8 rounds to 3,424
    const result = formatRevenue(100.7, 34);
    expect(result).toBe('$101 (฿3,424)');
  });

  it('handles negative values — sign is placed after $ by toLocaleString', () => {
    // toLocaleString("en-US") produces "$-100" (sign after prefix) for negative numbers
    const result = formatRevenue(-100, 34);
    expect(result).toBe('$-100 (฿-3,400)');
  });
});

// ── formatUSDShort edge cases ─────────────────────────────────────────────────
describe('formatUSDShort edge cases', () => {
  it('formats exactly 1_000_000 → "$1.0M"', () => {
    expect(formatUSDShort(1_000_000)).toBe('$1.0M');
  });

  it('formats exactly 1_000 → "$1.0k"', () => {
    expect(formatUSDShort(1_000)).toBe('$1.0k');
  });

  it('formats 999 → "$999"', () => {
    expect(formatUSDShort(999)).toBe('$999');
  });

  it('formats 0 → "$0"', () => {
    expect(formatUSDShort(0)).toBe('$0');
  });
});

// ── formatUSD edge cases ──────────────────────────────────────────────────────
describe('formatUSD edge cases', () => {
  it('formats large value with commas', () => {
    expect(formatUSD(1_234_567)).toBe('$1,234,567');
  });

  it('handles undefined as 0', () => {
    expect(formatUSD(undefined)).toBe('$0');
  });

  it('formats negative value — sign is placed after $ by toLocaleString', () => {
    // toLocaleString("en-US") produces "$-500" (sign after prefix) for negative numbers
    expect(formatUSD(-500)).toBe('$-500');
  });
});
