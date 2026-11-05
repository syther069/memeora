'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, Search, Wallet } from 'iconoir-react';
import { Button, linkButtonClass } from '@/components/ui/button';
import { useAppSession } from '@/components/auth/app-session-guard';
import { AccountMenu } from './account-menu';
import { BrandMark } from './brand-mark';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Overview', subtitle: 'Your month at a glance.' },
  '/personal': { title: 'Overview', subtitle: 'Your month at a glance, and what to do next.' },
  '/business': { title: 'Business overview', subtitle: 'Revenue, costs, burn and runway, from your own records.' },
  '/transactions': { title: 'Transactions', subtitle: 'Everything you have earned and spent.' },
  '/budgets': { title: 'Budgets & goals', subtitle: 'Your monthly limit and what you are saving for.' },
  '/assistant': { title: 'Assistant', subtitle: 'Exact sums from your ledger, guided by your memories.' },
  '/memory': { title: 'Memory', subtitle: 'The rules and goals Memeora remembers, stored on Walrus.' },
  '/verification': { title: 'On-chain proof', subtitle: 'Check your memories on Sui Mainnet, read through Tatum.' },
};

const businessTitles: Record<string, { title: string; subtitle: string }> = {
  '/transactions': { title: 'Transactions', subtitle: 'Everything the business has earned and spent.' },
  '/budgets': { title: 'Spend limit & goals', subtitle: 'Your monthly limit and what the business is working towards.' },
  '/assistant': { title: 'Assistant', subtitle: 'Exact sums from your ledger, guided by your business memories.' },
  '/memory': { title: 'Business memory', subtitle: 'How you run the business, stored on Walrus apart from your personal memories.' },
  '/verification': { title: 'On-chain proof', subtitle: 'Check your business memories on Sui Mainnet, read through Tatum.' },
};

export function Header({ onOpenCommand, onOpenGuide }: { onOpenCommand: () => void; onOpenGuide: () => void }) {
  const pathname = usePathname();
  const { walletAddress, mode } = useAppSession();

  const currentKey = Object.keys(routeTitles).find((key) => pathname === key || pathname.startsWith(`${key}/`)) ?? '/dashboard';
  const { title, subtitle } = (mode === 'business' && businessTitles[currentKey]) || routeTitles[currentKey];
  const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

  return (
    <header className="z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:sticky sm:top-0 sm:flex-nowrap bg-[var(--surface-base)] px-4 pb-3 pt-[calc(0.75rem+var(--safe-top))] sm:px-6 lg:px-8">
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
        <BrandMark className="hidden h-9 w-9 sm:grid lg:hidden" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-2xl">{title}</h1>
          <p className="hidden truncate text-xs text-[var(--ink-secondary)] md:block">{subtitle}</p>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Open command menu"
          className="hit flex h-9 items-center gap-2 rounded-full border border-[var(--border-pill)] px-3 text-xs text-[var(--ink-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          <Search aria-hidden className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Search actions</span>
          <kbd className="hidden rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 font-sans text-[11px] font-medium lg:inline">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <Button variant="outline" size="sm" onClick={onOpenGuide} leftIcon={<HelpCircle aria-hidden className="h-4 w-4" />}>
          Guide
        </Button>
        {walletAddress
          ? <AccountMenu walletAddress={walletAddress} />
          : <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={linkButtonClass('primary', 'sm')}><Wallet aria-hidden className="h-4 w-4" />Connect wallet</Link>}
      </div>
    </header>
  );
}
