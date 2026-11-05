import { getPostgresPool } from './pool';

export interface PostgresClient {
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
  release(): void;
}

export interface PostgresPool {
  connect(): Promise<PostgresClient>;
}

/**
 * Runs authenticated database work in one transaction and binds its RLS wallet
 * context with transaction-local scope. The address must come from the verified
 * Memeora server session, never directly from request data.
 */
export async function withWalletTransaction<T>(
  verifiedWalletAddress: string,
  action: (client: PostgresClient) => Promise<T>,
  pool: PostgresPool = getPostgresPool(),
): Promise<T> {
  if (!/^0x[0-9a-f]{64}$/.test(verifiedWalletAddress)) {
    throw new Error('A normalized, verified Sui wallet address is required.');
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query(
      "SELECT set_config('memeora.wallet_address', $1, TRUE)",
      [verifiedWalletAddress],
    );

    const result = await action(client);
    await client.query('COMMIT');
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original query/commit error; the pool discards broken
        // connections according to node-postgres release semantics.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
