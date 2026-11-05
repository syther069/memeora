import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ connect: vi.fn(), query: vi.fn(), release: vi.fn() }));
vi.mock('@/lib/postgres/pool', () => ({
  getPostgresPool: () => ({ connect: mocks.connect }),
}));

import { NextRequest } from 'next/server';
import { getVerifiedWalletSession, hashSessionToken, WALLET_SESSION_COOKIE } from '@/lib/auth/wallet-session';

const token = 'a'.repeat(43);
const walletAddress = `0x${'b'.repeat(64)}`;
const userId = '10000000-0000-4000-8000-000000000001';

describe('verified wallet session lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
  });

  it('loads the stored session, sets transaction-local RLS identity, and resolves the protected mapping', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ wallet_address: walletAddress }] })
      .mockResolvedValueOnce({ rows: [] }) // set_config
      .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `${WALLET_SESSION_COOKIE}=${token}`, 'x-wallet-address': `0x${'c'.repeat(64)}` },
    });

    await expect(getVerifiedWalletSession(request)).resolves.toEqual({ userId, walletAddress });
    expect(mocks.query.mock.calls[1]?.[1]).toEqual([hashSessionToken(token)]);
    expect(mocks.query.mock.calls[2]?.[1]).toEqual([walletAddress]);
    expect(mocks.query.mock.calls[3]?.[1]).toEqual([walletAddress]);
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringContaining("set_config('memeora.wallet_address'"),
    ]));
    expect(mocks.query).toHaveBeenCalledWith('COMMIT');
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it('rejects a missing or expired session before setting wallet context', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `${WALLET_SESSION_COOKIE}=${token}` },
    });

    await expect(getVerifiedWalletSession(request)).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalledWith(expect.stringContaining('set_config'), expect.anything());
    expect(mocks.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
