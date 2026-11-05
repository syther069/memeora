/** One calendar month of a business's ledger in a single currency. */
export interface MonthTotals {
  period: string;
  incomeMinor: number;
  expenseMinor: number;
  transactionCount: number;
}

export interface BusinessMetrics {
  revenueMinor: number;
  expensesMinor: number;
  profitMinor: number;
  /** Average monthly net spend. Null with no records to base it on. */
  burnMinor: number | null;
  /** The average month brings in at least as much as it spends. */
  notBurning: boolean;
  /** Months of runway in tenths (72 is 7.2), rounded down. Null without cash or without burn. */
  runwayTenths: number | null;
  /** How many of the recent months had records, so the burn can be explained. */
  burnMonths: number;
}

/** The given YYYY-MM period and the months before it, newest first. */
export function recentPeriods(period: string, count: number): string[] {
  const [year, month] = period.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/**
 * Burn averages only months that have records, so a new business is not flattered
 * by empty months. Integer minor units throughout; nothing here is estimated by AI.
 */
export function calculateBusinessMetrics(months: MonthTotals[], currentPeriod: string, cashMinor: number | null): BusinessMetrics {
  const current = months.find((month) => month.period === currentPeriod);
  const revenueMinor = current?.incomeMinor ?? 0;
  const expensesMinor = current?.expenseMinor ?? 0;

  const recorded = months.filter((month) => month.transactionCount > 0);
  if (recorded.length === 0) {
    return { revenueMinor, expensesMinor, profitMinor: revenueMinor - expensesMinor, burnMinor: null, notBurning: false, runwayTenths: null, burnMonths: 0 };
  }
  const netSpend = recorded.reduce((sum, month) => sum + month.expenseMinor - month.incomeMinor, 0);
  const average = Math.round(netSpend / recorded.length);
  const burnMinor = Math.max(average, 0);
  const notBurning = burnMinor === 0;
  const runwayTenths = cashMinor === null || notBurning ? null : Math.floor((cashMinor * 10) / burnMinor);

  return { revenueMinor, expensesMinor, profitMinor: revenueMinor - expensesMinor, burnMinor, notBurning, runwayTenths, burnMonths: recorded.length };
}

/** "7.2 months" from 72 tenths. */
export function formatRunway(tenths: number): string {
  const whole = Math.floor(tenths / 10);
  const rest = tenths % 10;
  const value = rest === 0 ? `${whole}` : `${whole}.${rest}`;
  return `${value} ${value === '1' ? 'month' : 'months'}`;
}
