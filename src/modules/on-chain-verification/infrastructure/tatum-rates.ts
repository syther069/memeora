import { getServerConfig } from '@/lib/config/env';
import type { CurrencyCode } from '@/modules/finance/domain/money';

const RATE_URL = 'https://api.tatum.io/v4/data/rate/symbol';
const RATE_CACHE_TTL_MS = 5 * 60_000;

/**
 * Tokens Memeora will price, by exact coin type. A symbol proves nothing, since
 * anyone can mint a token called USDC. Stablecoins count as 1 USD. Anything else
 * has no suggested value, and the user types their own.
 */
const PRICED_COINS: Record<string, { symbol: string; usdPegged: boolean }> = {
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': { symbol: 'SUI', usdPegged: false },
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC': { symbol: 'USDC', usdPegged: true },
  '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT': { symbol: 'USDT', usdPegged: true },
};

const cache = new Map<string, { at: number; value: string }>();

/** Today's rate only: Tatum returned the current rate even when asked for a past time. */
export class TatumRates {
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { apiKey?: string; fetchImpl?: typeof fetch } = {}) {
    this.apiKey = options.apiKey ?? getServerConfig().tatumApiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** The value of one whole token in this currency, as a decimal string. Null when there is none to suggest. */
  async rateFor(coinType: string, currency: CurrencyCode): Promise<string | null> {
    const coin = PRICED_COINS[coinType];
    if (!coin) return null;
    if (coin.symbol === currency || (coin.usdPegged && currency === 'USD')) return '1';
    if (currency === 'OTHER' || !this.apiKey) return null;

    const key = `${coin.symbol}:${currency}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < RATE_CACHE_TTL_MS) return cached.value;
    try {
      const response = await this.fetchImpl(`${RATE_URL}?symbol=${coin.symbol}&basePair=${currency}`, {
        headers: { 'x-api-key': this.apiKey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return null;
      const { value } = await response.json() as { value?: unknown };
      if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) return null;
      cache.set(key, { at: Date.now(), value });
      return value;
    } catch {
      return null; // No suggestion; the user types the value.
    }
  }
}
