import { describe, it, expect } from 'vitest';
import { Money } from '@/modules/finance/domain/money';
import {
  calculateCashFlowSummary,
  calculateBudgetStatus,
  evaluatePurchaseAffordability,
  type TransactionRecord,
} from '@/modules/finance/domain/calculations';

describe('Finance Domain — Deterministic Arithmetic & Affordability', () => {
  it('performs exact addition and subtraction without floating-point errors', () => {
    const a = Money.fromMajorUnits(19.99, 'INR');
    const b = Money.fromMajorUnits(0.01, 'INR');
    const sum = a.add(b);

    expect(sum.amountMinor).toBe(2000);
    expect(sum.toMajorUnits()).toBe(20);
  });

  it('rejects currency mismatches across Money operations', () => {
    const inr = Money.fromMinorUnits(1000, 'INR');
    const usd = Money.fromMinorUnits(1000, 'USD');

    expect(() => inr.add(usd)).toThrow(/Currency mismatch/);
  });

  it('calculates cash flow deterministically from transactions', () => {
    const records: TransactionRecord[] = [
      {
        id: 'tx-1',
        type: 'income',
        amountMinor: 4500000, // ₹45,000.00
        currency: 'INR',
        category: 'Freelance',
        occurredAt: '2026-10-19',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amountMinor: 2840000, // ₹28,400.00
        currency: 'INR',
        category: 'Groceries',
        occurredAt: '2026-10-20',
      },
    ];

    const summary = calculateCashFlowSummary(records, 'INR');
    expect(summary.inflow.amountMinor).toBe(4500000);
    expect(summary.outflow.amountMinor).toBe(2840000);
    expect(summary.netCashFlow.amountMinor).toBe(1660000); // ₹16,600.00 net
  });

  it('computes budget utilization and purchase affordability verdict', () => {
    const budget = calculateBudgetStatus(3500000, 2840000);
    expect(budget.remainingMinor).toBe(660000);
    expect(budget.utilizationPercent).toBe(81);
    expect(budget.isOverBudget).toBe(false);

    const verdict = evaluatePurchaseAffordability({
      proposedPurchaseMinor: 150000, // ₹1,500.00
      budgetLimitMinor: 3500000,
      currentSpentMinor: 2840000,
      currentInflowMinor: 4500000,
      monthlySavingsTargetMinor: 300000, // ₹3,000.00
    });

    expect(verdict.fitsRemainingBudget).toBe(true);
    expect(verdict.preservesSavingsTarget).toBe(true);
    expect(verdict.remainingBudgetAfterPurchaseMinor).toBe(510000); // ₹5,100.00 remaining
    expect(verdict.projectedNetAfterPurchaseMinor).toBe(1510000); // ₹15,100.00 net
  });
});

