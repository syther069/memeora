'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSession } from '@/components/auth/app-session-guard';
import { cn } from '@/lib/utils';
import { ModeSwitcher } from './mode-switcher';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Sparkles,
  Brain,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { name: 'Transactions', href: '/transactions', icon: ReceiptText },
  { name: 'Budgets & Goals', href: '/budgets', icon: Target },
  { name: 'Assistant', href: '/assistant', icon: Sparkles },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'On-chain proof', href: '/verification', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mode } = useAppSession();
  const overview = `/${mode}`;
  const items = [{ name: 'Overview', href: overview, icon: LayoutDashboard }, ...navItems];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-[var(--border-subtle)] bg-[var(--surface-card)]/80 backdrop-blur-md shrink-0 h-screen sticky top-0 z-20">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-[var(--border-subtle)] justify-between">
        <Link href={overview} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--brand-deep-current)] shadow-[var(--shadow-sm)] flex items-center justify-center text-white transition-transform group-hover:scale-105">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 18V6l8 8 8-8v12" />
              <circle cx="12" cy="14" r="1.5" fill="#90caf9" stroke="none" />
            </svg>
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[var(--ink-primary)]">
              Memeora
            </span>
            <span className="block text-[11px] font-medium text-[var(--ink-muted)]">
              Finance &amp; Memory
            </span>
          </div>
        </Link>
      </div>

      <ModeSwitcher className="mx-4 mt-5" />

      {/* Main Navigation with Tactile Pills */}
      <nav aria-label="Primary Navigation" className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center justify-between px-3.5 py-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-150',
                isActive
                  ? 'bg-[var(--brand-deep-current)] text-white shadow-[var(--shadow-pill)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sky-tint)]'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    isActive ? 'text-[var(--brand-sky-blue)]' : 'text-[var(--ink-muted)]'
                  )}
                />
                <span>{item.name}</span>
              </div>

              {isActive ? (
                <ChevronRight className="w-4 h-4 text-[var(--brand-sky-blue)] opacity-80" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-[var(--radius-lg)] border border-[var(--brand-sky-blue)]/70 bg-[var(--surface-sky-solid)] p-4">
        <p className="text-xs font-bold text-[var(--ink-primary)]">Your money stays exact</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
          Sums come from your ledger, never from AI. Your rules live on Walrus, and you can check them on Sui.
        </p>
      </div>
    </aside>
  );
}
