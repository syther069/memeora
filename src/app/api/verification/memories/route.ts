import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';
import { loadReadyMemoryAccount, walrusClientFor } from '@/modules/financial-memory/infrastructure/wallet-memory-account';
import { MEMORY_PROOF_EXPLANATION } from '@/modules/on-chain-verification/domain/memory-proof';
import { TatumMemoryProofs } from '@/modules/on-chain-verification/infrastructure/tatum-memory-proofs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Newest confirmed memories proven per request (each costs about two paced Tatum calls). */
const MAX_PROOFS = 20;

/**
 * Proves the signed-in wallet's confirmed memories on Sui Mainnet via Tatum:
 * each must be a certified Walrus Blob owned by the MemWal account owner, in
 * this wallet's namespace, written by the job Memeora recorded.
 */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);

  let memories;
  let account;
  try {
    memories = await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client, mode).findActiveByUserId(session.userId));
    account = await loadReadyMemoryAccount(session);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your memories could not be loaded.', 503);
  }

  const namespace = walrusClientFor(account, mode).namespaceFor(session.walletAddress);
  const confirmed = memories.filter((m) => m.status === 'confirmed' && m.walrusBlobId).slice(0, MAX_PROOFS);
  const texts = new Map(confirmed.map((m) => [m.id, { text: m.text, category: m.category }]));
  if (confirmed.length === 0) {
    return jsonSuccess({ status: 'no_memories', namespace, proofs: [], explanation: MEMORY_PROOF_EXPLANATION });
  }

  if (!account) {
    return jsonSuccess({ status: 'not_configured', reason: 'This wallet has not set up its Walrus account yet.', namespace, proofs: [], explanation: MEMORY_PROOF_EXPLANATION });
  }
  const proofs = new TatumMemoryProofs({ accountId: account.accountId, delegateAddress: account.delegateAddress });
  const result = await proofs.prove(confirmed.map((m) => ({
    memoryId: m.id,
    blobId: m.walrusBlobId as string,
    namespace,
    jobId: m.walrusJobId,
  })));
  if (result.status !== 'checked') {
    return jsonSuccess({ status: result.status, reason: result.reason, namespace, proofs: [], explanation: MEMORY_PROOF_EXPLANATION });
  }
  return jsonSuccess({
    status: 'checked',
    namespace,
    account: result.account,
    proofs: result.proofs.map((proof) => ({ ...proof, ...texts.get(proof.memoryId) })),
    checkedAt: new Date().toISOString(),
    explanation: MEMORY_PROOF_EXPLANATION,
  });
}
