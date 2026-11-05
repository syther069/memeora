import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '../../../lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { parseTransactionInput } from '@/modules/finance/application/transaction-input';
import { periodBounds } from '@/modules/finance/domain/calculations';
import { Transaction, TransactionType } from '../../../modules/finance/domain/transaction';
import { DbTransaction, serializeRow } from './serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);

  const params = new URL(request.url).searchParams;
  const typeParam = params.get('type');
  const categoryParam = params.get('category');
  const limitParam = params.get('limit');
  const periodParam = params.get('period');
  if (typeParam && typeParam !== 'income' && typeParam !== 'expense') return jsonError('VALIDATION_ERROR', 'Type must be income or expense.', 400);
  if (categoryParam !== null && (!categoryParam.trim() || categoryParam.trim().length > 50)) return jsonError('VALIDATION_ERROR', 'Category must be between 1 and 50 characters.', 400);
  let limit = 50;
  if (limitParam !== null) {
    if (!/^\d+$/.test(limitParam)) return jsonError('VALIDATION_ERROR', 'Limit must be an integer from 1 to 100.', 400);
    limit = Number(limitParam);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) return jsonError('VALIDATION_ERROR', 'Limit must be an integer from 1 to 100.', 400);
  }
  let bounds: { start: string; end: string } | null = null;
  if (periodParam !== null) {
    try { bounds = periodBounds(periodParam); } catch { return jsonError('VALIDATION_ERROR', 'Period must use YYYY-MM format with a valid month.', 400); }
  }

  try {
    const rows = await withWalletTransaction(session.walletAddress, async (client) => client.query(
      `SELECT * FROM transactions WHERE user_id = $1
       AND ($2::text IS NULL OR type = $2)
       AND ($3::text IS NULL OR category = $3)
       AND ($4::timestamptz IS NULL OR (occurred_at >= $4 AND occurred_at < $5))
       AND mode = $7
       ORDER BY occurred_at DESC, created_at DESC LIMIT $6`,
      [session.userId, typeParam, categoryParam?.trim() ?? null, bounds?.start ?? null, bounds?.end ?? null, limit, mode],
    ) as Promise<{ rows: DbTransaction[] }>);
    return jsonSuccess({ transactions: rows.rows.map(serializeRow) });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to load transactions right now.', 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400);
  const parsed = parseTransactionInput(body as Record<string, unknown>);
  if (!parsed.ok) return jsonError('VALIDATION_ERROR', parsed.message, 400);

  try {
    const now = new Date();
    const transaction = Transaction.create({
      id: globalThis.crypto.randomUUID(),
      userId: session.userId,
      type: parsed.value.type as TransactionType,
      amountMinor: parsed.value.amountMinor,
      currency: parsed.value.currency,
      category: parsed.value.category,
      description: parsed.value.description,
      occurredAt: parsed.value.occurredAt,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await withWalletTransaction(session.walletAddress, (client) => client.query(
      `INSERT INTO transactions(id, user_id, type, amount_minor, currency, category, description, occurred_at, mode, counterparty, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [transaction.id, session.userId, transaction.type, transaction.amount.amountMinor, transaction.amount.currency, transaction.category, transaction.description, transaction.occurredAt.toISOString(), mode, parsed.value.counterparty, parsed.value.reference],
    ) as Promise<{ rows: DbTransaction[] }>);
    return jsonSuccess({ transaction: serializeRow(saved.rows[0]) }, 201);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to save transaction right now.', 503);
  }
}
