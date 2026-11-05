import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
  hoverEffect?: boolean;
  variant?: 'default' | 'elevated' | 'subtle' | 'pill' | 'accent' | 'blue';
}

const VARIANTS = {
  default: 'bg-[var(--surface-card)] border border-[var(--border-card)] rounded-[var(--radius-lg)]',
  elevated: 'bg-[var(--surface-card)] border border-[var(--border-card)] rounded-[var(--radius-lg)]',
  subtle: 'bg-[var(--surface-card-subtle)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]',
  pill: 'bg-[var(--surface-card)] border border-[var(--border-pill)] rounded-full',
  accent: 'bg-[var(--surface-tint)] border border-[var(--brand-blue-soft)]/60 rounded-[var(--radius-lg)]',
  blue: 'on-blue bg-[var(--brand-blue)] text-[var(--ink-inverse)] rounded-[var(--radius-lg)]',
};

export function Card({ ref, className, hoverEffect = false, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden p-5 sm:p-6',
        VARIANTS[variant],
        hoverEffect && 'transition-colors duration-150 hover:border-[var(--border-strong)] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-5', className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-bold tracking-tight text-[var(--ink-primary)]', className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-[var(--ink-muted)] leading-relaxed', className)} {...props}>{children}</p>;
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4', className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]', className)} {...props}>
      {children}
    </div>
  );
}
