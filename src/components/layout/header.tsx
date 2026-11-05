'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, LogOut } from 'lucide-react';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAppSession } from '@/components/auth/app-session-guard';
import { useLedger } from './ledger-provider';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Overview', subtitle: 'Your month at a glance, and what to do next.' },
  '/personal': { title: 'Overview', subtitle: 'Your month at a glance, and what to do next.' },
  '/business': { title: 'Business overview', subtitle: 'Revenue, costs, burn and runway, from your own records.' },
  '/transactions': { title: 'Transactions', subtitle: 'Everything you have earned and spent.' },
  '/budgets': { title: 'Budgets & Goals', subtitle: 'Your monthly spending limit and what you are saving for.' },
  '/assistant': { title: 'Assistant', subtitle: 'Ask about your money. Exact sums from your ledger, guided by your memories.' },
  '/memory': { title: 'Memory', subtitle: 'The rules and goals Memeora remembers for you, stored on Walrus.' },
  '/verification': { title: 'On-chain proof', subtitle: 'Check your memories on Sui Mainnet, read through Tatum.' },
};

const businessTitles: Record<string, { title: string; subtitle: string }> = {
  '/transactions': { title: 'Transactions', subtitle: 'Everything the business has earned and spent.' },
  '/budgets': { title: 'Spend limit & goals', subtitle: 'Your monthly spend limit and what the business is working towards.' },
  '/assistant': { title: 'Assistant', subtitle: 'Ask about the business. Exact sums from your ledger, guided by your business memories.' },
  '/memory': { title: 'Business memory', subtitle: 'How you run the business, stored on Walrus apart from your personal memories.' },
  '/verification': { title: 'On-chain proof', subtitle: 'Check your business memories on Sui Mainnet, read through Tatum.' },
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const dAppKit = useDAppKit();
  const { walletAddress, mode } = useAppSession();
  const { openAddTransaction } = useLedger();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const currentKey = Object.keys(routeTitles).find((key) => pathname === key || pathname.startsWith(`${key}/`)) ?? '/dashboard';
  const { title, subtitle } = (mode === 'business' && businessTitles[currentKey]) || routeTitles[currentKey];

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      // Revoke the Memeora session on the server first; that is what signs out.
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || result?.data?.signedOut !== true) throw new Error(result?.data?.message ?? 'Could not end the Memeora session.');
      // After a page reload the wallet may not be connected in this tab; nothing to disconnect then.
      await dAppKit.disconnectWallet().catch(() => undefined);
      router.replace('/sign-in');
      router.refresh();
    } catch (cause) {
      toast({ type: 'warning', title: 'Sign out failed', description: cause instanceof Error ? cause.message : 'Please try again.' });
      setIsSigningOut(false);
    }
  };

  return (
    <header className="h-20 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="min-w-0">
        <h1 className="truncate text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--ink-primary)]">{title}</h1>
        <p className="hidden md:block truncate text-xs text-[var(--ink-muted)] font-medium mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {walletAddress && (
          <Badge variant="pill-outline" className="hidden lg:inline-flex font-mono text-xs" title={walletAddress}>
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </Badge>
        )}
        <Button variant="primary" size="pill" aria-label="Add transaction" onClick={openAddTransaction} leftIcon={<Plus className="w-4 h-4" />}>
          <span className="hidden sm:inline">Add transaction</span>
        </Button>
        <Button variant="outline" size="sm" aria-label="Sign out" disabled={isSigningOut} onClick={handleSignOut} leftIcon={<LogOut className="w-4 h-4" />}>
          <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
        </Button>
      </div>
    </header>
  );
}
