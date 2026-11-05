import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getVerifiedWalletSession: vi.fn(),
  withWalletTransaction: vi.fn(),
  query: vi.fn(),
}));

vi.mock('@/lib/auth/wallet-session', () => ({ getVerifiedWalletSession: mocks.getVerifiedWalletSession }));
vi.mock('@/lib/postgres/wallet-transaction', () => ({ withWalletTransaction: mocks.withWalletTransaction }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/onboarding/route';

describe('POST /api/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedWalletSession.mockResolvedValue({
      userId: '10000000-0000-4000-8000-000000000001',
      walletAddress: `0x${'a'.repeat(64)}`,
    });
    mocks.query.mockResolvedValue({ rows: [{ id: 'goal-1' }] });
    mocks.withWalletTransaction.mockImplementation(async (_wallet: string, action: (client: { query: typeof mocks.query }) => Promise<unknown>) => action({ query: mocks.query }));
  });

  it('requires an explicit memory consent choice', async () => {
    const response = await POST(new NextRequest('http://localhost:3000/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'complete', currency: 'INR' }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.withWalletTransaction).not.toHaveBeenCalled();
  });

  it('saves profile, recorded opt-out, budget, and optional goal in one wallet-scoped transaction', async () => {
    const response = await POST(new NextRequest('http://localhost:3000/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        currency: 'INR',
        monthlyBudgetMinor: 2_000_000,
        savingsGoal: { name: 'Emergency fund', targetAmountMinor: 500_000, targetDate: '2099-12-31' },
        memoryConsentEnabled: false,
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.onboardingCompleted).toBe(true);
    expect(body.data.savingsGoalId).toBe('goal-1');
    expect(mocks.withWalletTransaction).toHaveBeenCalledWith(`0x${'a'.repeat(64)}`, expect.any(Function));
    expect(mocks.query).toHaveBeenCalledTimes(4);
    const queries = mocks.query.mock.calls.map(([sql]) => sql as string);
    expect(queries.some((sql) => sql.includes('INSERT INTO profiles'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO profile_consent_events'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO budgets'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO savings_goals'))).toBe(true);
    expect(mocks.query.mock.calls[1]?.[1]).toContain(false);
  });

  it('does not accept client supplied identity when no wallet session exists', async () => {
    mocks.getVerifiedWalletSession.mockResolvedValue(null);
    const response = await POST(new NextRequest('http://localhost:3000/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'somebody-else' },
      body: JSON.stringify({ action: 'complete', currency: 'INR', memoryConsentEnabled: false }),
    }));

    expect(response.status).toBe(401);
    expect(mocks.withWalletTransaction).not.toHaveBeenCalled();
  });
});
