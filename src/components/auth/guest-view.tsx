'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Brain, List, PiggyBank, ShieldCheck, Sparks, Wallet } from 'iconoir-react';
import { linkButtonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppSession } from './app-session-guard';

const PAGES: Record<string, { icon: typeof List; title: string; body: string }> = {
  '/transactions': { icon: List, title: 'Your transactions live here', body: 'Record income and spending, or import transactions from your Sui wallet. Each wallet has its own private ledger.' },
  '/budgets': { icon: PiggyBank, title: 'Your budgets and goals live here', body: 'Set a monthly limit and name what you are saving for. Memeora compares them with what you record.' },
  '/assistant': { icon: Sparks, title: 'Ask about your own money', body: 'The Assistant works from your records and saved rules, so it needs to know whose they are. The sums come from the server, and AI only explains them.' },
  '/memory': { icon: Brain, title: 'Your rules live here', body: 'Save rules and goals to Walrus, in an account your wallet owns. Nothing is stored until you turn memory on and save something.' },
  '/verification': { icon: ShieldCheck, title: 'Check your memories on Sui', body: 'Reads each stored memory on Sui Mainnet through Tatum, and checks it against what Memeora recorded.' },
};

const OVERVIEW_STEPS = [
  { icon: List, title: 'Record', body: 'Add income and spending, or import from your Sui wallet.' },
  { icon: Brain, title: 'Remember', body: 'Save the rules you want followed. They are stored on Walrus.' },
  { icon: Sparks, title: 'Ask', body: 'Get exact sums, guided by your rules.' },
  { icon: ShieldCheck, title: 'Verify', body: 'Check your memories on Sui, read through Tatum.' },
];

/** What a visitor sees before connecting a wallet. It shows no figures, because there is no account to read them from. */
export function GuestView() {
  const pathname = usePathname();
  const { mode } = useAppSession();
  const signInHref = `/sign-in?next=${encodeURIComponent(pathname)}`;
  const page = PAGES[pathname];

  if (page) {
    const Icon = page.icon;
    return (
      <Card className="mx-auto mt-6 max-w-xl text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-tint)] text-[var(--brand-blue)]"><Icon aria-hidden className="h-6 w-6" /></span>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--ink-primary)]">{page.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">{page.body}</p>
        <Link href={signInHref} className={linkButtonClass('primary', 'md', 'mt-5')}><Wallet aria-hidden className="h-4 w-4" />Connect a wallet to continue</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card variant="blue" className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{mode === 'business' ? 'See your revenue, burn and runway.' : 'See your month at a glance.'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-on-blue-muted)]">You are looking around without a wallet, so there are no figures to show yet. Connect one and your records appear here. It is free, and there is no password.</p>
        </div>
        <Link href={signInHref} className={linkButtonClass('cream', 'lg', 'shrink-0')}>Connect a wallet<ArrowRight aria-hidden className="h-4 w-4" /></Link>
      </Card>
      <section aria-label="How Memeora works" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OVERVIEW_STEPS.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <Icon aria-hidden className="h-5 w-5 text-[var(--brand-blue)]" />
            <h3 className="mt-3 text-sm font-bold text-[var(--ink-primary)]">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
