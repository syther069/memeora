import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getVerifiedWalletSession: vi.fn() }));
vi.mock('@/lib/auth/wallet-session', () => ({ getVerifiedWalletSession: mocks.getVerifiedWalletSession }));

import { NextRequest } from 'next/server';
import { requireWalletSession } from '@/lib/auth/require-session';

const request = new NextRequest('http://localhost:3000/api/budgets');

describe('requireWalletSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the verified session', async () => {
    const session = { userId: 'u', walletAddress: `0x${'a'.repeat(64)}` };
    mocks.getVerifiedWalletSession.mockResolvedValue(session);
    expect(await requireWalletSession(request)).toEqual({ ok: true, session });
  });

  it('answers 401 only when there is no valid session', async () => {
    mocks.getVerifiedWalletSession.mockResolvedValue(null);
    const result = await requireWalletSession(request);
    expect(result.ok === false && result.response.status).toBe(401);
  });

  it('answers 503, not 401, when the database cannot be reached, so an outage never signs the user out', async () => {
    mocks.getVerifiedWalletSession.mockRejectedValue(new Error('timeout exceeded when trying to connect'));
    const result = await requireWalletSession(request);
    expect(result.ok === false && result.response.status).toBe(503);
  });
});
