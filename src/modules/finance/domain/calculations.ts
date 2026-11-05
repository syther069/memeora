import { Money, type CurrencyCode } from './money';

export type TransactionType = 'income' | 'expense';

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: CurrencyCode;
  category: string;
  description?: string;
  occurredAt: string;
}

export interface BudgetStatus {
  limitMinor: number;
  spentMinor: number;
  remainingMinor: number;
  utilizationPercent: number;
  isOverBudget: boolean;
}

export interface AffordabilityVerdict {
  fitsRemainingBudget: boolean;
  preservesSavingsTarget: boolean;
  remainingBudgetAfterPurchaseMinor: number;
  projectedNetAfterPurchaseMinor: number;
}

export function calculateCashFlowSummary(
  transactions: ReadonlyArray<TransactionRecord>,
  currency: CurrencyCode = 'INR'
): {
  inflow: Money;
  outflow: Money;
  netCashFlow: Money;
} {
  let inflow = Money.zero(currency);
  let outflow = Money.zero(currency);

  for (const tx of transactions) {
    const amount = Money.fromMinorUnits(tx.amountMinor, tx.currency);
    if (tx.type === 'income') {
      inflow = inflow.add(amount);
    } else {
      outflow = outflow.add(amount);
    }
  }

  return {
    inflow,
    outflow,
    netCashFlow: inflow.subtract(outflow),
  };
}

export function calculateBudgetStatus(
  limitMinor: number,
  spentMinor: number
): BudgetStatus {
  if (limitMinor <= 0) {
    throw new Error('Budget limit must be a positive integer in minor units.');
  }
  const remainingMinor = limitMinor - spentMinor;
  const utilizationPercent = Math.round((spentMinor / limitMinor) * 100);

  return {
    limitMinor,
    spentMinor,
    remainingMinor,
    utilizationPercent,
    isOverBudget: remainingMinor < 0,
  };
}

export function evaluatePurchaseAffordability(params: {
  proposedPurchaseMinor: number;
  budgetLimitMinor: number;
  currentSpentMinor: number;
  currentInflowMinor: number;
  monthlySavingsTargetMinor: number;
}): AffordabilityVerdict {
  const remainingBudgetBefore = params.budgetLimitMinor - params.currentSpentMinor;
  const remainingBudgetAfterPurchaseMinor = remainingBudgetBefore - params.proposedPurchaseMinor;
  const projectedNetAfterPurchaseMinor =
    params.currentInflowMinor - (params.currentSpentMinor + params.proposedPurchaseMinor);

  return {
    fitsRemainingBudget: remainingBudgetAfterPurchaseMinor >= 0,
    preservesSavingsTarget:
      projectedNetAfterPurchaseMinor >= params.monthlySavingsTargetMinor,
    remainingBudgetAfterPurchaseMinor,
    projectedNetAfterPurchaseMinor,
  };
}


/** UTC bounds of a YYYY-MM period: start inclusive, end exclusive. */
export function periodBounds(period: string): { start: string; end: string } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) throw new Error('Period must use YYYY-MM format with a valid month.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    end: new Date(Date.UTC(year, month, 1)).toISOString(),
  };
}

export interface PeriodCurrencyTotals {
  currency: CurrencyCode;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  transactionCount: number;
}

/** Builds one currency's totals from database sums, refusing amounts beyond the safe integer range. */
export function toPeriodTotals(row: {
  currency: CurrencyCode;
  incomeMinor: string | number;
  expenseMinor: string | number;
  transactionCount: string | number;
}): PeriodCurrencyTotals {
  const income = Money.fromMinorUnits(Number(row.incomeMinor), row.currency);
  const expense = Money.fromMinorUnits(Number(row.expenseMinor), row.currency);
  return {
    currency: row.currency,
    incomeMinor: income.amountMinor,
    expenseMinor: expense.amountMinor,
    netMinor: income.subtract(expense).amountMinor,
    transactionCount: Number(row.transactionCount),
  };
}
