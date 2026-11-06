'use client';

import { CurrencyOptions } from '@/components/ui/currency-options';
import type { CurrencyCode } from '@/modules/finance/domain/money';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, DollarCircle, ShieldCheck, Sparks, Suitcase, User } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppSession } from '@/components/auth/app-session-guard';
import type { AppMode } from '@/lib/app-mode';
import { localDateInput } from '@/lib/dates';
import { parseMajorUnitsToMinor } from '@/modules/finance/domain/money';

async function postOnboarding(body: Record<string, unknown>) {
  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result?.success !== true) {
    throw new Error(result?.error?.message ?? 'Could not save your setup. Please try again.');
  }
  return result.data;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { markOnboardingSettled } = useAppSession();
  const [mode, setMode] = React.useState<AppMode>('personal');
  const [currency, setCurrency] = React.useState<CurrencyCode>('USD');
  const [budget, setBudget] = React.useState('');
  const [goalName, setGoalName] = React.useState('');
  const [goalAmount, setGoalAmount] = React.useState('');
  const [goalDate, setGoalDate] = React.useState('');
  const [memoryChoice, setMemoryChoice] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const monthlyBudgetMinor = budget.trim() ? parseMajorUnitsToMinor(budget) : null;
    if (budget.trim() && monthlyBudgetMinor === null) { setError('Enter a positive monthly budget with up to two decimal places, or leave it empty.'); return; }
    const hasGoal = Boolean(goalName.trim() || goalAmount.trim());
    const targetAmountMinor = goalAmount.trim() ? parseMajorUnitsToMinor(goalAmount) : null;
    if (hasGoal && (!goalName.trim() || targetAmountMinor === null)) { setError('A savings goal needs both a name and a positive target amount, or leave both empty.'); return; }
    if (memoryChoice === null) { setError('Choose whether Memeora may use persistent memory before continuing.'); return; }

    setBusy(true);
    try {
      await postOnboarding({
        action: 'complete', currency, monthlyBudgetMinor, activeMode: mode,
        savingsGoal: hasGoal ? { name: goalName.trim(), targetAmountMinor, targetDate: goalDate || null } : null,
        memoryConsentEnabled: memoryChoice,
      });
      markOnboardingSettled(currency, mode);
      router.replace(`/${mode}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your setup. Please try again.');
    } finally { setBusy(false); }
  };

  const defer = async () => {
    setError('');
    setBusy(true);
    try {
      await postOnboarding({ action: 'defer' });
      markOnboardingSettled();
      router.replace('/dashboard');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not defer setup. Please retry.');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-[var(--brand-blue)]">A clear start</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-4xl">Set up your money workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">Choose a currency and your memory preference. A monthly spending limit and a savings goal are optional, and you can change them later.</p>
      </header>

      <form onSubmit={finish} className="space-y-6">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink-primary)]">How will you use Memeora?</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">You can have both. They stay separate, and you can switch at any time.</p>
          </div>
          <div role="radiogroup" aria-label="Workspace" className="grid gap-3 sm:grid-cols-2">
            {([
              { value: 'personal', label: 'Personal', text: 'Daily spending, crypto and saving.', icon: User },
              { value: 'business', label: 'Business', text: 'Revenue, costs, burn and runway, for founders, builders and business owners.', icon: Suitcase },
            ] as const).map((option) => {
              const Icon = option.icon;
              return (
                <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${mode === option.value ? 'border-[var(--brand-blue)] bg-[var(--surface-tint)]' : 'border-[var(--border-card)] bg-white'}`}>
                  <input type="radio" name="workspace" checked={mode === option.value} onChange={() => setMode(option.value)} className="mt-1 accent-[var(--brand-blue)]" />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ink-primary)]"><Icon aria-hidden className="h-4 w-4" />{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{option.text}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex items-start gap-4 border-b border-[var(--border-subtle)] pb-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-tint)] text-[var(--brand-blue)]"><DollarCircle className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-[var(--ink-primary)]">Your starting point</h2><p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">These settings are saved to your finance profile and can be changed as your plans change.</p></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5 text-left">
              <span className="block text-xs font-bold text-[var(--ink-primary)]">Preferred currency</span>
              <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} className="h-11 w-full rounded-xl border border-[var(--border-field)] bg-[var(--surface-card)] px-4 text-sm font-medium text-[var(--ink-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-bright)]">
                <CurrencyOptions />
              </select>
            </label>
            <Input label={`Monthly budget (${currency}, optional)`} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={budget} onChange={(event) => setBudget(event.target.value)} helperText="A spending limit for the current month." />
            <Input label="Savings goal (optional)" type="text" maxLength={100} placeholder="Emergency fund" value={goalName} onChange={(event) => setGoalName(event.target.value)} />
            <Input label={`Goal target (${currency})`} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} />
            <Input label="Target date (optional)" type="date" min={localDateInput()} value={goalDate} onChange={(event) => setGoalDate(event.target.value)} />
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-tint)] text-[var(--brand-blue)]"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-[var(--ink-primary)]">Your memory choice</h2><p className="mt-1 text-sm leading-6 text-[var(--ink-secondary)]">Walrus Memory is an external service for remembering preferences you choose to save. If enabled, approved memory text may be processed and stored there. Your budget, goals, and transactions remain in Memeora’s PostgreSQL database.</p></div>
          </div>
          <div className="rounded-xl border border-[var(--brand-blue-soft)]/70 bg-[var(--surface-tint)] p-4 text-sm leading-6 text-[var(--ink-secondary)]">
            <strong className="text-[var(--ink-primary)]">Nothing is stored during setup.</strong> Each memory you add later is encrypted and written to Walrus on Sui Mainnet. Before your first memory, your wallet creates your own Walrus account and approves Memeora to use it, at no cost to you. You can hide a memory at any time, or delete it from Walrus with your wallet, which pays a small SUI fee.
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-[var(--ink-primary)]">May Memeora use persistent memory?</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-card)] bg-white p-4">
              <input type="radio" name="memory-consent" checked={memoryChoice === true} onChange={() => setMemoryChoice(true)} className="mt-1 accent-[var(--brand-blue)]" />
              <span><span className="block text-sm font-semibold text-[var(--ink-primary)]">Yes, remember the preferences I choose to save</span><span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">Only text you add yourself is stored. Your transactions are never written to Walrus.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-card)] bg-white p-4">
              <input type="radio" name="memory-consent" checked={memoryChoice === false} onChange={() => setMemoryChoice(false)} className="mt-1 accent-[var(--brand-blue)]" />
              <span><span className="block text-sm font-semibold text-[var(--ink-primary)]">No, keep persistent memory off</span><span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">Your finance workspace still works without Walrus Memory.</span></span>
            </label>
          </fieldset>
        </Card>

        {error && <p role="alert" className="rounded-xl border border-[var(--accent-danger-border)] bg-[var(--accent-danger-bg)] p-3 text-sm text-[var(--accent-danger)]">{error}</p>}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void defer()}>Finish setup later</Button>
          <Button type="submit" size="lg" isLoading={busy} leftIcon={!busy ? <Check className="h-4 w-4" /> : undefined} rightIcon={!busy ? <Sparks className="h-4 w-4" /> : undefined}>Save my setup</Button>
        </div>
      </form>
    </div>
  );
}
