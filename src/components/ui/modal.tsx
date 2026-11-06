'use client';

import { Tooltip } from './tooltip';
import * as React from 'react';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { Xmark } from 'iconoir-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** How far, or how fast, a sheet must be pulled down before it closes. */
const DISMISS_DISTANCE_PX = 110;
const DISMISS_VELOCITY = 600;

/**
 * A dialog on larger screens and a bottom sheet on phones. The sheet can be pulled
 * down by its handle; the close button and Escape always work too.
 */
export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reducedMotion = useReducedMotion();
  const titleId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // A field marked autoFocus keeps its focus; otherwise focus moves into the dialog.
    if (panel && !panel.contains(document.activeElement)) panel.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="fixed inset-0 bg-[var(--ink-primary)]/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.15 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.8 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > DISMISS_DISTANCE_PX || info.velocity.y > DISMISS_VELOCITY) onClose();
        }}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }}
        className={cn(
          'relative z-10 w-full sm:max-w-lg border border-transparent bg-[var(--surface-card)] shadow-[var(--shadow-modal)] focus:outline-none',
          'max-h-[calc(100dvh-var(--safe-top)-1rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain',
          'rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] px-5 sm:px-7 pt-2 sm:pt-6 pb-[calc(1.25rem+var(--safe-bottom))] sm:pb-6',
          className,
        )}
      >
        {/* Pull-down handle, phones only. touch-none keeps the drag from scrolling the page. */}
        <div onPointerDown={(event) => dragControls.start(event)} className="sm:hidden -mx-5 mb-1 flex h-7 touch-none cursor-grab items-center justify-center" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-[var(--border-pill)]" />
        </div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--ink-primary)]">{title}</h2>}
            {description && <p className="text-xs text-[var(--ink-secondary)] mt-1 leading-relaxed">{description}</p>}
          </div>
          <Tooltip label="Close"><button type="button" onClick={onClose} aria-label="Close dialog" className="hit shrink-0 p-1.5 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
            <Xmark className="w-5 h-5" />
          </button></Tooltip>
        </div>
        <div>{children}</div>
      </motion.div>
    </div>
  );
}
