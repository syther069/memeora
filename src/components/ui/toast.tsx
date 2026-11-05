'use client';

import * as React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ type, title, description }: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        role="region"
        aria-label="Notifications"
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto p-4 rounded-2xl border shadow-[var(--shadow-hero)] flex items-start gap-3 bg-white/95 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ring-1 ring-white/90 ring-inset',
                t.type === 'success' && 'border-[var(--brand-sky-blue)]',
                t.type === 'warning' && 'border-[var(--accent-warning-border)]',
                t.type === 'info' && 'border-[var(--brand-sky-blue)]'
              )}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && (
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-positive-bg)] text-[var(--accent-positive)] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {t.type === 'warning' && (
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-warning-bg)] text-[var(--accent-warning)] flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {t.type === 'info' && (
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-sky-solid)] text-[var(--brand-deep-current)] flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--ink-primary)] leading-tight">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-[var(--ink-muted)] mt-0.5 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sky-tint)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
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
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

