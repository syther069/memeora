/** What Memeora has stored about a wallet's Walrus Memory account and key. */
export interface StoredMemoryAccount {
  accountId: string;
  delegateAddress: string;
  status: 'pending' | 'ready' | 'revoked';
}

/** What Sui says about the account this wallet owns. */
export interface OnChainMemoryAccount {
  accountId: string;
  owner: string;
  active: boolean;
  delegateAddresses: string[];
}

export type MemoryAccountStatus = 'no_account' | 'inactive' | 'needs_delegate' | 'ready';

/**
 * A wallet may save memories only when, on chain, it owns an active account
 * with Memeora's key for that wallet registered on it. Anything Memeora has
 * stored is checked against that; a key the owner removed stops being usable.
 */
export function resolveMemoryAccountStatus(
  wallet: string,
  stored: StoredMemoryAccount | null,
  onChain: OnChainMemoryAccount | null,
): MemoryAccountStatus {
  if (!onChain || onChain.owner !== wallet) return 'no_account';
  if (!onChain.active) return 'inactive';
  const registered = stored !== null
    && stored.accountId === onChain.accountId
    && onChain.delegateAddresses.includes(stored.delegateAddress);
  return registered ? 'ready' : 'needs_delegate';
}
