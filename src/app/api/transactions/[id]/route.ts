import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { parseTransactionInput } from '@/modules/finance/application/transaction-input';
import { DbTransaction, serializeRow } from '../serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Replaces an entry's fields. RLS and the user_id filter limit it to this wallet's
 * account. On an entry verified on Sui, direction and date stay what the chain says;
 * changing its value makes it the user's own figure rather than an estimate.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return jsonError('VALIDATION_ERROR', 'Transaction ID must be a UUID.', 400);

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400);
  const parsed = parseTransactionInput(body as Record<string, unknown>);
  if (!parsed.ok) return jsonError('VALIDATION_ERROR', parsed.message, 400);
  const input = parsed.value;

  try {
    const result = await withWalletTransaction(session.walletAddress, (client) => client.query(
      `UPDATE transactions
       SET type = CASE WHEN verification = 'sui_verified' THEN type ELSE $3 END,
           fiat_estimated = CASE WHEN amount_minor = $4 AND currency = $5 THEN fiat_estimated ELSE FALSE END,
           amount_minor = $4, currency = $5, category = $6, description = $7,
           occurred_at = CASE WHEN verification = 'sui_verified' THEN occurred_at ELSE $8 END,
           counterparty = $9, reference = $10, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, session.userId, input.type, input.amountMinor, input.currency, input.category, input.description, input.occurredAt.toISOString(), input.counterparty, input.reference],
    ) as Promise<{ rows: DbTransaction[] }>);
    if (!result.rows[0]) return jsonError('NOT_FOUND', 'Transaction not found.', 404);
    return jsonSuccess({ transaction: serializeRow(result.rows[0]) });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to update this transaction right now.', 503);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return jsonError('VALIDATION_ERROR', 'Transaction ID must be a UUID.', 400);

  try {
    const result = await withWalletTransaction(session.walletAddress, (client) => client.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, session.userId],
    ) as Promise<{ rows: Array<{ id: string }> }>);
    if (!result.rows[0]) return jsonError('NOT_FOUND', 'Transaction not found.', 404);
    return jsonSuccess({ deletedTransactionId: id });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to delete this transaction right now.', 503);
  }
}
