'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Check, Pencil, Receipt, RotateCcw, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useLedger } from '@/components/layout/ledger-provider';
import { currentPeriod, financeApi, formatMoney, type ApiBudget, type ApiTransaction } from '@/lib/finance-api';
import { formatLedgerDate, formatPeriod } from '@/lib/dates';
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

interface MemorySummary { consentEnabled: boolean; total: number; storedOnWalrus: number }

export default function BusinessOverviewPage() {
  const { toast } = useToast();
  const { version, openAddTransaction } = useLedger();
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [budget, setBudget] = React.useState<ApiBudget | null>(null);
  const [transactions, setTransactions] = React.useState<ApiTransaction[]>([]);
  const [memory, setMemory] = React.useState<MemorySummary | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isCashOpen, setIsCashOpen] = React.useState(false);
  const [cashInput, setCashInput] = React.useState('');
  const [cashCurrency, setCashCurrency] = React.useState<Currency>('INR');
  const [cashError, setCashError] = React.useState<string | null>(null);
  const [isSavingCash, setIsSavingCash] = React.useState(false);
  const period = currentPeriod();
  const periodLabel = formatPeriod(period);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const [figures, ledger, budgets, memorySummary] = await Promise.all([
        financeApi<Overview>(`/api/business?period=${period}`),
        financeApi<{ transactions: ApiTransaction[] }>('/api/transactions?limit=5'),
        financeApi<{ budget: ApiBudget | null }>(`/api/budgets?period=${period}`),
        // Memory status is extra: the figures still show if it fails.
        financeApi<MemorySummary>('/api/memory').catch(() => null),
      ]);
      setOverview(figures);
      setTransactions(ledger.transactions);
      setBudget(budgets.budget);
      setMemory(memorySummary);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Your business figures could not be loaded.');
    }
  }, [period]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, version]);

  const openCash = () => {
    setCashError(null);
    setCashInput(overview?.cashMinor === null || overview?.cashMinor === undefined ? '' : (overview.cashMinor / 100).toFixed(2));
    setCashCurrency(overview?.currency ?? 'INR');
    setIsCashOpen(true);
  };

  const saveCash = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingCash) return;
    const trimmed = cashInput.trim();
    const cashMinor = trimmed === '' ? null : trimmed === '0' ? 0 : parseMajorUnitsToMinor(trimmed);
    if (trimmed !== '' && cashMinor === null) {
      setCashError('Enter an amount with up to two decimal places, or leave it empty.');
      return;
    }
    setIsSavingCash(true);
    setCashError(null);
    try {
      await financeApi('/api/business', { method: 'PUT', body: JSON.stringify({ cashMinor, currency: cashCurrency }) });
      setIsCashOpen(false);
      toast({ type: 'success', title: 'Cash figure saved', description: 'Runway is worked out from it.' });
      void load();
    } catch (error) {
      setCashError(error instanceof Error ? error.message : 'The cash figure could not be saved. Please retry.');
    } finally {
      setIsSavingCash(false);
    }
  };

  const currency = overview?.currency ?? 'INR';
  const money = (minor: number) => (overview ? formatMoney(minor, currency) : loadError ? '—' : '…');
  const metrics = overview?.metrics;
  const hasTransactions = transactions.length > 0;
  const hasMemory = (memory?.total ?? 0) > 0;
  const steps = [
    { title: 'Record', text: 'Add revenue and costs, or import them from your Sui wallet. Every figure here comes from these entries.', done: hasTransactions, href: null, action: 'Add a transaction', icon: Receipt },
    { title: 'Remember', text: 'Save how you run the business, like “keep 6 months of runway”. It is stored on Walrus, apart from your personal memories.', done: hasMemory, href: '/memory', action: 'Save a business memory', icon: Brain },
    { title: 'Ask', text: 'Ask “can we afford this hire?”. The sums are exact, and your rules guide the advice.', done: false, href: '/assistant', action: 'Ask the Assistant', icon: Sparkles },
    { title: 'Verify', text: 'Check on Sui Mainnet that your business memories are really stored.', done: false, href: '/verification', action: 'See the proof', icon: ShieldCheck },
  ];

  const isLoading = !overview && !loadError;
  const burnNote = !metrics
    ? (isLoading ? 'Loading…' : 'Not available right now.')
    : metrics.burnMinor === null
    ? 'No records yet to base this on.'
    : metrics.notBurning
      ? `Revenue covers costs, averaged over ${metrics.burnMonths} ${metrics.burnMonths === 1 ? 'month' : 'months'}.`
      : `Costs minus revenue, averaged over ${metrics.burnMonths} ${metrics.burnMonths === 1 ? 'month' : 'months'} with records.`;

  const remainingLimit = budget && metrics && budget.currency === currency ? budget.amountMinor - metrics.expensesMinor : null;

  return (
    <div className="space-y-6">
      {loadError && (
        <Card role="alert" className="flex flex-wrap items-center justify-between gap-4 border-[var(--accent-warning-border)]">
          <div>
            <h3 className="font-bold text-[var(--ink-primary)]">Could not load your business figures</h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>Try again</Button>
        </Card>
      )}

      {overview && !(hasTransactions && hasMemory) && (
        <section aria-labelledby="business-guide-title">
          <h2 id="business-guide-title" className="mb-3 text-sm font-bold text-[var(--ink-primary)]">How Memeora works for a business</h2>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${step.done ? 'bg-[var(--accent-positive-bg)] text-[var(--accent-positive)]' : 'bg-[var(--surface-sky-solid)] text-[var(--brand-deep-current)]'}`}>
                        {step.done ? <Check aria-label="Done" className="h-4 w-4" /> : <Icon aria-hidden className="h-4 w-4" />}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--ink-primary)]">{index + 1}. {step.title}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-secondary)]">{step.text}</p>
                  </div>
                  {!step.done && (step.href
                    ? <Link href={step.href} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">{step.action}<ArrowRight className="h-3.5 w-3.5" /></Link>
                    : <button type="button" onClick={openAddTransaction} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline cursor-pointer">{step.action}<ArrowRight className="h-3.5 w-3.5" /></button>)}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section aria-label={`${periodLabel} business totals`} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="elevated" className="border-t-4 border-t-[var(--brand-deep-current)]">
          <p className="text-xs font-bold text-[var(--ink-muted)]">Profit in {periodLabel}</p>
          <p className={`my-2 text-3xl font-black tracking-tight tabular-nums sm:text-4xl ${metrics && metrics.profitMinor < 0 ? 'text-[var(--accent-danger)]' : 'text-[var(--ink-primary)]'}`}>{money(metrics?.profitMinor ?? 0)}</p>
          <p className="text-xs text-[var(--ink-muted)]">Revenue minus expenses you recorded. Not your accounting profit.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-[var(--ink-muted)]">Revenue</p>
          <p className="my-2 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{money(metrics?.revenueMinor ?? 0)}</p>
          <p className="text-xs text-[var(--ink-muted)]">Everything recorded as income in {periodLabel}.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-[var(--ink-muted)]">Expenses</p>
          <p className="my-2 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{money(metrics?.expensesMinor ?? 0)}</p>
          <p className="text-xs text-[var(--ink-muted)]">
            {!overview ? ' ' : remainingLimit === null ? <>No spend limit set. <Link href="/budgets" className="font-bold text-[var(--brand-deep-current)] hover:underline">Set one</Link></> : remainingLimit >= 0 ? `${money(remainingLimit)} left of your spend limit.` : `${money(Math.abs(remainingLimit))} over your spend limit.`}
          </p>
        </Card>
      </section>

      {overview && overview.otherCurrencies.length > 0 && (
        <p className="text-xs text-[var(--ink-muted)]">
          Figures show {currency} only. Also recorded this month: {overview.otherCurrencies.map((entry) => `${formatMoney(entry.incomeMinor, entry.currency)} in, ${formatMoney(entry.expenseMinor, entry.currency)} out`).join('; ')}.
        </p>
      )}

      <section aria-label="Runway" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-bold text-[var(--ink-muted)]">Monthly burn</p>
          <p className="my-2 text-2xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{metrics?.burnMinor === null || !metrics ? '—' : money(metrics.burnMinor)}</p>
          <p className="text-xs text-[var(--ink-muted)]">{burnNote}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-[var(--ink-muted)]">Cash you hold</p>
            <button type="button" onClick={openCash} aria-label="Edit cash figure" className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--surface-sky-tint)] hover:text-[var(--ink-primary)] cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
          <p className="my-2 text-2xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{overview?.cashMinor === null || !overview ? '—' : money(overview.cashMinor)}</p>
          <p className="text-xs text-[var(--ink-muted)]">A figure you enter. Memeora does not read your bank or wallet balance.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-[var(--ink-muted)]">Runway</p>
          <p className="my-2 text-2xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{metrics?.runwayTenths === null || !metrics ? '—' : formatRunway(metrics.runwayTenths)}</p>
          <p className="text-xs text-[var(--ink-muted)]">
            {!overview ? ' ' : metrics?.notBurning ? 'Not burning cash on these records.' : overview.cashMinor === null ? <button type="button" onClick={openCash} className="font-bold text-[var(--brand-deep-current)] hover:underline cursor-pointer">Enter your cash to see this</button> : metrics?.burnMinor === null ? 'Record some transactions to see this.' : 'Cash divided by monthly burn, rounded down.'}
          </p>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="text-base font-bold text-[var(--ink-primary)]">Where the money went</h3>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">{periodLabel}, largest first.</p>
          {!overview || overview.topCategories.length === 0 ? (
            <p className="py-4 text-sm text-[var(--ink-muted)]">{overview ? 'No expenses recorded this month.' : isLoading ? 'Loading…' : 'Not available right now.'}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {overview.topCategories.map((entry) => (
                <li key={entry.category} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate font-semibold text-[var(--ink-primary)]">{entry.category}</span>
                  <span className="shrink-0 font-bold tabular-nums text-[var(--ink-primary)]">{money(entry.amountMinor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="text-base font-bold text-[var(--ink-primary)]">Clients and vendors</h3>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">{periodLabel}, from the client or vendor you add to a transaction.</p>
          {!overview || overview.counterparties.length === 0 ? (
            <p className="py-4 text-sm text-[var(--ink-muted)]">{overview ? 'Add a client or vendor to a transaction to see them here.' : isLoading ? 'Loading…' : 'Not available right now.'}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {overview.counterparties.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate font-semibold text-[var(--ink-primary)]">{entry.name}</span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-[var(--ink-secondary)]">
                    {entry.receivedMinor > 0 && <span className="block font-bold text-[var(--accent-positive)]">+{money(entry.receivedMinor)}</span>}
                    {entry.paidMinor > 0 && <span className="block font-bold">−{money(entry.paidMinor)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[var(--ink-primary)]">Recent transactions</h3>
          <Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">See all<ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {isLoading ? (
          <p role="status" className="py-6 text-center text-sm text-[var(--ink-muted)]">Loading transactions…</p>
        ) : transactions.length === 0 ? (
          <EmptyState icon={<Wallet className="w-6 h-6" />} title="No business transactions yet" description="These stay separate from your personal ledger." actionLabel="Add your first transaction" onAction={openAddTransaction} />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--ink-primary)]">{tx.description || tx.counterparty || tx.category}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                    <span>{tx.category} · {formatLedgerDate(tx.occurredAt)}</span>
                    {tx.onChain?.verified && <Badge variant="success" className="text-[10px] font-semibold">Verified on Sui</Badge>}
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-extrabold tabular-nums ${tx.type === 'expense' ? 'text-[var(--ink-primary)]' : 'text-[var(--accent-positive)]'}`}>
                  {tx.type === 'expense' ? '−' : '+'}{formatMoney(tx.amountMinor, tx.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={isCashOpen} onClose={() => setIsCashOpen(false)} title="Cash you hold" description="Used only to work out runway. Leave it empty to clear it.">
        <form onSubmit={saveCash} className="space-y-4">
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Input label="Amount" type="number" inputMode="decimal" min="0" step="0.01" autoFocus placeholder="0.00" value={cashInput} onChange={(event) => setCashInput(event.target.value)} />
            <div className="space-y-1.5 text-left">
              <label htmlFor="cash-currency" className="block text-xs font-bold text-[var(--ink-primary)]">Currency</label>
              <select id="cash-currency" value={cashCurrency} onChange={(event) => setCashCurrency(event.target.value as Currency)} className="h-11 w-full rounded-xl border border-[var(--brand-sky-blue)]/70 bg-[var(--surface-card)] px-3.5 text-sm font-medium text-[var(--ink-primary)]">
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
              </select>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">Your overview shows figures in this currency.</p>
          {cashError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{cashError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsCashOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="pill" isLoading={isSavingCash}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
