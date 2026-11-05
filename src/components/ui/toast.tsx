'use client';

import * as React from 'react';
import { CheckCircle, InfoCircle, WarningCircle, WarningTriangle, Xmark } from 'iconoir-react';
import { cn } from '@/lib/utils';

export interface ToastOptions {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description?: string;
  /** A short secondary action, such as Undo. */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastMessage extends ToastOptions {
  id: string;
}

interface ToastContextType {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

const ICONS = {
  success: { icon: CheckCircle, color: 'text-[var(--accent-positive)]' },
  warning: { icon: WarningTriangle, color: 'text-[var(--accent-warning)]' },
  error: { icon: WarningCircle, color: 'text-[var(--accent-danger)]' },
  info: { icon: InfoCircle, color: 'text-[var(--brand-blue)]' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback((options: ToastOptions) => {
    const id = `toast-${globalThis.crypto.randomUUID()}`;
    setToasts((previous) => [...previous, { ...options, id }]);
    setTimeout(() => dismiss(id), options.durationMs ?? 4000);
    return id;
  }, [dismiss]);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="region" aria-label="Notifications" className="fixed bottom-[calc(5.5rem+var(--safe-bottom))] lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[60] flex flex-col gap-2 sm:w-96 pointer-events-none">
        {toasts.map((item) => {
          const { icon: Icon, color } = ICONS[item.type];
          return (
            <div key={item.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-card)] bg-[var(--surface-elevated)] p-3.5 shadow-[var(--shadow-hero)] [animation:page-enter_180ms_var(--ease-out)]">
              <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', color)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-[var(--ink-primary)]">{item.title}</p>
                {item.description && <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--ink-secondary)]">{item.description}</p>}
              </div>
              {item.action && (
                <button
                  type="button"
                  onClick={() => { item.action?.onClick(); dismiss(item.id); }}
                  className="hit shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-[var(--brand-blue)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  {item.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss notification" className="hit shrink-0 rounded-full p-0.5 text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink-primary)] cursor-pointer">
                <Xmark className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
