import { Pool } from 'pg';

let pool: Pool | undefined;

/**
 * Server-only PostgreSQL connection pool. The supplied connection must use the
 * dedicated runtime role, which must not own application tables or bypass RLS.
 */
export function getPostgresPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL access.');
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 300_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'memeora-web',
  });

  return pool;
}

export async function closePostgresPool(): Promise<void> {
  if (!pool) return;
  const activePool = pool;
  pool = undefined;
  await activePool.end();
}
