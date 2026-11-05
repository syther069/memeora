import type { PostgresClient } from '@/lib/postgres/wallet-transaction';
import type { StoredMemoryAccount } from '../domain/memory-account';

export interface StoredMemoryAccountRow extends StoredMemoryAccount {
  delegatePublicKey: string;
  encryptedDelegateKey: string;
}

interface DbRow {
  account_id: string;
  delegate_public_key: string;
  delegate_address: string;
  encrypted_delegate_key: string;
  status: StoredMemoryAccount['status'];
}

/** The client must come from `withWalletTransaction`, so RLS limits it to the verified wallet. */
export class PostgresMemoryAccountRepository {
  constructor(private readonly client: PostgresClient) {}

  async get(userId: string): Promise<StoredMemoryAccountRow | null> {
    const result = await this.client.query(
      `SELECT account_id, delegate_public_key, delegate_address, encrypted_delegate_key, status
       FROM wallet_memory_accounts WHERE user_id = $1`,
      [userId],
    ) as { rows: DbRow[] };
    const row = result.rows[0];
    return row ? {
      accountId: row.account_id,
      delegatePublicKey: row.delegate_public_key,
      delegateAddress: row.delegate_address,
      encryptedDelegateKey: row.encrypted_delegate_key,
      status: row.status,
    } : null;
  }

  /** Stores a new key that the wallet has not registered yet, replacing any earlier one. */
  async savePending(userId: string, account: Omit<StoredMemoryAccountRow, 'status'>): Promise<void> {
    await this.client.query(
      `INSERT INTO wallet_memory_accounts(user_id, account_id, delegate_public_key, delegate_address, encrypted_delegate_key, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         delegate_public_key = EXCLUDED.delegate_public_key,
         delegate_address = EXCLUDED.delegate_address,
         encrypted_delegate_key = EXCLUDED.encrypted_delegate_key,
         status = 'pending',
         registered_at = NULL,
         updated_at = NOW()`,
      [userId, account.accountId, account.delegatePublicKey, account.delegateAddress, account.encryptedDelegateKey],
    );
  }

  async setStatus(userId: string, status: StoredMemoryAccount['status']): Promise<void> {
    await this.client.query(
      `UPDATE wallet_memory_accounts
       SET status = $2,
           registered_at = CASE WHEN $2 = 'ready' THEN NOW() ELSE registered_at END,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, status],
    );
  }
}
