'use client';

import * as React from 'react';
import { Card, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { financeApi } from '@/lib/finance-api';
import { CheckCircle, InfoCircle, OpenNewWindow, ShieldCheck, XmarkCircle } from 'iconoir-react';

interface MemoryProof {
  memoryId: string;
  text?: string;
  category?: string;
  blobId: string;
  status: 'verified' | 'mismatch' | 'not_found';
  suiObjectId: string | null;
  transactionDigest: string | null;
  certifiedEpoch: number | null;
  storageEndEpoch: number | null;
  sizeBytes: number | null;
  onChainNamespace: string | null;
  checks: { certified: boolean; ownedByMemWalAccountOwner: boolean; namespaceMatches: boolean; jobIdMatches: boolean | null };
}

interface ProofPayload {
  status: 'checked' | 'no_memories' | 'not_configured' | 'unavailable';
  reason?: string;
  namespace: string;
  account?: { accountId: string; owner: string; delegateRegistered: boolean };
  proofs: MemoryProof[];
  checkedAt?: string;
  explanation: { proves: string; doesNotProve: string };
}

/** Sui explorer links, built only from IDs returned by Sui Mainnet. */
const SUISCAN = 'https://suiscan.xyz/mainnet';

const PROOF_BADGE: Record<MemoryProof['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  verified: { label: 'Verified on Sui', variant: 'success' },
  mismatch: { label: 'Does not match', variant: 'warning' },
  not_found: { label: 'Not found on Sui', variant: 'danger' },
};

const CHECK_LABELS: Array<[keyof MemoryProof['checks'], string]> = [
  ['certified', 'Blob certified by Walrus'],
  ['ownedByMemWalAccountOwner', 'Owned by the MemWal account owner'],
  ['namespaceMatches', 'On-chain namespace is this wallet’s'],
  ['jobIdMatches', 'Written by the job Memeora recorded'],
];

function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

export function MemoryProofs() {
  const [payload, setPayload] = React.useState<ProofPayload | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const check = async () => {
    setIsChecking(true);
    setError(null);
    try {
      setPayload(await financeApi<ProofPayload>('/api/verification/memories'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Memory proofs could not be loaded.');
    } finally {
      setIsChecking(false);
    }
  };

  const verifiedCount = payload?.proofs.filter((p) => p.status === 'verified').length ?? 0;

  return (
    <section aria-labelledby="memory-proofs-heading" className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 id="memory-proofs-heading" className="text-lg font-bold tracking-tight text-[var(--ink-primary)]">Your memories on Sui</h3>
          <p className="max-w-2xl text-xs text-[var(--ink-muted)]">
            Reads each stored memory&apos;s Walrus Blob object on Sui Mainnet through Tatum and checks it against what Memeora recorded.
            Takes about a second per memory.
          </p>
        </div>
        <Button variant="primary" size="sm" isLoading={isChecking} onClick={() => void check()} leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}>
          {payload ? 'Check again' : 'Verify my memories'}
        </Button>
      </div>

      {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}
      {isChecking && <p role="status" className="flex items-center gap-2 text-xs text-[var(--ink-secondary)]"><Spinner size={14} className="text-[var(--brand-blue)]" />Reading Sui Mainnet through Tatum…</p>}

      {payload && !isChecking && (
        <Card className="p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-card)] bg-[var(--surface-tint)] p-5 text-xs">
            <div className="space-y-1">
              <p className="text-[var(--ink-muted)]">Namespace <code className="ml-1 break-all font-bold text-[var(--ink-primary)]">{payload.namespace}</code></p>
              {payload.account && (
                <p className="text-[var(--ink-muted)]">
                  MemWal account owner <code className="ml-1 text-[var(--ink-primary)]">{short(payload.account.owner)}</code>
                  {' · '}Memeora delegate key {payload.account.delegateRegistered ? 'registered on the account' : 'NOT registered on the account'}
                </p>
              )}
            </div>
            {payload.status === 'checked' && (
              <Badge variant={verifiedCount === payload.proofs.length ? 'success' : 'warning'} className="text-xs tabular-nums">
                {verifiedCount} of {payload.proofs.length} verified
              </Badge>
            )}
          </div>

          <div className="divide-y divide-[var(--border-card)]">
            {payload.status === 'no_memories' && <p className="p-5 text-xs text-[var(--ink-secondary)]">No memory is stored on Walrus yet. A memory appears here once the Memory page shows it as stored.</p>}
            {(payload.status === 'not_configured' || payload.status === 'unavailable') && (
              <p className="p-5 text-xs text-[var(--accent-warning)]">
                {payload.status === 'not_configured' ? 'On-chain checks are not configured on the server.' : 'Sui Mainnet could not be read through Tatum right now.'} {payload.reason}
              </p>
            )}
            {payload.proofs.map((proof) => (
              <div key={proof.memoryId} className="space-y-3 p-5 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-xl font-semibold text-[var(--ink-primary)]">{proof.text ?? proof.blobId}</p>
                  <Badge variant={PROOF_BADGE[proof.status].variant} className="shrink-0 text-xs">{PROOF_BADGE[proof.status].label}</Badge>
                </div>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {CHECK_LABELS.filter(([key]) => proof.checks[key] !== null).map(([key, label]) => (
                    <li key={key} className="flex items-center gap-1.5 text-[var(--ink-secondary)]">
                      {proof.checks[key]
                        ? <CheckCircle aria-hidden className="h-3.5 w-3.5 text-[var(--accent-positive)]" />
                        : <XmarkCircle aria-hidden className="h-3.5 w-3.5 text-[var(--accent-danger)]" />}
                      <span>{label}<span className="sr-only">: {proof.checks[key] ? 'yes' : 'no'}</span></span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[var(--ink-muted)]">
                  <span>Walrus blob <code className="text-[var(--ink-primary)]">{short(proof.blobId)}</code></span>
                  {proof.certifiedEpoch !== null && <span>Certified at Walrus epoch {proof.certifiedEpoch} · stored until epoch {proof.storageEndEpoch ?? '—'}</span>}
                  {proof.suiObjectId && (
                    <a className="inline-flex items-center gap-1 font-semibold text-[var(--brand-blue)] hover:underline" href={`${SUISCAN}/object/${proof.suiObjectId}`} target="_blank" rel="noopener noreferrer">
                      Sui object {short(proof.suiObjectId)} <OpenNewWindow aria-hidden className="h-3 w-3" />
                    </a>
                  )}
                  {proof.transactionDigest && (
                    <a className="inline-flex items-center gap-1 font-semibold text-[var(--brand-blue)] hover:underline" href={`${SUISCAN}/tx/${proof.transactionDigest}`} target="_blank" rel="noopener noreferrer">
                      Last transaction {short(proof.transactionDigest)} <OpenNewWindow aria-hidden className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {proof.status === 'mismatch' && proof.onChainNamespace && !proof.checks.namespaceMatches && (
                  <p className="text-[var(--accent-warning)]">On-chain namespace is <code>{proof.onChainNamespace}</code>.</p>
                )}
              </div>
            ))}
          </div>

          <CardFooter className="items-start gap-2 border-t border-[var(--border-card)] bg-[var(--surface-card)] p-4 text-xs text-[var(--ink-secondary)]">
            <InfoCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]" />
            <span><strong>Scope:</strong> {payload.explanation.proves} {payload.explanation.doesNotProve}{payload.checkedAt ? ` Checked ${new Date(payload.checkedAt).toLocaleTimeString()}.` : ''}</span>
          </CardFooter>
        </Card>
      )}
    </section>
  );
}
