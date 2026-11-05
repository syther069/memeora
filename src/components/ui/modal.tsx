'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--brand-deep-current)]/25 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={cn(
          // Scrolls inside itself, so Save stays reachable on short screens.
          'max-h-[calc(100dvh-2rem)] overflow-y-auto',
          'relative w-full max-w-lg bg-gradient-to-b from-white via-white to-[#f7faff] border border-[var(--brand-sky-blue)]/80 rounded-2xl sm:rounded-3xl shadow-[var(--shadow-modal)] p-6 sm:p-8',
          'z-10 animate-in fade-in-0 zoom-in-95 duration-200 focus:outline-none ring-1 ring-white/90 ring-inset',
          className
        )}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sky-tint)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
