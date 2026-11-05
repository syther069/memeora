import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ instance: undefined as import('@electric-sql/pglite').PGlite | undefined }));
vi.mock('@/lib/postgres/pool', () => ({
  getPostgresPool: () => ({
    connect: async () => ({
      query: (sql: string, values?: readonly unknown[]) => db.instance!.query(sql, values ? [...values] : undefined),
      release: () => undefined,
    }),
  }),
}));

import { GET as transactionsGet, POST as transactionsPost } from '@/app/api/transactions/route';
import { GET as budgetsGet, POST as budgetsPost } from '@/app/api/budgets/route';
import { GET as sessionGet } from '@/app/api/auth/session/route';
import { POST as rememberRoute } from '@/app/api/memory/remember/route';
import { POST as recallRoute } from '@/app/api/memory/recall/route';
import { DELETE as deleteMemoryRoute } from '@/app/api/memory/[id]/route';
import { POST as assistantRoute } from '@/app/api/assistant/chat/route';
import { GET as verificationRoute } from '@/app/api/verification/sui-checkpoint/route';
import { GET as memoryProofsRoute } from '@/app/api/verification/memories/route';
import { GET as memorySummaryRoute } from '@/app/api/memory/route';
import { DELETE as transactionDelete, PATCH as transactionPatch } from '@/app/api/transactions/[id]/route';
import { PUT as consentPut } from '@/app/api/memory/consent/route';
import { GET as onboardingGet, POST as onboardingPost } from '@/app/api/onboarding/route';
import { createMigratedDatabase, deleteRequest, getRequest, jsonRequest, signIn, insertMemory } from '../helpers/wallet-harness';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('API routes with verified wallet sessions on PostgreSQL', () => {
  beforeAll(async () => {
    db.instance = await createMigratedDatabase();
  });

  afterAll(async () => {
    await db.instance?.close();
  });

  beforeEach(() => {
    vi.stubEnv('TATUM_API_KEY', '');
    vi.stubEnv('MEMWAL_KEY', '');
    vi.stubEnv('MEMWAL_ACCOUNT_ID', '');
    vi.stubEnv('LLM_API_KEY', '');
  });

  describe('/api/auth/session', () => {
    it('reports unauthenticated without a session and the wallet with one', async () => {
      expect((await (await sessionGet(getRequest('/api/auth/session'))).json()).data.authenticated).toBe(false);
      const cookie = await signIn();
      const session = (await (await sessionGet(getRequest('/api/auth/session', cookie))).json()).data;
      expect(session).toMatchObject({ authenticated: true, walletAddress: expect.stringMatching(/^0x[0-9a-f]{64}$/) });
    });

    it('ignores identity headers that are not a Memeora session', async () => {
      const request = getRequest('/api/transactions');
      request.headers.set('x-user-id', 'usr_spoofed');
      request.headers.set('authorization', 'Bearer forged');
      expect((await transactionsGet(request)).status).toBe(401);
    });
  });

  describe('/api/onboarding', () => {
    it('requires a choice, then saves with only a memory choice and stops being required', async () => {
      const cookie = await signIn();
      const status = async () => (await (await onboardingGet(getRequest('/api/onboarding', cookie))).json()).data.onboardingRequired;
      expect(await status()).toBe(true);
      expect((await onboardingPost(jsonRequest('POST', '/api/onboarding', { action: 'complete', currency: 'INR' }, cookie))).status).toBe(400);

      const saved = await onboardingPost(jsonRequest('POST', '/api/onboarding', { action: 'complete', currency: 'USD', memoryConsentEnabled: true, monthlyBudgetMinor: null, savingsGoal: null }, cookie));
      expect(saved.status).toBe(201);
      expect(await status()).toBe(false);

      const budgets = (await (await budgetsGet(getRequest('/api/budgets', cookie))).json()).data;
      expect(budgets).toMatchObject({ preferredCurrency: 'USD', budget: null, savingsGoals: [] });
      // Consent is recorded; saving still needs the wallet's own Walrus account.
      expect((await (await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text: 'Consent alone is not enough' }, cookie))).json()).error.code).toBe('MEMORY_ACCOUNT_REQUIRED');
    });
  });

  describe('/api/transactions', () => {
    it('requires a wallet session for reads and writes', async () => {
      expect((await transactionsGet(getRequest('/api/transactions'))).status).toBe(401);
      expect((await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'expense', amountMinor: 100, category: 'Dining' }))).status).toBe(401);
    });

    it('validates query filters and integer minor-unit amounts', async () => {
      const cookie = await signIn();
      expect((await transactionsGet(getRequest('/api/transactions?type=transfer', cookie))).status).toBe(400);
      expect((await transactionsGet(getRequest('/api/transactions?limit=101', cookie))).status).toBe(400);
      expect((await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'expense', amountMinor: 10.5, category: 'Dining' }, cookie))).status).toBe(400);
    });

    it('edits and deletes an entry only for its owner, and totals follow', async () => {
      const cookie = await signIn();
      const params = (id: string) => ({ params: Promise.resolve({ id }) });
      const patchRequest = (id: string, body: unknown, session: string) => jsonRequest('POST', `/api/transactions/${id}`, body, session);
      const created = (await (await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'expense', amountMinor: 50000, category: 'Dining', occurredAt: '2026-11-03T12:00:00.000Z' }, cookie))).json()).data.transaction;

      const other = await signIn();
      const edit = { type: 'expense', amountMinor: 70000, currency: 'INR', category: 'Groceries', description: 'Corrected', occurredAt: '2026-11-04T12:00:00.000Z' };
      expect((await transactionPatch(patchRequest(created.id, edit, other), params(created.id))).status).toBe(404);
      expect((await transactionDelete(deleteRequest(`/api/transactions/${created.id}`, other), params(created.id))).status).toBe(404);
      expect((await transactionPatch(patchRequest(created.id, { ...edit, amountMinor: 1.5 }, cookie), params(created.id))).status).toBe(400);
      expect((await transactionDelete(deleteRequest('/api/transactions/not-a-uuid', cookie), params('not-a-uuid'))).status).toBe(400);

      const edited = await transactionPatch(patchRequest(created.id, edit, cookie), params(created.id));
      expect((await edited.json()).data.transaction).toMatchObject({ amountMinor: 70000, category: 'Groceries', description: 'Corrected' });
      const totals = async () => (await (await budgetsGet(getRequest('/api/budgets?period=2026-11', cookie))).json()).data.periodTotals;
      expect((await totals())[0].expenseMinor).toBe(70000);

      expect((await transactionDelete(deleteRequest(`/api/transactions/${created.id}`, cookie), params(created.id))).status).toBe(200);
      expect(await totals()).toEqual([]);
    });

    it('filters by month, and rejects an invalid month', async () => {
      const cookie = await signIn();
      await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'expense', amountMinor: 100, category: 'Dining', occurredAt: '2026-10-15T12:00:00.000Z' }, cookie));
      await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'expense', amountMinor: 200, category: 'Dining', occurredAt: '2026-11-15T12:00:00.000Z' }, cookie));
      const november = (await (await transactionsGet(getRequest('/api/transactions?period=2026-11', cookie))).json()).data.transactions;
      expect(november.map((tx: { amountMinor: number }) => tx.amountMinor)).toEqual([200]);
      expect((await transactionsGet(getRequest('/api/transactions?period=2026-13', cookie))).status).toBe(400);
    });

    it('creates account-scoped transactions, ignores a body userId, and applies filters', async () => {
      const cookie = await signIn();
      const created = await transactionsPost(jsonRequest('POST', '/api/transactions', {
        userId: 'spoofed-user', type: 'expense', amountMinor: 12850, currency: 'INR', category: 'Dining', description: 'Lunch', occurredAt: '2026-11-03T10:00:00.000Z',
      }, cookie));
      expect(created.status).toBe(201);
      await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'income', amountMinor: 500000, category: 'Salary' }, cookie));

      const filtered = (await (await transactionsGet(getRequest('/api/transactions?type=expense&category=Dining&limit=1', cookie))).json()).data;
      expect(filtered.transactions).toHaveLength(1);
      expect(filtered.transactions[0]).toMatchObject({ amountMinor: 12850, category: 'Dining' });

      const otherWallet = await signIn();
      expect((await (await transactionsGet(getRequest('/api/transactions', otherWallet))).json()).data.transactions).toHaveLength(0);
    });
  });

  describe('/api/budgets', () => {
    const goalAction = (cookie: string, body: Record<string, unknown>) => budgetsPost(jsonRequest('POST', '/api/budgets', body, cookie));

    it('requires a wallet session', async () => {
      expect((await budgetsGet(getRequest('/api/budgets'))).status).toBe(401);
      expect((await budgetsPost(jsonRequest('POST', '/api/budgets', { action: 'set-budget', period: '2026-11', amountMinor: 100 }))).status).toBe(401);
    });

    it('creates and updates a monthly budget, then returns it with goals, active first', async () => {
      const cookie = await signIn();
      expect((await goalAction(cookie, { action: 'set-budget', period: '2026-11', amountMinor: 500000 })).status).toBeLessThan(300);
      expect((await goalAction(cookie, { action: 'set-budget', period: '2026-11', amountMinor: 650000 })).status).toBe(200);
      const paused = (await (await goalAction(cookie, { action: 'create-goal', name: 'Paused fund', targetAmountMinor: 50000 })).json()).data.savingsGoal;
      await goalAction(cookie, { action: 'set-goal-status', goalId: paused.id, status: 'paused' });
      const active = (await (await goalAction(cookie, { action: 'create-goal', name: 'Travel fund', targetAmountMinor: 100000 })).json()).data.savingsGoal;

      const result = (await (await budgetsGet(getRequest('/api/budgets?period=2026-11', cookie))).json()).data;
      expect(result.budget.amountMinor).toBe(650000);
      expect(result.savingsGoals.map((g: { id: string; status: string }) => [g.id, g.status])).toEqual([[active.id, 'active'], [paused.id, 'paused']]);
    });

    it('totals every entry of the month exactly, beyond 100 transactions, for pages and the Assistant', async () => {
      const cookie = await signIn();
      const session = (await (await sessionGet(getRequest('/api/auth/session', cookie))).json()).data;
      await db.instance!.transaction(async (tx) => {
        await tx.query("SELECT set_config('memeora.wallet_address', $1, TRUE)", [session.walletAddress]);
        await tx.query(
          `INSERT INTO transactions(user_id, type, amount_minor, currency, category, occurred_at)
           SELECT $1::uuid, 'expense', 1000, 'INR', 'Groceries', TIMESTAMPTZ '2026-11-15T10:00:00Z' + (n || ' seconds')::interval
           FROM generate_series(1, 120) AS n`,
          [session.userId],
        );
        await tx.query(
          `INSERT INTO transactions(user_id, type, amount_minor, currency, category, occurred_at) VALUES
             ($1, 'income', 500000, 'INR', 'Salary', '2026-11-01T00:00:00Z'),
             ($1, 'expense', 777, 'INR', 'Rent', '2026-10-31T23:59:59Z'),
             ($1, 'expense', 777, 'INR', 'Rent', '2026-12-01T00:00:00Z'),
             ($1, 'expense', 2500, 'USD', 'Travel', '2026-11-20T10:00:00Z')`,
          [session.userId],
        );
      });

      const totals = (await (await budgetsGet(getRequest('/api/budgets?period=2026-11', cookie))).json()).data.periodTotals;
      expect(totals).toEqual([
        { currency: 'INR', incomeMinor: 500000, expenseMinor: 120000, netMinor: 380000, transactionCount: 121 },
        { currency: 'USD', incomeMinor: 0, expenseMinor: 2500, netMinor: -2500, transactionCount: 1 },
      ]);

      await budgetsPost(jsonRequest('POST', '/api/budgets', { action: 'set-budget', period: '2026-11', amountMinor: 200000 }, cookie));
      const answer = (await (await assistantRoute(jsonRequest('POST', '/api/assistant/chat', { prompt: 'How much did I spend?', cycleMonth: '2026-11' }, cookie))).json()).data;
      expect(answer.calculationContext).toMatchObject({ spentMinor: 120000, remainingBudgetMinor: 80000, incomeFormatted: '₹5,000.00' });
      expect(answer.calculationContext.recordWindowDescription).toBe('All ledger records saved for 2026-11 (UTC).');
    });

    it('validates budget periods and integer amounts', async () => {
      const cookie = await signIn();
      expect((await goalAction(cookie, { action: 'set-budget', period: '2026-13', amountMinor: 100 })).status).toBe(400);
      expect((await goalAction(cookie, { action: 'set-budget', period: '2026-11', amountMinor: 100.25 })).status).toBe(400);
    });

    it('creates, edits, pauses, resumes, completes, and deletes a goal only for its owner', async () => {
      const cookie = await signIn();
      const created = await goalAction(cookie, { action: 'create-goal', name: '  Goa trip  ', targetAmountMinor: 1500000, currency: 'INR', targetDate: '2099-12-01' });
      expect(created.status).toBe(201);
      const goal = (await created.json()).data.savingsGoal;
      expect(goal).toMatchObject({ name: 'Goa trip', currentAmountMinor: 0, status: 'active', targetDate: '2099-12-01' });

      const edited = (await (await goalAction(cookie, { action: 'update-goal', goalId: goal.id, name: 'Goa 2099', targetAmountMinor: 10000, targetDate: null })).json()).data.savingsGoal;
      expect(edited).toMatchObject({ name: 'Goa 2099', targetAmountMinor: 10000, targetDate: null });

      await goalAction(cookie, { action: 'set-goal-status', goalId: goal.id, status: 'paused' });
      expect((await goalAction(cookie, { action: 'contribute-goal', goalId: goal.id, amountMinor: 100 })).status).toBe(409);
      await goalAction(cookie, { action: 'set-goal-status', goalId: goal.id, status: 'active' });
      const completed = (await (await goalAction(cookie, { action: 'contribute-goal', goalId: goal.id, amountMinor: 10000 })).json()).data.savingsGoal;
      expect(completed).toMatchObject({ currentAmountMinor: 10000, progressPercent: 100, status: 'completed' });

      const other = await signIn();
      expect((await goalAction(other, { action: 'update-goal', goalId: goal.id, name: 'Hijacked' })).status).toBe(404);
      expect((await goalAction(other, { action: 'delete-goal', goalId: goal.id })).status).toBe(404);

      expect((await goalAction(cookie, { action: 'delete-goal', goalId: goal.id })).status).toBe(200);
      expect((await (await budgetsGet(getRequest('/api/budgets?period=2026-11', cookie))).json()).data.savingsGoals).toHaveLength(0);
    });

    it('validates new goals and enforces goal rules', async () => {
      const cookie = await signIn();
      expect((await goalAction(cookie, { action: 'create-goal', name: '', targetAmountMinor: 1000 })).status).toBe(400);
      expect((await goalAction(cookie, { action: 'create-goal', name: 'Laptop', targetAmountMinor: 10.5 })).status).toBe(400);
      expect((await goalAction(cookie, { action: 'create-goal', name: 'Laptop', targetAmountMinor: 1000, targetDate: '2026-02-30' })).status).toBe(400);
      expect((await goalAction(cookie, { action: 'create-goal', name: 'Laptop', targetAmountMinor: 1000, targetDate: '2001-01-01' })).status).toBe(400);
      expect((await goalAction(cookie, { action: 'create-goal', name: 'x'.repeat(101), targetAmountMinor: 1000 })).status).toBe(400);

      const goal = (await (await goalAction(cookie, { action: 'create-goal', name: 'Laptop', targetAmountMinor: 10000, currentAmountMinor: 4000 })).json()).data.savingsGoal;
      expect((await goalAction(cookie, { action: 'update-goal', goalId: goal.id, currency: 'USD' })).status).toBe(409);
      expect((await (await goalAction(cookie, { action: 'update-goal', goalId: goal.id, targetAmountMinor: 4000 })).json()).data.savingsGoal.status).toBe('completed');
      expect((await goalAction(cookie, { action: 'set-goal-status', goalId: goal.id, status: 'paused' })).status).toBe(409);
      expect((await (await goalAction(cookie, { action: 'update-goal', goalId: goal.id, targetAmountMinor: 20000 })).json()).data.savingsGoal.status).toBe('active');
    });
  });

  describe('memory routes', () => {
    it('require a wallet session', async () => {
      expect((await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'preference', text: 'Valid memory text' }))).status).toBe(401);
      expect((await recallRoute(jsonRequest('POST', '/api/memory/recall', {}))).status).toBe(401);
      expect((await deleteMemoryRoute(deleteRequest(`/api/memory/${UNKNOWN_ID}`), { params: Promise.resolve({ id: UNKNOWN_ID }) })).status).toBe(401);
    });

    it('keep memories visible and removable after memory is turned off, and report status without Walrus', async () => {
      const keypair = new Ed25519Keypair();
      const cookie = await signIn(keypair);
      expect((await (await memorySummaryRoute(getRequest('/api/memory', cookie))).json()).data).toMatchObject({ consentEnabled: false, total: 0, storedOnWalrus: 0 });
      await consentPut(jsonRequest('PUT', '/api/memory/consent', { enabled: true }, cookie));
      await insertMemory(db.instance!, keypair.toSuiAddress(), 'Save for a new laptop');
      await consentPut(jsonRequest('PUT', '/api/memory/consent', { enabled: false }, cookie));

      const page = (await (await recallRoute(jsonRequest('POST', '/api/memory/recall', { limit: 100 }, cookie))).json()).data;
      expect(page.memories.map((m: { text: string }) => m.text)).toEqual(['Save for a new laptop']);
      expect(page.walrus).toEqual({ available: false, reason: 'Memory is off.' });
      expect((await (await memorySummaryRoute(getRequest('/api/memory', cookie))).json()).data).toMatchObject({ consentEnabled: false, total: 1, storedOnWalrus: 0 });
      expect((await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text: 'Must not be stored' }, cookie))).status).toBe(403);
    });

    it('validate memory input and ids', async () => {
      const cookie = await signIn();
      expect((await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'random', text: 'Valid memory text' }, cookie))).status).toBe(400);
      expect((await rememberRoute(jsonRequest('POST', '/api/memory/remember', { category: 'goal', text: 'Hey' }, cookie))).status).toBe(400);
      expect((await deleteMemoryRoute(deleteRequest('/api/memory/not-a-uuid', cookie), { params: Promise.resolve({ id: 'not-a-uuid' }) })).status).toBe(400);
      expect((await deleteMemoryRoute(deleteRequest(`/api/memory/${UNKNOWN_ID}`, cookie), { params: Promise.resolve({ id: UNKNOWN_ID }) })).status).toBe(404);
    });
  });

  describe('/api/assistant/chat', () => {
    const ask = (body: Record<string, unknown>, cookie?: string) => assistantRoute(jsonRequest('POST', '/api/assistant/chat', body, cookie));

    it('requires a wallet session and validates the prompt and month', async () => {
      expect((await ask({ prompt: 'Can I afford ₹500?' })).status).toBe(401);
      const cookie = await signIn();
      expect((await ask({ prompt: '' }, cookie)).status).toBe(400);
      expect((await ask({ prompt: 'How much did I spend?', cycleMonth: '2026-13' }, cookie)).status).toBe(400);
    });

    it('says a purchase cannot be assessed when no budget is saved', async () => {
      const cookie = await signIn();
      const data = (await (await ask({ prompt: 'Can I afford a ₹5,000 laptop repair this month?', cycleMonth: '2026-11' }, cookie)).json()).data;
      expect(data.calculationContext).toMatchObject({ remainingBudgetFormatted: 'No INR budget is set for 2026-11', spentMinor: 0, incomeFormatted: '₹0.00' });
      expect(data.calculationContext.verdict).toContain('cannot be assessed against a budget');
      expect(data.memoryStatus).toBe('not_consented');
    });

    it('computes the verdict from the budget and transactions stored for this wallet', async () => {
      const cookie = await signIn();
      await budgetsPost(jsonRequest('POST', '/api/budgets', { action: 'set-budget', period: '2026-11', amountMinor: 1500000 }, cookie));
      await transactionsPost(jsonRequest('POST', '/api/transactions', { type: 'expense', amountMinor: 840000, category: 'Rent', occurredAt: '2026-11-02T10:00:00.000Z' }, cookie));
      const data = (await (await ask({ prompt: 'Can I afford a ₹1,500 purchase?', cycleMonth: '2026-11' }, cookie)).json()).data;
      expect(data.calculationContext).toMatchObject({ budgetLimitMinor: 1500000, spentMinor: 840000, remainingBudgetMinor: 660000, proposedPurchaseMinor: 150000 });
      expect(data.calculationContext.verdict).toContain('leaving ₹5,100.00');
    });
  });

  describe('GET /api/verification/sui-checkpoint', () => {
    it('reports not_configured truthfully without a Tatum key', async () => {
      const data = (await (await verificationRoute(getRequest('/api/verification/sui-checkpoint?check=checkpoint'))).json()).data;
      expect(data).toMatchObject({ network: 'sui-mainnet', check: 'checkpoint', status: 'not_configured' });
      expect(data.sequenceNumber).toBeUndefined();
    });

    it('rejects unsupported checks', async () => {
      const response = await verificationRoute(getRequest('/api/verification/sui-checkpoint?check=unsupported'));
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/verification/memories', () => {
    it('requires a wallet session and reports honestly when there is nothing to prove or no Tatum key', async () => {
      expect((await memoryProofsRoute(getRequest('/api/verification/memories'))).status).toBe(401);

      const cookie = await signIn();
      const empty = (await (await memoryProofsRoute(getRequest('/api/verification/memories', cookie))).json()).data;
      expect(empty).toMatchObject({ status: 'no_memories', proofs: [] });
      expect(empty.namespace).toMatch(/^memeora:0x[0-9a-f]{64}$/);

      // A confirmed memory, inserted under this wallet's RLS context.
      const session = (await (await sessionGet(getRequest('/api/auth/session', cookie))).json()).data;
      await db.instance!.transaction(async (tx) => {
        await tx.query("SELECT set_config('memeora.wallet_address', $1, TRUE)", [session.walletAddress]);
        await tx.query(
          `INSERT INTO financial_memories(user_id, category, memory_text, walrus_blob_id, walrus_job_id, walrus_status)
           VALUES ($1, 'preference', 'Keep a ₹3,000 buffer', 'blob-x', 'job-x', 'confirmed')`,
          [session.userId],
        );
      });
      const unconfigured = (await (await memoryProofsRoute(getRequest('/api/verification/memories', cookie))).json()).data;
      expect(unconfigured).toMatchObject({ status: 'not_configured', proofs: [] });
    });
  });
});
