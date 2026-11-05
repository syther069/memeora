'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppSession } from '@/components/auth/app-session-guard';
import { useLedger } from '@/components/layout/ledger-provider';
import { financeApi, FinanceApiError, formatMoney, currentPeriod, type ApiBudget, type ApiPeriodTotals, type ApiSavingsGoal, type ApiTransaction } from '@/lib/finance-api';
import { formatLedgerDate, formatPeriod } from '@/lib/dates';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Brain, Check, PiggyBank, Plus, Receipt, RotateCcw, ShieldCheck, Sparkles, Target } from 'lucide-react';

type LoadState = 'loading' | 'ready' | 'offline' | 'error';
interface BudgetPayload { period: string; preferredCurrency?: ApiBudget['currency']; budget: ApiBudget | null; savingsGoals: ApiSavingsGoal[]; periodTotals: ApiPeriodTotals[] }
interface MemorySummary { consentEnabled: boolean; total: number; storedOnWalrus: number }

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const width = Math.min(Math.max(percent, 0), 100);
  return (
    <div role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="w-full h-3 rounded-full bg-[var(--surface-cloud-solid)] border border-[var(--brand-sky-blue)]/60 overflow-hidden p-0.5">
      <div className={`h-full rounded-full transition-all ${percent > 100 ? 'bg-[var(--accent-danger)]' : 'bg-[var(--brand-deep-current)]'}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const { preferredCurrency } = useAppSession();
  const { version, openAddTransaction } = useLedger();
  const [transactions, setTransactions] = React.useState<ApiTransaction[]>([]);
  const [budgetData, setBudgetData] = React.useState<BudgetPayload | null>(null);
  const [memory, setMemory] = React.useState<MemorySummary | null>(null);
  const [loadState, setLoadState] = React.useState<LoadState>('loading');
  const [loadError, setLoadError] = React.useState('');
  const period = currentPeriod();
  const periodLabel = formatPeriod(period);

  const loadDashboard = React.useCallback(async () => {
    setLoadError('');
    try {
      const [ledger, budgets, memorySummary] = await Promise.all([
        financeApi<{ transactions: ApiTransaction[] }>('/api/transactions?limit=5'),
        financeApi<BudgetPayload>(`/api/budgets?period=${period}`),
        // Memory status is extra: finance figures still show if it fails.
        financeApi<MemorySummary>('/api/memory').catch(() => null),
      ]);
      setTransactions(ledger.transactions);
      setBudgetData(budgets);
      setMemory(memorySummary);
      setLoadState('ready');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your overview.');
      setLoadState(error instanceof FinanceApiError && error.offline ? 'offline' : 'error');
    }
  }, [period]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, version]);

  const ready = loadState === 'ready';
  const budget = budgetData?.budget ?? null;
  const periodTotals = budgetData?.periodTotals ?? [];
  const currency = budget?.currency ?? periodTotals[0]?.currency ?? preferredCurrency;
  const totals = periodTotals.find((entry) => entry.currency === currency);
  const incomeMinor = totals?.incomeMinor ?? 0;
  const expenseMinor = totals?.expenseMinor ?? 0;
  const netMinor = totals?.netMinor ?? 0;
  const remainingMinor = budget ? budget.amountMinor - expenseMinor : null;
  const utilization = budget ? Math.round((expenseMinor / budget.amountMinor) * 100) : 0;
  const goal = budgetData?.savingsGoals.find((candidate) => candidate.status === 'active') ?? null;
  const otherCurrencies = periodTotals.filter((entry) => entry.currency !== currency);
  const money = (minor: number) => (ready ? formatMoney(minor, currency) : loadState === 'loading' ? '…' : '—');

  const hasTransactions = transactions.length > 0;
  const hasMemory = (memory?.total ?? 0) > 0;
  const steps = [
    { title: 'Record', text: 'Add your income and spending. Budgets and answers use these exact figures.', done: hasTransactions, href: null, action: 'Add a transaction', icon: Receipt },
    { title: 'Remember', text: `Save a rule, like “keep a ${preferredCurrency === 'USD' ? '$' : '₹'}3,000 buffer”. It is stored for you on Walrus.`, done: hasMemory, href: '/memory', action: 'Save a memory', icon: Brain },
    { title: 'Ask', text: 'Ask “can I afford this?”. The sums are exact, and your rules guide the advice.', done: false, href: '/assistant', action: 'Ask the Assistant', icon: Sparkles },
    { title: 'Verify', text: 'Check on Sui Mainnet that your memories are really stored.', done: false, href: '/verification', action: 'See the proof', icon: ShieldCheck },
  ];
  const showGuide = ready && !(hasTransactions && hasMemory);

  return (
    <div className="space-y-6">
      {(loadState === 'offline' || loadState === 'error') && (
        <Card role="alert" className="flex flex-wrap items-center justify-between gap-4 border-[var(--accent-warning-border)]">
          <div>
            <h3 className="font-bold text-[var(--ink-primary)]">{loadState === 'offline' ? 'You seem to be offline' : 'Could not load your overview'}</h3>
            <p className="text-sm text-[var(--ink-muted)] mt-1">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>Try again</Button>
        </Card>
      )}

      {showGuide && (
        <section aria-labelledby="guide-title">
          <h2 id="guide-title" className="mb-3 text-sm font-bold text-[var(--ink-primary)]">How Memeora works</h2>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${step.done ? 'bg-[var(--brand-deep-current)] text-white' : 'bg-[var(--surface-sky-solid)] text-[var(--brand-deep-current)]'}`}>
                        {step.done ? <Check aria-label="Done" className="h-4 w-4" /> : <Icon aria-hidden className="h-4 w-4" />}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--ink-primary)]">{index + 1}. {step.title}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-secondary)]">{step.text}</p>
                  </div>
                  {!step.done && (step.href
                    ? <Link href={step.href} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">{step.action}<ArrowRight className="h-3.5 w-3.5" /></Link>
                    : <button type="button" onClick={openAddTransaction} className="inline-flex items-center gap-1 self-start text-xs font-bold text-[var(--brand-deep-current)] hover:underline cursor-pointer">{step.action}<ArrowRight className="h-3.5 w-3.5" /></button>)}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section aria-label={`${periodLabel} totals`} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" className="border-t-4 border-t-[var(--brand-deep-current)]">
          <p className="text-xs font-bold text-[var(--ink-muted)]">Left over in {periodLabel}</p>
          <p className={`my-2 text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${netMinor < 0 ? 'text-[var(--accent-danger)]' : 'text-[var(--brand-deep-current)]'}`}>{netMinor < 0 && ready ? '−' : ''}{money(Math.abs(netMinor))}</p>
          <p className="text-xs text-[var(--ink-muted)]">Income minus spending you recorded. Not your bank balance.</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-[var(--ink-muted)]">Income</p>
          <p className="my-2 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{money(incomeMinor)}</p>
          <p className="text-xs text-[var(--ink-muted)]">{ready ? `${totals?.transactionCount ?? 0} ${totals?.transactionCount === 1 ? 'entry' : 'entries'} recorded this month` : ' '}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-[var(--ink-muted)]">Spent</p>
          <p className="my-2 text-3xl font-extrabold tracking-tight tabular-nums text-[var(--ink-primary)]">{money(expenseMinor)}</p>
          <p className="text-xs text-[var(--ink-muted)]">{!ready ? ' ' : remainingMinor === null ? 'No budget set for this month' : remainingMinor < 0 ? `Over budget by ${formatMoney(-remainingMinor, currency)}` : `${formatMoney(remainingMinor, currency)} left in budget`}</p>
        </Card>
      </section>
      {ready && otherCurrencies.length > 0 && (
        <p className="text-xs text-[var(--ink-muted)]">
          Totals show {currency} only. Also recorded this month: {otherCurrencies.map((entry) => `${formatMoney(entry.expenseMinor, entry.currency)} spent in ${entry.currency}`).join(', ')}. Memeora does not convert currencies.
        </p>
      )}

      <section aria-label="Budget, goal and memory" className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ink-primary)]"><Target aria-hidden className="h-4 w-4 text-[var(--brand-deep-current)]" />Monthly budget</h3>
              {budget && <Badge variant={utilization > 100 ? 'danger' : 'sky'} className="text-[11px] font-bold tabular-nums">{utilization}% used</Badge>}
            </div>
            {budget ? (
              <>
                <ProgressBar percent={utilization} label="Monthly budget used" />
                <p className="text-xs text-[var(--ink-secondary)] tabular-nums">{formatMoney(expenseMinor, budget.currency)} of {formatMoney(budget.amountMinor, budget.currency)}</p>
              </>
            ) : !ready ? <p className="text-xs text-[var(--ink-muted)]">Loading…</p> : <p className="text-xs leading-5 text-[var(--ink-secondary)]">Set a spending limit so Memeora can tell you what a purchase would leave.</p>}
          </div>
          <Link href="/budgets" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">{budget ? 'Manage budget' : 'Set a budget'}<ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ink-primary)]"><PiggyBank aria-hidden className="h-4 w-4 text-[var(--brand-deep-current)]" />Savings goal</h3>
              {goal && <Badge variant="sky" className="text-[11px] font-bold tabular-nums">{goal.progressPercent}%</Badge>}
            </div>
            {goal ? (
              <>
                <ProgressBar percent={goal.progressPercent} label={`${goal.name} progress`} />
                <p className="text-xs text-[var(--ink-secondary)] tabular-nums"><strong>{goal.name}</strong>: {formatMoney(goal.currentAmountMinor, goal.currency)} of {formatMoney(goal.targetAmountMinor, goal.currency)}</p>
              </>
            ) : !ready ? <p className="text-xs text-[var(--ink-muted)]">Loading…</p> : <p className="text-xs leading-5 text-[var(--ink-secondary)]">Name what you are saving for. The Assistant weighs dated goals when you ask about a purchase.</p>}
          </div>
          <Link href="/budgets" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">{goal ? 'View goals' : 'Add a goal'}<ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ink-primary)]"><Brain aria-hidden className="h-4 w-4 text-[var(--brand-deep-current)]" />Memory</h3>
            <p className="text-xs leading-5 text-[var(--ink-secondary)]">
              {!ready ? 'Loading…'
                : !memory ? 'Memory status is unavailable right now.'
                : !memory.consentEnabled ? 'Memory is off. Turn it on so Memeora can remember your rules between sessions.'
                  : memory.total === 0 ? 'Nothing saved yet. Save a rule and the Assistant will use it.'
                    : `${memory.storedOnWalrus} of ${memory.total} ${memory.total === 1 ? 'memory' : 'memories'} stored on Walrus. The Assistant uses them in its advice.`}
            </p>
          </div>
          <Link href="/memory" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">{memory?.consentEnabled === false ? 'Turn on memory' : 'Open Memory'}<ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>
      </section>

      <section aria-labelledby="recent-title">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 id="recent-title" className="text-sm font-bold text-[var(--ink-primary)]">Recent transactions</h3>
            {hasTransactions && <Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-deep-current)] hover:underline">See all<ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
          {loadState === 'loading' ? <p role="status" className="py-6 text-sm text-[var(--ink-muted)]">Loading…</p>
            : !ready ? <p className="py-6 text-sm text-[var(--ink-muted)]">Transactions are unavailable right now.</p>
              : !hasTransactions ? <EmptyState icon={<Receipt className="w-6 h-6" />} title="No transactions yet" description="Add your first income or expense to see your month take shape." actionLabel="Add a transaction" onAction={openAddTransaction} />
                : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {transactions.map((tx) => (
                      <li key={tx.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'expense' ? 'bg-[var(--surface-cloud-solid)] text-[var(--brand-deep-current)]' : 'bg-[var(--accent-positive-bg)] text-[var(--accent-positive)]'}`}>
                            {tx.type === 'expense' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--ink-primary)] truncate">{tx.description || tx.category}</p>
                            <p className="text-xs text-[var(--ink-muted)] mt-0.5">{tx.category} · {formatLedgerDate(tx.occurredAt)}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-extrabold tabular-nums whitespace-nowrap ${tx.type === 'income' ? 'text-[var(--accent-positive)]' : 'text-[var(--ink-primary)]'}`}>{tx.type === 'income' ? '+' : '−'}{formatMoney(tx.amountMinor, tx.currency)}</p>
                      </li>
                    ))}
                  </ul>
                )}
          {ready && hasTransactions && (
            <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" size="sm" onClick={openAddTransaction} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add another</Button>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
