'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSession } from '@/components/auth/app-session-guard';
import { AddOnChainDialog } from '@/components/transactions/add-onchain-dialog';
import { ImportSuiDialog } from '@/components/transactions/import-sui-dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useLedger } from '@/components/layout/ledger-provider';
import { currentPeriod, financeApi, financeApiHeaders, FinanceApiError, formatMoney, type ApiTransaction } from '@/lib/finance-api';
import { MEMORY_DRAFT_KEY } from '@/lib/memory-draft';
import { formatLedgerDate, formatPeriod } from '@/lib/dates';
import { Search, ArrowDownRight, ArrowUpRight, Brain, Download, Link2, Receipt, Wallet, X, RotateCcw, Pencil, Trash2 } from 'lucide-react';

type LoadState = 'loading' | 'ready' | 'offline' | 'error';

const LIST_LIMIT = 100;

export default function TransactionsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { mode } = useAppSession();
  const { version, openAddTransaction, openEditTransaction, notifyLedgerChanged } = useLedger();
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isOtherChainOpen, setIsOtherChainOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [transactions, setTransactions] = React.useState<ApiTransaction[]>([]);
  const [loadState, setLoadState] = React.useState<LoadState>('loading');
  const [loadError, setLoadError] = React.useState('');
  const [period, setPeriod] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [selectedType, setSelectedType] = React.useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [toDelete, setToDelete] = React.useState<ApiTransaction | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const loadTransactions = React.useCallback(async () => {
    // Keep the current list on screen while a filter change or edit reloads it.
    setLoadState((current) => (current === 'ready' ? current : 'loading'));
    setLoadError('');
    try {
      const query = `limit=${LIST_LIMIT}${period ? `&period=${period}` : ''}`;
      const data = await financeApi<{ transactions: ApiTransaction[] }>(`/api/transactions?${query}`);
      setTransactions(data.transactions);
      setLoadState('ready');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load transactions.');
      setLoadState(error instanceof FinanceApiError && error.offline ? 'offline' : 'error');
    }
  }, [period]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void loadTransactions(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTransactions, version]);

  const categories = ['All', ...Array.from(new Set(transactions.map((tx) => tx.category))).sort()];
  const query = searchQuery.trim().toLowerCase();
  const filtered = transactions.filter((tx) =>
    (selectedCategory === 'All' || tx.category === selectedCategory)
    && (selectedType === 'all' || tx.type === selectedType)
    && (tx.description.toLowerCase().includes(query) || tx.category.toLowerCase().includes(query) || (tx.counterparty ?? '').toLowerCase().includes(query) || (tx.reference ?? '').toLowerCase().includes(query)));
  const hasActiveFilters = selectedCategory !== 'All' || selectedType !== 'all' || query !== '' || period !== '';
  const clearFilters = () => { setSelectedCategory('All'); setSelectedType('all'); setSearchQuery(''); setPeriod(''); };

  /** Opens the Save-a-memory form prefilled. The draft stays in this tab, and the user reviews it before saving. */
  const rememberTransaction = (tx: ApiTransaction) => {
    const verb = tx.type === 'expense' ? 'Spent' : 'Received';
    const detail = tx.description || tx.counterparty || '';
    const text = `${verb} ${formatMoney(tx.amountMinor, tx.currency)} on ${formatLedgerDate(tx.occurredAt)} for ${tx.category}${detail ? ` (${detail})` : ''}.`;
    try {
      sessionStorage.setItem(MEMORY_DRAFT_KEY, text.slice(0, 500));
    } catch {
      // Without session storage the form simply opens empty.
    }
    router.push('/memory');
  };

  const exportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const exportPeriod = period || currentPeriod();
    try {
      const response = await fetch(`/api/transactions/export?period=${exportPeriod}`, { headers: financeApiHeaders(), cache: 'no-store' });
      if (!response.ok) throw new Error('The export could not be created.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `memeora-${mode}-${exportPeriod}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'CSV exported', description: `Your transactions for ${formatPeriod(exportPeriod)}.` });
    } catch (error) {
      toast({ type: 'warning', title: 'Export failed', description: error instanceof Error ? error.message : 'Please retry.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await financeApi(`/api/transactions/${encodeURIComponent(toDelete.id)}`, { method: 'DELETE' });
      setToDelete(null);
      notifyLedgerChanged();
      toast({ type: 'info', title: 'Transaction deleted', description: 'Your totals have been updated.' });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'This transaction could not be deleted. Please retry.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {(loadState === 'offline' || loadState === 'error') && (
        <Card role="alert" className="flex flex-wrap items-center justify-between gap-4 border-[var(--accent-warning-border)]">
          <div>
            <h3 className="font-bold text-[var(--ink-primary)]">{loadState === 'offline' ? 'You seem to be offline' : 'Could not load your transactions'}</h3>
            <p className="text-sm text-[var(--ink-muted)] mt-1">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadTransactions()} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>Try again</Button>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" leftIcon={<Wallet className="w-3.5 h-3.5" />} onClick={() => setIsImportOpen(true)}>Import from Sui wallet</Button>
        <Button type="button" variant="outline" size="sm" leftIcon={<Link2 className="w-3.5 h-3.5" />} onClick={() => setIsOtherChainOpen(true)}>Add from another chain</Button>
        {mode === 'business' && <Button type="button" variant="outline" size="sm" isLoading={isExporting} leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => void exportCsv()}>Export {period ? formatPeriod(period) : 'this month'} as CSV</Button>}
      </div>

      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <Input
              aria-label="Search by note or category"
              placeholder="Search by note or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftAddon={<Search className="w-4 h-4 text-[var(--ink-muted)]" />}
              rightAddon={searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="p-1 hover:text-[var(--ink-primary)] cursor-pointer"><X className="w-3.5 h-3.5" /></button> : null}
            />
          </div>
          <div className="sm:w-48">
            <Input label="Month" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div role="group" aria-label="Transaction type" className="flex self-start lg:self-auto p-1 bg-[var(--surface-cloud-solid)] rounded-full border border-[var(--brand-sky-blue)]/60 text-xs">
            {(['all', 'expense', 'income'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setSelectedType(type)} aria-pressed={selectedType === type} className={`px-4 py-1.5 rounded-full font-bold capitalize transition-all cursor-pointer ${selectedType === type ? 'bg-[var(--brand-deep-current)] text-white' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'}`}>{type}</button>
            ))}
          </div>
        </div>
        {(categories.length > 1 || hasActiveFilters) && (
          <div className="flex items-center justify-between gap-3 overflow-x-auto pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border ${selectedCategory === category ? 'bg-[var(--brand-deep-current)] text-white border-transparent' : 'bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:bg-[var(--surface-sky-tint)] border-[var(--brand-sky-blue)]/70'}`}>{category}</button>
              ))}
            </div>
            {hasActiveFilters && <Button variant="ghost" size="sm" className="shrink-0" onClick={clearFilters}>Clear filters</Button>}
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="pb-4 mb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-base font-bold text-[var(--ink-primary)]">{period ? formatPeriod(period) : 'Latest transactions'}</h3>
          <p className="text-xs text-[var(--ink-muted)]">
            {loadState === 'ready'
              ? `Showing ${filtered.length}${transactions.length === LIST_LIMIT ? `, from the latest ${LIST_LIMIT}. Pick a month to see older entries` : ''}.`
              : 'Loading…'}
          </p>
        </div>

        {loadState === 'loading' ? (
          <p role="status" className="py-10 text-center text-sm text-[var(--ink-muted)]">Loading transactions…</p>
        ) : loadState !== 'ready' ? (
          <EmptyState icon={<Receipt className="w-6 h-6" />} title="Transactions are not available" description="Check your connection and try again." />
        ) : filtered.length === 0 ? (
          hasActiveFilters
            ? <EmptyState icon={<Receipt className="w-6 h-6" />} title="Nothing matches these filters" description="Try another month, or clear the filters." actionLabel="Clear filters" onAction={clearFilters} />
            : <EmptyState icon={<Receipt className="w-6 h-6" />} title="No transactions yet" description="Add your income and spending. Your totals and the Assistant work from these entries." actionLabel="Add your first transaction" onAction={openAddTransaction} />
        ) : (
          <ul aria-label="Transactions" className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <li key={tx.id} className="py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${isExpense ? 'bg-[var(--surface-cloud-solid)] border-[var(--brand-sky-blue)] text-[var(--brand-deep-current)]' : 'bg-[var(--accent-positive-bg)] border-[var(--accent-positive-border)] text-[var(--accent-positive)]'}`}>
                      {isExpense ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--ink-primary)] truncate">{tx.description || tx.counterparty || tx.category}</p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5 tabular-nums">{tx.category} · {formatLedgerDate(tx.occurredAt)}{tx.counterparty && tx.description ? ` · ${tx.counterparty}` : ''}{tx.reference ? ` · ${tx.reference}` : ''}</p>
                      {(tx.onChain || tx.fiatEstimated) && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
                          {tx.onChain && <span className="tabular-nums">{tx.onChain.assetAmount} {tx.onChain.assetSymbol}</span>}
                          {tx.onChain && <Badge variant={tx.onChain.verified ? 'success' : 'warning'} className="text-[10px] font-semibold">{tx.onChain.verified ? 'Verified on Sui' : 'Not verified, added by you'}</Badge>}
                          {tx.fiatEstimated && <Badge variant="default" className="text-[10px] font-semibold">Value is an estimate</Badge>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                    <p className={`text-sm sm:text-base font-extrabold tabular-nums ${isExpense ? 'text-[var(--ink-primary)]' : 'text-[var(--accent-positive)]'}`}>
                      {isExpense ? '−' : '+'}{formatMoney(tx.amountMinor, tx.currency)}
                    </p>
                    <button type="button" onClick={() => rememberTransaction(tx)} aria-label={`Remember ${tx.description || tx.category}`} title="Save a memory about this" className="hidden sm:block p-2 rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sky-tint)] cursor-pointer"><Brain className="w-4 h-4" /></button>
                    <button type="button" onClick={() => openEditTransaction(tx)} aria-label={`Edit ${tx.description || tx.category}`} className="p-2 rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sky-tint)] cursor-pointer"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => { setDeleteError(null); setToDelete(tx); }} aria-label={`Delete ${tx.description || tx.category}`} className="p-2 rounded-xl text-[var(--ink-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-bg)] cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {isImportOpen && (
        <ImportSuiDialog
          onClose={() => setIsImportOpen(false)}
          onImported={(count) => {
            setIsImportOpen(false);
            notifyLedgerChanged();
            toast({ type: 'success', title: count === 1 ? 'Transaction added' : `${count} transactions added`, description: 'Verified on Sui and added to your ledger.' });
          }}
        />
      )}
      {isOtherChainOpen && (
        <AddOnChainDialog
          onClose={() => setIsOtherChainOpen(false)}
          onUseSui={() => { setIsOtherChainOpen(false); setIsImportOpen(true); }}
          onSaved={() => {
            setIsOtherChainOpen(false);
            notifyLedgerChanged();
            toast({ type: 'success', title: 'Transaction saved', description: 'Saved as not verified, because Memeora cannot check that chain.' });
          }}
        />
      )}

      <Modal isOpen={toDelete !== null} onClose={() => setToDelete(null)} title="Delete this transaction?" description="This cannot be undone. Your totals will update.">
        <div className="space-y-4">
          {toDelete && (
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sky-solid)] p-3 text-sm font-semibold text-[var(--ink-primary)]">
              {toDelete.description || toDelete.category} · {formatMoney(toDelete.amountMinor, toDelete.currency)} · {formatLedgerDate(toDelete.occurredAt)}
            </p>
          )}
          {deleteError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{deleteError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3">
            <Button type="button" variant="ghost" onClick={() => setToDelete(null)}>Keep it</Button>
            <Button type="button" variant="danger" isLoading={isDeleting} onClick={() => void handleDelete()}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
