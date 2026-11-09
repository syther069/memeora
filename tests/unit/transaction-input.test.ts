import { describe, expect, it } from 'vitest';
import { parseTransactionInput } from '@/modules/finance/application/transaction-input';
import { MAX_AMOUNT_MINOR } from '@/modules/finance/domain/money';

const base = { type: 'expense', category: 'Groceries' };

describe('parseTransactionInput amount cap', () => {
  it('accepts the largest allowed amount', () => {
    expect(parseTransactionInput({ ...base, amountMinor: MAX_AMOUNT_MINOR }).ok).toBe(true);
  });

  it('rejects an amount above the cap, so period sums stay exact', () => {
    expect(parseTransactionInput({ ...base, amountMinor: MAX_AMOUNT_MINOR + 1 }).ok).toBe(false);
  });
});
