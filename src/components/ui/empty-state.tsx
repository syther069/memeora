import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[var(--brand-sky-blue)]/80 bg-[var(--surface-cloud-solid)]/60',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--brand-sky-blue)]/60 flex items-center justify-center text-[var(--brand-deep-current)] mb-4 shadow-xs">
          {icon}
        </div>
      )}
      <h4 className="text-base sm:text-lg font-bold text-[var(--ink-primary)] mb-1.5">{title}</h4>
      <p className="text-xs sm:text-sm text-[var(--ink-muted)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="pill" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
