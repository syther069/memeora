import type { AppMode } from '@/lib/app-mode';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { DelegateKeyVault } from './delegate-key-vault';
import { PostgresMemoryAccountRepository } from './postgres-memory-account-repository';
import { WalrusClient } from './walrus-client';

export const MEMORY_ACCOUNT_REQUIRED_MESSAGE = 'Set up your Walrus account first. Your wallet needs to own it and approve Memeora.';

export interface ReadyMemoryAccount {
  accountId: string;
  delegateAddress: string;
  key: string;
}

/**
 * The wallet's own Walrus account and key, if setup finished and the key still
 * decrypts. There is deliberately no shared fallback account: without this, no
 * memory goes to Walrus for this wallet.
 */
export async function loadReadyMemoryAccount(session: { userId: string; walletAddress: string }): Promise<ReadyMemoryAccount | null> {
  const row = await withWalletTransaction(session.walletAddress, (client) =>
    new PostgresMemoryAccountRepository(client).get(session.userId));
  if (row?.status !== 'ready') return null;
  try {
    return {
      accountId: row.accountId,
      delegateAddress: row.delegateAddress,
      key: new DelegateKeyVault().decrypt(row.encryptedDelegateKey, { userId: session.userId, accountId: row.accountId }),
    };
  } catch {
    console.warn('A stored Walrus delegate key could not be decrypted; check MEMEORA_DELEGATE_KEY_SECRET.');
    return null;
  }
}

/** A Walrus client for this account and workspace. With null it is unconfigured and sends nothing. */
export function walrusClientFor(account: ReadyMemoryAccount | null, mode: AppMode = 'personal'): WalrusClient {
  return new WalrusClient({ key: account?.key ?? '', accountId: account?.accountId ?? '', mode });
}
