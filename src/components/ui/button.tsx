import * as React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'cream';
  size?: 'sm' | 'md' | 'lg' | 'pill';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** For harmless repeat actions such as paging. Keep the guard on anything that saves. */
  allowRepeatClicks?: boolean;
}

const VARIANTS = {
  primary: 'bg-[var(--brand-blue)] text-[var(--ink-inverse)] font-semibold hover:bg-[var(--brand-blue-hover)] active:bg-[var(--brand-blue-pressed)]',
  accent: 'bg-[var(--brand-blue)] text-[var(--ink-inverse)] font-semibold hover:bg-[var(--brand-blue-hover)] active:bg-[var(--brand-blue-pressed)]',
  secondary: 'bg-[var(--surface-tint)] text-[var(--brand-blue)] font-semibold hover:bg-[var(--brand-blue-soft)]/60 active:bg-[var(--brand-blue-soft)]',
  outline: 'bg-transparent text-[var(--ink-primary)] font-medium border border-[var(--border-pill)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:bg-[var(--surface-tint)]',
  ghost: 'bg-transparent text-[var(--ink-secondary)] font-medium hover:text-[var(--ink-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-tint)]',
  danger: 'bg-[var(--accent-danger)] text-white font-semibold hover:brightness-95 active:brightness-90',
  cream: 'bg-[var(--brand-cream)] text-[var(--brand-blue)] font-semibold hover:bg-white active:bg-[var(--surface-sunken)]',
};

const SIZES = {
  sm: 'hit h-9 px-3.5 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-4 text-sm gap-2 rounded-full',
  lg: 'h-12 px-6 text-sm gap-2.5 rounded-full',
  pill: 'h-10 px-5 text-sm gap-2 rounded-full',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading = false, disabled, leftIcon, rightIcon, allowRepeatClicks = false, children, onClick, ...props },
    ref,
  ) => {
    // A ref, not state: disabling the button during its own click would stop the
    // browser submitting the form, so a submit button would silently do nothing.
    const isGuarded = React.useRef(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled || isGuarded.current) {
        event.preventDefault();
        return;
      }
      if (!allowRepeatClicks) {
        isGuarded.current = true;
        setTimeout(() => { isGuarded.current = false; }, 500);
      }
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,transform,filter] duration-150 cursor-pointer',
          'active:scale-[0.98] motion-reduce:active:scale-100',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]',
          'disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {/* The label stays while loading, so the user can still read what is happening. */}
        {isLoading ? <Spinner size={16} /> : leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
