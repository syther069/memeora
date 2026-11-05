import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { parseTransactionInput } from '@/modules/finance/application/transaction-input';
import { normalizeChainHash, OTHER_CHAINS } from '@/modules/on-chain-verification/domain/sui-wallet-activity';
import { DbTransaction, serializeRow } from '../serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_AMOUNT_PATTERN = /^\d{1,40}(\.\d{1,30})?$/;
const SYMBOL_PATTERN = /^[A-Za-z0-9.$_-]{1,32}$/;

/**
 * A transaction on another chain, entered by the user with its hash. Memeora does
 * not check it on that chain, so it is stored and shown as not verified.
 */
export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400);

  const parsed = parseTransactionInput(body);
  if (!parsed.ok) return jsonError('VALIDATION_ERROR', parsed.message, 400);

  const { chain, txHash, assetSymbol, assetAmount } = body;
  if (typeof chain !== 'string' || !OTHER_CHAINS.includes(chain)) return jsonError('VALIDATION_ERROR', 'Choose a supported chain. For Sui, use the wallet import, which verifies the transaction.', 400);
  const hash = typeof txHash === 'string' ? normalizeChainHash(chain, txHash) : null;
  if (!hash) return jsonError('VALIDATION_ERROR', `That does not look like a transaction hash on ${chain}.`, 400);
  if (typeof assetSymbol !== 'string' || !SYMBOL_PATTERN.test(assetSymbol.trim())) return jsonError('VALIDATION_ERROR', 'Enter the token symbol, like ETH or USDC.', 400);
  if (typeof assetAmount !== 'string' || !TOKEN_AMOUNT_PATTERN.test(assetAmount.trim()) || !/[1-9]/.test(assetAmount)) return jsonError('VALIDATION_ERROR', 'Enter the token amount as a positive number.', 400);
  const symbol = assetSymbol.trim().toUpperCase();
  const input = parsed.value;

  try {
    const result = await withWalletTransaction(session.walletAddress, (client) => client.query(
      `INSERT INTO transactions(user_id, type, amount_minor, currency, category, description, occurred_at, mode,
                                counterparty, reference, chain, tx_hash, coin_type, asset_symbol, asset_amount, verification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $14, 'unverified')
       ON CONFLICT (user_id, chain, tx_hash, coin_type) WHERE tx_hash IS NOT NULL DO NOTHING
       RETURNING *`,
      [session.userId, input.type, input.amountMinor, input.currency, input.category, input.description, input.occurredAt.toISOString(), mode,
        input.counterparty, input.reference, chain, hash, symbol, assetAmount.trim()],
    ) as Promise<{ rows: DbTransaction[] }>);
    if (!result.rows[0]) return jsonError('DUPLICATE_TRANSACTION', 'You have already added this token from this transaction.', 409);
    return jsonSuccess({ transaction: serializeRow(result.rows[0]) }, 201);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to save this transaction right now.', 503);
  }
}
