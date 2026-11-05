'use client';

import * as React from 'react';
import { Check, Copy, LogOut, NavArrowDown, Wallet } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useSignOut } from './use-sign-out';

/**
 * One button for the wallet: it shows the address and opens its actions, Copy
 * address and Sign out. A menu, so a stray click on the address cannot sign anyone out.
 */
export function AccountMenu({ walletAddress }: { walletAddress: string }) {
  const { toast } = useToast();
  const { signOut, isSigningOut } = useSignOut();
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = React.useId();

  React.useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ type: 'error', title: 'The address was not copied', description: 'Your browser did not allow clipboard access.' });
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        // Tabbing past the last action closes the menu; it never holds focus in.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setIsOpen(false);
      }}
    >
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        allowRepeatClicks
        aria-label={`Wallet ${walletAddress}: copy address or sign out`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        leftIcon={<Wallet aria-hidden className="h-4 w-4" />}
        rightIcon={<NavArrowDown aria-hidden className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />}
        className="font-mono"
      >
        {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
      </Button>

      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-[var(--radius-md)] border border-[var(--border-card)] bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-modal)] [animation:account-menu-enter_140ms_var(--ease-out)]"
        >
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-[var(--ink-secondary)]">Signed in with</p>
          <p className="break-all px-2 pb-2 font-mono text-xs text-[var(--ink-primary)]">{walletAddress}</p>
          <Button variant="ghost" size="md" allowRepeatClicks onClick={() => void copyAddress()} leftIcon={copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />} className="w-full justify-start">
            <span aria-live="polite">{copied ? 'Address copied' : 'Copy address'}</span>
          </Button>
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <Button variant="ghost" size="md" isLoading={isSigningOut} onClick={() => void signOut()} leftIcon={<LogOut aria-hidden className="h-4 w-4" />} className="w-full justify-start">
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      )}
    </div>
  );
}
