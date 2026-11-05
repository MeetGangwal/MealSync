import { describe, it, expect } from 'vitest';
import { formatINR, formatPercent, formatBytes } from './format';

describe('format helpers', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatINR(125000)).toBe('₹1,25,000');
    expect(formatINR(85.5)).toBe('₹85.5');
    expect(formatINR(null)).toBe('₹0');
  });

  it('returns null instead of inventing a value for missing metrics', () => {
    expect(formatPercent(null)).toBeNull();
    expect(formatBytes(null)).toBeNull();
    expect(formatPercent(0.0123)).toBe('1.2%');
    expect(formatBytes(512 * 1024 * 1024)).toBe('512 MB');
  });
});
