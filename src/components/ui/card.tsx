import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
  hoverEffect?: boolean;
  variant?: 'default' | 'elevated' | 'subtle' | 'pill' | 'accent';
}

export function Card({
  ref,
  className,
  hoverEffect = false,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      'bg-gradient-to-b from-white via-white to-[#f7faff] border border-[var(--brand-sky-blue)]/50 rounded-2xl sm:rounded-3xl shadow-[var(--shadow-card)] ring-1 ring-white/80 ring-inset',
    elevated:
      'bg-gradient-to-b from-white via-[#fdfefe] to-[#eef6fd] border border-[var(--brand-bright-current)]/35 rounded-2xl sm:rounded-3xl shadow-[var(--shadow-hero)] ring-1 ring-white/90 ring-inset',
    subtle:
      'bg-[var(--surface-card-subtle)] border border-[var(--border-subtle)] rounded-xl sm:rounded-2xl shadow-xs',
    pill:
      'bg-white border border-[var(--border-pill)] rounded-full shadow-[var(--shadow-pill)]',
    accent:
      'bg-gradient-to-b from-[#e3f2fd] via-[#f0f7ff] to-white border border-[var(--brand-sky-blue)]/70 rounded-2xl sm:rounded-3xl shadow-[var(--shadow-card)]',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden p-6 sm:p-7 transition-all duration-200',
        variantStyles[variant],
        hoverEffect &&
          'hover:shadow-[var(--shadow-hero)] hover:border-[var(--brand-bright-current)] hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-base sm:text-lg font-bold tracking-tight text-[var(--ink-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-[var(--ink-muted)] leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
