import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { isCurrencyCode, type CurrencyCode } from '@/modules/finance/domain/money';
import { formatTokenAmount, SUI_DIGEST_PATTERN, tokenToFiatMinor, type SuiWalletEntry } from '@/modules/on-chain-verification/domain/sui-wallet-activity';
import { SuiWalletHistory } from '@/modules/on-chain-verification/infrastructure/sui-wallet-history';
import { TatumRates } from '@/modules/on-chain-verification/infrastructure/tatum-rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;

/**
 * The signed-in wallet's Sui activity, ready to review for import. The address
 * always comes from the session, never from the request.
 */
export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const params = new URL(request.url).searchParams;
  const digest = params.get('digest')?.trim() || null;
  const cursor = params.get('cursor');
  const currencyParam = params.get('currency') ?? 'USD';
  if (!isCurrencyCode(currencyParam)) return jsonError('VALIDATION_ERROR', 'Choose a supported currency.', 400);
  const currency: CurrencyCode = currencyParam;
  if (digest && !SUI_DIGEST_PATTERN.test(digest)) return jsonError('VALIDATION_ERROR', 'That does not look like a Sui transaction digest.', 400);
  if (cursor && !CURSOR_PATTERN.test(cursor)) return jsonError('VALIDATION_ERROR', 'Invalid cursor.', 400);

  const history = new SuiWalletHistory();
  if (!history.isConfigured()) return jsonError('SERVICE_UNAVAILABLE', 'Reading Sui is not configured on this server.', 503);

  try {
    let entries: SuiWalletEntry[];
    let nextCursor: string | null = null;
    if (digest) {
      const found = await history.readEntries(session.walletAddress, digest);
      if (found === null) return jsonError('NOT_FOUND', 'Sui does not know this transaction.', 404);
      if (found.length === 0) return jsonError('NOT_YOUR_TRANSACTION', 'This transaction did not change your wallet’s balance, so there is nothing to record.', 409);
      entries = found;
    } else {
      ({ entries, nextCursor } = await history.listEntries(session.walletAddress, cursor ?? undefined));
    }

    const hashes = [...new Set(entries.map((entry) => entry.digest))];
    const imported = hashes.length === 0 ? [] : await withWalletTransaction(session.walletAddress, async (client) => {
      const result = await client.query(
        `SELECT tx_hash, coin_type, mode FROM transactions WHERE user_id = $1 AND chain = 'sui' AND tx_hash = ANY($2::text[])`,
        [session.userId, hashes],
      ) as { rows: Array<{ tx_hash: string; coin_type: string; mode: string }> };
      return result.rows;
    });
    const importedIn = new Map(imported.map((row) => [`${row.tx_hash}|${row.coin_type}`, row.mode]));

    const rates = new TatumRates();
    const today = new Date().toISOString().slice(0, 10);
    const rows = [];
    for (const entry of entries) {
      const coin = await history.coinFacts(entry.coinType);
      const rate = coin ? await rates.rateFor(entry.coinType, currency) : null;
      rows.push({
        digest: entry.digest,
        occurredAt: entry.occurredAt.toISOString(),
        coinType: entry.coinType,
        symbol: coin?.symbol ?? null,
        amount: coin ? formatTokenAmount(entry.amountRaw, coin.decimals) : null,
        direction: entry.direction,
        failed: entry.failed,
        suggestedMinor: coin && rate ? tokenToFiatMinor(entry.amountRaw, coin.decimals, rate) : null,
        // Tatum only has today's rate, so a suggestion for any other day is an estimate.
        isEstimate: entry.occurredAt.toISOString().slice(0, 10) !== today,
        importedIn: importedIn.get(`${entry.digest}|${entry.coinType}`) ?? null,
      });
    }
    return jsonSuccess({ wallet: session.walletAddress, currency, entries: rows, nextCursor });
  } catch (error) {
    console.warn(`Sui activity failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return jsonError('SERVICE_UNAVAILABLE', 'Your Sui activity could not be read through Tatum. Please retry.', 503);
  }
}
