'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, List, PiggyBank, ShieldCheck, Sparks, ViewGrid } from 'iconoir-react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const { mode } = useAppSession();
  const items = [
    { name: 'Overview', href: `/${mode}`, icon: ViewGrid },
    { name: 'Ledger', href: '/transactions', icon: List },
    { name: mode === 'business' ? 'Limit' : 'Budgets', href: '/budgets', icon: PiggyBank },
    { name: 'Assistant', href: '/assistant', icon: Sparks },
    { name: 'Memory', href: '/memory', icon: Brain },
    { name: 'Proof', href: '/verification', icon: ShieldCheck },
  ];

  return (
    <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-card)] bg-[var(--surface-elevated)] px-1 pt-1 pb-[calc(0.25rem+var(--safe-bottom))] pl-[max(0.25rem,var(--safe-left))] pr-[max(0.25rem,var(--safe-right))]">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors duration-150',
                isActive ? 'text-[var(--brand-blue)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]',
              )}
            >
              <span className={cn('grid h-6 w-11 place-items-center rounded-full transition-colors', isActive && 'bg-[var(--surface-tint)]')}>
                <Icon aria-hidden className="h-4.5 w-4.5" />
              </span>
              <span className={cn('truncate', isActive && 'font-semibold')}>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
