import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'sky' | 'pill-outline';
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant = 'default',
  icon,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      'bg-[var(--surface-cloud-solid)] text-[var(--brand-deep-current)] border-[var(--border-subtle)]',
    primary:
      'bg-[var(--brand-deep-current)] text-white border-transparent shadow-xs',
    sky:
      'bg-[var(--brand-sky-blue)]/30 text-[var(--brand-deep-current)] border-[var(--brand-sky-blue)]/60',
    success:
      'bg-[var(--accent-positive-bg)] text-[var(--accent-positive)] border-[var(--accent-positive-border)]',
    warning:
      'bg-[var(--accent-warning-bg)] text-[var(--accent-warning)] border-[var(--accent-warning-border)]',
    danger:
      'bg-[var(--accent-danger-bg)] text-[var(--accent-danger)] border-[var(--accent-danger-border)]',
    'pill-outline':
      'bg-[var(--surface-card)] text-[var(--brand-deep-current)] border border-[var(--brand-sky-blue)] shadow-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border tabular-nums transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 w-3.5 h-3.5 items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
