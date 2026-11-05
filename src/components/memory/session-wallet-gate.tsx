'use client';

import * as React from 'react';
import { Wallet } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { isWalletRejection, useSessionWallet } from '@/lib/wallet/use-session-wallet';

const short = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;

/** Shows its children only once the wallet that owns this session is connected. */
export function SessionWalletGate({ walletAddress, children }: { walletAddress: string; children: React.ReactNode }) {
  const { account, isSessionWallet, supportedWallets, connect, disconnect } = useSessionWallet(walletAddress);
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (isSessionWallet) return <>{children}</>;

  if (account) {
    return (
      <div className="space-y-2 text-xs leading-relaxed text-[var(--ink-secondary)]">
        <p role="alert">This wallet ({short(account.address)}) is not the one you signed in with ({short(walletAddress)}). Switch back to continue.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void disconnect()}>Use a different wallet</Button>
      </div>
    );
  }

  const handleConnect = async (name: string) => {
    setConnecting(name);
    setError(null);
    try {
      await connect(name);
    } catch (cause) {
      setError(isWalletRejection(cause) ? 'Connection cancelled. Connect again when you are ready.' : 'Your wallet did not connect. Unlock it and try again.');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">Connect the wallet you signed in with ({short(walletAddress)}) to continue.</p>
      {supportedWallets.length === 0 ? (
        <p role="alert" className="text-xs text-[var(--accent-warning)]">No Sui wallet was found in this browser. Install or unlock Slush, then reload this page.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {supportedWallets.map((wallet) => (
            <Button key={wallet.name} type="button" variant="outline" size="sm" leftIcon={<Wallet className="w-3.5 h-3.5" />} isLoading={connecting === wallet.name} disabled={Boolean(connecting)} onClick={() => void handleConnect(wallet.name)}>
              Connect {wallet.name}
            </Button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}
    </div>
  );
}
