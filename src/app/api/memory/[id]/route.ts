import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '../../../../lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  if (!id || !UUID_PATTERN.test(id)) return jsonError('VALIDATION_ERROR', 'Memory ID must be a UUID.', 400);
  try {
    // Hides the memory from Memeora's active context. The encrypted Walrus blob
    // stays; only the wallet-signed delete (/api/memory/delete) removes it.
    const superseded = await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client, mode).markSuperseded(id, session.userId));
    if (!superseded) return jsonError('NOT_FOUND', 'Memory record not found or not owned by user', 404);
    return jsonSuccess({ id, status: 'superseded', updatedAt: new Date().toISOString() });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to remove this memory right now.', 503);
  }
}
