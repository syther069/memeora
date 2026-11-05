import { describe, expect, it, vi } from 'vitest';
import { PostgresClient, PostgresPool, withWalletTransaction } from '../../src/lib/postgres/wallet-transaction';

const WALLET_A = `0x${'a'.repeat(64)}`;

function createPool() {
  const query = vi.fn(async () => ({}));
  const release = vi.fn();
  const client = { query, release } as unknown as PostgresClient;
  const connect = vi.fn(async () => client);
  return { pool: { connect } as PostgresPool, client, query, release, connect };
}

describe('withWalletTransaction', () => {
  it('sets transaction-local identity before work and commits before releasing', async () => {
    const { pool, query, release } = createPool();
    const action = vi.fn(async () => 'done');

    await expect(withWalletTransaction(WALLET_A, action, pool)).resolves.toBe('done');

    expect(query.mock.calls).toEqual([
      ['BEGIN'],
      ["SELECT set_config('memeora.wallet_address', $1, TRUE)", [WALLET_A]],
      ['COMMIT'],
    ]);
    expect(action).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back failed work and releases the connection', async () => {
    const { pool, query, release } = createPool();
    const failure = new Error('query failed');

    await expect(withWalletTransaction(WALLET_A, async () => { throw failure; }, pool)).rejects.toBe(failure);

    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rejects a non-canonical wallet before acquiring a connection', async () => {
    const { pool, connect } = createPool();

    await expect(withWalletTransaction('0xabc', async () => null, pool)).rejects.toThrow(
      'A normalized, verified Sui wallet address is required.',
    );
    expect(connect).not.toHaveBeenCalled();
  });
});
