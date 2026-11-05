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

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius-md)] bg-[var(--surface-well)]', className)}>
      {icon && <div className="mb-3 text-[var(--brand-blue)]">{icon}</div>}
      <h4 className="text-sm font-bold text-[var(--ink-primary)] mb-1">{title}</h4>
      <p className={cn('text-xs text-[var(--ink-secondary)] max-w-sm leading-relaxed', actionLabel && onAction && 'mb-4')}>{description}</p>
      {actionLabel && onAction && <Button variant="primary" size="sm" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
