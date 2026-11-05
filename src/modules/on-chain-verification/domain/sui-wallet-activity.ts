/** Zero external dependencies. Amounts are BigInt throughout, never floats. */

const ZERO = BigInt(0);

export interface SuiBalanceChange {
  address?: string;
  coinType?: string;
  amount?: string;
}

export interface SuiTransactionFacts {
  digest: string;
  occurredAt: Date;
  success: boolean;
  balanceChanges: SuiBalanceChange[];
}

/** One token moving in or out of the wallet in one transaction. */
export interface SuiWalletEntry {
  digest: string;
  occurredAt: Date;
  coinType: string;
  direction: 'income' | 'expense';
  /** Positive amount in the token's smallest unit, as a decimal string. */
  amountRaw: string;
  /** The transaction failed on chain, so this movement is only its gas. */
  failed: boolean;
}

/**
 * What a transaction did to this wallet. Other addresses' changes are ignored,
 * so a transaction whose gas someone else sponsored, and which moved nothing of
 * this wallet's, yields no entries. A swap yields one entry per token.
 */
export function walletEntries(wallet: string, transaction: SuiTransactionFacts): SuiWalletEntry[] {
  const totals = new Map<string, bigint>();
  for (const change of transaction.balanceChanges) {
    if (change.address !== wallet || !change.coinType || change.amount === undefined) continue;
    totals.set(change.coinType, (totals.get(change.coinType) ?? ZERO) + BigInt(change.amount));
  }
  const entries: SuiWalletEntry[] = [];
  for (const [coinType, amount] of totals) {
    if (amount === ZERO) continue;
    entries.push({
      digest: transaction.digest,
      occurredAt: transaction.occurredAt,
      coinType,
      direction: amount > ZERO ? 'income' : 'expense',
      amountRaw: (amount < ZERO ? -amount : amount).toString(),
      failed: !transaction.success,
    });
  }
  return entries;
}

/** "1.5" from raw 1500000000 at 9 decimals, keeping every digit. */
export function formatTokenAmount(amountRaw: string, decimals: number): string {
  const digits = amountRaw.padStart(decimals + 1, '0');
  if (decimals === 0) return digits;
  const whole = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * Ledger value in minor units from a token amount and a decimal rate string,
 * rounded half up. Null if the rate is unusable, the value rounds to nothing,
 * or it is too large for the ledger.
 */
export function tokenToFiatMinor(amountRaw: string, decimals: number, rate: string): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(rate.trim());
  if (!match) return null;
  const fraction = match[2] ?? '';
  const rateScaled = BigInt(`${match[1]}${fraction}`);
  const denominator = BigInt(`1${'0'.repeat(decimals + fraction.length)}`);
  const minor = (BigInt(amountRaw) * rateScaled * BigInt(200) + denominator) / (denominator * BigInt(2));
  if (minor <= ZERO || minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor);
}

/** Chains a user can record by hash, with the shape their hashes take. Sui goes through the verified path. */
const HASH_PATTERNS: Record<string, RegExp> = {
  ethereum: /^0x[0-9a-fA-F]{64}$/,
  base: /^0x[0-9a-fA-F]{64}$/,
  arbitrum: /^0x[0-9a-fA-F]{64}$/,
  polygon: /^0x[0-9a-fA-F]{64}$/,
  bnb: /^0x[0-9a-fA-F]{64}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{64,90}$/,
  bitcoin: /^[0-9a-fA-F]{64}$/,
  other: /^[0-9A-Za-z_:-]{8,128}$/,
};

export const OTHER_CHAINS = Object.keys(HASH_PATTERNS);

/** The normalized hash for this chain, or null if it cannot be one of its hashes. */
export function normalizeChainHash(chain: string, hash: string): string | null {
  const pattern = HASH_PATTERNS[chain];
  const trimmed = hash.trim();
  if (!pattern || !pattern.test(trimmed)) return null;
  return pattern.source.includes('a-fA-F') ? trimmed.toLowerCase() : trimmed;
}

export const SUI_DIGEST_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
