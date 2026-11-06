'use client';

import type { CurrencyCode } from '@/modules/finance/domain/money';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Check } from 'iconoir-react';
import { AnimatedLink } from '@/components/ui/animated-link';
import { Badge } from '@/components/ui/badge';
import { Expand } from '@/components/ui/expand';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeriod } from '@/lib/dates';
import { formatMoney } from '@/lib/finance-api';

export type Currency = CurrencyCode;

export interface OverviewPayload {
  period: string;
  periods: string[];
  months: Array<{ period: string; currency: Currency; incomeMinor: number; expenseMinor: number }>;
  categories: Array<{ currency: Currency; category: string; amountMinor: number }>;
}

export interface MemorySummary {
  consentEnabled: boolean;
  total: number;
  storedOnWalrus: number;
  recent?: Array<{ id: string; text: string; category: string; status: string }>;
}

function shortMonth(period: string) {
  return new Date(`${period}-01T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
}

/** A card heading with one link, used across the overview. */
export function SectionHead({ title, note, href, action }: { title: string; note?: string; href?: string; action?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[var(--ink-primary)]">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{note}</p>}
      </div>
      {href && action && (
        <AnimatedLink href={href} className="hit shrink-0 gap-1 text-xs font-semibold text-[var(--brand-blue)]">
          {action}<ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </AnimatedLink>
      )}
    </div>
  );
}

/** Recent months as paired hatched bars, with the exact figures one click away. */
export function MonthBars({ data, currency, incomeLabel = 'Income', expenseLabel = 'Spent' }: { data: OverviewPayload | null; currency: Currency; incomeLabel?: string; expenseLabel?: string }) {
  if (!data) return <Skeleton className="h-44 w-full" />;
  const rows = data.periods.map((period) => {
    const entry = data.months.find((month) => month.period === period && month.currency === currency);
    return { period, income: entry?.incomeMinor ?? 0, expense: entry?.expenseMinor ?? 0 };
  });
  const max = Math.max(1, ...rows.flatMap((row) => [row.income, row.expense]));
  if (rows.every((row) => row.income === 0 && row.expense === 0)) {
    return <p className="flex h-44 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-well)] px-6 text-center text-xs text-[var(--ink-secondary)]">Nothing recorded in {currency} in the last six months.</p>;
  }
  return (
    <div>
      <div aria-hidden className="grid h-44 grid-cols-6 items-end gap-2 sm:gap-3">
        {rows.map((row) => (
          <div key={row.period} title={`${formatPeriod(row.period)}: ${formatMoney(row.income, currency)} in, ${formatMoney(row.expense, currency)} out`} className="flex h-full flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              <div className={`bar-grow w-full max-w-7 rounded-t-lg ${row.income ? 'border border-[var(--brand-blue)]' : ''}`} style={{ height: `${Math.max(row.income ? 3 : 0, (row.income / max) * 100)}%`, backgroundImage: 'var(--hatch-soft)' }} />
              <div className="bar-grow w-full max-w-7 rounded-t-lg" style={{ height: `${Math.max(row.expense ? 3 : 0, (row.expense / max) * 100)}%`, backgroundImage: 'var(--hatch-blue)' }} />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-2 grid grid-cols-6 gap-2 border-t border-[var(--border-subtle)] pt-2 text-center text-xs text-[var(--ink-muted)] sm:gap-3">
        {rows.map((row) => <span key={row.period}>{shortMonth(row.period)}</span>)}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--ink-secondary)]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-[var(--brand-blue)]" style={{ backgroundImage: 'var(--hatch-soft)' }} />{incomeLabel}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundImage: 'var(--hatch-blue)' }} />{expenseLabel}</span>
        <span className="ml-auto text-[var(--ink-muted)]">In {currency}, as recorded</span>
      </div>
      <Expand label="See the figures" className="mt-3 text-xs text-[var(--ink-secondary)]">
        <table className="mt-2 w-full tabular-nums">
          <caption className="sr-only">{incomeLabel} and {expenseLabel.toLowerCase()} by month, in {currency}</caption>
          <thead><tr className="text-left text-[var(--ink-muted)]"><th scope="col" className="py-1 font-medium">Month</th><th scope="col" className="py-1 text-right font-medium">{incomeLabel}</th><th scope="col" className="py-1 text-right font-medium">{expenseLabel}</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.period} className="border-t border-[var(--border-subtle)]"><th scope="row" className="py-1 text-left font-normal">{formatPeriod(row.period)}</th><td className="py-1 text-right">{formatMoney(row.income, currency)}</td><td className="py-1 text-right">{formatMoney(row.expense, currency)}</td></tr>)}</tbody>
        </table>
      </Expand>
    </div>
  );
}

/** This month's spending by category, largest first. */
export function CategoryBars({ data, currency }: { data: OverviewPayload | null; currency: Currency }) {
  if (!data) return <div className="space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-5/6" /><Skeleton className="h-6 w-2/3" /></div>;
  const rows = data.categories.filter((entry) => entry.currency === currency).slice(0, 6);
  if (rows.length === 0) return <p className="rounded-[var(--radius-md)] bg-[var(--surface-well)] p-6 text-center text-xs text-[var(--ink-secondary)]">No spending recorded this month.</p>;
  const max = rows[0].amountMinor;
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.category}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-[var(--ink-secondary)]">{row.category}</span>
            <span className="font-semibold tabular-nums text-[var(--ink-primary)]">{formatMoney(row.amountMinor, currency)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (row.amountMinor / max) * 100)}%`, backgroundImage: 'var(--hatch-blue)' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SEGMENTS = 22;

/** A segmented arc for how much of a limit is used. Past 100% it says so in words and in color. */
export function UsageGauge({ percent, label }: { percent: number; label: string }) {
  const filled = Math.min(SEGMENTS, Math.round((Math.max(percent, 0) / 100) * SEGMENTS));
  const over = percent > 100;
  return (
    <div role="img" aria-label={`${label}: ${percent}% used`} className="relative mx-auto w-full max-w-56">
      <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, index) => {
          const angle = Math.PI - (index / (SEGMENTS - 1)) * Math.PI;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          return (
            <line
              key={index}
              x1={100 + cos * 66}
              y1={100 - sin * 66}
              x2={100 + cos * 92}
              y2={100 - sin * 92}
              strokeWidth="9"
              strokeLinecap="round"
              stroke={index < filled ? (over ? 'var(--accent-danger)' : 'var(--brand-blue)') : 'var(--surface-sunken)'}
            />
          );
        })}
      </svg>
      <p className={`absolute inset-x-0 bottom-0 text-center text-2xl font-bold tabular-nums ${over ? 'text-[var(--accent-danger)]' : 'text-[var(--ink-primary)]'}`}>{percent}%</p>
    </div>
  );
}

/** What the Assistant is following: the part only Memeora has. */
export function RulesPanel({ memory, isLoading, business }: { memory: MemorySummary | null; isLoading: boolean; business?: boolean }) {
  const rules = memory?.recent ?? [];
  return (
    <Card className="flex flex-col">
      <SectionHead title={business ? 'Rules for the business' : 'Rules the Assistant follows'} href="/memory" action={memory?.consentEnabled === false ? 'Turn on memory' : 'Open memory'} />
      {isLoading ? (
        <div className="space-y-2.5"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
      ) : !memory ? (
        <p className="text-xs text-[var(--ink-secondary)]">Memory status is unavailable right now. Your figures are not affected.</p>
      ) : !memory.consentEnabled ? (
        <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">Memory is off. Turn it on so Memeora can keep your rules between sessions.</p>
      ) : rules.length === 0 ? (
        <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">Nothing saved yet. Save a rule, and the Assistant will follow it.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-well)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-body)]">
                <Brain aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-blue)]" />
                <span className="line-clamp-2">{rule.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs tabular-nums text-[var(--ink-muted)]">{memory.storedOnWalrus} of {memory.total} stored on Walrus</p>
        </>
      )}
    </Card>
  );
}

export interface GuideStep {
  title: string;
  done: boolean;
  href?: string;
  onClick?: () => void;
  action: string;
}

/** First steps, as a single strip that disappears when they are done. */
export function GuideStrip({ steps, title }: { steps: GuideStep[]; title: string }) {
  const doneCount = steps.filter((step) => step.done).length;
  return (
    <section aria-label={title} className="rounded-[var(--radius-lg)] border border-[var(--border-card)] bg-[var(--surface-card)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[var(--ink-primary)]">{title}</h2>
        <Badge variant="sky" className="text-[11px]">{doneCount} of {steps.length} done</Badge>
      </div>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const content = (
            <>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${step.done ? 'bg-[var(--accent-positive-bg)] text-[var(--accent-positive)]' : 'bg-[var(--surface-tint)] text-[var(--brand-blue)]'}`}>
                {step.done ? <Check aria-label="Done" className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{step.done ? step.title : step.action}</span>
              {!step.done && <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--brand-blue)]" />}
            </>
          );
          const rowClass = `flex h-11 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-left text-xs font-medium transition-colors ${step.done ? 'text-[var(--ink-muted)]' : 'bg-[var(--surface-well)] text-[var(--ink-primary)] hover:bg-[var(--surface-tint)]'}`;
          return (
            <li key={step.title}>
              {step.done ? <div className={rowClass}>{content}</div>
                : step.href ? <Link href={step.href} className={rowClass}>{content}</Link>
                  : <button type="button" onClick={step.onClick} className={`${rowClass} cursor-pointer`}>{content}</button>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
