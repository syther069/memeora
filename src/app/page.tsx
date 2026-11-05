'use client';

import Link from 'next/link';
import { ArrowRight, Wallet } from 'iconoir-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { linkButtonClass } from '@/components/ui/button';

const FEATURES = [
  { title: 'Exact sums', body: 'Income, spending, budgets and goals, added up by the server from your own records. AI only explains the result.' },
  { title: 'Rules that stay', body: 'Save rules like “keep a buffer before non-essential purchases”. They are encrypted and stored on Walrus, in an account your wallet owns.' },
  { title: 'Proof you can check', body: 'Read each stored memory on Sui Mainnet through Tatum, and compare it with what Memeora recorded.' },
  { title: 'Personal and Business', body: 'Two workspaces, kept apart. Business adds revenue, burn, runway, clients and vendors.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[var(--surface-base)] text-[var(--ink-body)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 pt-[calc(1rem+var(--safe-top))] sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="text-lg font-bold tracking-tight text-[var(--ink-primary)]">Memeora</span>
        </div>
        <Link href="/sign-in" className={linkButtonClass('outline', 'sm')}><Wallet aria-hidden className="h-4 w-4" />Connect a wallet</Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-[calc(3rem+var(--safe-bottom))] sm:px-6">
        <section className="grid items-center gap-8 py-8 lg:grid-cols-[1fr_1.15fr] lg:py-14">
          <div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-[var(--ink-primary)] sm:text-6xl">A finance assistant that remembers.</h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--ink-secondary)]">Track your money with exact sums, and get advice that follows the rules you save. Look around first: you only need a wallet when you want to keep your own records.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className={linkButtonClass('primary', 'lg')}>Open the dashboard<ArrowRight aria-hidden className="h-4 w-4" /></Link>
              <Link href="/sign-in" className={linkButtonClass('outline', 'lg')}>Connect a wallet</Link>
            </div>
          </div>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed screenshot with reserved dimensions */}
            <img src="/guide/overview.jpg" alt="The Memeora overview, with money left over, a budget gauge, saved rules and a six-month chart." width={1280} height={800} className="aspect-[8/5] w-full rounded-[var(--radius-lg)] border border-[var(--border-card)] object-cover object-top" />
            <figcaption className="mt-2 text-xs text-[var(--ink-muted)]">Sample data, not a real account. The sample memories shown were not written to Walrus.</figcaption>
          </figure>
        </section>

        <section aria-label="What Memeora does" className="grid gap-6 border-t border-[var(--border-subtle)] pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h2 className="text-sm font-bold text-[var(--ink-primary)]">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-secondary)]">{feature.body}</p>
            </div>
          ))}
        </section>

        <p className="mt-10 text-xs text-[var(--ink-muted)]">Memeora keeps your records. It is not a bank or a financial adviser.</p>
      </main>
    </div>
  );
}
