import type { PostgresClient } from '@/lib/postgres/wallet-transaction';
import { BusinessMetrics, calculateBusinessMetrics, MonthTotals, recentPeriods } from '../domain/business-metrics';
import { periodBounds } from '../domain/calculations';
import type { CurrencyCode } from '../domain/money';

/** Months the burn is averaged over, including the current one. */
const BURN_WINDOW_MONTHS = 3;
const TOP_LIMIT = 6;

export interface BusinessOverview {
  period: string;
  currency: CurrencyCode;
  cashMinor: number | null;
  metrics: BusinessMetrics;
  topCategories: Array<{ category: string; amountMinor: number }>;
  counterparties: Array<{ name: string; receivedMinor: number; paidMinor: number }>;
  /** Other currencies recorded this month, which the figures above leave out. */
  otherCurrencies: Array<{ currency: CurrencyCode; incomeMinor: number; expenseMinor: number }>;
}

/**
 * The Business workspace's figures for one month, summed by the database over
 * every entry. The client must come from `withWalletTransaction`.
 */
export async function readBusinessOverview(client: PostgresClient, userId: string, period: string): Promise<BusinessOverview> {
  const profile = await client.query(
    'SELECT preferred_currency, business_cash_minor, business_cash_currency FROM profiles WHERE id = $1',
    [userId],
  ) as { rows: Array<{ preferred_currency: CurrencyCode; business_cash_minor: string | number | null; business_cash_currency: CurrencyCode | null }> };
  const row = profile.rows[0];
  const cashMinor = row?.business_cash_minor === null || row?.business_cash_minor === undefined ? null : Number(row.business_cash_minor);

  const periods = recentPeriods(period, BURN_WINDOW_MONTHS);
  const { start, end } = periodBounds(period);
  // The whole burn window at once, per month and currency: every round trip here is felt on the page.
  const totals = await client.query(
    `SELECT to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM') AS period, currency,
            COALESCE(SUM(amount_minor) FILTER (WHERE type = 'income'), 0) AS income,
            COALESCE(SUM(amount_minor) FILTER (WHERE type = 'expense'), 0) AS expense,
            COUNT(*) AS n
     FROM transactions
     WHERE user_id = $1 AND mode = 'business' AND occurred_at >= $2 AND occurred_at < $3
     GROUP BY 1, 2`,
    [userId, periodBounds(periods[periods.length - 1]).start, end],
  ) as { rows: Array<{ period: string; currency: CurrencyCode; income: string | number; expense: string | number; n: string | number }> };

  // The cash figure's currency if there is one, else whatever this month is mostly recorded in.
  const thisMonth = totals.rows.filter((entry) => entry.period === period);
  const mostUsed = [...thisMonth].sort((x, y) => Number(y.n) - Number(x.n) || x.currency.localeCompare(y.currency))[0]?.currency;
  const currency = row?.business_cash_currency ?? mostUsed ?? row?.preferred_currency ?? 'INR';

  const months: MonthTotals[] = periods.map((candidate) => {
    const entry = totals.rows.find((total) => total.period === candidate && total.currency === currency);
    return {
      period: candidate,
      incomeMinor: Number(entry?.income ?? 0),
      expenseMinor: Number(entry?.expense ?? 0),
      transactionCount: Number(entry?.n ?? 0),
    };
  });

  const categories = await client.query(
    `SELECT category, SUM(amount_minor) AS amount FROM transactions
     WHERE user_id = $1 AND mode = 'business' AND type = 'expense' AND currency = $2 AND occurred_at >= $3 AND occurred_at < $4
     GROUP BY category ORDER BY SUM(amount_minor) DESC, category LIMIT $5`,
    [userId, currency, start, end, TOP_LIMIT],
  ) as { rows: Array<{ category: string; amount: string | number }> };
  const counterparties = await client.query(
    `SELECT counterparty,
            COALESCE(SUM(amount_minor) FILTER (WHERE type = 'income'), 0) AS received,
            COALESCE(SUM(amount_minor) FILTER (WHERE type = 'expense'), 0) AS paid
     FROM transactions
     WHERE user_id = $1 AND mode = 'business' AND currency = $2 AND counterparty IS NOT NULL AND occurred_at >= $3 AND occurred_at < $4
     GROUP BY counterparty ORDER BY SUM(amount_minor) DESC, counterparty LIMIT $5`,
    [userId, currency, start, end, TOP_LIMIT],
  ) as { rows: Array<{ counterparty: string; received: string | number; paid: string | number }> };
  return {
    period,
    currency,
    cashMinor,
    metrics: calculateBusinessMetrics(months, period, cashMinor),
    topCategories: categories.rows.map((entry) => ({ category: entry.category, amountMinor: Number(entry.amount) })),
    counterparties: counterparties.rows.map((entry) => ({ name: entry.counterparty, receivedMinor: Number(entry.received), paidMinor: Number(entry.paid) })),
    otherCurrencies: thisMonth
      .filter((entry) => entry.currency !== currency)
      .sort((x, y) => x.currency.localeCompare(y.currency))
      .map((entry) => ({ currency: entry.currency, incomeMinor: Number(entry.income), expenseMinor: Number(entry.expense) })),
  };
}
