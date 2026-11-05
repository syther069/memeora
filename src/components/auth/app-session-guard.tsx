'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { isAppMode, type AppMode } from '@/lib/app-mode';
import { setFinanceApiMode } from '@/lib/finance-api';
import type { CurrencyCode } from '@/modules/finance/domain/money';

type SessionState = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

interface AppSession {
  walletAddress: string | null;
  preferredCurrency: CurrencyCode;
  /** The active workspace. Every finance request carries it. */
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  /** The onboarding page reports that setup is finished or deferred. */
  markOnboardingSettled: (preferredCurrency?: CurrencyCode, mode?: AppMode) => void;
}

const AppSessionContext = React.createContext<AppSession>({
  walletAddress: null,
  preferredCurrency: 'INR',
  mode: 'personal',
  setMode: () => undefined,
  markOnboardingSettled: () => undefined,
});

export function useAppSession() {
  return React.useContext(AppSessionContext);
}

/**
 * Checks the wallet session and onboarding once when the signed-in area opens
 * (each check costs several database round trips), then keeps the answer while
 * the user moves between pages. Pages render only when they are allowed to, so
 * a page that is about to be redirected away never starts loading data.
 */
export function AppSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = React.useState<SessionState>('checking');
  const [onboardingRequired, setOnboardingRequired] = React.useState(false);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [preferredCurrency, setPreferredCurrency] = React.useState<CurrencyCode>('INR');
  const [mode, setModeState] = React.useState<AppMode>('personal');
  const [retry, setRetry] = React.useState(0);
  const firstPath = React.useRef(pathname);

  React.useEffect(() => {
    let active = true;
    const check = async () => {
      setState('checking');
      try {
        // The HttpOnly wallet session cookie is sent automatically on same-origin requests.
        // Both at once: together they cost several database round trips.
        const [response, onboardingResponse] = await Promise.all([
          fetch('/api/auth/session', { cache: 'no-store' }),
          fetch('/api/onboarding', { cache: 'no-store' }),
        ]);
        const result = await response.json();
        if (!response.ok || result?.success !== true) throw new Error('Session check failed');
        if (!active) return;
        if (!result.data.authenticated) {
          setState('unauthenticated');
          router.replace(`/sign-in?next=${encodeURIComponent(firstPath.current || '/dashboard')}`);
          return;
        }
        const onboarding = await onboardingResponse.json();
        if (!onboardingResponse.ok || onboarding?.success !== true) throw new Error('Onboarding check failed');
        if (!active) return;
        setWalletAddress(result.data.walletAddress);
        setPreferredCurrency(onboarding.data.profile?.preferred_currency === 'USD' ? 'USD' : 'INR');
        const savedMode = onboarding.data.profile?.active_mode;
        if (isAppMode(savedMode)) {
          setFinanceApiMode(savedMode);
          setModeState(savedMode);
        }
        setOnboardingRequired(Boolean(onboarding.data.onboardingRequired));
        setState('authenticated');
      } catch {
        if (active) setState('error');
      }
    };
    void check();
    return () => { active = false; };
  }, [retry, router]);

  // Only remembers the last choice; a failure changes nothing on screen.
  const rememberMode = React.useCallback((next: AppMode) => {
    void fetch('/api/profile/mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next }),
    }).catch(() => undefined);
  }, []);

  const applyMode = React.useCallback((next: AppMode) => {
    setFinanceApiMode(next);
    setModeState(next);
    rememberMode(next);
  }, [rememberMode]);

  // Opening an overview's address makes that workspace active, before its page loads data.
  const routeMode: AppMode | null = pathname === '/business' ? 'business' : pathname === '/personal' ? 'personal' : null;
  if (state === 'authenticated' && routeMode !== null && routeMode !== mode) {
    // Adjusted while rendering, so no page ever loads with the other workspace's data.
    setFinanceApiMode(routeMode);
    setModeState(routeMode);
  }
  const isAuthenticated = state === 'authenticated';
  React.useEffect(() => {
    if (isAuthenticated && routeMode) rememberMode(routeMode);
  }, [isAuthenticated, routeMode, rememberMode]);

  const mustOnboard = state === 'authenticated' && onboardingRequired && pathname !== '/onboarding';
  const alreadyOnboarded = state === 'authenticated' && !onboardingRequired && pathname === '/onboarding';

  React.useEffect(() => {
    if (mustOnboard) router.replace('/onboarding');
    else if (alreadyOnboarded) router.replace('/dashboard');
  }, [mustOnboard, alreadyOnboarded, router]);

  const session = React.useMemo<AppSession>(() => ({
    walletAddress,
    preferredCurrency,
    mode,
    setMode: applyMode,
    markOnboardingSettled: (currency, nextMode) => {
      if (currency) setPreferredCurrency(currency);
      if (nextMode) {
        setFinanceApiMode(nextMode);
        setModeState(nextMode);
      }
      setOnboardingRequired(false);
    },
  }), [walletAddress, preferredCurrency, mode, applyMode]);

  if (state === 'authenticated' && !mustOnboard && !alreadyOnboarded) {
    return <AppSessionContext.Provider value={session}>{children}</AppSessionContext.Provider>;
  }
  if (state === 'error') return <main className="grid min-h-dvh place-items-center p-6"><div className="max-w-sm text-center"><h1 className="text-xl font-bold text-[var(--ink-primary)]">Could not check your session</h1><p className="mt-2 text-sm text-[var(--ink-secondary)]">Check your connection, then try again. Nothing you saved was lost.</p><button type="button" className="mt-4 h-10 rounded-full bg-[var(--brand-blue)] px-5 text-sm font-semibold text-[var(--ink-inverse)] hover:bg-[var(--brand-blue-hover)] cursor-pointer" onClick={() => setRetry((value) => value + 1)}>Check session again</button></div></main>;
  return <main className="grid min-h-dvh place-items-center p-6 text-[var(--brand-blue)]" aria-live="polite"><p className="flex items-center gap-2.5 text-sm text-[var(--ink-secondary)]"><Spinner size={20} className="text-[var(--brand-blue)]" />Opening your workspace…</p></main>;
}
