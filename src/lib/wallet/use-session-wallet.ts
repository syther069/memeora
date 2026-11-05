'use client';

import * as React from 'react';
import { useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';

/** A wallet's refusal, as opposed to something going wrong. */
export function isWalletRejection(cause: unknown): boolean {
  return cause instanceof Error && /reject|denied|cancel/i.test(`${cause.name} ${cause.message}`);
}

/**
 * Signing with the wallet that owns this Memeora session. A page reload drops
 * the wallet connection while the session stays, so signing needs a reconnect,
 * and it must be the same wallet.
 */
export function useSessionWallet(walletAddress: string) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const wallets = useWallets();
  const supportedWallets = wallets;

  const isSessionWallet = account?.address.toLowerCase() === walletAddress.toLowerCase();

  const connect = React.useCallback(async (walletName: string) => {
    const wallet = wallets.find((candidate) => candidate.name === walletName);
    if (wallet) await dAppKit.connectWallet({ wallet });
  }, [dAppKit, wallets]);

  const signMessage = React.useCallback(async (message: string) => {
    const { signature } = await dAppKit.signPersonalMessage({ message: new TextEncoder().encode(message) });
    return signature;
  }, [dAppKit]);

  /** Signs prepared base64 transaction bytes exactly as given. */
  const signTransaction = React.useCallback(async (transaction: string) => {
    const { signature } = await dAppKit.signTransaction({ transaction });
    return signature;
  }, [dAppKit]);

  /** The wallet adds gas, signs and submits; returns the digest of a transaction that executed. */
  const signAndExecute = React.useCallback(async (kindBytes: string) => {
    const result = await dAppKit.signAndExecuteTransaction({ transaction: Transaction.fromKind(kindBytes) });
    if (result.$kind === 'FailedTransaction') throw new Error('The transaction failed on Sui. Nothing was deleted.');
    return result.Transaction.digest;
  }, [dAppKit]);

  const disconnect = React.useCallback(() => dAppKit.disconnectWallet(), [dAppKit]);

  return { account, isSessionWallet, supportedWallets, connect, disconnect, signMessage, signTransaction, signAndExecute };
}
