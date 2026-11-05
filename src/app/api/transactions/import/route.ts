import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { isCurrencyCode, type CurrencyCode } from '@/modules/finance/domain/money';
import { formatTokenAmount, SUI_DIGEST_PATTERN } from '@/modules/on-chain-verification/domain/sui-wallet-activity';
import { SuiWalletHistory } from '@/modules/on-chain-verification/infrastructure/sui-wallet-history';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 25;

interface ImportItem {
  digest: string;
  coinType: string;
  category: string;
  amountMinor: number;
  currency: CurrencyCode;
  description: string;
  counterparty: string | null;
  reference: string | null;
  /** The user changed or typed the value, so it is their own figure rather than today's rate. */
  valueEdited: boolean;
}

function parseItem(value: unknown): ImportItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const short = (field: unknown) => (typeof field === 'string' && field.trim() ? field.trim().slice(0, 100) : null);
  if (typeof item.digest !== 'string' || !SUI_DIGEST_PATTERN.test(item.digest)) return null;
  if (typeof item.coinType !== 'string' || !item.coinType || item.coinType.length > 255) return null;
  if (typeof item.category !== 'string' || !item.category.trim() || item.category.trim().length > 50) return null;
  if (typeof item.amountMinor !== 'number' || !Number.isSafeInteger(item.amountMinor) || item.amountMinor <= 0) return null;
  if (!isCurrencyCode(item.currency)) return null;
  if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 500)) return null;
  return {
    digest: item.digest,
    coinType: item.coinType,
    category: item.category.trim(),
    amountMinor: item.amountMinor,
    currency: item.currency,
    description: typeof item.description === 'string' ? item.description.trim() : '',
    counterparty: short(item.counterparty),
    reference: short(item.reference),
    valueEdited: item.valueEdited === true,
  };
}

/**
 * Adds Sui transactions to the ledger. Direction, date, token and amount are read
 * again from Sui through Tatum; the request only supplies what the chain cannot
 * know: the category, the ledger value and the notes.
 */
export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);

  const body = await request.json().catch(() => null) as { items?: unknown } | null;
  if (!Array.isArray(body?.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return jsonError('VALIDATION_ERROR', `Choose between 1 and ${MAX_ITEMS} transactions.`, 400);
  }
  const items = body.items.map(parseItem);
  if (items.some((item) => item === null)) return jsonError('VALIDATION_ERROR', 'One of the transactions is incomplete. Check its value and category.', 400);

  const history = new SuiWalletHistory();
  if (!history.isConfigured()) return jsonError('SERVICE_UNAVAILABLE', 'Reading Sui is not configured on this server.', 503);

  try {
    // Network reads first, so no database connection waits on Tatum.
    const verified: Array<{ item: ImportItem; type: 'income' | 'expense'; occurredAt: string; symbol: string; amount: string; estimated: boolean }> = [];
    const failed: Array<{ digest: string; coinType: string; reason: string }> = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const item of items as ImportItem[]) {
      const entries = await history.readEntries(session.walletAddress, item.digest);
      const entry = entries?.find((candidate) => candidate.coinType === item.coinType);
      const coin = entry ? await history.coinFacts(entry.coinType) : null;
      if (!entry || !coin) {
        failed.push({ digest: item.digest, coinType: item.coinType, reason: entry ? 'Sui has no details for this token.' : 'Sui does not show this token moving in your wallet in this transaction.' });
        continue;
      }
      verified.push({
        item,
        type: entry.direction,
        occurredAt: entry.occurredAt.toISOString(),
        symbol: coin.symbol.slice(0, 32),
        amount: formatTokenAmount(entry.amountRaw, coin.decimals),
        estimated: !item.valueEdited && entry.occurredAt.toISOString().slice(0, 10) !== today,
      });
    }

    const importedCount = await withWalletTransaction(session.walletAddress, async (client) => {
      let count = 0;
      for (const row of verified) {
        const result = await client.query(
          `INSERT INTO transactions(user_id, type, amount_minor, currency, category, description, occurred_at, mode,
                                    counterparty, reference, chain, tx_hash, coin_type, asset_symbol, asset_amount,
                                    verification, fiat_estimated)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sui', $11, $12, $13, $14, 'sui_verified', $15)
           ON CONFLICT (user_id, chain, tx_hash, coin_type) WHERE tx_hash IS NOT NULL DO NOTHING
           RETURNING id`,
          [session.userId, row.type, row.item.amountMinor, row.item.currency, row.item.category, row.item.description, row.occurredAt, mode,
            row.item.counterparty, row.item.reference, row.item.digest, row.item.coinType, row.symbol, row.amount, row.estimated],
        ) as { rows: Array<{ id: string }> };
        count += result.rows.length;
      }
      return count;
    });

    return jsonSuccess({ imported: importedCount, duplicates: verified.length - importedCount, failed }, 201);
  } catch (error) {
    console.warn(`Sui import failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return jsonError('SERVICE_UNAVAILABLE', 'These transactions could not be read through Tatum, so nothing was added. Please retry.', 503);
  }
}
