'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { ArrowRight, Check, ShieldCheck, Wallet } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

async function readApiResult(response: Response) {
  const result = await response.json();
  if (!response.ok || result?.success !== true) throw new Error(result?.error?.message ?? 'The request could not be completed.');
  return result.data;
}

const INSTALLABLE_WALLETS = [
  { name: 'Suiet', href: 'https://suiet.app' },
  { name: 'Phantom', href: 'https://phantom.com' },
  { name: 'Nightly', href: 'https://nightly.app' },
];

/** Wallet sign-in: connect, then sign a free message. Opens over whichever page the visitor is on. */
export function ConnectWalletDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const wallets = useWallets();
  const [connectingWallet, setConnectingWallet] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);
  const [error, setError] = React.useState('');

  const connect = async (walletName: string) => {
    const wallet = wallets.find((candidate) => candidate.name === walletName);
    if (!wallet) return;
    setError('');
    setConnectingWallet(wallet.name);
    try {
      await dAppKit.connectWallet({ wallet });
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'UserRejectedRequestError'
        ? 'Wallet connection was cancelled. Connect again when you are ready.'
        : 'Wallet connection was not completed. Unlock your wallet and try again.');
    } finally {
      setConnectingWallet(null);
    }
  };

  const signIn = async () => {
    if (!account) return;
    setError('');
    setSigningIn(true);
    try {
      const challenge = await readApiResult(await fetch('/api/auth/wallet/challenge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account.address }),
      }));
      const signed = await dAppKit.signPersonalMessage({
        message: new TextEncoder().encode(challenge.message),
        account,
        network: 'mainnet',
      });
      await readApiResult(await fetch('/api/auth/wallet/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account.address, nonce: challenge.nonce, signature: signed.signature }),
      }));
      // A full load, so the session guard reads the new session. From the landing page, go to the app.
      window.location.assign(window.location.pathname === '/' ? '/dashboard' : window.location.pathname);
    } catch (cause) {
      const rejected = cause instanceof Error && /reject|denied|cancel/i.test(`${cause.name} ${cause.message}`);
      setError(rejected
        ? 'You cancelled the signature. Click “Sign in with this wallet” when you are ready.'
        : cause instanceof Error ? cause.message : 'Wallet sign-in could not be completed. Please retry.');
      setSigningIn(false);
    }
  };

  // Installed wallets first, so a wallet someone already has is the easy choice.
  const supportedWallets = [...wallets].sort((a, b) => Number(/slush/i.test(a.name)) - Number(/slush/i.test(b.name)));
  const installable = INSTALLABLE_WALLETS.filter((option) => !wallets.some(({ name }) => name.toLowerCase().includes(option.name.toLowerCase())));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? 'Prove this wallet is yours' : 'Connect your Sui wallet'}
      description={account ? 'Your wallet will ask you to sign a message. It is free: it sends no transaction and spends no SUI.' : 'Your wallet is your account. There is no password to create.'}
    >
      {account ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--accent-positive-border)] bg-[var(--accent-positive-bg)] p-3.5">
            <Check aria-hidden className="h-5 w-5 shrink-0 text-[var(--accent-positive)]" />
            <div className="min-w-0"><p className="text-xs font-semibold text-[var(--accent-positive)]">Wallet connected</p><p className="mt-0.5 truncate font-mono text-xs text-[var(--ink-primary)]">{account.address}</p></div>
          </div>
          <Button type="button" size="lg" className="w-full" isLoading={signingIn} onClick={() => void signIn()} rightIcon={<ArrowRight className="h-4 w-4" />}>Sign in with this wallet</Button>
          <button type="button" disabled={signingIn} onClick={() => { setError(''); void dAppKit.disconnectWallet(); }} className="hit mx-auto block text-xs font-semibold text-[var(--brand-blue)] hover:underline disabled:opacity-50 cursor-pointer">Use a different wallet</button>
        </div>
      ) : supportedWallets.length > 0 ? (
        <div className="space-y-2.5">
          {supportedWallets.map((wallet) => (
            <Button key={wallet.name} type="button" size="lg" variant="outline" className="w-full justify-between" disabled={Boolean(connectingWallet)} isLoading={connectingWallet === wallet.name} onClick={() => void connect(wallet.name)} rightIcon={<ArrowRight className="h-4 w-4" />}>
              <span className="flex items-center gap-3"><Wallet aria-hidden className="h-4 w-4" />Connect with {wallet.name}</span>
            </Button>
          ))}
        </div>
      ) : (
        <div role="status" className="rounded-[var(--radius-md)] bg-[var(--surface-well)] p-4 text-sm leading-relaxed text-[var(--ink-secondary)]">
          No Sui wallet was found in this browser. Install or unlock one, then reload this page.
        </div>
      )}

      {!account && installable.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-[var(--ink-secondary)]">
          Need a wallet? Install{' '}
          {installable.map((option, index) => (
            <span key={option.name}>
              {index > 0 && (index === installable.length - 1 ? ' or ' : ', ')}
              <a href={option.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--brand-blue)] underline">{option.name}</a>
            </span>
          ))}
          , then reload this page.
        </p>
      )}

      {error && <p role="alert" className="mt-3 rounded-[var(--radius-sm)] border border-[var(--accent-danger-border)] bg-[var(--accent-danger-bg)] p-3 text-sm text-[var(--accent-danger)]">{error}</p>}
      <div className="mt-5 flex items-start gap-2.5 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--ink-muted)]"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]" /><p>Memeora never asks for your recovery phrase or private key. Each wallet has its own private workspace.</p></div>
    </Modal>
  );
}

/** A button that opens wallet sign-in, styled by the caller. */
export function ConnectWalletButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={`${className ?? ''} cursor-pointer`}>{children}</button>
      {/* In body, because a scaled ancestor on the landing page would misplace a fixed dialog. */}
      {isOpen && createPortal(<ConnectWalletDialog isOpen onClose={() => setIsOpen(false)} />, document.body)}
    </>
  );
}
