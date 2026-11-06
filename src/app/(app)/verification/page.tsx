'use client';

import * as React from 'react';
import { Card, CardFooter } from '@/components/ui/card';
import { Expand } from '@/components/ui/expand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { MemoryProofs } from '@/components/verification/memory-proofs';
import { CheckCircle, Copy, Database, InfoCircle, OpenNewWindow, Refresh, ShieldCheck, WarningTriangle, WifiOff } from 'iconoir-react';

type CheckType = 'checkpoint' | 'walrus-account';
interface VerificationPayload {
  network: string;
  check: CheckType;
  method: string;
  status: 'verified' | 'not_configured' | 'unavailable' | 'not_found' | 'unexpected_network' | 'unexpected_object';
  sequenceNumber?: string;
  accountObject?: { objectId: string; version: string; digest: string; type: string; ownerKind?: number };
  verified: boolean;
  cached: boolean;
  cachedAt?: string;
  timestamp: string;
  latencyMs: number;
  error?: string;
  explanation: { proves: string; doesNotProve: string };
  rawResult: unknown;
}

const checkDetails: Record<CheckType, { title: string; description: string; method: string }> = {
  checkpoint: {
    title: 'Sui Mainnet checkpoint',
    description: 'Reads the latest executed checkpoint through Sui gRPC LedgerService.',
    method: 'LedgerService/GetServiceInfo',
  },
  'walrus-account': {
    title: 'Walrus Memory account object',
    description: 'Reads the Walrus Memory account your wallet owns and checks its Move type.',
    method: 'LedgerService/GetObject',
  },
};

const emptyResults: Record<CheckType, VerificationPayload | null> = { checkpoint: null, 'walrus-account': null };

export default function VerificationPage() {
  const { toast } = useToast();
  const [results, setResults] = React.useState(emptyResults);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const executeChecks = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const outcomes = await Promise.allSettled((['checkpoint', 'walrus-account'] as const).map(async (check) => {
      const response = await fetch(`/api/verification/sui-checkpoint?check=${check}`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Sui could not be reached through Tatum just now. Your records are not affected.');
      return json.data as VerificationPayload;
    }));

    let firstError: string | null = null;
    outcomes.forEach((outcome, index) => {
      const check = (['checkpoint', 'walrus-account'] as const)[index];
      if (outcome.status === 'fulfilled') {
        setResults((previous) => ({ ...previous, [check]: outcome.value }));
      } else if (!firstError) {
        firstError = outcome.reason instanceof TypeError || !(outcome.reason instanceof Error) ? 'The check did not finish. Please try again.' : outcome.reason.message;
      }
    });
    if (firstError) {
      setErrorMessage(firstError);
      toast({ type: 'error', title: 'Sui could not be checked', description: firstError });
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void executeChecks(); }, 0);
    return () => window.clearTimeout(timer);
  }, [executeChecks]);

  const handleCopyPayload = () => {
    void navigator.clipboard?.writeText(JSON.stringify(results, null, 2));
    toast({ type: 'info', title: 'Response copied', description: 'The current verification responses were copied as JSON.' });
  };

  const statusLabel = (payload: VerificationPayload | null) => {
    if (!payload) return 'Not checked';
    if (payload.status === 'verified') return 'Confirmed';
    if (payload.status === 'not_configured') return 'Not configured';
    if (payload.status === 'not_found') return 'Object not found';
    if (payload.status === 'unexpected_object') return 'Unexpected object type';
    if (payload.status === 'unexpected_network') return 'Unexpected network';
    return 'Unavailable';
  };

  const statusVariant = (payload: VerificationPayload | null): 'success' | 'warning' | 'default' => !payload ? 'default' : payload.verified ? 'success' : 'warning';

  return (
    <div className="space-y-6">
      {!isOnline && <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-well)] p-4 text-xs text-[var(--ink-secondary)]"><WifiOff className="h-4 w-4 shrink-0 text-[var(--accent-warning)]" />You are offline. Live Sui Mainnet checks cannot run.</div>}

      <MemoryProofs />

      <Card>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--ink-primary)]">Is the network live?</h2>
                <Badge variant="sky" className="text-[11px] font-bold">Read through Tatum</Badge>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-[var(--ink-secondary)]">Two live, read-only checks on Sui Mainnet: the latest checkpoint, and your Walrus Memory account.</p>
            </div>
          </div>
          <Button variant="primary" size="pill" isLoading={isLoading} leftIcon={<Refresh className="h-4 w-4" />} onClick={() => void executeChecks()}>Recheck network</Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-[var(--border-card)] pt-6 sm:grid-cols-3">
          <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-well)] p-4"><div className="flex items-center justify-between text-xs font-semibold text-[var(--ink-secondary)]"><span>Network</span><Database className="h-3.5 w-3.5 text-[var(--brand-blue-bright)]" /></div><p className="text-base font-bold text-[var(--ink-primary)]">Sui Mainnet</p><p className="text-[11px] text-[var(--ink-muted)]">Read-only gRPC queries</p></div>
          <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-well)] p-4"><div className="flex items-center justify-between text-xs font-semibold text-[var(--ink-secondary)]"><span>Checkpoint height</span><CheckCircle className="h-3.5 w-3.5 text-[var(--brand-blue)]" /></div><p className="font-mono text-base font-bold text-[var(--ink-primary)]">{results.checkpoint?.sequenceNumber ?? '—'}</p><p className="text-[11px] text-[var(--ink-muted)]">{results.checkpoint ? `${results.checkpoint.latencyMs} ms${results.checkpoint.cached ? ' · cached' : ''}` : 'No response yet'}</p></div>
          <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-well)] p-4"><div className="flex items-center justify-between text-xs font-semibold text-[var(--ink-secondary)]"><span>Walrus account</span><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-blue)]" /></div><p className="truncate font-mono text-xs font-bold text-[var(--ink-primary)]">{results['walrus-account']?.accountObject?.objectId ?? '—'}</p><p className="text-[11px] text-[var(--ink-muted)]">{results['walrus-account'] ? statusLabel(results['walrus-account']) : 'No response yet'}</p></div>
        </div>
      </Card>

      {errorMessage && <Card variant="subtle" className="flex items-center gap-3 border border-[var(--accent-danger-border)] bg-[var(--accent-danger-bg)] p-4 text-xs text-[var(--accent-danger)]"><WarningTriangle className="h-4 w-4 shrink-0" /><span>{errorMessage}</span></Card>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(['checkpoint', 'walrus-account'] as const).map((check) => {
          const result = results[check];
          return <Card key={check} className="p-0 sm:p-0">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-card)] bg-[var(--surface-tint)] p-5">
              <div><h3 className="font-bold text-[var(--ink-primary)]">{checkDetails[check].title}</h3><p className="mt-1 text-xs text-[var(--ink-secondary)]">{checkDetails[check].description}</p></div>
              <Badge variant={statusVariant(result)} className="shrink-0 text-[10px]">{statusLabel(result)}</Badge>
            </div>
            <div className="space-y-3 p-5 text-xs">
              <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Tatum method</span><code className="text-right text-[var(--ink-secondary)]">{checkDetails[check].method}</code></div>
              {check === 'checkpoint' ? <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Checkpoint</span><code className="text-[var(--ink-primary)]">{result?.sequenceNumber ?? '—'}</code></div> : <>
                <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Object ID</span><code className="max-w-[70%] break-all text-right text-[var(--ink-primary)]">{result?.accountObject?.objectId ?? '—'}</code></div>
                <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Move type</span><code className="max-w-[70%] break-all text-right text-[var(--ink-primary)]">{result?.accountObject?.type ?? '—'}</code></div>
                {result?.accountObject && <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Version · digest</span><code className="max-w-[70%] break-all text-right text-[var(--ink-primary)]">{result.accountObject.version} · {result.accountObject.digest}</code></div>}
              </>}
              {result?.error && <p className="text-[var(--accent-warning)]">{result.error}</p>}
              {result && <p className="text-[10px] text-[var(--ink-muted)]">{result.latencyMs} ms{result.cached ? ` · cached ${result.cachedAt ? new Date(result.cachedAt).toLocaleTimeString() : ''}` : ''}</p>}
            </div>
            {result && <CardFooter className="items-start gap-2 border-t border-[var(--border-card)] bg-[var(--surface-card)] p-4 text-[11px] text-[var(--ink-secondary)]"><InfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]" /><span><strong>Scope:</strong> {result.explanation.proves} {result.explanation.doesNotProve}</span></CardFooter>}
          </Card>;
        })}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div><h3 className="text-sm font-bold tracking-tight text-[var(--ink-primary)]">Technical details</h3><p className="text-xs text-[var(--ink-muted)]">The raw responses from both checks.</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={handleCopyPayload} leftIcon={<Copy className="h-3.5 w-3.5" />}>Copy JSON</Button><a href="https://docs.tatum.io/changelog/sui-grpc-available-tatum" target="_blank" rel="noopener noreferrer" className="inline-flex"><Button variant="outline" size="sm" rightIcon={<OpenNewWindow className="h-3.5 w-3.5" />}>Tatum gRPC docs</Button></a></div>
      </div>
      <Expand label="Show raw responses" summaryClassName="text-xs font-bold">
      <Card className="mt-3 p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-tint)] p-3.5 px-5"><code className="text-xs font-mono font-bold text-[var(--brand-blue)]">sui-mainnet-grpc.gateway.tatum.io:443</code><Badge variant="sky" className="text-[10px] font-mono">Sui gRPC</Badge></div>
        <pre className="max-h-[32rem] overflow-auto bg-[var(--ink-primary)] p-5 font-mono text-xs leading-relaxed text-[var(--ink-inverse)]">{JSON.stringify(results, null, 2)}</pre>
      </Card>
      </Expand>
    </div>
  );
}
