'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Page, Sparks, Plus } from 'iconoir-react';
import { AnimatePresence } from 'framer-motion';
import { Expand } from '@/components/ui/expand';
import { RollingAmount } from '@/components/ui/rolling-amount';
import { useAppSession } from '@/components/auth/app-session-guard';
import { useLedger } from '@/components/layout/ledger-provider';
import { CategoryBars, GuideStrip, MonthBars, RulesPanel, SectionHead, UsageGauge, type MemorySummary, type OverviewPayload } from '@/components/overview/overview-parts';
import { TxRow } from '@/components/transactions/tx-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress';
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton';
import { FreshnessNote, LoadErrorPanel } from '@/components/ui/status-panels';
import { currentPeriod, formatMoney, type ApiBudget, type ApiPeriodTotals, type ApiSavingsGoal, type ApiTransaction } from '@/lib/finance-api';
import { formatPeriod } from '@/lib/dates';
import { useFinanceResource } from '@/lib/use-finance-resource';

interface BudgetPayload { period: string; preferredCurrency?: ApiBudget['currency']; budget: ApiBudget | null; savingsGoals: ApiSavingsGoal[]; periodTotals: ApiPeriodTotals[] }

export default function PersonalOverviewPage() {
  const { preferredCurrency } = useAppSession();
  const { version, hiddenIds, openAddTransaction } = useLedger();
  const period = currentPeriod();
  const periodLabel = formatPeriod(period);

  const budgets = useFinanceResource<BudgetPayload>(`/api/budgets?period=${period}`, version);
  const ledger = useFinanceResource<{ transactions: ApiTransaction[] }>('/api/transactions?limit=5', version);
  // Charts and memory are extra: the figures still show if either fails.
  const overview = useFinanceResource<OverviewPayload>(`/api/overview?period=${period}`, version);
  const memory = useFinanceResource<MemorySummary>('/api/memory', version);

  const budget = budgets.data?.budget ?? null;
  const periodTotals = budgets.data?.periodTotals ?? [];
  const currency = budget?.currency ?? periodTotals[0]?.currency ?? preferredCurrency;
  const totals = periodTotals.find((entry) => entry.currency === currency);
  const expenseMinor = totals?.expenseMinor ?? 0;
  const netMinor = totals?.netMinor ?? 0;
  const remainingMinor = budget ? budget.amountMinor - expenseMinor : null;
  const utilization = budget ? Math.round((expenseMinor / budget.amountMinor) * 100) : 0;
  const goal = budgets.data?.savingsGoals.find((candidate) => candidate.status === 'active') ?? null;
  const otherCurrencies = periodTotals.filter((entry) => entry.currency !== currency);
  const transactions = (ledger.data?.transactions ?? []).filter((tx) => !hiddenIds.has(tx.id));

  const hasData = Boolean(budgets.data);
  const figuresFailed = Boolean(budgets.error) && !hasData;
  const hasTransactions = transactions.length > 0;
  const hasMemory = (memory.data?.total ?? 0) > 0;
  const showGuide = hasData && Boolean(ledger.data) && !(hasTransactions && hasMemory);

  return (
    <div className="space-y-4">
      {budgets.error && !hasData && <LoadErrorPanel title="Could not load your overview" message={budgets.error} offline={budgets.isOffline} onRetry={() => budgets.refresh()} />}

      {showGuide && (
        <GuideStrip
          title="Get started"
          steps={[
            { title: 'Transaction recorded', action: 'Add your first transaction', done: hasTransactions, onClick: openAddTransaction },
            { title: 'Rule saved', action: 'Save a rule, like “keep a $300 buffer”', done: hasMemory, href: '/memory' },
            { title: 'Ask the Assistant', action: 'Ask “can I afford this?”', done: false, href: '/assistant' },
            { title: 'See the proof', action: 'Check your memories on Sui', done: false, href: '/verification' },
          ]}
        />
      )}

      <div className="flex min-h-5 flex-wrap items-center justify-between gap-3">
        <FreshnessNote updatedAt={budgets.updatedAt} isRefreshing={budgets.isRefreshing} refreshFailed={Boolean(budgets.error)} onRetry={() => void budgets.refresh()} />
        <Button variant="primary" size="sm" onClick={openAddTransaction} leftIcon={<Plus className="h-4 w-4" />}>Add transaction</Button>
        {hasData && otherCurrencies.length > 0 && (
          <p className="text-xs text-[var(--ink-muted)]">Totals show {currency} only. Also recorded: {otherCurrencies.map((entry) => `${formatMoney(entry.expenseMinor, entry.currency)} spent`).join(', ')}. Memeora does not convert currencies.</p>
        )}
      </div>

      <section aria-label={`${periodLabel} totals`} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card variant="blue" className="flex flex-col justify-between gap-6 lg:col-span-5">
          <div>
            <p className="text-xs font-medium text-[var(--ink-on-blue-muted)]">Left over in {periodLabel}</p>
            {hasData
              ? <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{netMinor < 0 ? '−' : ''}<RollingAmount key={currency} minor={Math.abs(netMinor)} format={(minor) => formatMoney(minor, currency)} /></p>
              : figuresFailed ? <p className="mt-2 text-2xl font-bold">Unavailable</p> : <Skeleton className="mt-2 h-12 w-48 bg-white/20" />}
            <p className="mt-1.5 text-xs text-[var(--ink-on-blue-muted)]">Income minus spending you recorded. Not your bank balance.</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
            <div>
              <dt className="text-xs text-[var(--ink-on-blue-muted)]">Income</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{hasData ? formatMoney(totals?.incomeMinor ?? 0, currency) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--ink-on-blue-muted)]">Spent</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{hasData ? formatMoney(expenseMinor, currency) : '—'}</dd>
            </div>
          </dl>
          {hasData && <Expand label="How this is worked out" className="on-blue -mt-3 text-xs" summaryClassName="text-[var(--ink-inverse)]!"><p className="pt-2 tabular-nums text-[var(--ink-on-blue-muted)]">income {formatMoney(totals?.incomeMinor ?? 0, currency)} minus spending {formatMoney(expenseMinor, currency)} is {`${netMinor < 0 ? '−' : ''}${formatMoney(Math.abs(netMinor), currency)}`}.</p></Expand>}
        </Card>

        <Card className="flex flex-col lg:col-span-3">
          <SectionHead title="Monthly budget" href="/budgets" action={budget || figuresFailed ? 'Manage' : 'Set budget'} />
          {figuresFailed ? <p className="text-xs text-[var(--ink-secondary)]">Unavailable until your figures load. Use Try again at the top of the page.</p> : !hasData ? <Skeleton className="h-28 w-full" />
            : budget ? (
              <>
                <UsageGauge percent={utilization} label="Monthly budget" />
                <p className="mt-3 text-center text-xs tabular-nums text-[var(--ink-secondary)]">
                  {remainingMinor !== null && remainingMinor < 0
                    ? <span className="font-semibold text-[var(--accent-danger)]">Over by {formatMoney(-remainingMinor, currency)}</span>
                    : <>{formatMoney(remainingMinor ?? 0, currency)} left of {formatMoney(budget.amountMinor, currency)}</>}
                </p>
              </>
            ) : <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">Set a limit, and Memeora can tell you what a purchase would leave.</p>}
        </Card>

        <div className="lg:col-span-4">
          <RulesPanel memory={memory.data} isLoading={memory.isLoading} />
        </div>
      </section>

      <section aria-label="Spending" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <SectionHead title="Last six months" />
          {overview.error && !overview.data
            ? <p className="py-10 text-center text-xs text-[var(--ink-secondary)]">Your chart could not be loaded. <button type="button" onClick={() => void overview.refresh()} className="font-semibold text-[var(--brand-blue)] underline cursor-pointer">Try again</button></p>
            : <MonthBars data={overview.data} currency={currency} />}
        </Card>
        <Card className="lg:col-span-5">
          <SectionHead title="Where the money went" note={periodLabel} />
          {overview.error && !overview.data
            ? <p className="py-10 text-center text-xs text-[var(--ink-secondary)]">These figures could not be loaded. <button type="button" onClick={() => void overview.refresh()} className="font-semibold text-[var(--brand-blue)] underline cursor-pointer">Try again</button></p>
            : <CategoryBars data={overview.data} currency={currency} />}
        </Card>
      </section>

      <section aria-label="Recent activity and goal" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <SectionHead title="Recent transactions" href={hasTransactions ? '/transactions' : undefined} action="See all" />
          {ledger.isLoading ? <ListSkeleton rows={3} label="Loading transactions" />
            : ledger.error && !ledger.data ? <p className="py-6 text-center text-xs text-[var(--ink-secondary)]">Transactions are unavailable right now. <button type="button" onClick={() => void ledger.refresh()} className="font-semibold text-[var(--brand-blue)] underline cursor-pointer">Try again</button></p>
              : !hasTransactions ? <EmptyState icon={<Page className="h-6 w-6" />} title="No transactions yet" description="Add your first income or expense to see your month take shape." actionLabel="Add a transaction" onAction={openAddTransaction} />
                : <ul className="divide-y divide-[var(--border-subtle)]"><AnimatePresence initial={false}>{transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}</AnimatePresence></ul>}
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card>
            <SectionHead title="Savings goal" href="/budgets" action={goal ? 'View goals' : 'Add a goal'} />
            {figuresFailed ? <p className="text-xs text-[var(--ink-secondary)]">Unavailable until your figures load. Use Try again at the top of the page.</p> : !hasData ? <Skeleton className="h-12 w-full" />
              : goal ? (
                <>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">{goal.name}</p>
                    <p className="text-sm font-semibold tabular-nums text-[var(--brand-blue)]">{goal.progressPercent}%</p>
                  </div>
                  <ProgressBar percent={goal.progressPercent} label={`${goal.name} progress`} />
                  <p className="mt-2 text-xs tabular-nums text-[var(--ink-secondary)]">{formatMoney(goal.currentAmountMinor, goal.currency)} of {formatMoney(goal.targetAmountMinor, goal.currency)}</p>
                </>
              ) : <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">Name what you are saving for. The Assistant weighs dated goals when you ask about a purchase.</p>}
          </Card>
          <Card variant="accent" className="flex flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--ink-primary)]">Thinking of buying something?</p>
              <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">Exact sums, guided by your rules.</p>
            </div>
            <Link href="/assistant"><Button variant="primary" size="sm" leftIcon={<Sparks className="h-3.5 w-3.5" />} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>Ask the Assistant</Button></Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
