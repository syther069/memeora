import { describe, it, expect } from 'vitest';
import { formatCurrency, cn } from '@/lib/utils';

describe('UI Utilities', () => {
  it('combines class names correctly using cn', () => {
    expect(cn('px-4 py-2', 'bg-red-500', undefined, false && 'hidden')).toBe('px-4 py-2 bg-red-500');
  });

  it('formats minor currency units in Indian Rupees correctly', () => {
    // 245000 paise = ₹2,450.00
    const formatted = formatCurrency(245000, 'INR');
    expect(formatted).toContain('2,450.00');
  });

  it('formats minor currency units in USD correctly', () => {
    // 1500 cents = $15.00
    const formatted = formatCurrency(1500, 'USD');
    expect(formatted).toContain('15.00');
  });
});
