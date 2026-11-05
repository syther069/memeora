import { NextRequest } from 'next/server';
import { jsonSuccess } from '@/lib/api-response';
import { getPostgresPool } from '@/lib/postgres/pool';
import { hashSessionToken, WALLET_SESSION_COOKIE } from '@/lib/auth/wallet-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(WALLET_SESSION_COOKIE)?.value;
  if (token) {
    try {
      await getPostgresPool().query(
        'UPDATE wallet_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
        [hashSessionToken(token)],
      );
    } catch {
      const response = jsonSuccess({ signedOut: false, message: 'Session could not be revoked. Retry sign out.' });
      response.cookies.delete(WALLET_SESSION_COOKIE);
      return response;
    }
  }
  const response = jsonSuccess({ signedOut: true });
  response.cookies.delete(WALLET_SESSION_COOKIE);
  return response;
}
