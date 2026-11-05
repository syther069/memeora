import { describe, expect, it } from 'vitest';
import { periodBounds, toPeriodTotals } from '@/modules/finance/domain/calculations';

describe('periodBounds', () => {
  it('covers exactly one UTC month, including across a year end', () => {
    expect(periodBounds('2026-11')).toEqual({ start: '2026-11-01T00:00:00.000Z', end: '2026-12-01T00:00:00.000Z' });
    expect(periodBounds('2026-12')).toEqual({ start: '2026-12-01T00:00:00.000Z', end: '2027-01-01T00:00:00.000Z' });
  });

  it('rejects anything that is not a real YYYY-MM month', () => {
    expect(() => periodBounds('2026-13')).toThrow();
    expect(() => periodBounds('2026-1')).toThrow();
  });
});

describe('toPeriodTotals', () => {
  it('converts database sums and computes net in integer minor units', () => {
    expect(toPeriodTotals({ currency: 'INR', incomeMinor: '500000', expenseMinor: '620050', transactionCount: '3' }))
      .toEqual({ currency: 'INR', incomeMinor: 500000, expenseMinor: 620050, netMinor: -120050, transactionCount: 3 });
  });

  it('refuses a sum beyond the safe integer range rather than rounding it', () => {
    expect(() => toPeriodTotals({ currency: 'INR', incomeMinor: '9007199254740993', expenseMinor: '0', transactionCount: '1' })).toThrow();
  });
});
