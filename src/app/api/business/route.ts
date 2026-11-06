import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { isCurrencyCode } from '@/modules/finance/domain/money';
import { readBusinessOverview } from '@/modules/finance/infrastructure/postgres-business-reader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The Business workspace's overview for one month. */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const period = new URL(request.url).searchParams.get('period') ?? new Date().toISOString().slice(0, 7);
  if (!PERIOD_PATTERN.test(period)) return jsonError('VALIDATION_ERROR', 'Period must use YYYY-MM format with a valid month.', 400);
  try {
    const overview = await withWalletTransaction(session.walletAddress, (client) =>
      readBusinessOverview(client, session.userId, period));
    return jsonSuccess(overview);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your business figures could not be loaded.', 503);
  }
}

/** Saves the cash figure the owner enters, which runway is worked out from. Null clears it. */
export async function PUT(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const body = await request.json().catch(() => null) as { cashMinor?: unknown; currency?: unknown } | null;
  const cashMinor = body?.cashMinor;
  if (cashMinor !== null && (typeof cashMinor !== 'number' || !Number.isSafeInteger(cashMinor) || cashMinor < 0)) {
    return jsonError('VALIDATION_ERROR', 'Cash must be zero or a positive amount.', 400);
  }
  if (!isCurrencyCode(body?.currency)) return jsonError('VALIDATION_ERROR', 'Choose a supported currency.', 400);
  const currency = body.currency;
  try {
    await withWalletTransaction(session.walletAddress, (client) => client.query(
      'UPDATE profiles SET business_cash_minor = $2, business_cash_currency = $3, updated_at = NOW() WHERE id = $1',
      [session.userId, cashMinor, currency],
    ));
    return jsonSuccess({ cashMinor, currency });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'The cash figure could not be saved.', 503);
  }
}
