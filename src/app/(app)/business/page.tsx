'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, EditPencil, Page, Sparks, Plus } from 'iconoir-react';
import { useLedger } from '@/components/layout/ledger-provider';
import { CategoryBars, GuideStrip, MonthBars, RulesPanel, SectionHead, UsageGauge, type MemorySummary, type OverviewPayload } from '@/components/overview/overview-parts';
import { TxRow } from '@/components/transactions/tx-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton';
import { FreshnessNote, LoadErrorPanel } from '@/components/ui/status-panels';
import { useToast } from '@/components/ui/toast';
import { currentPeriod, financeApi, formatMoney, type ApiBudget, type ApiTransaction } from '@/lib/finance-api';
import { formatPeriod } from '@/lib/dates';
import { useFinanceResource } from '@/lib/use-finance-resource';
import { formatRunway, type BusinessMetrics } from '@/modules/finance/domain/business-metrics';
import { parseMajorUnitsToMinor } from '@/modules/finance/domain/money';

type Currency = 'INR' | 'USD';

interface Overview {
  period: string;
  currency: Currency;
  cashMinor: number | null;
  metrics: BusinessMetrics;
  topCategories: Array<{ category: string; amountMinor: number }>;
  counterparties: Array<{ name: string; receivedMinor: number; paidMinor: number }>;
  otherCurrencies: Array<{ currency: Currency; incomeMinor: number; expenseMinor: number }>;
}

export default function BusinessOverviewPage() {
  const { toast } = useToast();
  const { version, hiddenIds, openAddTransaction } = useLedger();
  const period = currentPeriod();
  const periodLabel = formatPeriod(period);

  const figures = useFinanceResource<Overview>(`/api/business?period=${period}`, version);
  const ledger = useFinanceResource<{ transactions: ApiTransaction[] }>('/api/transactions?limit=5', version);
  const budgets = useFinanceResource<{ budget: ApiBudget | null }>(`/api/budgets?period=${period}`, version);
  const charts = useFinanceResource<OverviewPayload>(`/api/overview?period=${period}`, version);
  const memory = useFinanceResource<MemorySummary>('/api/memory', version);

  const [isCashOpen, setIsCashOpen] = React.useState(false);
  const [cashInput, setCashInput] = React.useState('');
  const [cashCurrency, setCashCurrency] = React.useState<Currency>('INR');
  const [cashError, setCashError] = React.useState<string | null>(null);
  const [isSavingCash, setIsSavingCash] = React.useState(false);

  const overview = figures.data;
  const currency = overview?.currency ?? 'INR';
  const metrics = overview?.metrics;
  const budget = budgets.data?.budget ?? null;
  const transactions = (ledger.data?.transactions ?? []).filter((tx) => !hiddenIds.has(tx.id));
  const hasTransactions = transactions.length > 0;
  const hasMemory = (memory.data?.total ?? 0) > 0;
  const money = (minor: number) => formatMoney(minor, currency);
  const figuresFailed = Boolean(figures.error) && !figures.data;
  const limitFailed = figuresFailed || (Boolean(budgets.error) && !budgets.data);

  const openCash = () => {
    setCashError(null);
    setCashInput(overview?.cashMinor === null || overview?.cashMinor === undefined ? '' : (overview.cashMinor / 100).toFixed(2));
    setCashCurrency(currency);
    setIsCashOpen(true);
  };

  const saveCash = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingCash) return;
    const trimmed = cashInput.trim();
    const cashMinor = trimmed === '' ? null : Number(trimmed) === 0 ? 0 : parseMajorUnitsToMinor(trimmed);
    if (trimmed !== '' && cashMinor === null) {
      setCashError('Enter an amount with up to two decimal places, or leave it empty to clear it.');
      return;
    }
    setIsSavingCash(true);
    setCashError(null);
    try {
      await financeApi('/api/business', { method: 'PUT', body: JSON.stringify({ cashMinor, currency: cashCurrency }) });
      setIsCashOpen(false);
      toast({ type: 'success', title: 'Cash figure saved', description: 'Runway is worked out from it.' });
      void figures.refresh();
    } catch (error) {
      setCashError(error instanceof Error ? error.message : 'The cash figure could not be saved. Please try again.');
    } finally {
      setIsSavingCash(false);
    }
  };

  const burnNote = !metrics ? ' '
    : metrics.burnMinor === null ? 'No records yet to base this on.'
      : metrics.notBurning ? `Revenue covers costs, averaged over ${metrics.burnMonths} ${metrics.burnMonths === 1 ? 'month' : 'months'}.`
        : `Costs minus revenue, averaged over ${metrics.burnMonths} ${metrics.burnMonths === 1 ? 'month' : 'months'} with records.`;

  const remainingLimit = budget && metrics && budget.currency === currency ? budget.amountMinor - metrics.expensesMinor : null;
  const limitUsed = budget && metrics && budget.currency === currency ? Math.round((metrics.expensesMinor / budget.amountMinor) * 100) : null;
  const statClass = 'mt-1 text-2xl font-bold tracking-tight tabular-nums text-[var(--ink-primary)]';

  return (
    <div className="space-y-4">
      {figures.error && !overview && <LoadErrorPanel title="Could not load your business figures" message={figures.error} offline={figures.isOffline} onRetry={() => figures.refresh()} />}

      {overview && ledger.data && !(hasTransactions && hasMemory) && (
        <GuideStrip
          title="Set up your business workspace"
          steps={[
            { title: 'Transaction recorded', action: 'Record revenue or a cost', done: hasTransactions, onClick: openAddTransaction },
            { title: 'Rule saved', action: 'Save a rule, like “keep 6 months of runway”', done: hasMemory, href: '/memory' },
            { title: 'Ask the Assistant', action: 'Ask “can we afford this hire?”', done: false, href: '/assistant' },
            { title: 'See the proof', action: 'Check your memories on Sui', done: false, href: '/verification' },
          ]}
        />
      )}

      <div className="flex min-h-5 flex-wrap items-center justify-between gap-3">
        <FreshnessNote updatedAt={figures.updatedAt} isRefreshing={figures.isRefreshing} refreshFailed={Boolean(figures.error)} onRetry={() => void figures.refresh()} />
        <Button variant="primary" size="sm" onClick={openAddTransaction} leftIcon={<Plus className="h-4 w-4" />}>Add transaction</Button>
        {overview && overview.otherCurrencies.length > 0 && (
          <p className="text-xs text-[var(--ink-muted)]">Figures show {currency} only. Also recorded: {overview.otherCurrencies.map((entry) => `${formatMoney(entry.incomeMinor, entry.currency)} in, ${formatMoney(entry.expenseMinor, entry.currency)} out`).join('; ')}.</p>
        )}
      </div>

      <section aria-label={`${periodLabel} business totals`} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card variant="blue" className="flex flex-col justify-between gap-6 lg:col-span-5">
          <div>
            <p className="text-xs font-medium text-[var(--ink-on-blue-muted)]">Profit in {periodLabel}</p>
            {metrics
              ? <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{metrics.profitMinor < 0 ? '−' : ''}{money(Math.abs(metrics.profitMinor))}</p>
              : figuresFailed ? <p className="mt-2 text-2xl font-bold">Unavailable</p> : <Skeleton className="mt-2 h-12 w-48 bg-white/20" />}
            <p className="mt-1.5 text-xs text-[var(--ink-on-blue-muted)]">Revenue minus expenses you recorded. Not your accounting profit.</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
            <div>
              <dt className="text-xs text-[var(--ink-on-blue-muted)]">Revenue</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{metrics ? money(metrics.revenueMinor) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--ink-on-blue-muted)]">Expenses</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{metrics ? money(metrics.expensesMinor) : '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-4">
          <SectionHead title="Runway" />
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-[var(--ink-secondary)]">Months left at this burn</dt>
              <dd className={statClass}>{figuresFailed ? 'Unavailable' : !metrics ? <Skeleton className="h-8 w-32" /> : metrics.runwayTenths === null ? '—' : formatRunway(metrics.runwayTenths)}</dd>
              <dd className="mt-0.5 text-xs text-[var(--ink-muted)]">
                {!overview ? ' ' : metrics?.notBurning ? 'Not burning cash on these records.' : overview.cashMinor === null ? <button type="button" onClick={openCash} className="hit font-semibold text-[var(--brand-blue)] hover:underline cursor-pointer">Enter your cash to see this</button> : metrics?.burnMinor === null ? 'Record some transactions to see this.' : 'Cash divided by monthly burn, rounded down.'}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-3">
              <div>
                <dt className="text-xs text-[var(--ink-secondary)]">Monthly burn</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--ink-primary)]">{!metrics || metrics.burnMinor === null ? '—' : money(metrics.burnMinor)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-[var(--ink-secondary)]">
                  Cash you hold
                  <button type="button" onClick={openCash} aria-label="Edit cash figure" className="hit rounded-full p-0.5 text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink-primary)] cursor-pointer"><EditPencil className="h-3 w-3" /></button>
                </dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--ink-primary)]">{overview?.cashMinor === null || !overview ? '—' : money(overview.cashMinor)}</dd>
              </div>
            </div>
            <dd className="text-xs text-[var(--ink-muted)]">{burnNote} Cash is a figure you enter; Memeora does not read your bank or wallet balance.</dd>
          </dl>
        </Card>

        <Card className="flex flex-col lg:col-span-3">
          <SectionHead title="Spend limit" href="/budgets" action={budget || limitFailed ? 'Manage' : 'Set limit'} />
          {limitFailed ? <p className="text-xs text-[var(--ink-secondary)]">Unavailable until your figures load. Use Try again at the top of the page.</p> : !budgets.data || !metrics ? <Skeleton className="h-28 w-full" />
            : limitUsed !== null ? (
              <>
                <UsageGauge percent={limitUsed} label="Spend limit" />
                <p className="mt-3 text-center text-xs tabular-nums text-[var(--ink-secondary)]">
                  {remainingLimit !== null && remainingLimit < 0 ? <span className="font-semibold text-[var(--accent-danger)]">Over by {money(-remainingLimit)}</span> : `${money(remainingLimit ?? 0)} left`}
                </p>
              </>
            ) : <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">{budget ? `Your limit is in ${budget.currency}, while these figures are in ${currency}.` : 'Set a monthly limit to see how much is left.'}</p>}
        </Card>
      </section>

      <section aria-label="Revenue and costs" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <SectionHead title="Last six months" />
          {charts.error && !charts.data
            ? <p className="py-10 text-center text-xs text-[var(--ink-secondary)]">Your chart could not be loaded. <button type="button" onClick={() => void charts.refresh()} className="font-semibold text-[var(--brand-blue)] underline cursor-pointer">Try again</button></p>
            : <MonthBars data={charts.data} currency={currency} incomeLabel="Revenue" expenseLabel="Expenses" />}
        </Card>
        <Card className="lg:col-span-5">
          <SectionHead title="Biggest costs" note={periodLabel} />
          {charts.error && !charts.data
            ? <p className="py-10 text-center text-xs text-[var(--ink-secondary)]">These figures could not be loaded. <button type="button" onClick={() => void charts.refresh()} className="font-semibold text-[var(--brand-blue)] underline cursor-pointer">Try again</button></p>
            : <CategoryBars data={charts.data} currency={currency} />}
        </Card>
      </section>

      <section aria-label="Clients, rules and activity" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <SectionHead title="Recent transactions" href={hasTransactions ? '/transactions' : undefined} action="See all" />
          {ledger.isLoading ? <ListSkeleton rows={3} label="Loading transactions" />
            : ledger.error && !ledger.data ? <p className="py-6 text-center text-xs text-[var(--ink-secondary)]">Transactions are unavailable right now. <button type="button" onClick={() => void ledger.refresh()} className="font-semibold text-[var(--brand-blue)] underline cursor-pointer">Try again</button></p>
              : !hasTransactions ? <EmptyState icon={<Page className="h-6 w-6" />} title="No business transactions yet" description="These stay separate from your personal ledger." actionLabel="Add a transaction" onAction={openAddTransaction} />
              : <ul className="divide-y divide-[var(--border-subtle)]">{transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}</ul>}
        </Card>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <RulesPanel memory={memory.data} isLoading={memory.isLoading} business />
          <Card>
            <SectionHead title="Clients and vendors" note={periodLabel} />
            {figuresFailed ? <p className="text-xs text-[var(--ink-secondary)]">Unavailable until your figures load. Use Try again at the top of the page.</p> : !overview ? <Skeleton className="h-16 w-full" />
              : overview.counterparties.length === 0 ? <p className="text-xs text-[var(--ink-secondary)]">Add a client or vendor to a transaction to see them here.</p>
                : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {overview.counterparties.map((entry) => (
                      <li key={entry.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="truncate font-medium text-[var(--ink-primary)]">{entry.name}</span>
                        <span className="shrink-0 text-right text-xs tabular-nums">
                          {entry.receivedMinor > 0 && <span className="block font-semibold text-[var(--accent-positive)]">+{money(entry.receivedMinor)}</span>}
                          {entry.paidMinor > 0 && <span className="block font-semibold text-[var(--ink-primary)]">−{money(entry.paidMinor)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
          </Card>
          <Card variant="accent" className="flex items-center justify-between gap-4">
            <p className="min-w-0 text-sm font-bold text-[var(--ink-primary)]">Weighing a hire or a big cost?</p>
            <Link href="/assistant"><Button variant="primary" size="sm" leftIcon={<Sparks className="h-3.5 w-3.5" />} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>Ask the Assistant</Button></Link>
          </Card>
        </div>
      </section>

      <Modal isOpen={isCashOpen} onClose={() => setIsCashOpen(false)} title="Cash you hold" description="Used only to work out runway. Leave it empty to clear it.">
        <form onSubmit={saveCash} className="space-y-4">
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Input label="Amount" type="number" inputMode="decimal" min="0" step="0.01" autoFocus placeholder="0.00" value={cashInput} onChange={(event) => setCashInput(event.target.value)} />
            <div className="space-y-1.5 text-left">
              <label htmlFor="cash-currency" className="block text-xs font-semibold text-[var(--ink-primary)]">Currency</label>
              <select id="cash-currency" value={cashCurrency} onChange={(event) => setCashCurrency(event.target.value as Currency)} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-field)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink-primary)]">
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">Your overview shows figures in this currency.</p>
          {cashError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{cashError}</p>}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsCashOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSavingCash}>Save cash figure</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
