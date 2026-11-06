import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as challengeRoute } from '@/app/api/auth/wallet/challenge/route';
import { POST as verifyRoute } from '@/app/api/auth/wallet/verify/route';
import { PUT as consentPut } from '@/app/api/memory/consent/route';
import { WALLET_SESSION_COOKIE } from '@/lib/auth/wallet-session';
import { DelegateKeyVault } from '@/modules/financial-memory/infrastructure/delegate-key-vault';

/**
 * Test harness for route handlers on a real PostgreSQL engine (PGlite) with
 * the real migrations, running as the least-privilege runtime role from 0003.
 *
 * Each test file routes the app's pool to the database itself, inside its own
 * hoisted vi.mock('@/lib/postgres/pool') factory. That factory must not import
 * this module: this module imports the routes, which import the pool.
 */
const MIGRATIONS = [
  '0001_provider_neutral_core.sql',
  '0002_onboarding_consent_audit.sql',
  '0003_runtime_role_grants.sql',
  '0004_walrus_jobs_and_namespace.sql',
  '0005_transaction_edit_delete.sql',
  '0006_wallet_memory_accounts.sql',
  '0007_drop_memory_delete_batches.sql',
  '0008_app_modes_and_onchain.sql',
  '0009_idempotency_keys.sql',
  '0010_usd_and_crypto_currencies.sql',
];

export async function createMigratedDatabase(): Promise<PGlite> {
  const db = new PGlite();
  for (const file of MIGRATIONS) {
    await db.exec(await readFile(path.join(process.cwd(), 'db', 'migrations', file), 'utf8'));
  }
  await db.exec('SET ROLE memeora_runtime');
  return db;
}

function withCookie(cookie?: string): Record<string, string> {
  return cookie ? { cookie: `${WALLET_SESSION_COOKIE}=${cookie}` } : {};
}

export function jsonRequest(method: 'POST' | 'PUT', url: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...withCookie(cookie) },
    body: JSON.stringify(body),
  });
}

export function getRequest(url: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${url}`, { headers: withCookie(cookie) });
}

export function deleteRequest(url: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'DELETE', headers: withCookie(cookie) });
}

/** Signs in through the real challenge/verify routes with a real Ed25519 signature; returns the session cookie. */
export async function signIn(keypair = new Ed25519Keypair()): Promise<string> {
  const address = keypair.toSuiAddress();
  const challenge = await (await challengeRoute(jsonRequest('POST', '/api/auth/wallet/challenge', { address }))).json();
  const { signature } = await keypair.signPersonalMessage(new TextEncoder().encode(challenge.data.message));
  const response = await verifyRoute(jsonRequest('POST', '/api/auth/wallet/verify', { address, nonce: challenge.data.nonce, signature }));
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
  return response.cookies.get(WALLET_SESSION_COOKIE)!.value;
}

/** A valid value for MEMEORA_DELEGATE_KEY_SECRET, for tests only. */
export const TEST_VAULT_SECRET = Buffer.alloc(32, 7).toString('base64');

/** Runs SQL under a wallet's RLS context, as a route would. */
export async function asWallet<T>(db: PGlite, wallet: string, work: (userId: string) => Promise<T>): Promise<T> {
  await db.query("SELECT set_config('memeora.wallet_address', $1, FALSE)", [wallet]);
  try {
    const identity = await db.query<{ user_id: string }>('SELECT user_id FROM wallet_identities WHERE wallet_address = $1', [wallet]);
    return await work(identity.rows[0].user_id);
  } finally {
    await db.query("SELECT set_config('memeora.wallet_address', '', FALSE)");
  }
}

/** The end state of a finished setup. The setup itself is covered in memory-account-routes.test.ts. */
export async function giveReadyMemoryAccount(db: PGlite, wallet: string, accountId = `0x${'e'.repeat(64)}`) {
  await asWallet(db, wallet, async (userId) => {
    const sealed = new DelegateKeyVault(TEST_VAULT_SECRET).encrypt('a'.repeat(64), { userId, accountId });
    await db.query(
      `INSERT INTO wallet_memory_accounts(user_id, account_id, delegate_public_key, delegate_address, encrypted_delegate_key, status, registered_at)
       VALUES ($1, $2, 'ab', $3, $4, 'ready', NOW())`,
      [userId, accountId, `0x${'d'.repeat(64)}`, sealed],
    );
  });
}

export async function insertMemory(db: PGlite, wallet: string, text: string, blobId: string | null = null, status = 'pending_retry') {
  return asWallet(db, wallet, async (userId) => {
    const result = await db.query<{ id: string }>(
      `INSERT INTO financial_memories(user_id, category, memory_text, walrus_blob_id, walrus_namespace, walrus_status)
       VALUES ($1, 'goal', $2, $3, $4, $5) RETURNING id`,
      [userId, text, blobId, `memeora:${wallet}`, status],
    );
    return result.rows[0].id;
  });
}

export async function enableConsent(cookie: string) {
  const response = await consentPut(jsonRequest('PUT', '/api/memory/consent', { enabled: true }, cookie));
  expect(response.status).toBe(200);
}
