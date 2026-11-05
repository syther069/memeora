import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Memory status for the signed-in wallet, from the database only (no Walrus call). */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  try {
    const summary = await withWalletTransaction(session.walletAddress, async (client) => {
      const repository = new PostgresMemoryRepository(client, mode);
      const [consentEnabled, memories] = [await repository.getConsent(session.userId), await repository.findActiveByUserId(session.userId)];
      return {
        consentEnabled,
        total: memories.length,
        storedOnWalrus: memories.filter((m) => m.status === 'confirmed').length,
        recent: memories.slice(0, 3).map((m) => ({ id: m.id, text: m.text, category: m.category, status: m.status })),
      };
    });
    return jsonSuccess(summary);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to load memory status.', 503);
  }
}
