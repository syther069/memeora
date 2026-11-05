import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '../../../../lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';
import { loadReadyMemoryAccount, MEMORY_ACCOUNT_REQUIRED_MESSAGE, walrusClientFor } from '@/modules/financial-memory/infrastructure/wallet-memory-account';
import { MemoryRecord, MemoryCategory } from '../../../../modules/financial-memory/domain/memory-record';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validCategories: MemoryCategory[] = ['goal', 'preference', 'budget'];

async function readMemoryInput(request: NextRequest):
  Promise<{ ok: true; category: MemoryCategory; text: string } | { ok: false; response: Response }> {
  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Invalid JSON payload', 400) };
  }

  const { category, text } = (body as { category?: MemoryCategory; text?: string }) || {};
  if (!category || !validCategories.includes(category)) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', `Category must be one of: ${validCategories.join(', ')}`, 400, [
      { field: 'category', issue: `Must be one of: ${validCategories.join(', ')}` },
    ]) };
  }

  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (trimmedText.length < 5) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Memory text must be at least 5 characters', 400, [
      { field: 'text', issue: 'Must be at least 5 characters' },
    ]) };
  }
  if (trimmedText.length > 500) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Memory text cannot exceed 500 characters', 400, [
      { field: 'text', issue: 'Cannot exceed 500 characters' },
    ]) };
  }
  return { ok: true, category, text: trimmedText };
}

function memoryResponse(record: MemoryRecord, warning?: string) {
  return jsonSuccess(
    {
      id: record.id,
      userId: record.userId,
      category: record.category,
      text: record.text,
      walrusBlobId: record.walrusBlobId,
      walrusJobId: record.walrusJobId,
      walrusStatus: record.status,
      createdAt: record.createdAt.toISOString(),
    },
    202,
    warning
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const input = await readMemoryInput(request);
  if (!input.ok) return input.response;

  let hasConsent: boolean;
  try {
    hasConsent = await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client, mode).getConsent(session.userId));
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Memory consent could not be checked. Nothing was stored.', 503);
  }
  if (!hasConsent) {
    return jsonError('CONSENT_REQUIRED', 'User has disabled persistent financial memory consent', 403);
  }

  // Only a wallet that owns its Walrus account and approved Memeora can save.
  let account;
  try {
    account = await loadReadyMemoryAccount(session);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Your Walrus account could not be checked. Nothing was stored.', 503);
  }
  if (!account) return jsonError('MEMORY_ACCOUNT_REQUIRED', MEMORY_ACCOUNT_REQUIRED_MESSAGE, 409);

  const walrus = walrusClientFor(account, mode);
  const namespace = walrus.namespaceFor(session.walletAddress);
  // Waiting to send until Walrus answers; a crash from here on is retried with the same key.
  const record = MemoryRecord.create({ id: crypto.randomUUID(), userId: session.userId, category: input.category, text: input.text, status: 'pending_retry' });
  let reservation;
  try {
    reservation = await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client, mode).reserveWrite(record, namespace));
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'The memory could not be recorded in your account. Please retry.', 503);
  }
  if (reservation.outcome === 'duplicate') {
    return jsonError('DUPLICATE_MEMORY', 'You have already saved this memory.', 409);
  }
  if (reservation.outcome === 'restored') return memoryResponse(reservation.existing);

  // The Walrus write runs outside any database transaction so a slow relayer
  // never holds a pooled connection. It is accepted as a background job and
  // confirmed later (see memory-sync).
  const result = await walrus.writeMemory({ namespaceOwner: session.walletAddress, category: input.category, text: input.text, idempotencyKey: record.id });
  const written = MemoryRecord.create({ id: record.id, userId: record.userId, category: record.category, text: record.text, walrusJobId: result.jobId, status: result.status, createdAt: record.createdAt });
  try {
    await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client, mode).updateWalrusState(record.id, session.userId, { status: result.status, jobId: result.jobId }));
  } catch {
    // The row stays `pending_retry`; the next sync resubmits with the same key, which Walrus dedupes.
  }
  return memoryResponse(written, result.warning);
}
