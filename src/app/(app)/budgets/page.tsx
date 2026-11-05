'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { useAppSession } from '@/components/auth/app-session-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { financeApi, FinanceApiError, formatMoney, currentPeriod, type ApiBudget, type ApiPeriodTotals, type ApiSavingsGoal } from '@/lib/finance-api';
import { useLedger } from '@/components/layout/ledger-provider';
import { formatLedgerDate, formatPeriod, localDateInput } from '@/lib/dates';
import { parseMajorUnitsToMinor as parseMinorUnits } from '@/modules/finance/domain/money';
import { Calendar, Pause, Pencil, PiggyBank, Play, Plus, Target, Trash2, RotateCcw } from 'lucide-react';

type LoadState = 'loading' | 'ready' | 'offline' | 'error';
interface BudgetPayload { period: string; preferredCurrency?: 'INR' | 'USD'; budget: ApiBudget | null; savingsGoals: ApiSavingsGoal[]; periodTotals: ApiPeriodTotals[] }

export default function BudgetsPage() {
  const { mode } = useAppSession();
  const isBusiness = mode === 'business';
  const { toast } = useToast();
  const { version } = useLedger();
  const period = currentPeriod();
  const [contributeGoal, setContributeGoal] = React.useState<ApiSavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = React.useState('');
  const [contributeError, setContributeError] = React.useState('');
  const [deleteGoal, setDeleteGoal] = React.useState<ApiSavingsGoal | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = React.useState(false);
  const [deleteGoalError, setDeleteGoalError] = React.useState('');
  const [busyGoalId, setBusyGoalId] = React.useState<string | null>(null);
  const [budgetData, setBudgetData] = React.useState<BudgetPayload | null>(null);
  const [loadState, setLoadState] = React.useState<LoadState>('loading');
  const [loadError, setLoadError] = React.useState('');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false);
  const [budgetAmount, setBudgetAmount] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [isSavingBudget, setIsSavingBudget] = React.useState(false);
  const [contributingGoalId, setContributingGoalId] = React.useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<ApiSavingsGoal | null>(null);
  const [goalName, setGoalName] = React.useState('');
  const [goalAmount, setGoalAmount] = React.useState('');
  const [goalDate, setGoalDate] = React.useState('');
  const [isSavingGoal, setIsSavingGoal] = React.useState(false);
  const [goalError, setGoalError] = React.useState('');

  const loadData = React.useCallback(async () => {
    // Keep the figures on screen while a save reloads them.
    setLoadState((current) => (current === 'ready' ? current : 'loading'));
    setLoadError('');
    try {
      setBudgetData(await financeApi<BudgetPayload>(`/api/budgets?period=${period}`));
      setLoadState('ready');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load budget data.');
      setLoadState(error instanceof FinanceApiError && error.offline ? 'offline' : 'error');
    }
  }, [period]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData, version]);

  const budget = budgetData?.budget ?? null;
  const goals = budgetData?.savingsGoals ?? [];
  const budgetCurrency = budget?.currency ?? budgetData?.preferredCurrency ?? goals[0]?.currency ?? 'INR';
  const periodTotals = budgetData?.periodTotals.find((entry) => entry.currency === budgetCurrency);
  const currentSpentMinor = periodTotals?.expenseMinor ?? 0;
  const remainingMinor = budget ? budget.amountMinor - currentSpentMinor : null;
  const utilization = budget && budget.amountMinor > 0 ? Math.round((currentSpentMinor / budget.amountMinor) * 100) : 0;

  const handleSetBudget = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountMinor = parseMinorUnits(budgetAmount);
    if (amountMinor === null) { setFormError('Enter a positive amount with up to two decimal places.'); return; }
    setFormError('');
    setIsSavingBudget(true);
    try {
      await financeApi('/api/budgets', { method: 'POST', body: JSON.stringify({ action: 'set-budget', period, amountMinor, currency: budgetCurrency }) });
      setIsBudgetModalOpen(false);
      setBudgetAmount('');
      await loadData();
      toast({ type: 'success', title: isBusiness ? 'Spend limit saved' : 'Monthly budget saved', description: `Your ${period} budget is ${formatMoney(amountMinor, budgetCurrency)}.` });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this budget. Please retry.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleContribute = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contributeGoal) return;
    const amountMinor = parseMinorUnits(contributeAmount);
    if (amountMinor === null) { setContributeError('Enter a positive amount with up to two decimal places.'); return; }
    setContributeError('');
    setContributingGoalId(contributeGoal.id);
    try {
      await financeApi('/api/budgets', { method: 'POST', body: JSON.stringify({ action: 'contribute-goal', goalId: contributeGoal.id, amountMinor }) });
      toast({ type: 'success', title: 'Added to your goal', description: `${formatMoney(amountMinor, contributeGoal.currency)} added to “${contributeGoal.name}”.` });
      setContributeGoal(null);
      await loadData();
    } catch (error) {
      setContributeError(error instanceof Error ? error.message : 'This could not be saved. Please retry.');
    } finally {
      setContributingGoalId(null);
    }
  };

  const handleGoalStatus = async (goal: ApiSavingsGoal, status: 'active' | 'paused') => {
    setBusyGoalId(goal.id);
    try {
      await financeApi('/api/budgets', { method: 'POST', body: JSON.stringify({ action: 'set-goal-status', goalId: goal.id, status }) });
      toast({ type: 'info', title: status === 'paused' ? 'Goal paused' : 'Goal resumed', description: status === 'paused' ? 'The Assistant will not count it until you resume it.' : `“${goal.name}” is active again.` });
      await loadData();
    } catch (error) {
      toast({ type: 'warning', title: 'Goal not changed', description: error instanceof Error ? error.message : 'Please retry.' });
    } finally {
      setBusyGoalId(null);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteGoal) return;
    setIsDeletingGoal(true);
    setDeleteGoalError('');
    try {
      await financeApi('/api/budgets', { method: 'POST', body: JSON.stringify({ action: 'delete-goal', goalId: deleteGoal.id }) });
      toast({ type: 'info', title: 'Goal deleted', description: `“${deleteGoal.name}” was removed.` });
      setDeleteGoal(null);
      await loadData();
    } catch (error) {
      setDeleteGoalError(error instanceof Error ? error.message : 'This goal could not be deleted. Please retry.');
    } finally {
      setIsDeletingGoal(false);
    }
  };

  const openGoalForm = (goal?: ApiSavingsGoal) => {
    setEditingGoal(goal ?? null);
    setGoalName(goal?.name ?? '');
    setGoalAmount(goal ? (goal.targetAmountMinor / 100).toFixed(2) : '');
    setGoalDate(goal?.targetDate ?? '');
    setGoalError('');
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetAmountMinor = parseMinorUnits(goalAmount);
    if (!goalName.trim() || goalName.trim().length > 100) { setGoalError('Add a goal name of up to 100 characters.'); return; }
    if (targetAmountMinor === null) { setGoalError('Enter a positive target with up to two decimal places.'); return; }
    setGoalError('');
    setIsSavingGoal(true);
    try {
      await financeApi('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          action: editingGoal ? 'update-goal' : 'create-goal',
          ...(editingGoal ? { goalId: editingGoal.id } : {}),
          name: goalName.trim(), targetAmountMinor, targetDate: goalDate || null,
          currency: editingGoal?.currency ?? budgetCurrency,
        }),
      });
      setIsGoalModalOpen(false);
      await loadData();
      toast({
        type: 'success',
        title: editingGoal ? 'Goal updated' : 'Goal created',
        description: `“${goalName.trim()}” is saved in ${budgetCurrency}.`,
      });
    } catch (error) {
      setGoalError(error instanceof Error ? error.message : 'Unable to save this goal. Please retry.');
    } finally { setIsSavingGoal(false); }
  };

  const periodLabel = formatPeriod(period);

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      {(loadState === 'offline' || loadState === 'error') && <Card role="alert" className="flex flex-wrap items-center justify-between gap-4 border-[var(--accent-warning-border)]"><div><h3 className="font-bold text-[var(--ink-primary)]">{loadState === 'offline' ? 'Finance service offline' : 'Could not load budgets'}</h3><p className="text-sm text-[var(--ink-muted)] mt-1">{loadError}</p></div><Button variant="outline" size="sm" onClick={() => void loadData()} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>Try again</Button></Card>}

      <Card variant="elevated" className="p-7 sm:p-9 border-t-4 border-t-[var(--brand-deep-current)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div><div className="flex items-center gap-2 mb-1.5"><Badge variant="primary" className="text-[11px] font-bold px-3 py-0.5">{periodLabel}</Badge></div><h2 className="text-2xl sm:text-3xl font-black text-[var(--ink-primary)]">Monthly spending budget</h2><p className="text-xs text-[var(--ink-muted)] mt-1">Your limit for this month, compared with what you have recorded.</p></div>
          <div className="flex items-center gap-2">{budget && <Badge variant={utilization > 85 ? 'warning' : 'success'} className="text-xs font-bold px-3.5 py-1.5">{utilization}% used</Badge>}<Button variant="outline" size="sm" onClick={() => { setBudgetAmount(budget ? (budget.amountMinor / 100).toFixed(2) : ''); setFormError(''); setIsBudgetModalOpen(true); }}>{budget ? 'Change budget' : 'Set budget'}</Button></div>
        </div>

        {loadState === 'loading' ? <p role="status" className="py-8 text-sm text-[var(--ink-muted)]">Loading budget and ledger…</p> : loadState !== 'ready' ? <p className="py-8 text-sm text-[var(--ink-muted)]">Budget figures are unavailable until the finance service responds.</p> : !budget ? <EmptyState icon={<Target className="w-6 h-6" />} title="No monthly budget yet" description={`Set a spending limit for ${periodLabel}. Your saved expense entries will be compared with it.`} actionLabel="Set monthly budget" onAction={() => setIsBudgetModalOpen(true)} /> : (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-baseline gap-2"><span className="text-3xl sm:text-4xl font-black text-[var(--ink-primary)] tabular-nums">{formatMoney(currentSpentMinor, budget.currency)} <span className="text-base text-[var(--ink-muted)] font-normal">/ {formatMoney(budget.amountMinor, budget.currency)}</span></span><span className={`text-sm font-bold tabular-nums ${remainingMinor !== null && remainingMinor < 0 ? 'text-[var(--accent-danger)]' : 'text-[var(--brand-deep-current)]'}`}>{remainingMinor !== null && remainingMinor < 0 ? 'Over by' : 'Remaining'}: {formatMoney(Math.abs(remainingMinor ?? 0), budget.currency)}</span></div>
            <div role="progressbar" aria-valuenow={Math.min(Math.max(utilization, 0), 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Monthly budget utilization" className="w-full h-4 rounded-full bg-[var(--surface-cloud-solid)] border border-[var(--brand-sky-blue)]/60 overflow-hidden p-0.5"><div className={`h-full rounded-full transition-all ${utilization > 90 ? 'bg-[var(--accent-danger)]' : utilization > 80 ? 'bg-[var(--brand-bright-current)]' : 'bg-[var(--brand-deep-current)]'}`} style={{ width: `${Math.min(Math.max(utilization, 0), 100)}%` }} /></div>
            <p className="text-xs text-[var(--ink-muted)]">Expense total includes every {budgetCurrency} entry saved for {periodLabel} ({periodTotals?.transactionCount ?? 0} {periodTotals?.transactionCount === 1 ? 'entry' : 'entries'}).</p>
          </div>
        )}
      </Card>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black text-[var(--ink-primary)] tracking-tight">{isBusiness ? 'Business goals' : 'Savings goals'}</h3><p className="text-xs text-[var(--ink-muted)] font-medium">Give a goal a target date and the Assistant will count this month’s share when you ask about a purchase.</p></div><Button type="button" variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => openGoalForm()}>Add goal</Button></div>
        {loadState === 'loading' ? <Card><p role="status" className="text-sm text-[var(--ink-muted)]">Loading savings goals…</p></Card> : loadState === 'ready' && goals.length === 0 ? <EmptyState icon={<PiggyBank className="w-6 h-6" />} title="Start with one savings goal" description="Name what you are saving for and set a target. You can change either later." actionLabel="Create savings goal" onAction={() => openGoalForm()} /> : loadState === 'ready' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">{goals.map((goal) => <Card key={goal.id} className="p-6 sm:p-7 flex flex-col justify-between space-y-6"><div><div className="flex items-start justify-between gap-3 mb-4"><div className="flex items-center gap-3.5"><div className="w-12 h-12 rounded-2xl bg-[var(--surface-sky-solid)] border border-[var(--brand-sky-blue)] text-[var(--brand-deep-current)] flex items-center justify-center shrink-0"><PiggyBank className="w-6 h-6" /></div><div><h4 className="text-base font-bold text-[var(--ink-primary)]">{goal.name}</h4><div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] mt-0.5"><Calendar className="w-3.5 h-3.5" /><span>{goal.targetDate ? `Target ${formatLedgerDate(goal.targetDate)}` : 'No target date'}</span></div></div></div><Badge variant={goal.status === 'completed' ? 'success' : goal.status === 'paused' ? 'default' : 'sky'} className="text-xs font-bold tabular-nums">{goal.status === 'active' ? `${goal.progressPercent}%` : goal.status === 'paused' ? 'Paused' : 'Complete'}</Badge></div>
            <div className="space-y-2 mt-4"><div role="progressbar" aria-valuenow={Math.min(goal.progressPercent, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.name} progress`} className="w-full h-3 rounded-full bg-[var(--surface-cloud-solid)] border border-[var(--brand-sky-blue)]/60 overflow-hidden p-0.5"><div className="h-full rounded-full bg-[var(--brand-deep-current)] transition-all" style={{ width: `${Math.min(goal.progressPercent, 100)}%` }} /></div><div className="flex justify-between text-xs font-semibold text-[var(--ink-secondary)] tabular-nums"><span>Saved: <strong className="text-[var(--brand-deep-current)]">{formatMoney(goal.currentAmountMinor, goal.currency)}</strong></span><span>Target: {formatMoney(goal.targetAmountMinor, goal.currency)}</span></div></div></div>
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[var(--brand-deep-current)] tabular-nums">{goal.status === 'completed' ? 'Goal reached' : `${formatMoney(Math.max(goal.targetAmountMinor - goal.currentAmountMinor, 0), goal.currency)} to go`}</span>
                {goal.status === 'active' && <Button type="button" variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setContributeAmount(''); setContributeError(''); setContributeGoal(goal); }}>Add money</Button>}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button type="button" variant="ghost" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openGoalForm(goal)}>Edit</Button>
                {goal.status !== 'completed' && <Button type="button" variant="ghost" size="sm" disabled={busyGoalId === goal.id} leftIcon={goal.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />} onClick={() => void handleGoalStatus(goal, goal.status === 'paused' ? 'active' : 'paused')}>{goal.status === 'paused' ? 'Resume' : 'Pause'}</Button>}
                <Button type="button" variant="ghost" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => { setDeleteGoalError(''); setDeleteGoal(goal); }}>Delete</Button>
              </div>
            </div></Card>)}</div>
        ) : null}
      </section>

      <Modal isOpen={contributeGoal !== null} onClose={() => setContributeGoal(null)} title={`Add money to ${contributeGoal?.name ?? 'goal'}`} description="Record what you have set aside. This updates the goal; it does not add a ledger entry.">
        <form onSubmit={handleContribute} className="space-y-4">
          <Input label={`Amount (${contributeGoal?.currency ?? ''})`} type="number" inputMode="decimal" min="0.01" step="0.01" required autoFocus placeholder="0.00" value={contributeAmount} onChange={(event) => setContributeAmount(event.target.value)} />
          {contributeError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{contributeError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3"><Button type="button" variant="ghost" onClick={() => setContributeGoal(null)}>Cancel</Button><Button type="submit" isLoading={contributingGoalId !== null}>Add to goal</Button></div>
        </form>
      </Modal>

      <Modal isOpen={deleteGoal !== null} onClose={() => setDeleteGoal(null)} title="Delete this goal?" description="This cannot be undone. Your transactions are not affected.">
        <div className="space-y-4">
          <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sky-solid)] p-3 text-sm font-semibold text-[var(--ink-primary)]">{deleteGoal?.name}</p>
          {deleteGoalError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{deleteGoalError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3"><Button type="button" variant="ghost" onClick={() => setDeleteGoal(null)}>Keep it</Button><Button type="button" variant="danger" isLoading={isDeletingGoal} onClick={() => void handleDeleteGoal()}>Delete</Button></div>
        </div>
      </Modal>

      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title={isBusiness ? (editingGoal ? 'Edit business goal' : 'Create a business goal') : (editingGoal ? 'Edit savings goal' : 'Create a savings goal')} description="Your goal is saved to your finance profile and can be changed any time.">
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <Input label="Goal name" required maxLength={100} placeholder={isBusiness ? 'Six months of runway' : 'Emergency fund'} value={goalName} onChange={(event) => setGoalName(event.target.value)} />
          <Input label={`Target amount (${editingGoal?.currency ?? budgetCurrency})`} type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="0.00" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} />
          <Input label="Target date (optional)" type="date" min={localDateInput()} value={goalDate} onChange={(event) => setGoalDate(event.target.value)} />
          {goalError && <p role="alert" className="text-sm text-[var(--accent-danger)]">{goalError}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3"><Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(false)}>Cancel</Button><Button type="submit" isLoading={isSavingGoal}>{editingGoal ? 'Save changes' : 'Create goal'}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title={isBusiness ? (budget ? 'Update spend limit' : 'Set spend limit') : (budget ? 'Update monthly budget' : 'Set monthly budget')} description={`Set the spending limit for ${periodLabel}.`}>
        <form onSubmit={handleSetBudget} className="space-y-4"><Input label={`${isBusiness ? 'Spend limit' : 'Budget amount'} (${budgetCurrency})`} type="number" min="0.01" step="0.01" required placeholder="0.00" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} />{formError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{formError}</p>}<div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]"><Button type="button" variant="ghost" onClick={() => setIsBudgetModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary" size="pill" isLoading={isSavingBudget}>Save budget</Button></div></form>
      </Modal>
    </div>
  );
}
