'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, User } from 'lucide-react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { cn } from '@/lib/utils';
import type { AppMode } from '@/lib/app-mode';

const OPTIONS: Array<{ mode: AppMode; label: string; icon: typeof User }> = [
  { mode: 'personal', label: 'Personal', icon: User },
  { mode: 'business', label: 'Business', icon: Briefcase },
];

/** Switches workspace. From an overview it goes to the other overview; elsewhere it stays on the page. */
export function ModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useAppSession();
  const pathname = usePathname();
  const router = useRouter();

  const choose = (next: AppMode) => {
    if (next === mode) return;
    if (pathname === '/personal' || pathname === '/business') router.push(`/${next}`);
    else setMode(next);
  };

  return (
    <div role="group" aria-label="Workspace" className={cn('grid grid-cols-2 gap-1 rounded-full border border-[var(--brand-sky-blue)]/70 bg-[var(--surface-cloud-solid)] p-1', className)}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => choose(option.mode)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
              isActive ? 'bg-[var(--brand-deep-current)] text-white shadow-xs' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]',
            )}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
