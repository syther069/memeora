'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSession } from '@/components/auth/app-session-guard';
import { TxRow } from '@/components/transactions/tx-row';
import { ListSkeleton } from '@/components/ui/skeleton';
import { FreshnessNote, LoadErrorPanel } from '@/components/ui/status-panels';
import { useFinanceResource } from '@/lib/use-finance-resource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useLedger } from '@/components/layout/ledger-provider';
import { currentPeriod, financeApiHeaders, formatMoney, type ApiTransaction } from '@/lib/finance-api';
import { MEMORY_DRAFT_KEY } from '@/lib/memory-draft';
import { formatLedgerDate, formatPeriod } from '@/lib/dates';
import { Brain, Plus, Download, EditPencil, Link, Page, Search, Trash, Wallet, Xmark, Check } from 'iconoir-react';

const LIST_LIMIT = 100;

export default function TransactionsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { mode } = useAppSession();
  const { version, hiddenIds, openAddTransaction, openEditTransaction, openImportSui, openOtherChain, deleteTransaction } = useLedger();
  const [isExporting, setIsExporting] = React.useState(false);
  const [period, setPeriod] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [selectedType, setSelectedType] = React.useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const ledger = useFinanceResource<{ transactions: ApiTransaction[] }>(`/api/transactions?limit=${LIST_LIMIT}${period ? `&period=${period}` : ''}`, version);
  // The list on screen stays while a filter change or an edit reloads it.
  const transactions = (ledger.data?.transactions ?? []).filter((tx) => !hiddenIds.has(tx.id));

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
      toast({ type: 'error', title: 'The CSV was not exported', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {ledger.error && !ledger.data && <LoadErrorPanel title="Could not load your transactions" message={ledger.error} offline={ledger.isOffline} onRetry={() => ledger.refresh()} />}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={openAddTransaction} leftIcon={<Plus className="h-4 w-4" />}>Add transaction</Button>
        <Button type="button" variant="secondary" size="sm" leftIcon={<Wallet className="w-3.5 h-3.5" />} onClick={openImportSui}>Import from Sui wallet</Button>
        <Button type="button" variant="outline" size="sm" leftIcon={<Link className="w-3.5 h-3.5" />} onClick={openOtherChain}>Add from another chain</Button>
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
              rightAddon={searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="p-1 hover:text-[var(--ink-primary)] cursor-pointer"><Xmark className="w-3.5 h-3.5" /></button> : null}
            />
          </div>
          <div className="sm:w-48">
            <Input label="Month" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div role="group" aria-label="Transaction type" className="flex self-start lg:self-auto p-1 bg-[var(--surface-sunken)] rounded-full border border-[var(--brand-blue-soft)]/60 text-xs">
            {(['all', 'expense', 'income'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setSelectedType(type)} aria-pressed={selectedType === type} className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full font-bold capitalize transition-colors cursor-pointer ${selectedType === type ? 'bg-[var(--brand-blue)] text-white' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'}`}>{selectedType === type && <Check aria-hidden className="h-3 w-3" />}{type}</button>
            ))}
          </div>
        </div>
        {(categories.length > 1 || hasActiveFilters) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category} className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer border ${selectedCategory === category ? 'bg-[var(--brand-blue)] text-white border-transparent' : 'bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] border-[var(--brand-blue-soft)]/70'}`}>{selectedCategory === category && <Check aria-hidden className="h-3 w-3" />}{category}</button>
              ))}
            </div>
            {hasActiveFilters && <Button variant="ghost" size="sm" className="shrink-0" onClick={clearFilters}>Clear filters</Button>}
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--ink-primary)]">{period ? formatPeriod(period) : 'Latest transactions'}</h2>
            {ledger.data && <p className="text-xs text-[var(--ink-muted)]">Showing {filtered.length}{transactions.length === LIST_LIMIT ? `, from the latest ${LIST_LIMIT}. Pick a month to see older entries` : ''}.</p>}
          </div>
          <FreshnessNote updatedAt={ledger.updatedAt} isRefreshing={ledger.isRefreshing} refreshFailed={Boolean(ledger.error)} onRetry={() => void ledger.refresh()} />
        </div>

        {ledger.isLoading ? <ListSkeleton rows={5} label="Loading transactions" />
          : !ledger.data ? <EmptyState className="mt-3" icon={<Page className="h-6 w-6" />} title="Transactions could not be loaded" description="Your saved entries are not affected." actionLabel="Try again" onAction={() => void ledger.refresh()} />
            : filtered.length === 0 ? (
              hasActiveFilters
                ? <EmptyState className="mt-3" icon={<Page className="h-6 w-6" />} title="Nothing matches these filters" description="Try another month, or clear the filters." actionLabel="Clear filters" onAction={clearFilters} />
                : <EmptyState className="mt-3" icon={<Page className="h-6 w-6" />} title="No transactions yet" description="Add your income and spending. Your totals and the Assistant work from these entries." actionLabel="Add your first transaction" onAction={openAddTransaction} />
            ) : (
              <ul aria-label="Transactions" className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((tx) => {
                  const name = tx.description || tx.category;
                  return (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      actions={(
                        <>
                          <Button variant="ghost" size="sm" onClick={() => rememberTransaction(tx)} aria-label={`Remember ${name}`} leftIcon={<Brain aria-hidden className="h-4 w-4" />}>Remember</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditTransaction(tx)} aria-label={`Edit ${name}`} leftIcon={<EditPencil aria-hidden className="h-4 w-4" />}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTransaction(tx)} aria-label={`Delete ${name}`} leftIcon={<Trash aria-hidden className="h-4 w-4" />} className="hover:bg-[var(--accent-danger-bg)] hover:text-[var(--accent-danger)]">Delete</Button>
                        </>
                      )}
                    />
                  );
                })}
              </ul>
            )}
      </Card>
    </div>
  );
}
