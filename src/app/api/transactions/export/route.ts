import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { periodBounds } from '@/modules/finance/domain/calculations';
import { toTransactionsCsv, type CsvRow } from '@/modules/finance/domain/transactions-csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A month's entries of the active workspace as CSV, for an accountant. */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);

  const period = new URL(request.url).searchParams.get('period') ?? new Date().toISOString().slice(0, 7);
  let bounds: { start: string; end: string };
  try { bounds = periodBounds(period); } catch { return jsonError('VALIDATION_ERROR', 'Period must use YYYY-MM format with a valid month.', 400); }

  try {
    const result = await withWalletTransaction(session.walletAddress, (client) => client.query(
      `SELECT occurred_at, type, amount_minor, currency, category, description, counterparty, reference,
              chain, tx_hash, asset_symbol, asset_amount, verification, fiat_estimated
       FROM transactions
       WHERE user_id = $1 AND mode = $2 AND occurred_at >= $3 AND occurred_at < $4
       ORDER BY occurred_at ASC, created_at ASC`,
      [session.userId, mode, bounds.start, bounds.end],
    ) as Promise<{ rows: CsvRow[] }>);
    return new NextResponse(toTransactionsCsv(result.rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="memeora-${mode}-${period}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your transactions could not be exported.', 503);
  }
}
