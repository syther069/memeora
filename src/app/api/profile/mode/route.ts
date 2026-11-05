import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { isAppMode, INVALID_MODE_MESSAGE } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Remembers which workspace this account last used. */
export async function PUT(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = await request.json().catch(() => null) as { mode?: unknown } | null;
  if (!isAppMode(body?.mode)) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const mode = body.mode;
  try {
    await withWalletTransaction(session.walletAddress, (client) => client.query(
      `UPDATE profiles SET active_mode = $2, updated_at = NOW() WHERE id = $1`,
      [session.userId, mode],
    ));
    return jsonSuccess({ mode });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your mode could not be saved.', 503);
  }
}
