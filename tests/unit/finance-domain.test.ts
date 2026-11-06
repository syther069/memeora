import { describe, it, expect } from 'vitest';
import { isCurrencyCode, Money } from '@/modules/finance/domain/money';
import {
  calculateCashFlowSummary,
  calculateBudgetStatus,
  evaluatePurchaseAffordability,
  type TransactionRecord,
} from '@/modules/finance/domain/calculations';

describe('Finance Domain — Deterministic Arithmetic & Affordability', () => {
  it('performs exact addition and subtraction without floating-point errors', () => {
    const a = Money.fromMajorUnits(19.99, 'USD');
    const b = Money.fromMajorUnits(0.01, 'USD');
    const sum = a.add(b);

    expect(sum.amountMinor).toBe(2000);
    expect(sum.toMajorUnits()).toBe(20);
  });

  it('rejects currency mismatches across Money operations', () => {
    const inr = Money.fromMinorUnits(1000, 'USD');
    const usd = Money.fromMinorUnits(1000, 'USDC');

    expect(() => inr.add(usd)).toThrow(/Currency mismatch/);
  });

  it('calculates cash flow deterministically from transactions', () => {
    const records: TransactionRecord[] = [
      {
        id: 'tx-1',
        type: 'income',
        amountMinor: 4500000, // $45,000.00
        currency: 'USD',
        category: 'Freelance',
        occurredAt: '2026-10-19',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amountMinor: 2840000, // $28,400.00
        currency: 'USD',
        category: 'Groceries',
        occurredAt: '2026-10-20',
      },
    ];

    const summary = calculateCashFlowSummary(records, 'USD');
    expect(summary.inflow.amountMinor).toBe(4500000);
    expect(summary.outflow.amountMinor).toBe(2840000);
    expect(summary.netCashFlow.amountMinor).toBe(1660000); // $16,600.00 net
  });

  it('computes budget utilization and purchase affordability verdict', () => {
    const budget = calculateBudgetStatus(3500000, 2840000);
    expect(budget.remainingMinor).toBe(660000);
    expect(budget.utilizationPercent).toBe(81);
    expect(budget.isOverBudget).toBe(false);

    const verdict = evaluatePurchaseAffordability({
      proposedPurchaseMinor: 150000, // $1,500.00
      budgetLimitMinor: 3500000,
      currentSpentMinor: 2840000,
      currentInflowMinor: 4500000,
      monthlySavingsTargetMinor: 300000, // $3,000.00
    });

    expect(verdict.fitsRemainingBudget).toBe(true);
    expect(verdict.preservesSavingsTarget).toBe(true);
    expect(verdict.remainingBudgetAfterPurchaseMinor).toBe(510000); // $5,100.00 remaining
    expect(verdict.projectedNetAfterPurchaseMinor).toBe(1510000); // $15,100.00 net
  });
});


describe('Supported currencies', () => {
  it('defaults to USD, accepts tokens and Other, and refuses INR', () => {
    expect(Money.zero().currency).toBe('USD');
    expect(isCurrencyCode('INR')).toBe(false);
    for (const code of ['USD', 'USDC', 'USDT', 'SUI', 'WAL', 'OTHER']) expect(isCurrencyCode(code)).toBe(true);
  });

  it('formats codes Intl would reject', () => {
    expect(Money.fromMinorUnits(123456, 'USD').format()).toBe('$1,234.56');
    expect(Money.fromMinorUnits(123456, 'SUI').format()).toBe('1,234.56 SUI');
    expect(Money.fromMinorUnits(5, 'OTHER').format()).toBe('0.05 Other');
  });
});
