import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { recentPeriods } from '@/modules/finance/domain/business-metrics';
import { periodBounds } from '@/modules/finance/domain/calculations';
import type { CurrencyCode } from '@/modules/finance/domain/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HISTORY_MONTHS = 6;
const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * The figures behind an overview's charts, summed by the database in integer minor
 * units for the active workspace: recent months, and this month's spending by category.
 */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const period = new URL(request.url).searchParams.get('period') ?? new Date().toISOString().slice(0, 7);
  if (!PERIOD_PATTERN.test(period)) return jsonError('VALIDATION_ERROR', 'Period must use YYYY-MM format with a valid month.', 400);

  const periods = recentPeriods(period, HISTORY_MONTHS);
  const { start, end } = periodBounds(period);
  try {
    const { months, categories } = await withWalletTransaction(session.walletAddress, async (client) => ({
      months: await client.query(
        `SELECT to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM') AS period, currency,
                COALESCE(SUM(amount_minor) FILTER (WHERE type = 'income'), 0) AS income,
                COALESCE(SUM(amount_minor) FILTER (WHERE type = 'expense'), 0) AS expense
         FROM transactions
         WHERE user_id = $1 AND mode = $2 AND occurred_at >= $3 AND occurred_at < $4
         GROUP BY 1, 2`,
        [session.userId, mode, periodBounds(periods[periods.length - 1]).start, end],
      ) as { rows: Array<{ period: string; currency: CurrencyCode; income: string | number; expense: string | number }> },
      categories: await client.query(
        `SELECT currency, category, SUM(amount_minor) AS amount
         FROM transactions
         WHERE user_id = $1 AND mode = $2 AND type = 'expense' AND occurred_at >= $3 AND occurred_at < $4
         GROUP BY 1, 2 ORDER BY SUM(amount_minor) DESC, category`,
        [session.userId, mode, start, end],
      ) as { rows: Array<{ currency: CurrencyCode; category: string; amount: string | number }> },
    }));
    return jsonSuccess({
      period,
      periods: [...periods].reverse(),
      months: months.rows.map((row) => ({ period: row.period, currency: row.currency, incomeMinor: Number(row.income), expenseMinor: Number(row.expense) })),
      categories: categories.rows.map((row) => ({ currency: row.currency, category: row.category, amountMinor: Number(row.amount) })),
    });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your charts could not be loaded.', 503);
  }
}
