import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Real routes, SQL and RLS on PGlite under the runtime role. Only the network
// edges are stand-ins: Sui (read through Tatum), prices, and MemWal.
const db = vi.hoisted(() => ({ instance: undefined as import('@electric-sql/pglite').PGlite | undefined }));
vi.mock('@/lib/postgres/pool', () => ({
  getPostgresPool: () => ({
    connect: async () => ({
      query: (sql: string, values?: readonly unknown[]) => db.instance!.query(sql, values ? [...values] : undefined),
      release: () => undefined,
    }),
  }),
}));

const SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const USDC = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const DIGEST = '5'.repeat(44);
const OTHER_DIGEST = '6'.repeat(44);

const chain = vi.hoisted(() => ({
  listed: [] as Array<{ digest: string; occurredAt: Date; coinType: string; direction: 'income' | 'expense'; amountRaw: string; failed: boolean }>,
  byDigest: new Map<string, Array<{ digest: string; occurredAt: Date; coinType: string; direction: 'income' | 'expense'; amountRaw: string; failed: boolean }>>(),
  failing: false,
  wallets: [] as string[],
}));
vi.mock('@/modules/on-chain-verification/infrastructure/sui-wallet-history', () => ({
  SuiWalletHistory: class {
    isConfigured() { return true; }
    async listEntries(wallet: string) {
      if (chain.failing) throw new Error('Tatum unavailable');
      chain.wallets.push(wallet);
      return { entries: chain.listed, nextCursor: null };
    }
    async readEntries(wallet: string, digest: string) {
      if (chain.failing) throw new Error('Tatum unavailable');
      chain.wallets.push(wallet);
      return chain.byDigest.get(digest) ?? null;
    }
    async coinFacts(coinType: string) {
      if (coinType.endsWith('::sui::SUI')) return { symbol: 'SUI', decimals: 9 };
      if (coinType.endsWith('::usdc::USDC')) return { symbol: 'USDC', decimals: 6 };
      return null;
    }
  },
}));
vi.mock('@/modules/on-chain-verification/infrastructure/tatum-rates', () => ({
  TatumRates: class {
    async rateFor(coinType: string) { return coinType.endsWith('::sui::SUI') ? '100' : null; }
  },
}));

const walrus = vi.hoisted(() => ({ writes: [] as Array<{ namespace: string; text: string }>, recalls: [] as string[] }));
vi.mock('@mysten-incubation/memwal', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mysten-incubation/memwal')>(),
  MemWal: {
    create: () => ({
      async remember(text: string, namespace: string, options: { idempotencyKey: string }) {
        walrus.writes.push({ namespace, text });
        return { job_id: options.idempotencyKey, status: 'accepted' };
      },
      async getRememberStatus(jobId: string) { return { job_id: jobId, status: 'running' }; },
      async recall({ namespace }: { namespace: string }) {
        walrus.recalls.push(namespace);
        return { results: [], total: 0 };
      },
      destroy() {},
    }),
  },
}));

import { POST as assistantRoute } from '@/app/api/assistant/chat/route';
import { GET as budgetsGet, POST as budgetsPost } from '@/app/api/budgets/route';
import { GET as businessGet, PUT as businessPut } from '@/app/api/business/route';
import { GET as overviewGet } from '@/app/api/overview/route';
import { GET as memorySummaryRoute } from '@/app/api/memory/route';
import { POST as onboardingPost, GET as onboardingGet } from '@/app/api/onboarding/route';
import { PUT as modePut } from '@/app/api/profile/mode/route';
import { POST as rememberRoute } from '@/app/api/memory/remember/route';
import { POST as recallRoute } from '@/app/api/memory/recall/route';
import { GET as exportGet } from '@/app/api/transactions/export/route';
import { POST as importRoute } from '@/app/api/transactions/import/route';
import { POST as onchainRoute } from '@/app/api/transactions/onchain/route';
import { GET as transactionsGet, POST as transactionsPost } from '@/app/api/transactions/route';
import { PATCH as transactionPatch } from '@/app/api/transactions/[id]/route';
import { GET as activityGet } from '@/app/api/transactions/sui-activity/route';
import { WALLET_SESSION_COOKIE } from '@/lib/auth/wallet-session';
import { currentPeriod } from '@/lib/finance-api';
import { createMigratedDatabase, enableConsent, giveReadyMemoryAccount, signIn, TEST_VAULT_SECRET } from '../helpers/wallet-harness';

type Mode = 'personal' | 'business';

function request(method: string, url: string, cookie: string, mode: Mode | string | null, body?: unknown, extraHeaders: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: `${WALLET_SESSION_COOKIE}=${cookie}`,
      ...(mode ? { 'x-memeora-mode': mode } : {}),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const dataOf = async (response: Response) => (await response.json()).data;

const expense = (category: string, amountMinor: number, extra: Record<string, unknown> = {}) => ({ type: 'expense', amountMinor, currency: 'USD', category, ...extra });

async function signedIn() {
  const keypair = new Ed25519Keypair();
  return { wallet: keypair.toSuiAddress(), cookie: await signIn(keypair) };
}

const listed = async (cookie: string, mode: Mode) =>
  (await dataOf(await transactionsGet(request('GET', '/api/transactions?limit=100', cookie, mode)))).transactions as Array<Record<string, never> & { id: string; category: string; onChain: { verified: boolean; assetAmount: string } | null; fiatEstimated: boolean; amountMinor: number; type: string; occurredAt: string }>;

beforeAll(async () => {
  db.instance = await createMigratedDatabase();
});
afterAll(async () => {
  await db.instance?.close();
});
beforeEach(() => {
  vi.stubEnv('MEMEORA_DELEGATE_KEY_SECRET', TEST_VAULT_SECRET);
  vi.stubEnv('LLM_API_KEY', '');
  vi.stubEnv('GROQ_API_KEY', '');
  chain.listed = [];
  chain.byDigest.clear();
  chain.failing = false;
  chain.wallets.length = 0;
  walrus.writes.length = 0;
  walrus.recalls.length = 0;
});

describe('workspaces stay separate', () => {
  it('keeps transactions apart, with no header meaning Personal, and rejects an unknown mode', async () => {
    const { cookie } = await signedIn();
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 5000, { counterparty: 'Acme Labs', reference: 'INV-1' })));
    await transactionsPost(request('POST', '/api/transactions', cookie, null, expense('Groceries', 700)));

    expect((await listed(cookie, 'business')).map((tx) => tx.category)).toEqual(['Payroll']);
    expect((await listed(cookie, 'personal')).map((tx) => tx.category)).toEqual(['Groceries']);
    expect((await listed(cookie, 'business'))[0]).toMatchObject({ counterparty: 'Acme Labs', reference: 'INV-1' });
    expect((await transactionsGet(request('GET', '/api/transactions', cookie, 'admin'))).status).toBe(400);
  });

  it('keeps budgets, period totals and goals apart', async () => {
    const { cookie } = await signedIn();
    const period = currentPeriod();
    const setBudget = (mode: Mode, amountMinor: number) => budgetsPost(request('POST', '/api/budgets', cookie, mode, { action: 'set-budget', period, amountMinor, currency: 'USD' }));
    expect((await setBudget('personal', 1000)).status).toBe(201);
    expect((await setBudget('business', 90000)).status).toBe(201);
    expect((await setBudget('business', 80000)).status).toBe(200);
    await budgetsPost(request('POST', '/api/budgets', cookie, 'business', { action: 'create-goal', name: 'Six months of runway', targetAmountMinor: 1000, currency: 'USD' }));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 5000)));

    const personal = await dataOf(await budgetsGet(request('GET', `/api/budgets?period=${period}`, cookie, 'personal')));
    const business = await dataOf(await budgetsGet(request('GET', `/api/budgets?period=${period}`, cookie, 'business')));
    expect(personal.budget.amountMinor).toBe(1000);
    expect(personal.savingsGoals).toEqual([]);
    expect(personal.periodTotals).toEqual([]);
    expect(business.budget.amountMinor).toBe(80000);
    expect(business.savingsGoals.map((goal: { name: string }) => goal.name)).toEqual(['Six months of runway']);
    expect(business.periodTotals[0].expenseMinor).toBe(5000);
  });

  it('writes and recalls Walrus memories in each workspace\'s own namespace', async () => {
    const { wallet, cookie } = await signedIn();
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, wallet);
    const save = (mode: Mode, text: string) => rememberRoute(request('POST', '/api/memory/remember', cookie, mode, { category: 'goal', text }));

    expect((await save('business', 'Always keep six months of runway')).status).toBe(202);
    expect((await save('personal', 'Always keep six months of runway')).status).toBe(202);
    expect((await save('business', 'always keep six months of runway')).status).toBe(409);
    expect(walrus.writes.map((write) => write.namespace)).toEqual([`memeora:${wallet}:business`, `memeora:${wallet}`]);

    const page = async (mode: Mode) => (await dataOf(await recallRoute(request('POST', '/api/memory/recall', cookie, mode, { sync: false, limit: 10 })))).memories;
    expect(await page('business')).toHaveLength(1);
    expect(await page('personal')).toHaveLength(1);

    await recallRoute(request('POST', '/api/memory/recall', cookie, 'business', { limit: 10 }));
    expect(walrus.recalls.at(-1)).toBe(`memeora:${wallet}:business`);
  });

  it('gives the Assistant only the active workspace\'s records and memories', async () => {
    const { wallet, cookie } = await signedIn();
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, wallet);
    const period = currentPeriod();
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 700000)));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 700)));
    await rememberRoute(request('POST', '/api/memory/remember', cookie, 'business', { category: 'preference', text: 'Keep six months of runway' }));
    await rememberRoute(request('POST', '/api/memory/remember', cookie, 'personal', { category: 'preference', text: 'Keep a small personal buffer' }));
    const ask = async (mode: Mode) => dataOf(await assistantRoute(request('POST', '/api/assistant/chat', cookie, mode, { prompt: 'How are we doing?', cycleMonth: period })));

    const business = await ask('business');
    expect(business.calculationContext).toMatchObject({ mode: 'business', spendingFormatted: expect.stringContaining('7,000') });
    expect(business.calculationContext.business.expensesFormatted).toContain('7,000');
    expect(business.recalledMemories.map((memory: { text: string }) => memory.text)).toEqual(['Keep six months of runway']);
    expect(walrus.recalls.at(-1)).toBe(`memeora:${wallet}:business`);

    const personal = await ask('personal');
    expect(personal.calculationContext.mode).toBe('personal');
    expect(personal.calculationContext.business).toBeUndefined();
    expect(personal.recalledMemories.map((memory: { text: string }) => memory.text)).toEqual(['Keep a small personal buffer']);
    expect(walrus.recalls.at(-1)).toBe(`memeora:${wallet}`);
  });

  it('remembers the chosen mode, from onboarding and from the switcher', async () => {
    const { cookie } = await signedIn();
    const complete = await onboardingPost(request('POST', '/api/onboarding', cookie, null, { action: 'complete', currency: 'USD', memoryConsentEnabled: false, monthlyBudgetMinor: 5000, activeMode: 'business' }));
    expect(complete.status).toBe(201);
    const period = currentPeriod();
    expect((await dataOf(await budgetsGet(request('GET', `/api/budgets?period=${period}`, cookie, 'business')))).budget.amountMinor).toBe(5000);
    expect((await dataOf(await budgetsGet(request('GET', `/api/budgets?period=${period}`, cookie, 'personal')))).budget).toBeNull();
    expect((await dataOf(await onboardingGet(request('GET', '/api/onboarding', cookie, null)))).profile.active_mode).toBe('business');

    expect((await modePut(request('PUT', '/api/profile/mode', cookie, null, { mode: 'personal' }))).status).toBe(200);
    expect((await dataOf(await onboardingGet(request('GET', '/api/onboarding', cookie, null)))).profile.active_mode).toBe('personal');
    expect((await modePut(request('PUT', '/api/profile/mode', cookie, null, { mode: 'nope' }))).status).toBe(400);
  });
});

describe('retrying a write', () => {
  const KEY = { 'idempotency-key': 'retry-key-0000001' };

  it('adds a transaction once when the same key is sent twice, and returns the same entry', async () => {
    const { cookie } = await signedIn();
    const send = (key: Record<string, string>) => transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 700), key));
    const first = await send(KEY);
    const second = await send(KEY);
    expect([first.status, second.status]).toEqual([201, 201]);
    const [a, b] = [await dataOf(first), await dataOf(second)];
    expect(b.transaction.id).toBe(a.transaction.id);
    expect(await listed(cookie, 'personal')).toHaveLength(1);

    // A different key is a different entry, and no key behaves as before.
    await send({ 'idempotency-key': 'retry-key-0000002' });
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 700)));
    expect(await listed(cookie, 'personal')).toHaveLength(3);
  });

  it('keeps keys per wallet and per workspace, and refuses a malformed key', async () => {
    const { cookie } = await signedIn();
    const other = await signedIn();
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 700), KEY));
    await transactionsPost(request('POST', '/api/transactions', other.cookie, 'personal', expense('Dining', 900), KEY));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 900), KEY));
    expect(await listed(other.cookie, 'personal')).toHaveLength(1);
    expect(await listed(cookie, 'business')).toHaveLength(1);
    expect((await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 700), { 'idempotency-key': 'bad key!' }))).status).toBe(400);
  });

  it('adds money to a goal once, creates a goal once, and leaves no claim behind a failed write', async () => {
    const { cookie } = await signedIn();
    const post = (body: unknown, key: Record<string, string>) => budgetsPost(request('POST', '/api/budgets', cookie, 'personal', body, key));
    const create = { action: 'create-goal', name: 'Laptop', targetAmountMinor: 10000, currency: 'USD' };
    await post(create, KEY);
    const repeat = await post(create, KEY);
    expect(repeat.status).toBe(201);
    const goals = (await dataOf(await budgetsGet(request('GET', `/api/budgets?period=${currentPeriod()}`, cookie, 'personal')))).savingsGoals;
    expect(goals).toHaveLength(1);

    const contribute = { action: 'contribute-goal', goalId: goals[0].id, amountMinor: 500 };
    const addKey = { 'idempotency-key': 'contribute-key-01' };
    await post(contribute, addKey);
    const again = await dataOf(await post(contribute, addKey));
    expect(again.savingsGoal.currentAmountMinor).toBe(500);

    // A refused write does not use up the key: fixing the amount and retrying works.
    const failKey = { 'idempotency-key': 'contribute-key-02' };
    expect((await post({ ...contribute, amountMinor: -1 }, failKey)).status).toBe(400);
    expect((await dataOf(await post(contribute, failKey))).savingsGoal.currentAmountMinor).toBe(1000);
  });
});

describe('overview charts', () => {
  it('sums recent months and this month\'s categories per workspace, in order', async () => {
    const { cookie } = await signedIn();
    const period = currentPeriod();
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Dining', 700)));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Dining', 300)));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 5000)));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', { type: 'income', amountMinor: 9000, currency: 'USD', category: 'Salary' }));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 111)));

    const data = await dataOf(await overviewGet(request('GET', `/api/overview?period=${period}`, cookie, 'personal')));
    expect(data.periods).toHaveLength(6);
    expect(data.periods.at(-1)).toBe(period);
    expect(data.months).toEqual([{ period, currency: 'USD', incomeMinor: 9000, expenseMinor: 6000 }]);
    expect(data.categories).toEqual([
      { currency: 'USD', category: 'Groceries', amountMinor: 5000 },
      { currency: 'USD', category: 'Dining', amountMinor: 1000 },
    ]);
    expect((await overviewGet(request('GET', '/api/overview?period=2026-13', cookie, 'personal'))).status).toBe(400);
  });

  it('gives the overview only that workspace\'s newest rules', async () => {
    const { wallet, cookie } = await signedIn();
    await enableConsent(cookie);
    await giveReadyMemoryAccount(db.instance!, wallet);
    await rememberRoute(request('POST', '/api/memory/remember', cookie, 'business', { category: 'goal', text: 'Keep six months of runway' }));
    const business = await dataOf(await memorySummaryRoute(request('GET', '/api/memory', cookie, 'business')));
    const personal = await dataOf(await memorySummaryRoute(request('GET', '/api/memory', cookie, 'personal')));
    expect(business.recent.map((rule: { text: string }) => rule.text)).toEqual(['Keep six months of runway']);
    expect(personal.recent).toEqual([]);
  });
});

describe('business overview', () => {
  it('sums the workspace exactly, and only it', async () => {
    const { cookie } = await signedIn();
    const period = currentPeriod();
    await businessPut(request('PUT', '/api/business', cookie, null, { cashMinor: 1000000, currency: 'USD' }));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', { type: 'income', amountMinor: 100000, currency: 'USD', category: 'Client revenue', counterparty: 'Acme Labs' }));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 300000, { counterparty: 'Acme Labs' })));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Marketing', 50000)));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 999)));

    const overview = await dataOf(await businessGet(request('GET', `/api/business?period=${period}`, cookie, null)));
    expect(overview.metrics).toEqual({
      revenueMinor: 100000,
      expensesMinor: 350000,
      profitMinor: -250000,
      burnMinor: 250000,
      notBurning: false,
      runwayTenths: 40,
      burnMonths: 1,
    });
    expect(overview.topCategories).toEqual([{ category: 'Payroll', amountMinor: 300000 }, { category: 'Marketing', amountMinor: 50000 }]);
    expect(overview.counterparties).toEqual([{ name: 'Acme Labs', receivedMinor: 100000, paidMinor: 300000 }]);
  });

  it('refuses a negative or fractional cash figure', async () => {
    const { cookie } = await signedIn();
    expect((await businessPut(request('PUT', '/api/business', cookie, null, { cashMinor: -1, currency: 'USD' }))).status).toBe(400);
    expect((await businessPut(request('PUT', '/api/business', cookie, null, { cashMinor: 1.5, currency: 'USD' }))).status).toBe(400);
    expect((await businessPut(request('PUT', '/api/business', cookie, null, { cashMinor: null, currency: 'USD' }))).status).toBe(200);
  });

  it('exports the workspace\'s month as CSV, defusing spreadsheet formulas', async () => {
    const { cookie } = await signedIn();
    await transactionsPost(request('POST', '/api/transactions', cookie, 'business', expense('Payroll', 123456, { description: '=HYPERLINK("http://x")', counterparty: 'A, B' })));
    await transactionsPost(request('POST', '/api/transactions', cookie, 'personal', expense('Groceries', 999)));
    const response = await exportGet(request('GET', `/api/transactions/export?period=${currentPeriod()}`, cookie, 'business'));
    const csv = await response.text();
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(csv).toContain('1234.56,USD,Payroll');
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"A, B"');
    expect(csv).not.toContain('Groceries');
  });
});

describe('Sui wallet import', () => {
  const past = new Date('2026-01-15T10:00:00Z');
  const entry = (digest: string, coinType: string, direction: 'income' | 'expense', amountRaw: string, occurredAt = past) => ({ digest, occurredAt, coinType, direction, amountRaw, failed: false });
  const item = (extra: Record<string, unknown> = {}) => ({ digest: DIGEST, coinType: SUI, category: 'Crypto received', amountMinor: 15000, currency: 'USD', ...extra });
  const importItems = (cookie: string, mode: Mode, items: unknown[]) => importRoute(request('POST', '/api/transactions/import', cookie, mode, { items }));

  it('lists the session wallet\'s activity with a suggested value, ignoring any address in the request', async () => {
    const { wallet, cookie } = await signedIn();
    chain.listed = [entry(DIGEST, SUI, 'income', '1500000000'), entry(OTHER_DIGEST, USDC, 'expense', '2500000')];
    const page = await dataOf(await activityGet(request('GET', `/api/transactions/sui-activity?currency=USD&address=0x${'9'.repeat(64)}`, cookie, null)));
    expect(chain.wallets).toEqual([wallet]);
    expect(page.entries[0]).toMatchObject({ symbol: 'SUI', amount: '1.5', direction: 'income', suggestedMinor: 15000, isEstimate: true, importedIn: null });
    expect(page.entries[1]).toMatchObject({ symbol: 'USDC', amount: '2.5', direction: 'expense', suggestedMinor: null });
  });

  it('takes direction, date and amount from Sui, whatever the request says', async () => {
    const { cookie } = await signedIn();
    chain.byDigest.set(DIGEST, [entry(DIGEST, SUI, 'income', '1500000000')]);
    const response = await importItems(cookie, 'business', [item({ type: 'expense', occurredAt: '2020-01-01', assetAmount: '999', direction: 'expense' })]);
    expect(response.status).toBe(201);
    expect(await dataOf(response)).toEqual({ imported: 1, duplicates: 0, failed: [] });

    const [tx] = await listed(cookie, 'business');
    expect(tx).toMatchObject({ type: 'income', amountMinor: 15000, fiatEstimated: true, onChain: { chain: 'sui', verified: true, assetSymbol: 'SUI', assetAmount: '1.5', txHash: DIGEST } });
    expect(tx.occurredAt).toBe(past.toISOString());
  });

  it('refuses a duplicate, including across modes, and shows where it already is', async () => {
    const { cookie } = await signedIn();
    chain.byDigest.set(DIGEST, [entry(DIGEST, SUI, 'income', '1500000000')]);
    chain.listed = [entry(DIGEST, SUI, 'income', '1500000000')];
    await importItems(cookie, 'business', [item()]);
    expect(await dataOf(await importItems(cookie, 'personal', [item()]))).toEqual({ imported: 0, duplicates: 1, failed: [] });
    expect(await listed(cookie, 'personal')).toEqual([]);
    const page = await dataOf(await activityGet(request('GET', '/api/transactions/sui-activity?currency=USD', cookie, 'personal')));
    expect(page.entries[0].importedIn).toBe('business');
  });

  it('adds nothing for a token that did not move in this wallet, and nothing during a Sui outage', async () => {
    const { cookie } = await signedIn();
    chain.byDigest.set(DIGEST, [entry(DIGEST, SUI, 'income', '1500000000')]);
    const wrongToken = await dataOf(await importItems(cookie, 'personal', [item({ coinType: USDC })]));
    expect(wrongToken.imported).toBe(0);
    expect(wrongToken.failed).toHaveLength(1);
    const unknown = await dataOf(await importItems(cookie, 'personal', [item({ digest: OTHER_DIGEST })]));
    expect(unknown.failed).toHaveLength(1);
    chain.failing = true;
    expect((await importItems(cookie, 'personal', [item()])).status).toBe(503);
    expect(await listed(cookie, 'personal')).toEqual([]);
  });

  it('counts the user\'s own value as no estimate, and keeps chain facts locked when editing', async () => {
    const { cookie } = await signedIn();
    chain.byDigest.set(DIGEST, [entry(DIGEST, SUI, 'income', '1500000000')]);
    await importItems(cookie, 'personal', [item({ valueEdited: true })]);
    let [tx] = await listed(cookie, 'personal');
    expect(tx.fiatEstimated).toBe(false);

    const patch = await transactionPatch(request('PATCH', `/api/transactions/${tx.id}`, cookie, 'personal', {
      type: 'expense', amountMinor: 20000, currency: 'USD', category: 'Airdrop', occurredAt: '2020-01-01T12:00:00Z',
    }), { params: Promise.resolve({ id: tx.id }) });
    expect(patch.status).toBe(200);
    [tx] = await listed(cookie, 'personal');
    expect(tx).toMatchObject({ type: 'income', amountMinor: 20000, category: 'Airdrop', occurredAt: past.toISOString() });
  });

  it('turns an estimate into the user\'s own figure when the value is edited', async () => {
    const { cookie } = await signedIn();
    chain.byDigest.set(DIGEST, [entry(DIGEST, SUI, 'income', '1500000000')]);
    await importItems(cookie, 'personal', [item()]);
    const [tx] = await listed(cookie, 'personal');
    expect(tx.fiatEstimated).toBe(true);
    const edit = (amountMinor: number) => transactionPatch(request('PATCH', `/api/transactions/${tx.id}`, cookie, 'personal', {
      type: 'income', amountMinor, currency: 'USD', category: 'Airdrop', occurredAt: past.toISOString(),
    }), { params: Promise.resolve({ id: tx.id }) });
    await edit(15000);
    expect((await listed(cookie, 'personal'))[0].fiatEstimated).toBe(true);
    await edit(16000);
    expect((await listed(cookie, 'personal'))[0].fiatEstimated).toBe(false);
  });
});

describe('other-chain transactions', () => {
  const HASH = `0x${'A'.repeat(64)}`;
  const body = (extra: Record<string, unknown> = {}) => ({ chain: 'ethereum', txHash: HASH, assetSymbol: 'eth', assetAmount: '0.25', type: 'expense', amountMinor: 50000, currency: 'USD', category: 'Gas & network fees', ...extra });
  const add = (cookie: string, mode: Mode, extra: Record<string, unknown> = {}) => onchainRoute(request('POST', '/api/transactions/onchain', cookie, mode, body(extra)));

  it('saves as not verified, and refuses a repeat across modes', async () => {
    const { cookie } = await signedIn();
    const saved = await add(cookie, 'business');
    expect(saved.status).toBe(201);
    expect((await dataOf(saved)).transaction.onChain).toEqual({ chain: 'ethereum', txHash: HASH.toLowerCase(), coinType: 'ETH', assetSymbol: 'ETH', assetAmount: '0.25', verified: false });
    const repeat = await add(cookie, 'personal', { txHash: HASH.toLowerCase() });
    expect(repeat.status).toBe(409);
    expect((await repeat.json()).error.code).toBe('DUPLICATE_TRANSACTION');
  });

  it('checks the hash shape per chain, and sends Sui to the verified path', async () => {
    const { cookie } = await signedIn();
    expect((await add(cookie, 'personal', { txHash: '0x123' })).status).toBe(400);
    expect((await add(cookie, 'personal', { chain: 'bitcoin' })).status).toBe(400);
    expect((await add(cookie, 'personal', { chain: 'sui', txHash: DIGEST })).status).toBe(400);
    expect((await add(cookie, 'personal', { assetAmount: '0' })).status).toBe(400);
    expect((await add(cookie, 'personal', { assetAmount: '1e5' })).status).toBe(400);
    expect((await add(cookie, 'personal', { chain: 'bitcoin', txHash: 'a'.repeat(64) })).status).toBe(201);
  });

  it('allows two tokens from one transaction, as in a swap', async () => {
    const { cookie } = await signedIn();
    expect((await add(cookie, 'personal')).status).toBe(201);
    expect((await add(cookie, 'personal', { assetSymbol: 'USDC', assetAmount: '500' })).status).toBe(201);
  });
});
