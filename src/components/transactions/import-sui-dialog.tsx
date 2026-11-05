'use client';

import * as React from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, RotateCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useAppSession } from '@/components/auth/app-session-guard';
import { financeApi, formatMoney } from '@/lib/finance-api';
import { formatLedgerDate } from '@/lib/dates';
import { categoriesFor } from '@/modules/finance/domain/categories';
import { parseMajorUnitsToMinor } from '@/modules/finance/domain/money';

interface ActivityEntry {
  digest: string;
  occurredAt: string;
  coinType: string;
  symbol: string | null;
  amount: string | null;
  direction: 'income' | 'expense';
  failed: boolean;
  suggestedMinor: number | null;
  isEstimate: boolean;
  importedIn: string | null;
}

interface ActivityPage { entries: ActivityEntry[]; nextCursor: string | null }

interface Draft {
  selected: boolean;
  category: string;
  value: string;
}

const keyOf = (entry: ActivityEntry) => `${entry.digest}|${entry.coinType}`;
const shortHash = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-6)}`;

/** Reviews the signed-in wallet's Sui activity and adds what the user chooses. Reading needs no signature. */
export function ImportSuiDialog({ onClose, onImported }: {
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const { mode, preferredCurrency } = useAppSession();
  const [entries, setEntries] = React.useState<ActivityEntry[]>([]);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [digest, setDigest] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const addEntries = React.useCallback((incoming: ActivityEntry[], selectThem: boolean) => {
    setEntries((current) => {
      const known = new Set(current.map(keyOf));
      return [...current, ...incoming.filter((entry) => !known.has(keyOf(entry)))];
    });
    setDrafts((current) => {
      const next = { ...current };
      for (const entry of incoming) {
        if (next[keyOf(entry)]) continue;
        next[keyOf(entry)] = {
          selected: selectThem && !entry.importedIn,
          category: categoriesFor(mode, entry.direction, true)[0],
          value: entry.suggestedMinor === null ? '' : (entry.suggestedMinor / 100).toFixed(2),
        };
      }
      return next;
    });
  }, [mode]);

  const load = React.useCallback(async (cursor?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ currency: preferredCurrency });
      if (cursor) params.set('cursor', cursor);
      const page = await financeApi<ActivityPage>(`/api/transactions/sui-activity?${params}`);
      addEntries(page.entries, false);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Your Sui activity could not be read.');
    } finally {
      setIsLoading(false);
    }
  }, [addEntries, preferredCurrency]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const findByDigest = async (event: React.FormEvent) => {
    event.preventDefault();
    const wanted = digest.trim();
    if (!wanted || isLoading) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ currency: preferredCurrency, digest: wanted });
      const page = await financeApi<ActivityPage>(`/api/transactions/sui-activity?${params}`);
      addEntries(page.entries, true);
      setDigest('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'That transaction could not be read.');
    } finally {
      setIsLoading(false);
    }
  };

  const update = (key: string, change: Partial<Draft>) => setDrafts((current) => ({ ...current, [key]: { ...current[key], ...change } }));

  const importable = entries.filter((entry) => entry.symbol && !entry.importedIn);
  const chosen = importable.filter((entry) => drafts[keyOf(entry)]?.selected);

  const save = async () => {
    if (isSaving || chosen.length === 0) return;
    setSaveError(null);
    const items = [];
    for (const entry of chosen) {
      const draft = drafts[keyOf(entry)];
      const amountMinor = parseMajorUnitsToMinor(draft.value);
      if (amountMinor === null) {
        setSaveError(`Enter a ${preferredCurrency} value for ${entry.amount} ${entry.symbol}.`);
        return;
      }
      items.push({
        digest: entry.digest,
        coinType: entry.coinType,
        category: draft.category,
        amountMinor,
        currency: preferredCurrency,
        valueEdited: amountMinor !== entry.suggestedMinor,
      });
    }
    setIsSaving(true);
    try {
      const result = await financeApi<{ imported: number; duplicates: number; failed: Array<{ reason: string }> }>('/api/transactions/import', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      if (result.failed.length > 0) {
        setSaveError(`${result.imported} added. ${result.failed.length} could not be added: ${result.failed[0].reason}`);
        setIsSaving(false);
        return;
      }
      onImported(result.imported);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'These transactions could not be added. Please retry.');
      setIsSaving(false);
    }
  };

  const selectClass = 'h-9 w-full rounded-lg border border-[var(--brand-sky-blue)]/70 bg-[var(--surface-card)] px-2 text-xs font-medium text-[var(--ink-primary)]';

  return (
    <Modal isOpen onClose={onClose} className="max-w-2xl" title="Import from your Sui wallet" description={`Choose what belongs in your ${mode} ledger. Token, amount and date come from Sui Mainnet, read through Tatum.`}>
      <div className="space-y-4">
        <form onSubmit={findByDigest} className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Find a transaction by its digest (optional)" placeholder="Paste a Sui transaction digest" value={digest} onChange={(event) => setDigest(event.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={!digest.trim() || isLoading} leftIcon={<Search className="w-3.5 h-3.5" />}>Find</Button>
        </form>

        {loadError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-3 text-xs text-[var(--accent-warning)]">
            <span className="flex items-center gap-2"><AlertTriangle aria-hidden className="w-4 h-4 shrink-0" />{loadError}</span>
            <Button type="button" variant="outline" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => void load()}>Try again</Button>
          </div>
        )}

        {entries.length === 0 && !isLoading && !loadError && (
          <p className="py-6 text-center text-sm text-[var(--ink-muted)]">No recent transactions changed this wallet&apos;s balance.</p>
        )}

        {entries.length > 0 && (
          <ul aria-label="Sui transactions" className="max-h-[45dvh] divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
            {entries.map((entry) => {
              const key = keyOf(entry);
              const draft = drafts[key];
              if (!draft) return null;
              const isIncome = entry.direction === 'income';
              const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
              const canImport = Boolean(entry.symbol) && !entry.importedIn;
              const suggestion = entry.suggestedMinor === null ? null : parseMajorUnitsToMinor(draft.value) === entry.suggestedMinor;
              return (
                <li key={key} className="space-y-2 p-3">
                  <label className={`flex items-start gap-3 ${canImport ? 'cursor-pointer' : ''}`}>
                    <input type="checkbox" disabled={!canImport} checked={draft.selected} onChange={(event) => update(key, { selected: event.target.checked })} className="mt-1 accent-[var(--brand-deep-current)]" aria-label={`Import ${entry.amount ?? 'unknown amount'} ${entry.symbol ?? 'token'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[var(--ink-primary)]">
                        <Icon aria-hidden className={`h-4 w-4 ${isIncome ? 'text-[var(--accent-positive)]' : 'text-[var(--brand-deep-current)]'}`} />
                        {isIncome ? 'Received' : 'Sent'} {entry.amount ?? 'an unknown amount of'} {entry.symbol ?? 'an unknown token'}
                        {entry.failed && <Badge variant="warning" className="text-[10px]">Failed, gas only</Badge>}
                        {entry.importedIn && <Badge variant="sky" className="text-[10px]">Already in {entry.importedIn}</Badge>}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-[var(--ink-muted)]">{formatLedgerDate(entry.occurredAt)} · {shortHash(entry.digest)}</span>
                      {!entry.symbol && <span className="mt-0.5 block text-[11px] text-[var(--ink-muted)]">Sui has no details for this token, so it cannot be added.</span>}
                    </span>
                  </label>
                  {draft.selected && (
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <label className="space-y-1 text-[11px] font-bold text-[var(--ink-primary)]">
                        Category
                        <select value={draft.category} onChange={(event) => update(key, { category: event.target.value })} className={selectClass}>
                          {categoriesFor(mode, entry.direction, true).map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1 text-[11px] font-bold text-[var(--ink-primary)]">
                        Value in {preferredCurrency}
                        <input type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.value} onChange={(event) => update(key, { value: event.target.value })} placeholder="0.00" className={selectClass} />
                      </label>
                      <p className="col-span-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                        {entry.suggestedMinor === null
                          ? 'No suggested value: Memeora has no price for this token, or the amount is under one cent. Enter what it was worth to you.'
                          : suggestion
                            ? entry.isEstimate
                              ? `Estimate: ${formatMoney(entry.suggestedMinor, preferredCurrency)} at today's rate, not the rate on that day. Change it if you know the real value.`
                              : `${formatMoney(entry.suggestedMinor, preferredCurrency)} at today's rate.`
                            : 'Your own figure.'}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isLoading && <p role="status" className="text-center text-xs text-[var(--ink-muted)]">Reading Sui Mainnet…</p>}
        {nextCursor && !isLoading && (
          <div className="text-center"><Button type="button" variant="ghost" size="sm" onClick={() => void load(nextCursor)}>Show older transactions</Button></div>
        )}
        {!nextCursor && !isLoading && !loadError && (
          <p className="text-center text-[11px] text-[var(--ink-muted)]">That is as far back as this Sui node keeps. Much older transactions may not be available here.</p>
        )}
        {saveError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{saveError}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" size="pill" isLoading={isSaving} disabled={chosen.length === 0} onClick={() => void save()}>
            {chosen.length === 0 ? 'Choose transactions' : `Add ${chosen.length} to ${mode}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
