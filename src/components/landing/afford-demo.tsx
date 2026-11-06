'use client';

import { RollingAmount } from '@/components/ui/rolling-amount';
import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, WarningTriangle, XmarkCircle } from 'iconoir-react';
import { formatMoney } from '@/lib/finance-api';

/** Sample figures, in cents like the real ledger. Labelled as a sample on the page. */
const LEFT_IN_BUDGET_MINOR = 160_000;
const KEEP_UNTOUCHED_MINOR = 30_000;
const STEP_MINOR = 5_000;
const MAX_PRICE_MINOR = 200_000;
const START_PRICE_MINOR = 45_000;
/** Where the saved rule starts on the budget meter. */
const RULE_MARK_PERCENT = ((LEFT_IN_BUDGET_MINOR - KEEP_UNTOUCHED_MINOR) * 100) / LEFT_IN_BUDGET_MINOR;

const usd = (minor: number) => formatMoney(minor, 'USD');

function verdictFor(priceMinor: number) {
  const afterMinor = LEFT_IN_BUDGET_MINOR - priceMinor;
  if (afterMinor < 0) {
    return { tone: 'over', Icon: XmarkCircle, title: 'Over your budget', detail: `This is ${usd(-afterMinor)} more than the ${usd(LEFT_IN_BUDGET_MINOR)} left this month.` } as const;
  }
  if (afterMinor < KEEP_UNTOUCHED_MINOR) {
    return { tone: 'rule', Icon: WarningTriangle, title: 'Fits, but breaks your rule', detail: `You would have ${usd(afterMinor)} left. Your rule says to keep ${usd(KEEP_UNTOUCHED_MINOR)} untouched.` } as const;
  }
  return { tone: 'fits', Icon: CheckCircle, title: 'Fits, and follows your rule', detail: `You would have ${usd(afterMinor)} left, above the ${usd(KEEP_UNTOUCHED_MINOR)} you keep untouched.` } as const;
}

const TONES = {
  fits: { text: 'text-[var(--accent-positive)]', fill: 'bg-[var(--accent-positive)]' },
  rule: { text: 'text-[var(--accent-warning)]', fill: 'bg-[var(--accent-warning)]' },
  over: { text: 'text-[var(--accent-danger)]', fill: 'bg-[var(--accent-danger)]' },
};

export function AffordDemo() {
  const reduced = useReducedMotion();
  const [priceMinor, setPriceMinor] = React.useState(START_PRICE_MINOR);
  const verdict = verdictFor(priceMinor);
  const { Icon } = verdict;
  const tone = TONES[verdict.tone];
  const usedFraction = Math.min(priceMinor, LEFT_IN_BUDGET_MINOR) / LEFT_IN_BUDGET_MINOR;

  return (
    <div className="landing-card rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-5 text-[var(--ink-body)] sm:p-7">
      <label htmlFor="afford-price" className="block text-sm font-semibold text-[var(--ink-primary)]">Thinking of buying something for</label>
      <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-[var(--brand-blue)] sm:text-6xl"><RollingAmount minor={priceMinor} format={usd} /></p>
      <input
        id="afford-price"
        type="range"
        min={STEP_MINOR}
        max={MAX_PRICE_MINOR}
        step={STEP_MINOR}
        value={priceMinor}
        aria-valuetext={usd(priceMinor)}
        onChange={(event) => setPriceMinor(Number(event.target.value))}
        className="mt-4 h-11 w-full cursor-pointer accent-[var(--brand-blue)]"
      />

      <div aria-hidden className="relative mt-2 h-3 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <div className={`absolute inset-0 origin-left rounded-full transition-[transform,background-color] duration-200 ease-out ${tone.fill}`} style={{ transform: `scaleX(${usedFraction})` }} />
        <div className="absolute inset-y-0 w-0.5 bg-[var(--ink-primary)]" style={{ left: `${RULE_MARK_PERCENT}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-[var(--ink-secondary)]">The line marks where your rule starts.</p>

      <div aria-live="polite" className="mt-3 min-h-28 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={verdict.tone}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-center gap-2 text-base font-bold ${tone.text}`}
          >
            <Icon aria-hidden className="h-5 w-5 shrink-0" />{verdict.title}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ink-body)]">{verdict.detail}</p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--ink-secondary)]">Sample month: {usd(LEFT_IN_BUDGET_MINOR)} left, with one saved rule. In the app these are your own figures, and fitting a budget is not financial advice.</p>
    </div>
  );
}
