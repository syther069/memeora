import { describe, expect, it } from 'vitest';
import { calculateBusinessMetrics, formatRunway, recentPeriods } from '@/modules/finance/domain/business-metrics';
import { categoriesFor } from '@/modules/finance/domain/categories';
import { formatTokenAmount, normalizeChainHash, tokenToFiatMinor, walletEntries } from '@/modules/on-chain-verification/domain/sui-wallet-activity';
import { SuiWalletHistory } from '@/modules/on-chain-verification/infrastructure/sui-wallet-history';
import { readAppMode } from '@/lib/app-mode';

const WALLET = `0x${'1'.repeat(64)}`;
const OTHER = `0x${'2'.repeat(64)}`;
const SUI = '0x2::sui::SUI';
const USDC = '0xabc::usdc::USDC';
const tx = (balanceChanges: Array<{ address: string; coinType: string; amount: string }>, success = true) => ({
  digest: 'd', occurredAt: new Date('2026-11-05T08:00:00Z'), success, balanceChanges,
});

describe('SuiWalletHistory.listEntries', () => {
  it('scans again from the lowest checkpoint when it reaches pruned history, keeping results', async () => {
    const requests: Array<{ startCheckpoint?: bigint }> = [];
    const listTransactions = (request: { startCheckpoint?: bigint }) => {
      requests.push(request);
      return {
        responses: (async function* () {
          yield { transaction: { digest: 'd1', timestamp: { seconds: '1793866510' }, effects: { status: { success: true } }, balanceChanges: [{ address: WALLET, coinType: SUI, amount: '5' }] } };
          if (request.startCheckpoint === undefined) throw new Error('requested data below earliest available; lowest available checkpoint is 237661232');
        })(),
      };
    };
    const history = new SuiWalletHistory({ apiKey: 'k', clientFactory: () => ({ ledgerService: { listTransactions } }) as never });

    const page = await history.listEntries(WALLET);
    expect(requests.map((request) => request.startCheckpoint)).toEqual([undefined, BigInt(237661232)]);
    expect(page.entries.map((entry) => [entry.digest, entry.amountRaw])).toEqual([['d1', '5']]);
    expect(page.nextCursor).toBeNull();
  });
});

describe('recentPeriods', () => {
  it('walks back across a year boundary', () => {
    expect(recentPeriods('2026-02', 3)).toEqual(['2026-02', '2026-01', '2025-12']);
  });
});

describe('calculateBusinessMetrics', () => {
  const month = (period: string, incomeMinor: number, expenseMinor: number, transactionCount = 1) => ({ period, incomeMinor, expenseMinor, transactionCount });

  it('averages net spend over months with records only, and rounds runway down', () => {
    const metrics = calculateBusinessMetrics([month('2026-11', 100, 500), month('2026-10', 200, 400), month('2026-09', 0, 0, 0)], '2026-11', 1000);
    expect(metrics).toEqual({ revenueMinor: 100, expensesMinor: 500, profitMinor: -400, burnMinor: 300, notBurning: false, runwayTenths: 33, burnMonths: 2 });
  });

  it('reports not burning, with no runway, when revenue covers costs', () => {
    const metrics = calculateBusinessMetrics([month('2026-11', 900, 500)], '2026-11', 1000);
    expect(metrics).toMatchObject({ burnMinor: 0, notBurning: true, runwayTenths: null });
  });

  it('has no burn without records, and no runway without cash', () => {
    expect(calculateBusinessMetrics([], '2026-11', 1000)).toMatchObject({ burnMinor: null, notBurning: false, runwayTenths: null, profitMinor: 0 });
    expect(calculateBusinessMetrics([month('2026-11', 0, 500)], '2026-11', null)).toMatchObject({ burnMinor: 500, runwayTenths: null });
  });

  it('counts this month from the current period, not from older ones', () => {
    expect(calculateBusinessMetrics([month('2026-10', 100, 500)], '2026-11', null)).toMatchObject({ revenueMinor: 0, expensesMinor: 0, burnMinor: 400 });
  });
});

describe('formatRunway', () => {
  it('reads naturally', () => {
    expect(formatRunway(72)).toBe('7.2 months');
    expect(formatRunway(70)).toBe('7 months');
    expect(formatRunway(10)).toBe('1 month');
    expect(formatRunway(0)).toBe('0 months');
  });
});

describe('walletEntries', () => {
  it('uses only this wallet\'s changes, so another payer\'s gas yields nothing', () => {
    expect(walletEntries(WALLET, tx([{ address: OTHER, coinType: SUI, amount: '-716216' }]))).toEqual([]);
  });

  it('reads the real delete: a net storage refund is income', () => {
    const [entry] = walletEntries(WALLET, tx([{ address: WALLET, coinType: SUI, amount: '5188922' }]));
    expect(entry).toMatchObject({ direction: 'income', amountRaw: '5188922', coinType: SUI, failed: false });
  });

  it('gives a swap one entry per token, nets repeats, and drops a zero', () => {
    const entries = walletEntries(WALLET, tx([
      { address: WALLET, coinType: SUI, amount: '-300' },
      { address: WALLET, coinType: SUI, amount: '-200' },
      { address: WALLET, coinType: USDC, amount: '700' },
      { address: WALLET, coinType: '0xdead::x::X', amount: '5' },
      { address: WALLET, coinType: '0xdead::x::X', amount: '-5' },
    ]));
    expect(entries.map((entry) => [entry.coinType, entry.direction, entry.amountRaw])).toEqual([[SUI, 'expense', '500'], [USDC, 'income', '700']]);
  });

  it('marks a failed transaction, and handles amounts beyond a float\'s precision', () => {
    expect(walletEntries(WALLET, tx([{ address: WALLET, coinType: SUI, amount: '-90071992547409931234' }], false))[0])
      .toMatchObject({ failed: true, amountRaw: '90071992547409931234' });
  });
});

describe('formatTokenAmount', () => {
  it('keeps every digit and no trailing zeros', () => {
    expect(formatTokenAmount('1500000000', 9)).toBe('1.5');
    expect(formatTokenAmount('5188922', 9)).toBe('0.005188922');
    expect(formatTokenAmount('1000000', 6)).toBe('1');
    expect(formatTokenAmount('42', 0)).toBe('42');
  });
});

describe('tokenToFiatMinor', () => {
  it('converts exactly, rounding half up', () => {
    expect(tokenToFiatMinor('1500000000', 9, '100')).toBe(15000);
    expect(tokenToFiatMinor('1000000000', 9, '0.93029094')).toBe(93);
    expect(tokenToFiatMinor('5000000', 9, '1')).toBe(1); // 0.5 cents rounds up
    expect(tokenToFiatMinor('5188922', 9, '87.37475791')).toBe(45);
  });

  it('gives nothing for a value under half a cent, a bad rate, or an unsafe size', () => {
    expect(tokenToFiatMinor('4000000', 9, '1')).toBeNull();
    expect(tokenToFiatMinor('1000000000', 9, 'abc')).toBeNull();
    expect(tokenToFiatMinor('1000000000', 9, '-1')).toBeNull();
    expect(tokenToFiatMinor(`1${'0'.repeat(40)}`, 9, '1')).toBeNull();
  });
});

describe('normalizeChainHash', () => {
  it('lowercases hex hashes, keeps base58 case, and checks shape per chain', () => {
    expect(normalizeChainHash('ethereum', ` 0x${'A'.repeat(64)} `)).toBe(`0x${'a'.repeat(64)}`);
    expect(normalizeChainHash('bitcoin', 'B'.repeat(64))).toBe('b'.repeat(64));
    const solana = 'A1'.repeat(40);
    expect(normalizeChainHash('solana', solana)).toBe(solana);
    expect(normalizeChainHash('base', 'a'.repeat(64))).toBeNull();
    expect(normalizeChainHash('sui', 'a'.repeat(44))).toBeNull();
    expect(normalizeChainHash('other', 'short')).toBeNull();
  });
});

describe('categoriesFor', () => {
  it('leaves the personal form as it was, and adds crypto categories only on-chain', () => {
    expect(categoriesFor('personal', 'expense')[0]).toBe('Groceries');
    expect(categoriesFor('personal', 'income')).toEqual(['Salary', 'Freelance', 'Other']);
    expect(categoriesFor('personal', 'expense')).not.toContain('Swap');
    expect(categoriesFor('personal', 'expense', true)).toContain('Swap');
    expect(categoriesFor('business', 'expense')).toContain('Smart contract audits');
    expect(categoriesFor('business', 'income', true)).toContain('Token sale');
  });
});

describe('readAppMode', () => {
  const withHeader = (value: string | null) => ({ headers: { get: () => value } });
  it('defaults to Personal and refuses unknown values', () => {
    expect(readAppMode(withHeader(null))).toBe('personal');
    expect(readAppMode(withHeader('business'))).toBe('business');
    expect(readAppMode(withHeader('admin'))).toBeNull();
  });
});
