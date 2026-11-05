'use client';

import * as React from 'react';
import { financeApi, FinanceApiError, getFinanceApiMode } from '@/lib/finance-api';

interface CacheEntry {
  data: unknown;
  at: number;
}

/** In memory only, per workspace, and emptied on sign-out. Finance data is never persisted here. */
const cache = new Map<string, CacheEntry>();

export function clearFinanceCache() {
  cache.clear();
}

export interface FinanceResource<T> {
  data: T | null;
  /** Nothing to show yet. */
  isLoading: boolean;
  /** Showing cached figures while newer ones load. */
  isRefreshing: boolean;
  error: string | null;
  isOffline: boolean;
  updatedAt: number | null;
  refresh: () => Promise<void>;
}

/**
 * Shows what is already known straight away and refreshes behind it, so moving
 * between pages does not blank the figures. A failed refresh keeps them on screen.
 * Pass null to skip loading.
 */
export function useFinanceResource<T>(path: string | null, version: number = 0): FinanceResource<T> {
  const key = path ? `${getFinanceApiMode()}:${path}` : null;
  const [entry, setEntry] = React.useState<CacheEntry | null>(() => (key ? cache.get(key) ?? null : null));
  const [isFetching, setIsFetching] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  const latest = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!path || !key) return;
    const request = ++latest.current;
    setIsFetching(true);
    try {
      const data = await financeApi<T>(path);
      if (request !== latest.current) return;
      const next = { data, at: Date.now() };
      cache.set(key, next);
      setEntry(next);
      setError(null);
      setIsOffline(false);
    } catch (cause) {
      if (request !== latest.current) return;
      setError(cause instanceof Error ? cause.message : 'This could not be loaded.');
      setIsOffline(cause instanceof FinanceApiError && cause.offline);
    } finally {
      if (request === latest.current) setIsFetching(false);
    }
  }, [path, key]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, version]);

  return {
    data: (entry?.data as T | undefined) ?? null,
    isLoading: !entry && isFetching,
    isRefreshing: Boolean(entry) && isFetching,
    error,
    isOffline,
    updatedAt: entry?.at ?? null,
    refresh,
  };
}
