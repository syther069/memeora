import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '../../../../lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';
import { MemoryCategory, MemoryRecord } from '../../../../modules/financial-memory/domain/memory-record';
import { loadReadyMemoryAccount, MEMORY_ACCOUNT_REQUIRED_MESSAGE, walrusClientFor } from '@/modules/financial-memory/infrastructure/wallet-memory-account';
import { settleWrites, unknownRecalled } from '@/modules/financial-memory/application/memory-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Unsettled writes checked per page load, and Walrus memories considered for import. */
const SETTLE_BATCH = 10;
const IMPORT_LIMIT = 20;
/** Most memories returned in one list. */
const MAX_LIST = 100;

interface RecallFilters {
  /** false lists what Memeora already has, without calling Walrus. */
  sync?: boolean;
  query?: string;
  categories?: MemoryCategory[];
  limit?: number;
}

async function readFilters(request: NextRequest): Promise<RecallFilters> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as RecallFilters : {};
  } catch {
    return {}; // Body is optional
  }
}

function selectMemories(memories: MemoryRecord[], { query, categories, limit = 5 }: RecallFilters) {
  let selected = memories;
  if (Array.isArray(categories) && categories.length > 0) {
    selected = selected.filter((m) => categories.includes(m.category));
  }
  if (typeof query === 'string' && query.trim()) {
    const q = query.trim().toLowerCase();
    selected = selected.filter((m) => m.text.toLowerCase().includes(q));
  }
  const clampedLimit = Math.min(MAX_LIST, Math.max(1, Number(limit) || 5));
  const limited = selected.slice(0, clampedLimit);
  return {
    memories: limited.map((m) => ({
      id: m.id,
      category: m.category,
      text: m.text,
      walrusBlobId: m.walrusBlobId,
      walrusStatus: m.status,
      createdAt: m.createdAt.toISOString(),
    })),
    count: limited.length,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const filters = await readFilters(request);
  try {
    const { hasConsent, unsettled, stored } = await withWalletTransaction(session.walletAddress, async (client) => {
      const repository = new PostgresMemoryRepository(client, mode);
      const consent = await repository.getConsent(session.userId);
      if (consent && filters.sync === false) {
        return { hasConsent: true, unsettled: [], stored: await repository.findActiveByUserId(session.userId) };
      }
      return consent
        ? { hasConsent: true, unsettled: await repository.findUnsettled(session.userId, SETTLE_BATCH), stored: [] }
        // With memory off, nothing goes to Walrus, but the user can still see and remove what is stored.
        : { hasConsent: false, unsettled: [], stored: await repository.findActiveByUserId(session.userId) };
    });
    if (!hasConsent) return jsonSuccess({ ...selectMemories(stored, filters), walrus: { available: false, reason: 'Memory is off.' } });
    if (filters.sync === false) return jsonSuccess(selectMemories(stored, filters));

    // Walrus network calls run between transactions, never inside one.
    const account = await loadReadyMemoryAccount(session);
    if (!account) {
      const local = await withWalletTransaction(session.walletAddress, (client) =>
        new PostgresMemoryRepository(client, mode).findActiveByUserId(session.userId));
      return jsonSuccess({ ...selectMemories(local, filters), walrus: { available: false, setupRequired: true, reason: MEMORY_ACCOUNT_REQUIRED_MESSAGE } });
    }
    const walrus = walrusClientFor(account, mode);
    const updates = await settleWrites(walrus, session.walletAddress, unsettled);
    const recalled = await walrus.recallMemories({ namespaceOwner: session.walletAddress, query: '', limit: IMPORT_LIMIT });

    const memories = await withWalletTransaction(session.walletAddress, async (client) => {
      const repository = new PostgresMemoryRepository(client, mode);
      for (const update of updates) await repository.updateWalrusState(update.id, session.userId, update);
      if (recalled.available) {
        const unknown = unknownRecalled(await repository.findAllByUserId(session.userId), recalled.memories);
        await repository.importRecalled(session.userId, walrus.namespaceFor(session.walletAddress), unknown);
      }
      return repository.findActiveByUserId(session.userId);
    });
    return jsonSuccess({
      ...selectMemories(memories, filters),
      walrus: recalled.available
        ? { available: true, namespace: walrus.namespaceFor(session.walletAddress) }
        : { available: false, reason: recalled.reason },
    });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to load memories right now.', 503);
  }
}
