'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { SessionWalletGate } from '@/components/memory/session-wallet-gate';
import { financeApi } from '@/lib/finance-api';
import { isWalletRejection, useSessionWallet } from '@/lib/wallet/use-session-wallet';

export interface DeletableMemory {
  id: string;
  text: string;
  walrusBlobId: string;
}

type Stage =
  | { name: 'review' }
  | { name: 'working'; label: string }
  | { name: 'pending' }
  | { name: 'done'; digest: string };

/** After signing, how long to wait for Sui to show the transaction through Tatum. */
const CONFIRM_POLL_MS = 2500;
const CONFIRM_POLL_ATTEMPTS = 8;

const call = <T,>(body: Record<string, unknown>) => financeApi<T>('/api/memory/delete', { method: 'POST', body: JSON.stringify(body) });

function explain(cause: unknown): string {
  if (isWalletRejection(cause)) return 'You cancelled in your wallet. Nothing was deleted.';
  const message = cause instanceof Error ? cause.message : '';
  if (/gas|insufficient|balance/i.test(message)) {
    return 'Your wallet does not have enough SUI for the network fee. Add a little SUI and try again. Nothing was deleted.';
  }
  return message || 'The deletion could not continue. Please retry.';
}

/**
 * Deletes a memory's blob on Sui. The wallet signs and pays gas. The server
 * reports it deleted only after seeing Walrus's BlobDeleted event for this blob
 * in a successful transaction from this wallet.
 */
export function PermanentDeleteDialog({ walletAddress, memory, onClose, onSettled }: {
  walletAddress: string;
  memory: DeletableMemory;
  onClose: () => void;
  /** The server state changed; reload the lists. */
  onSettled: () => void;
}) {
  const { signAndExecute } = useSessionWallet(walletAddress);
  const [stage, setStage] = React.useState<Stage>({ name: 'review' });
  const [error, setError] = React.useState<string | null>(null);

  const isWorking = stage.name === 'working';

  const runDelete = async () => {
    setError(null);
    try {
      setStage({ name: 'working', label: 'Checking your memory on Sui…' });
      const { kindBytes } = await call<{ kindBytes: string }>({ action: 'prepare', memoryId: memory.id });

      setStage({ name: 'working', label: 'Approve the deletion in your wallet.' });
      const digest = await signAndExecute(kindBytes);

      setStage({ name: 'working', label: 'Confirming on Sui…' });
      for (let attempt = 0; attempt < CONFIRM_POLL_ATTEMPTS; attempt++) {
        const result = await call<{ state: 'deleted' | 'pending'; digest: string }>({ action: 'confirm', memoryId: memory.id, digest });
        if (result.state === 'deleted') {
          setStage({ name: 'done', digest });
          onSettled();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_MS));
      }
      setStage({ name: 'pending' });
      onSettled();
    } catch (cause) {
      setStage({ name: 'review' });
      setError(explain(cause));
    }
  };

  const close = () => { if (!isWorking) onClose(); };

  return (
    <Modal isOpen onClose={close} title="Delete permanently from Walrus?" description="This removes the memory from Walrus storage and cannot be undone.">
      <div className="space-y-4">
        {stage.name === 'done' ? (
          <div role="status" className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-positive)]"><CheckCircle2 aria-hidden className="w-4 h-4" />Deleted on Walrus, confirmed on Sui</p>
            <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">The text is gone from Memeora, and the Assistant no longer uses it. The encrypted copy can stay downloadable from caches for a while. Sui still shows that a deletion happened, but not what the memory said.</p>
            <p className="break-all font-mono text-[11px] text-[var(--ink-muted)]">Sui transaction {stage.digest}</p>
          </div>
        ) : stage.name === 'pending' ? (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-3 text-xs leading-relaxed text-[var(--accent-warning)]">
            <AlertTriangle aria-hidden className="w-4 h-4 shrink-0" />
            Your wallet signed, but Sui has not shown the deletion yet, so it is not confirmed. You can close this. Memeora checks again when you reopen the Memory page, and you will not need to sign again.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sky-solid)] p-3">
              <p className="text-sm font-semibold text-[var(--ink-primary)]">{memory.text}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-[var(--ink-muted)]">Walrus blob {memory.walrusBlobId}</p>
            </div>
            <ul className="space-y-1 list-disc pl-4 text-xs leading-relaxed text-[var(--ink-secondary)]">
              <li>Your wallet will ask you to approve once, and shows the network fee first. You need a little SUI to cover it. Deleting also returns a storage refund to your wallet.</li>
              <li>This ends its storage on Walrus, but is not an instant erase. The encrypted copy can stay downloadable from caches for a while, and anyone who saved a copy keeps it.</li>
            </ul>
          </>
        )}

        {stage.name === 'working' && <p role="status" className="text-xs text-[var(--ink-secondary)]">{stage.label}</p>}
        {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}

        <div className="border-t border-[var(--border-subtle)] pt-3">
          {stage.name === 'done' || stage.name === 'pending' ? (
            <div className="flex justify-end"><Button type="button" variant="primary" onClick={onClose}>Close</Button></div>
          ) : (
            <SessionWalletGate walletAddress={walletAddress}>
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" disabled={isWorking} onClick={close}>Keep it</Button>
                <Button type="button" variant="danger" isLoading={isWorking} onClick={() => void runDelete()}>Delete permanently</Button>
              </div>
            </SessionWalletGate>
          )}
        </div>
      </div>
    </Modal>
  );
}
