import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'pill';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    // A ref, not state: disabling the button during its own click would stop the
    // browser submitting the form, so a submit button would silently do nothing.
    const isGuarded = React.useRef(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled || isGuarded.current) {
        e.preventDefault();
        return;
      }
      isGuarded.current = true;
      setTimeout(() => { isGuarded.current = false; }, 500);
      onClick?.(e);
    };

    const variantStyles = {
      primary:
        'bg-[var(--brand-deep-current)] text-white font-semibold hover:bg-[var(--accent-primary-hover)] shadow-[var(--shadow-sm)] active:scale-[0.98]',
      secondary:
        'bg-[var(--surface-card)] text-[var(--brand-deep-current)] font-semibold border border-[var(--brand-sky-blue)]/80 hover:bg-[var(--surface-sky-solid)] hover:border-[var(--brand-bright-current)] shadow-[var(--shadow-sm)] active:scale-[0.98]',
      accent:
        'bg-[var(--brand-bright-current)] text-white font-semibold hover:bg-[var(--accent-interactive-hover)] shadow-[var(--shadow-sm)] active:scale-[0.98]',
      outline:
        'bg-transparent text-[var(--ink-secondary)] font-medium hover:text-[var(--brand-deep-current)] hover:bg-[var(--surface-sky-tint)] border border-[var(--border-card)] active:scale-[0.98]',
      ghost:
        'bg-transparent text-[var(--ink-secondary)] hover:text-[var(--brand-deep-current)] hover:bg-[var(--surface-sky-tint)] active:scale-[0.98]',
      danger:
        'bg-[var(--accent-danger)] text-white font-semibold hover:opacity-95 shadow-[var(--shadow-sm)] active:scale-[0.98]',
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-[var(--radius-sm)]',
      md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-md)]',
      lg: 'h-12 px-6 text-base gap-2.5 rounded-[var(--radius-lg)]',
      pill: 'h-10 px-5 text-sm gap-2 rounded-full',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] focus-visible:outline-offset-2',
          'disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
