import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode, type AppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';
import { WalrusBlobDeletion } from '@/modules/on-chain-verification/infrastructure/walrus-blob-deletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGEST_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** A digest Sui has still not shown after this long never landed; the memory is deletable again. */
const UNSEEN_DIGEST_EXPIRY_MS = 15 * 60_000;
/** Pending deletions re-checked per page load (each is one paced Tatum call). */
const RECHECK_LIMIT = 5;

type Session = { userId: string; walletAddress: string; mode: AppMode };

const inWallet = <T>(session: Session, action: (repository: PostgresMemoryRepository) => Promise<T>) =>
  withWalletTransaction(session.walletAddress, (client) => action(new PostgresMemoryRepository(client, session.mode)));

/** Settles deletions signed earlier, from Sui alone. Needs no wallet, so a closed tab loses nothing. */
async function recheckPending(session: Session) {
  const pending = await inWallet(session, (repository) => repository.findPendingDeletes(session.userId));
  const deletion = new WalrusBlobDeletion();
  if (!deletion.isConfigured()) return;
  for (const row of pending.slice(0, RECHECK_LIMIT)) {
    try {
      const check = await deletion.checkDeletion(row.digest, session.walletAddress, row.blobId);
      const expired = check === 'not_found' && Date.now() - row.updatedAt.getTime() > UNSEEN_DIGEST_EXPIRY_MS;
      if (check === 'confirmed') {
        await inWallet(session, (repository) => repository.markDeletedOnWalrus(row.id, session.userId, row.digest));
      } else if (check === 'rejected' || expired) {
        await inWallet(session, (repository) => repository.setDeleteDigest(row.id, session.userId, null));
      }
    } catch {
      // Sui could not be read through Tatum; it stays pending for the next load.
    }
  }
}

/** Hidden memories that can still be deleted, and deletions Sui has not confirmed yet. */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const session: Session = { ...auth.session, mode };
  try {
    await recheckPending(session);
    const { hidden, pending } = await inWallet(session, async (repository) => ({
      hidden: await repository.findHiddenOnWalrus(session.userId),
      pending: await repository.findPendingDeletes(session.userId),
    }));
    return jsonSuccess({
      hidden: hidden.map((m) => ({ id: m.id, text: m.text, category: m.category, walrusBlobId: m.walrusBlobId })),
      pending: pending.map((row) => ({ id: row.id, digest: row.digest })),
    });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your hidden memories could not be loaded.', 503);
  }
}

/** Builds the delete transaction, after checking on Sui that this wallet can delete the blob. */
async function prepare(session: Session, memoryId: string) {
  const deletion = new WalrusBlobDeletion();
  if (!deletion.isConfigured()) return jsonError('SERVICE_UNAVAILABLE', 'Deleting is not configured on this server.', 503);

  const row = await inWallet(session, (repository) => repository.findDeletable(memoryId, session.userId));
  if (!row) return jsonError('NOTHING_TO_DELETE', 'This memory has no copy on Walrus to delete.', 409);
  if (row.digest) return jsonError('DELETE_IN_PROGRESS', 'A deletion of this memory is waiting for Sui to confirm it.', 409);

  const blob = await deletion.findOwnedBlob(session.walletAddress, row.blobId);
  if (!blob) {
    return jsonError('BLOB_NOT_IN_WALLET', 'This memory’s copy on Walrus is not held by your wallet, so your wallet cannot delete it. It may already be gone, or be held by another account. Nothing was changed.', 409);
  }
  if (!blob.deletable) {
    return jsonError('BLOB_NOT_DELETABLE', 'Walrus stored this memory as permanent, so it cannot be deleted before its storage ends. You can still hide it.', 409);
  }
  return jsonSuccess({
    kindBytes: await deletion.buildDeleteKind(session.walletAddress, blob.objectId),
    blobId: row.blobId,
    objectId: blob.objectId,
  });
}

/** Records the signed transaction first, so its outcome stays tracked, then checks it on Sui. */
async function confirm(session: Session, memoryId: string, digest: string) {
  const row = await inWallet(session, (repository) => repository.findDeletable(memoryId, session.userId));
  if (!row) return jsonError('NOTHING_TO_DELETE', 'This memory has no copy on Walrus to delete.', 409);
  await inWallet(session, (repository) => repository.setDeleteDigest(memoryId, session.userId, digest));

  let check;
  try {
    check = await new WalrusBlobDeletion().checkDeletion(digest, session.walletAddress, row.blobId);
  } catch {
    return jsonSuccess({ state: 'pending' as const, digest });
  }
  if (check === 'confirmed') {
    await inWallet(session, (repository) => repository.markDeletedOnWalrus(memoryId, session.userId, digest));
    return jsonSuccess({ state: 'deleted' as const, digest });
  }
  if (check === 'rejected') {
    await inWallet(session, (repository) => repository.setDeleteDigest(memoryId, session.userId, null));
    return jsonError('DELETE_NOT_CONFIRMED', 'Sui does not show this deletion, so the memory was not marked as deleted.', 409);
  }
  return jsonSuccess({ state: 'pending' as const, digest });
}

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const session: Session = { ...auth.session, mode };

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const memoryId = typeof body?.memoryId === 'string' ? body.memoryId : '';
  const digest = typeof body?.digest === 'string' ? body.digest : '';
  if (!UUID_PATTERN.test(memoryId)) return jsonError('VALIDATION_ERROR', 'Memory ID must be a UUID.', 400);

  try {
    if (body?.action === 'prepare') return await prepare(session, memoryId);
    if (body?.action === 'confirm') {
      if (!DIGEST_PATTERN.test(digest)) return jsonError('VALIDATION_ERROR', 'The transaction digest is not valid.', 400);
      return await confirm(session, memoryId, digest);
    }
    return jsonError('VALIDATION_ERROR', 'Unknown action.', 400);
  } catch (error) {
    console.warn(`Memory delete failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return jsonError('SERVICE_UNAVAILABLE', 'Sui could not be read through Tatum. Nothing was changed. Please retry.', 503);
  }
}
