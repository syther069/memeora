import { describe, expect, it } from 'vitest';
import { dateInputToOccurredAt, formatLedgerDate, localDateInput, localPeriod, occurredAtToDateInput } from '@/lib/dates';
import { periodBounds } from '@/modules/finance/domain/calculations';

describe('ledger dates', () => {
  it('keeps the picked calendar date in its own month, whatever the time zone', () => {
    // The old local-midnight storage put 1 November in India at 31 October 18:30 UTC.
    const occurredAt = dateInputToOccurredAt('2026-11-01');
    const { start, end } = periodBounds('2026-11');
    expect(occurredAt >= start && occurredAt < end).toBe(true);
    expect(occurredAtToDateInput(occurredAt)).toBe('2026-11-01');
    expect(formatLedgerDate(occurredAt)).toContain('2026');
    expect(formatLedgerDate(occurredAt)).toContain('1');
  });

  it('uses the local calendar for today and this month', () => {
    const late = new Date(2026, 10, 30, 23, 45);
    expect(localDateInput(late)).toBe('2026-11-30');
    expect(localPeriod(late)).toBe('2026-11');
  });
});
