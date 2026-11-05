'use client';

import * as React from 'react';
import { Key } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionWalletGate } from '@/components/memory/session-wallet-gate';
import { financeApi } from '@/lib/finance-api';
import { isWalletRejection, useSessionWallet } from '@/lib/wallet/use-session-wallet';

export type MemoryAccountStatus = 'ready' | 'no_account' | 'needs_delegate' | 'inactive' | 'unavailable' | 'not_configured';

type NextStep =
  | { step: 'ready' }
  | { step: 'create_account' | 'add_delegate'; kindBytes: string; authMessage: string; authNonce: string; authTimestamp: number };

/** After a transaction lands, how long to wait for Sui to show it through Tatum. */
const CHAIN_POLL_MS = 2500;
const CHAIN_POLL_ATTEMPTS = 12;

const PROGRESS: Record<'create_account' | 'add_delegate', string> = {
  create_account: 'Creating your Walrus account. Approve the two prompts in your wallet.',
  add_delegate: 'Approving Memeora on your account. Approve the two prompts in your wallet.',
};

const account = (body: Record<string, unknown>) => financeApi<never>('/api/memory/account', { method: 'POST', body: JSON.stringify(body) });

export function MemoryAccountSetup({ walletAddress, status, onReady }: {
  walletAddress: string;
  status: MemoryAccountStatus;
  onReady: () => void;
}) {
  const { signMessage, signTransaction } = useSessionWallet(walletAddress);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runSetup = async () => {
    setError(null);
    setProgress('Reading your account on Sui…');
    try {
      let lastStep: string | null = null;
      for (let waits = 0; waits <= CHAIN_POLL_ATTEMPTS;) {
        const next = await account({ action: 'next' }) as NextStep;
        if (next.step === 'ready') {
          onReady();
          return;
        }
        // Same step as the one just signed: Sui has not shown it yet. Never sign it twice.
        if (next.step === lastStep) {
          waits += 1;
          setProgress('Waiting for Sui to confirm…');
          await new Promise((resolve) => setTimeout(resolve, CHAIN_POLL_MS));
          continue;
        }
        setProgress(PROGRESS[next.step]);
        const authSignature = await signMessage(next.authMessage);
        const sponsored = await account({
          action: 'sponsor', kindBytes: next.kindBytes, authNonce: next.authNonce, authTimestamp: next.authTimestamp, authSignature,
        }) as { bytes: string; digest: string };
        const signature = await signTransaction(sponsored.bytes);
        await account({ action: 'execute', digest: sponsored.digest, signature });
        lastStep = next.step;
        waits = 0;
      }
      setError('Your wallet signed, but Sui has not shown it yet. Wait a moment and click the button again. You will not sign anything twice if it has landed.');
    } catch (cause) {
      setError(isWalletRejection(cause)
        ? 'You cancelled in your wallet. Nothing changed for that step. Click the button when you are ready.'
        : cause instanceof Error ? cause.message : 'Setup could not finish. Please retry.');
    } finally {
      setProgress(null);
    }
  };

  const isBusy = progress !== null;
  const hasAccount = status === 'needs_delegate';

  return (
    <Card className="p-5 sm:p-6 border-[var(--brand-blue-soft)]">
      <div className="flex items-start gap-3">
        <Key aria-hidden className="w-5 h-5 shrink-0 mt-0.5 text-[var(--brand-blue)]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--ink-primary)]">{hasAccount ? 'Approve Memeora on your Walrus account' : 'Create your Walrus account'}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
              Memories are stored in an account your wallet owns, not one shared with other people. {hasAccount
                ? 'Your wallet already has an account, so this only approves Memeora to use it.'
                : 'This creates your account on Sui, then approves Memeora to use it.'}
            </p>
          </div>
          <ul className="space-y-1 text-xs leading-relaxed text-[var(--ink-secondary)] list-disc pl-4">
            <li>You will approve {hasAccount ? 'two prompts' : 'four prompts'} in your wallet. Walrus Memory pays the network fee, so you do not need SUI.</li>
            <li>Approving gives Memeora its own key for your account, kept encrypted on our server. With it, Memeora can save and read memories in your account until you remove the key.</li>
            <li>You can remove that key at any time from the Walrus Memory dashboard. Removing it stops future access, but cannot take back what Memeora has already read.</li>
          </ul>
          {status === 'inactive' && <p role="alert" className="text-xs text-[var(--accent-warning)]">Your Walrus account is deactivated. Reactivate it in the Walrus Memory dashboard, then try again.</p>}
          <SessionWalletGate walletAddress={walletAddress}>
            <Button type="button" variant="primary" size="pill" isLoading={isBusy} disabled={status === 'inactive'} onClick={() => void runSetup()}>
              {hasAccount ? 'Approve Memeora' : 'Create my account'}
            </Button>
          </SessionWalletGate>
          {progress && <p role="status" className="text-xs text-[var(--ink-secondary)]">{progress}</p>}
          {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
