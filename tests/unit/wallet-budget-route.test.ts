import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getVerifiedWalletSession: vi.fn(),
  withWalletTransaction: vi.fn(),
  query: vi.fn(),
}));

vi.mock('@/lib/auth/wallet-session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/wallet-session')>('@/lib/auth/wallet-session');
  return { ...actual, getVerifiedWalletSession: mocks.getVerifiedWalletSession };
});
vi.mock('@/lib/postgres/wallet-transaction', () => ({ withWalletTransaction: mocks.withWalletTransaction }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/budgets/route';

const walletAddress = `0x${'a'.repeat(64)}`;
const userId = '10000000-0000-4000-8000-000000000001';
const existingGoal = {
  id: 'goal-1', user_id: userId, name: 'Emergency fund', target_amount_minor: '1000000',
  current_amount_minor: '200000', currency: 'INR', target_date: null, status: 'active',
  created_at: new Date('2026-01-01T00:00:00Z'), updated_at: new Date('2026-01-01T00:00:00Z'),
};

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/budgets', {
    method: 'POST', headers: { cookie: 'memeora_wallet_session=test-wallet-cookie', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('wallet-authenticated savings goal API', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.clearAllMocks();
    mocks.getVerifiedWalletSession.mockResolvedValue({ userId, walletAddress });
    mocks.withWalletTransaction.mockImplementation(async (_wallet: string, action: (client: { query: typeof mocks.query }) => Promise<unknown>) => action({ query: mocks.query }));
  });

  it('creates a savings goal in the verified wallet transaction', async () => {
    mocks.query.mockResolvedValue({ rows: [{ ...existingGoal, id: 'goal-new', name: 'Laptop', target_amount_minor: '1500000', current_amount_minor: '0' }] });
    const response = await POST(request({ action: 'create-goal', name: 'Laptop', targetAmountMinor: 1_500_000, currency: 'INR' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.savingsGoal.name).toBe('Laptop');
    expect(mocks.withWalletTransaction).toHaveBeenCalledWith(walletAddress, expect.any(Function));
    expect(mocks.query.mock.calls[0]?.[0]).toContain('INSERT INTO savings_goals');
    expect(mocks.query.mock.calls[0]?.[1]).toContain(userId);
  });

  it('edits only a goal selected for the verified account', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [existingGoal] }).mockResolvedValueOnce({ rows: [] });
    const response = await POST(request({ action: 'update-goal', goalId: 'goal-1', name: 'Rainy day fund', targetAmountMinor: 1_200_000 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.savingsGoal.name).toBe('Rainy day fund');
    expect(mocks.query.mock.calls[0]?.[0]).toContain('WHERE id = $1 AND user_id = $2 FOR UPDATE');
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['goal-1', userId]);
    expect(mocks.query.mock.calls[1]?.[0]).toContain('UPDATE savings_goals');
  });
});
