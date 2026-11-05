'use client';

import * as React from 'react';
import { Refresh, WarningTriangle, WifiOff } from 'iconoir-react';
import { Button } from './button';
import { Spinner } from './spinner';

/** A failed load, next to what it affects, with a way to retry. */
export function LoadErrorPanel({ title, message, offline, onRetry }: { title: string; message: string; offline?: boolean; onRetry: () => void | Promise<unknown> }) {
  // A failed request does not prove the device is offline, so ask the browser too.
  const isOffline = Boolean(offline) && typeof navigator !== 'undefined' && !navigator.onLine;
  const Icon = isOffline ? WifiOff : WarningTriangle;
  const [isRetrying, setIsRetrying] = React.useState(false);
  const retry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-warning)]" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--accent-warning)]">{isOffline ? 'You seem to be offline' : title}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">{message}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" isLoading={isRetrying} onClick={() => void retry()} leftIcon={<Refresh className="h-3.5 w-3.5" />}>Try again</Button>
    </div>
  );
}

function timeOf(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Says how fresh the figures on screen are, and when a refresh failed that they are older. */
export function FreshnessNote({ updatedAt, isRefreshing, refreshFailed, onRetry }: { updatedAt: number | null; isRefreshing: boolean; refreshFailed: boolean; onRetry: () => void }) {
  if (!updatedAt) return null;
  if (isRefreshing) {
    return <p role="status" className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]"><Spinner size={12} />Refreshing figures from {timeOf(updatedAt)}…</p>;
  }
  if (refreshFailed) {
    return (
      <p role="status" className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--accent-warning)]">
        <WarningTriangle aria-hidden className="h-3.5 w-3.5" />Could not refresh. Showing figures from {timeOf(updatedAt)}.
        <button type="button" onClick={onRetry} className="hit font-bold underline cursor-pointer">Try again</button>
      </p>
    );
  }
  return <p className="text-xs text-[var(--ink-muted)]">Updated {timeOf(updatedAt)}</p>;
}
