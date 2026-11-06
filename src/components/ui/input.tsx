'use client';

import * as React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

/** Types whose text can be measured. Numbers and dates expose no caret position. */
const TEXT_TYPES = new Set([undefined, 'text', 'search', 'email', 'url', 'tel']);
const CARET_SPRING = { stiffness: 500, damping: 30, mass: 0.5 };

/**
 * A caret that glides between characters, adapted from Skiper 106 by Skiper UI
 * (https://skiper-ui.com/v1/skiper106). Free version, attribution is shown in the
 * site footers.
 *
 * Changes from the source: no dialkit control panel, no browser globals at import,
 * which break server rendering, and it is an overlay on the real input. The native
 * caret is hidden only while this one is showing, and stays for reduced motion,
 * forced colours and right-aligned fields.
 */
function SmoothCaret({ inputRef, value }: { inputRef: React.RefObject<HTMLInputElement | null>; value: unknown }) {
  const reduced = useReducedMotion();
  const target = useMotionValue(0);
  const x = useSpring(target, CARET_SPRING);
  const opacity = useMotionValue(0);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const placeRef = React.useRef<(jump?: boolean) => void>(() => {});

  React.useEffect(() => {
    const input = inputRef.current;
    const measure = measureRef.current;
    if (!input || !measure || reduced) return;
    if (window.matchMedia('(forced-colors: active)').matches) return;

    const place = (jump = false) => {
      if (document.activeElement !== input) return;
      const styles = window.getComputedStyle(input);
      if (styles.textAlign === 'right' || styles.textAlign === 'center') return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const index = input.selectionDirection === 'backward' ? start : end;
      measure.style.font = styles.font;
      measure.style.letterSpacing = styles.letterSpacing;
      measure.textContent = input.value.slice(0, index);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const inset = input.offsetLeft + input.clientLeft;
      const position = measure.offsetWidth + paddingLeft - input.scrollLeft;
      const visible = position >= paddingLeft - 1 && position <= input.clientWidth - paddingRight + 1;
      target.set(inset + position);
      if (jump) x.jump(inset + position);
      input.style.caretColor = 'transparent';
      opacity.set(start === end && visible ? 1 : 0);
    };
    const hide = () => {
      opacity.set(0);
      input.style.caretColor = '';
    };
    placeRef.current = place;

    const onFocus = () => place(true);
    const onChange = () => requestAnimationFrame(() => place());
    const fonts = () => place();
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', hide);
    input.addEventListener('input', onChange);
    input.addEventListener('scroll', onChange);
    document.addEventListener('selectionchange', onChange);
    document.fonts.addEventListener('loadingdone', fonts);
    const resize = new ResizeObserver(() => place());
    resize.observe(input);
    place(true);

    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', hide);
      input.removeEventListener('input', onChange);
      input.removeEventListener('scroll', onChange);
      document.removeEventListener('selectionchange', onChange);
      document.fonts.removeEventListener('loadingdone', fonts);
      resize.disconnect();
      placeRef.current = () => {};
      hide();
    };
  }, [inputRef, opacity, reduced, target, x]);

  // A value set from outside, such as clearing a search, moves the caret too.
  React.useEffect(() => {
    placeRef.current();
  }, [value]);

  return (
    <>
      <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre" />
      <motion.span aria-hidden className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--brand-blue)] forced-colors:hidden" style={{ x, opacity }} />
    </>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftAddon, rightAddon, id, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = Boolean(error);
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--ink-primary)]">{label}</label>}
        <div className="relative flex items-center">
          {leftAddon && <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--ink-muted)]">{leftAddon}</div>}
          <input
            id={inputId}
            ref={innerRef}
            type={type}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
            className={cn(
              'w-full h-11 px-4 rounded-[var(--radius-sm)] border bg-[var(--surface-elevated)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:border-transparent',
              'disabled:opacity-60 disabled:bg-[var(--surface-sunken)] disabled:cursor-not-allowed',
              type === 'number' && 'tabular-nums',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              hasError
                ? 'border-[var(--accent-danger)] focus-visible:ring-[var(--accent-danger)]'
                : 'border-[var(--border-field)] hover:border-[var(--border-strong)]',
              className,
            )}
            {...props}
          />
          {TEXT_TYPES.has(type) && <SmoothCaret inputRef={innerRef} value={props.value} />}
          {rightAddon && <div className="absolute right-3.5 flex items-center text-[var(--ink-muted)]">{rightAddon}</div>}
        </div>
        {error && <p id={`${inputId}-error`} className="text-xs text-[var(--accent-danger)]" role="alert">{error}</p>}
        {!error && helperText && <p id={`${inputId}-desc`} className="text-xs text-[var(--ink-muted)]">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
