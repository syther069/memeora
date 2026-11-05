'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, List, PiggyBank, ShieldCheck, Sparks, ViewGrid } from 'iconoir-react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';
import { ModeSwitcher } from './mode-switcher';

export function Sidebar() {
  const pathname = usePathname();
  const { mode } = useAppSession();
  const overview = `/${mode}`;
  const items = [
    { name: 'Overview', href: overview, icon: ViewGrid },
    { name: 'Transactions', href: '/transactions', icon: List },
    { name: mode === 'business' ? 'Spend limit & goals' : 'Budgets & goals', href: '/budgets', icon: PiggyBank },
    { name: 'Assistant', href: '/assistant', icon: Sparks },
    { name: 'Memory', href: '/memory', icon: Brain },
    { name: 'On-chain proof', href: '/verification', icon: ShieldCheck },
  ];

  return (
    <aside className="on-blue hidden lg:flex lg:flex-col w-64 shrink-0 m-3 mr-0 h-[calc(100dvh-1.5rem)] sticky top-3 z-20 rounded-[var(--radius-xl)] bg-[var(--surface-rail)] text-[var(--ink-inverse)]">
      <div className="flex h-20 items-center px-5">
        <Link href={overview} className="flex items-center gap-3 rounded-[var(--radius-sm)]">
          <BrandMark tone="cream" />
          <span>
            <span className="block text-lg font-bold leading-tight tracking-tight">Memeora</span>
            <span className="block text-xs text-[var(--ink-on-blue-muted)]">{mode === 'business' ? 'Business workspace' : 'Personal workspace'}</span>
          </span>
        </Link>
      </div>

      <ModeSwitcher tone="rail" className="mx-4" />

      <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors duration-150',
                isActive ? 'bg-[var(--brand-cream)] font-semibold text-[var(--brand-blue)]' : 'text-[var(--ink-on-blue-muted)] hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon aria-hidden className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-white/15 px-5 py-4 text-xs leading-relaxed text-[var(--ink-on-blue-muted)]">
        Sums come from your ledger, never from AI. Your rules live on Walrus.
      </p>
    </aside>
  );
}
