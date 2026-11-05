import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readEnabled(request: NextRequest): Promise<{ ok: true; enabled: boolean } | { ok: false; response: Response }> {
  let body: unknown;
  try { body = await request.json(); } catch { return { ok: false, response: jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400) }; }
  if (!body || typeof body !== 'object' || typeof (body as { enabled?: unknown }).enabled !== 'boolean') {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'enabled must be a boolean.', 400) };
  }
  return { ok: true, enabled: (body as { enabled: boolean }).enabled };
}

export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  try {
    const enabled = await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client).getConsent(session.userId));
    return jsonSuccess({ enabled });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to load memory consent.', 503);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const parsed = await readEnabled(request);
  if (!parsed.ok) return parsed.response;
  try {
    await withWalletTransaction(session.walletAddress, (client) =>
      new PostgresMemoryRepository(client).setConsent(session.userId, parsed.enabled));
    return jsonSuccess({ enabled: parsed.enabled });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to update memory consent.', 503);
  }
}
