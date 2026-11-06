'use client';

import { ConnectWalletDialog } from '@/components/auth/connect-wallet';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Link, List, LogOut, PiggyBank, Plus, Search, ShieldCheck, Sparks, Suitcase, User, ViewGrid, Wallet, HelpCircle } from 'iconoir-react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { requestNewMemory } from '@/lib/memory-draft';
import { cn } from '@/lib/utils';
import { useLedger } from './ledger-provider';
import { useSignOut } from './use-sign-out';

interface CommandItem {
  id: string;
  group: 'Actions' | 'Go to';
  label: string;
  keywords?: string;
  icon: typeof Plus;
  hint?: string;
  run: () => void;
}

/** A quick way to reach everything the app can do. Ctrl or Cmd + K opens it from anywhere. */
export function CommandMenu({ isOpen, onClose, onOpenGuide }: { isOpen: boolean; onClose: () => void; onOpenGuide: () => void }) {
  const router = useRouter();
  const [isWalletOpen, setIsWalletOpen] = React.useState(false);
  const pathname = usePathname();
  const { mode, setMode, isGuest } = useAppSession();
  const { openAddTransaction, openImportSui, openOtherChain } = useLedger();
  const { signOut } = useSignOut();
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const otherMode = mode === 'business' ? 'personal' : 'business';
  const items = React.useMemo<CommandItem[]>(() => {
    const go = (href: string) => () => router.push(href);
    if (isGuest) {
      return [
        { id: 'connect', group: 'Actions', label: 'Connect a wallet', keywords: 'sign in login slush suiet', icon: Wallet, run: () => setIsWalletOpen(true) },
        { id: 'guide', group: 'Actions', label: 'Open the guide', keywords: 'help how tutorial', icon: HelpCircle, run: onOpenGuide },
        { id: 'go-overview', group: 'Go to', label: 'Overview', keywords: 'dashboard home', icon: ViewGrid, run: go(`/${mode}`) },
        { id: 'go-transactions', group: 'Go to', label: 'Transactions', keywords: 'ledger', icon: List, run: go('/transactions') },
        { id: 'go-budgets', group: 'Go to', label: 'Budgets & goals', keywords: 'budget savings', icon: PiggyBank, run: go('/budgets') },
        { id: 'go-assistant', group: 'Go to', label: 'Assistant', keywords: 'ask chat ai', icon: Sparks, run: go('/assistant') },
        { id: 'go-memory', group: 'Go to', label: 'Memory', keywords: 'walrus rules', icon: Brain, run: go('/memory') },
        { id: 'go-proof', group: 'Go to', label: 'On-chain proof', keywords: 'verify sui tatum', icon: ShieldCheck, run: go('/verification') },
      ];
    }
    return [
      { id: 'add', group: 'Actions', label: 'Add a transaction', keywords: 'new expense income', icon: Plus, hint: 'N', run: openAddTransaction },
      { id: 'import', group: 'Actions', label: 'Import from Sui wallet', keywords: 'crypto fetch chain', icon: Wallet, run: openImportSui },
      { id: 'other-chain', group: 'Actions', label: 'Add a transaction from another chain', keywords: 'ethereum solana bitcoin hash crypto', icon: Link, run: openOtherChain },
      { id: 'memory', group: 'Actions', label: 'Save a memory', keywords: 'rule goal walrus remember', icon: Brain, run: () => requestNewMemory(router) },
      {
        id: 'switch',
        group: 'Actions',
        label: `Switch to ${otherMode === 'business' ? 'Business' : 'Personal'}`,
        keywords: 'workspace mode',
        icon: otherMode === 'business' ? Suitcase : User,
        run: () => {
          if (pathname === '/personal' || pathname === '/business') router.push(`/${otherMode}`);
          else setMode(otherMode);
        },
      },
      { id: 'guide', group: 'Actions', label: 'Open the guide', keywords: 'help how tutorial', icon: HelpCircle, run: onOpenGuide },
      { id: 'sign-out', group: 'Actions', label: 'Sign out', keywords: 'log out wallet', icon: LogOut, run: () => void signOut() },
      { id: 'go-overview', group: 'Go to', label: 'Overview', keywords: 'dashboard home', icon: ViewGrid, run: go(`/${mode}`) },
      { id: 'go-transactions', group: 'Go to', label: 'Transactions', keywords: 'ledger', icon: List, run: go('/transactions') },
      { id: 'go-budgets', group: 'Go to', label: mode === 'business' ? 'Spend limit & goals' : 'Budgets & goals', keywords: 'budget savings', icon: PiggyBank, run: go('/budgets') },
      { id: 'go-assistant', group: 'Go to', label: 'Assistant', keywords: 'ask chat ai', icon: Sparks, run: go('/assistant') },
      { id: 'go-memory', group: 'Go to', label: 'Memory', keywords: 'walrus rules', icon: Brain, run: go('/memory') },
      { id: 'go-proof', group: 'Go to', label: 'On-chain proof', keywords: 'verify sui tatum', icon: ShieldCheck, run: go('/verification') },
    ];
  }, [isGuest, mode, otherMode, pathname, router, setMode, signOut, openAddTransaction, openImportSui, openOtherChain, onOpenGuide]);

  const needle = query.trim().toLowerCase();
  const visible = needle ? items.filter((item) => `${item.label} ${item.keywords ?? ''}`.toLowerCase().includes(needle)) : items;
  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0));

  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  React.useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return <ConnectWalletDialog isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />;

  const close = () => {
    setQuery('');
    setActive(0);
    onClose();
  };
  const runItem = (item: CommandItem) => {
    close();
    item.run();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(visible.length ? (activeIndex + 1) % visible.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(visible.length ? (activeIndex - 1 + visible.length) % visible.length : 0);
    } else if (event.key === 'Enter' && visible[activeIndex]) {
      event.preventDefault();
      runItem(visible[activeIndex]);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Command menu" className="fixed inset-0 z-[55] flex items-start justify-center px-3 pt-[max(10dvh,calc(var(--safe-top)+1rem))]" onKeyDown={handleKeyDown}>
      <div className="fixed inset-0 bg-[var(--ink-primary)]/35" onClick={close} aria-hidden="true" />
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 620, damping: 44, mass: 0.7 }}
        className="relative w-full max-w-lg overflow-hidden border border-transparent rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={visible[activeIndex] ? `command-${visible[activeIndex].id}` : undefined}
            aria-label="Search actions and pages"
            placeholder="Search actions and pages…"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            className="h-12 w-full bg-transparent text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none"
          />
          <kbd className="rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 font-sans text-[11px] text-[var(--ink-secondary)]">Esc</kbd>
        </div>
        <div ref={listRef} id="command-list" role="listbox" aria-label="Actions and pages" className="max-h-[50dvh] overflow-y-auto overscroll-contain p-2">
          {visible.length === 0 && <p className="px-3 py-6 text-center text-xs text-[var(--ink-muted)]">Nothing matches “{query}”.</p>}
          {visible.map((item, index) => {
            const Icon = item.icon;
            const startsGroup = index === 0 || visible[index - 1].group !== item.group;
            return (
              <React.Fragment key={item.id}>
                {startsGroup && <p role="presentation" className="px-3 pb-1 pt-2 text-[11px] font-semibold text-[var(--ink-muted)]">{item.group}</p>}
                <div
                  id={`command-${item.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onPointerMove={() => setActive(index)}
                  onClick={() => runItem(item)}
                  className={cn('flex h-10 cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm text-[var(--ink-primary)]', index === activeIndex && 'bg-[var(--surface-tint)]')}
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0 text-[var(--brand-blue)]" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <kbd className="rounded-md bg-[var(--surface-sunken)] px-1.5 py-0.5 font-sans text-[11px] text-[var(--ink-secondary)]">{item.hint}</kbd>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
