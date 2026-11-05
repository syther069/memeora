import { createHash, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { buildLoginMessage } from '@/lib/auth/login-message';
import { getPostgresPool } from '@/lib/postgres/pool';
import { isCanonicalSuiAddress } from '@/lib/auth/wallet-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !isCanonicalSuiAddress((body as Record<string, unknown>).address)) {
    return jsonError('VALIDATION_ERROR', 'A canonical Sui Mainnet wallet address is required.', 400);
  }

  const address = (body as { address: string }).address;
  const nonce = randomBytes(32).toString('base64url');
  const nonceHash = createHash('sha256').update(nonce).digest();
  const pool = getPostgresPool();

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM wallet_challenges WHERE expires_at <= NOW() OR consumed_at IS NOT NULL');
      const attempts = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM wallet_challenges
         WHERE wallet_address = $1 AND created_at > NOW() - INTERVAL '1 hour'`, [address],
      );
      if (Number(attempts.rows[0]?.count ?? 0) >= 10) {
        await client.query('ROLLBACK');
        return jsonError('RATE_LIMITED', 'Too many sign-in attempts. Try again later.', 429);
      }
      const inserted = await client.query<{ id: string; created_at: Date; expires_at: Date }>(
        `INSERT INTO wallet_challenges(wallet_address, nonce_hash, purpose, expires_at)
         VALUES ($1, $2, 'wallet_login', NOW() + INTERVAL '5 minutes')
         RETURNING id, created_at, expires_at`, [address, nonceHash],
      );
      await client.query('COMMIT');
      const challenge = inserted.rows[0];
      const message = buildLoginMessage({
        address,
        challengeId: challenge.id,
        nonce,
        issuedAt: challenge.created_at,
        expiresAt: challenge.expires_at,
      });
      return jsonSuccess({ challengeId: challenge.id, nonce, message, expiresAt: challenge.expires_at.toISOString() }, 201);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Wallet sign-in is unavailable until PostgreSQL is configured.', 503);
  }
}
