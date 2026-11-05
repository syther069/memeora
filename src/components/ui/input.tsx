import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftAddon, rightAddon, id, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-[var(--ink-primary)]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--ink-muted)]">
              {leftAddon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
            className={cn(
              'w-full bg-[var(--surface-card)] border rounded-xl text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)]',
              'h-11 px-4 transition-all duration-150 shadow-xs font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright-current)] focus-visible:border-transparent',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              hasError
                ? 'border-[var(--accent-danger)] focus-visible:ring-[var(--accent-danger)]'
                : 'border-[var(--brand-sky-blue)]/70 hover:border-[var(--brand-bright-current)]/60',
              className
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-[var(--ink-muted)]">
              {rightAddon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--accent-danger)] font-medium" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-desc`} className="text-xs text-[var(--ink-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
