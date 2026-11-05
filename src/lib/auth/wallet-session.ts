import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getPostgresPool } from '@/lib/postgres/pool';

export const WALLET_SESSION_COOKIE = 'memeora_wallet_session';
export const WALLET_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface VerifiedWalletSession {
  userId: string;
  walletAddress: string;
}

export function hashSessionToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/**
 * Resolves identity only from the opaque HttpOnly session issued by Memeora.
 * Returns null when there is no valid session. Throws when the database could
 * not be reached, so an outage is never mistaken for being signed out.
 */
export async function getVerifiedWalletSession(request: NextRequest): Promise<VerifiedWalletSession | null> {
  const token = request.cookies.get(WALLET_SESSION_COOKIE)?.value;
  if (!token || token.length < 40 || token.length > 128) return null;

  const client = await getPostgresPool().connect();
  try {
    await client.query('BEGIN');
    const sessionResult = await client.query<{ wallet_address: string }>(
      `SELECT wallet_address FROM wallet_sessions
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [hashSessionToken(token)],
    );
    const walletAddress = sessionResult.rows[0]?.wallet_address;
    if (!walletAddress) {
      await client.query('ROLLBACK');
      return null;
    }
    // wallet_sessions is server-only. Bind its stored address before reading
    // the RLS-protected identity; never use an address supplied by the request.
    await client.query("SELECT set_config('memeora.wallet_address', $1, TRUE)", [walletAddress]);
    const identityResult = await client.query<{ user_id: string }>(
      'SELECT user_id FROM wallet_identities WHERE wallet_address = $1 LIMIT 1', [walletAddress],
    );
    const userId = identityResult.rows[0]?.user_id;
    if (!userId) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('COMMIT');
    return { userId, walletAddress };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function isCanonicalSuiAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value);
}

/**
 * True when the request carries a Memeora wallet session cookie and should use
 * the wallet/PostgreSQL path. Route unit tests keep the legacy identity path.
 */
export function usesWalletSession(request: NextRequest): boolean {
  return process.env.NODE_ENV !== 'test' && request.cookies.has(WALLET_SESSION_COOKIE);
}
