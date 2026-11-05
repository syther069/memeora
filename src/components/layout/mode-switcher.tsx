'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Suitcase, User } from 'iconoir-react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { cn } from '@/lib/utils';
import type { AppMode } from '@/lib/app-mode';

const OPTIONS: Array<{ mode: AppMode; label: string; icon: typeof User }> = [
  { mode: 'personal', label: 'Personal', icon: User },
  { mode: 'business', label: 'Business', icon: Suitcase },
];

/** Switches workspace. From an overview it goes to the other overview; elsewhere it stays on the page. */
export function ModeSwitcher({ className, tone = 'canvas' }: { className?: string; tone?: 'canvas' | 'rail' }) {
  const { mode, setMode } = useAppSession();
  const pathname = usePathname();
  const router = useRouter();
  const onRail = tone === 'rail';

  const choose = (next: AppMode) => {
    if (next === mode) return;
    if (pathname === '/personal' || pathname === '/business') router.push(`/${next}`);
    else setMode(next);
  };

  return (
    <div role="group" aria-label="Workspace" className={cn('grid grid-cols-2 gap-1 rounded-full p-1', onRail ? 'bg-white/12' : 'bg-[var(--surface-sunken)]', className)}>
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
              'flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-150 cursor-pointer',
              isActive
                ? onRail ? 'bg-[var(--brand-cream)] text-[var(--brand-blue)]' : 'bg-[var(--brand-blue)] text-[var(--ink-inverse)]'
                : onRail ? 'text-[var(--ink-on-blue-muted)] hover:text-white' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
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
