import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'sky' | 'pill-outline';
  icon?: React.ReactNode;
}

const VARIANTS = {
  default: 'bg-[var(--surface-sunken)] text-[var(--ink-secondary)] border-transparent',
  primary: 'bg-[var(--brand-blue)] text-[var(--ink-inverse)] border-transparent',
  sky: 'bg-[var(--surface-tint)] text-[var(--brand-blue)] border-transparent',
  success: 'bg-[var(--accent-positive-bg)] text-[var(--accent-positive)] border-[var(--accent-positive-border)]',
  warning: 'bg-[var(--accent-warning-bg)] text-[var(--accent-warning)] border-[var(--accent-warning-border)]',
  danger: 'bg-[var(--accent-danger-bg)] text-[var(--accent-danger)] border-[var(--accent-danger-border)]',
  'pill-outline': 'bg-transparent text-[var(--ink-secondary)] border-[var(--border-pill)]',
};

export function Badge({ className, variant = 'default', icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tabular-nums', VARIANTS[variant], className)} {...props}>
      {icon && <span className="inline-flex shrink-0 w-3.5 h-3.5 items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
