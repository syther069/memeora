import type { PostgresClient } from './wallet-transaction';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** The request's key. Undefined means none was sent; null means one was sent but is malformed. */
export function readIdempotencyKey(request: { headers: { get(name: string): string | null } }): string | null | undefined {
  const value = request.headers.get(IDEMPOTENCY_HEADER);
  if (value === null) return undefined;
  return KEY_PATTERN.test(value) ? value : null;
}

export interface StoredResponse {
  status: number;
  body: unknown;
}

/**
 * Claims a key inside the write's own transaction. If an earlier request with this
 * key finished, returns its stored answer, and the caller must not repeat the work.
 * A concurrent duplicate waits on the primary key until the first commits.
 */
export async function claimIdempotencyKey(client: PostgresClient, userId: string, scope: string, key: string | undefined): Promise<StoredResponse | null> {
  if (!key) return null;
  await client.query(
    'INSERT INTO idempotency_keys(user_id, scope, key) VALUES ($1, $2, $3) ON CONFLICT (user_id, scope, key) DO NOTHING',
    [userId, scope, key],
  );
  const result = await client.query(
    'SELECT response_status, response_body FROM idempotency_keys WHERE user_id = $1 AND scope = $2 AND key = $3',
    [userId, scope, key],
  ) as { rows: Array<{ response_status: number | null; response_body: unknown }> };
  const row = result.rows[0];
  return row?.response_status ? { status: row.response_status, body: row.response_body } : null;
}

export async function storeIdempotentResponse(client: PostgresClient, userId: string, scope: string, key: string | undefined, response: StoredResponse): Promise<void> {
  if (!key) return;
  await client.query(
    'UPDATE idempotency_keys SET response_status = $4, response_body = $5::jsonb WHERE user_id = $1 AND scope = $2 AND key = $3',
    [userId, scope, key, response.status, JSON.stringify(response.body)],
  );
}
