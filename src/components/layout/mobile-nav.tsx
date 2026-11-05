'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSession } from '@/components/auth/app-session-guard';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Sparkles,
  Brain,
  ShieldCheck,
} from 'lucide-react';

const mobileNavItems = [
  { name: 'Ledger', href: '/transactions', icon: ReceiptText },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Assistant', href: '/assistant', icon: Sparkles },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Proof', href: '/verification', icon: ShieldCheck },
];

export function MobileNav() {
  const pathname = usePathname();
  const { mode } = useAppSession();
  const items = [{ name: 'Overview', href: `/${mode}`, icon: LayoutDashboard }, ...mobileNavItems];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--brand-sky-blue)]/60 px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-modal)] ring-1 ring-white/90 ring-inset"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center min-w-[48px] min-h-[48px] py-1 px-2 rounded-2xl text-[10px] font-bold transition-all',
                isActive
                  ? 'text-[var(--brand-deep-current)] bg-[var(--surface-sky-tint)] shadow-xs scale-105'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-0.5', isActive && 'stroke-[2.5]')} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
