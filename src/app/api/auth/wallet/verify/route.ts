import { createHash, randomBytes } from 'node:crypto';
import { isValidPersonalMessageSignature } from '@mysten/sui/verify';
import { createTatumSuiGrpcClient } from '@/modules/on-chain-verification/infrastructure/tatum-sui-grpc';
import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { buildLoginMessage } from '@/lib/auth/login-message';
import { getPostgresPool } from '@/lib/postgres/pool';
import { hashSessionToken, isCanonicalSuiAddress, WALLET_SESSION_COOKIE, WALLET_SESSION_MAX_AGE_SECONDS } from '@/lib/auth/wallet-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('VALIDATION_ERROR', 'Request body must be an object.', 400);
  const input = body as Record<string, unknown>;
  const { address, nonce, signature } = input;
  if (!isCanonicalSuiAddress(address) || typeof nonce !== 'string' || nonce.length < 32 || nonce.length > 100 || typeof signature !== 'string' || signature.length > 4096) {
    return jsonError('VALIDATION_ERROR', 'Wallet address, challenge nonce, and signature are required.', 400);
  }

  let client;
  try {
    client = await getPostgresPool().connect();
    await client.query('BEGIN');
    const challengeResult = await client.query<{
      id: string; wallet_address: string; purpose: string; expires_at: Date; created_at: Date; consumed_at: Date | null;
    }>(
      `SELECT id, wallet_address, purpose, expires_at, created_at, consumed_at
       FROM wallet_challenges WHERE nonce_hash = $1 FOR UPDATE`,
      [createHash('sha256').update(nonce).digest()],
    );
    const challenge = challengeResult.rows[0];
    if (!challenge || challenge.wallet_address !== address || challenge.purpose !== 'wallet_login' || challenge.consumed_at || challenge.expires_at.getTime() <= Date.now()) {
      await client.query('ROLLBACK');
      return jsonError('INVALID_CHALLENGE', 'This wallet sign-in challenge is invalid, expired, or already used.', 401);
    }

    const message = buildLoginMessage({
      address,
      challengeId: challenge.id,
      nonce,
      issuedAt: challenge.created_at,
      expiresAt: challenge.expires_at,
    });
    // zkLogin wallets (for example Slush accounts created with Google) can only
    // be verified on-chain, so the check uses Tatum's Sui gRPC gateway. Ed25519,
    // Secp256k1/r1 and passkey signatures are still verified locally.
    let signatureValid: boolean;
    try {
      const tatumApiKey = process.env.TATUM_API_KEY?.trim();
      signatureValid = await isValidPersonalMessageSignature(new TextEncoder().encode(message), signature, {
        address,
        ...(tatumApiKey ? { client: createTatumSuiGrpcClient(tatumApiKey) } : {}),
      });
    } catch {
      // Only environmental failures throw (e.g. the zkLogin lookup could not reach Sui).
      await client.query('ROLLBACK');
      return jsonError('SIGNATURE_VERIFIER_UNAVAILABLE', 'The wallet signature could not be checked right now. Try again.', 503);
    }
    if (!signatureValid) {
      await client.query('ROLLBACK');
      return jsonError('INVALID_SIGNATURE', 'The wallet signature could not be verified.', 401);
    }

    // The address is now cryptographically verified; bind RLS context before
    // inserting or reading the wallet-identity mapping.
    await client.query("SELECT set_config('memeora.wallet_address', $1, TRUE)", [address]);
    await client.query('UPDATE wallet_challenges SET consumed_at = NOW() WHERE id = $1', [challenge.id]);
    const identityResult = await client.query<{ user_id: string }>(
      'SELECT user_id FROM wallet_identities WHERE wallet_address = $1 FOR UPDATE', [address],
    );
    let userId = identityResult.rows[0]?.user_id;
    if (!userId) {
      const account = await client.query<{ id: string }>('INSERT INTO app_users DEFAULT VALUES RETURNING id');
      userId = account.rows[0].id;
      await client.query('INSERT INTO wallet_identities(wallet_address, user_id) VALUES ($1, $2)', [address, userId]);
    }
    await client.query('INSERT INTO profiles(id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [userId]);

    const sessionToken = randomBytes(32).toString('base64url');
    await client.query(
      `INSERT INTO wallet_sessions(wallet_address, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`, [address, hashSessionToken(sessionToken)],
    );
    await client.query('COMMIT');

    const response = jsonSuccess({ authenticated: true, walletAddress: address, userId });
    response.cookies.set(WALLET_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: WALLET_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    return jsonError('SERVICE_UNAVAILABLE', 'Wallet sign-in could not be completed. Try again.', 503);
  } finally {
    client?.release();
  }
}
