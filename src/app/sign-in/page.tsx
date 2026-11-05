'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { ArrowRight, Check, ShieldCheck, Wallet } from 'iconoir-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function safeDestination(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

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

const subscribeToNothing = () => () => undefined;
const getClientWalletSnapshot = () => true;
const getServerWalletSnapshot = () => false;

export default function SignInPage() {
  const router = useRouter();
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const wallets = useWallets();
  const [connectingWallet, setConnectingWallet] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);
  const [error, setError] = React.useState('');
  const walletRuntimeReady = React.useSyncExternalStore(
    subscribeToNothing,
    getClientWalletSnapshot,
    getServerWalletSnapshot,
  );
  const destination = typeof window === 'undefined' ? '/dashboard' : safeDestination(new URLSearchParams(window.location.search).get('next'));

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
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      const rejected = cause instanceof Error && /reject|denied|cancel/i.test(`${cause.name} ${cause.message}`);
      setError(rejected
        ? 'You cancelled the signature. Click “Sign in with this wallet” when you are ready.'
        : cause instanceof Error ? cause.message : 'Wallet sign-in could not be completed. Please retry.');
    } finally {
      setSigningIn(false);
    }
  };

  // Installed wallets first, so a wallet someone already has is the easy choice.
  const supportedWallets = [...wallets].sort((a, b) => Number(/slush/i.test(a.name)) - Number(/slush/i.test(b.name)));
  const installable = INSTALLABLE_WALLETS.filter((option) => !wallets.some(({ name }) => name.toLowerCase().includes(option.name.toLowerCase())));

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="on-blue relative hidden flex-col justify-between overflow-hidden bg-[var(--brand-blue)] p-10 text-[var(--ink-inverse)] lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <BrandMark tone="cream" />
          <span className="text-lg font-bold tracking-tight">Memeora</span>
        </div>
        <div className="relative z-10 max-w-lg">
          <p className="text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">A finance assistant that remembers.</p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/25 pt-6 text-sm">
            <div><dt className="font-semibold">Exact sums</dt><dd className="mt-1 text-xs leading-relaxed text-[var(--ink-on-blue-muted)]">From your ledger, never from AI.</dd></div>
            <div><dt className="font-semibold">Your rules</dt><dd className="mt-1 text-xs leading-relaxed text-[var(--ink-on-blue-muted)]">Kept on Walrus, in an account your wallet owns.</dd></div>
            <div><dt className="font-semibold">Proof</dt><dd className="mt-1 text-xs leading-relaxed text-[var(--ink-on-blue-muted)]">Check every memory on Sui, through Tatum.</dd></div>
          </dl>
        </div>
        <p className="text-xs text-[var(--ink-on-blue-muted)]">Personal and Business workspaces, kept apart.</p>
        <div aria-hidden className="absolute inset-y-0 right-0 w-40 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #f8f3f0 0 6px, transparent 6px 16px)' }} />
      </aside>

      <main className="flex flex-col justify-center px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(2rem+var(--safe-top))] sm:px-10">
        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <span className="text-lg font-bold tracking-tight text-[var(--ink-primary)]">Memeora</span>
          </div>
          <p className="text-xs font-semibold text-[var(--brand-blue)]">{account ? 'Step 2 of 2' : 'Step 1 of 2'} · Sui Mainnet</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink-primary)]">{account ? 'Prove this wallet is yours' : 'Connect your Sui wallet'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
            <span className="lg:hidden">Track your money with exact sums, and get advice that follows the rules you save on Walrus. </span>
            {account ? 'Your wallet will ask you to sign a message. It is free: it sends no transaction and spends no SUI.' : 'Your wallet is your account. There is no password to create.'}
          </p>

          {!walletRuntimeReady ? (
            <div role="status" className="mt-6 flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--surface-well)] p-4 text-sm text-[var(--ink-secondary)]"><Spinner size={18} className="text-[var(--brand-blue)]" />Looking for your Sui wallet…</div>
          ) : account ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--accent-positive-border)] bg-[var(--accent-positive-bg)] p-3.5">
                <Check aria-hidden className="h-5 w-5 shrink-0 text-[var(--accent-positive)]" />
                <div className="min-w-0"><p className="text-xs font-semibold text-[var(--accent-positive)]">Wallet connected</p><p className="mt-0.5 truncate font-mono text-xs text-[var(--ink-primary)]">{account.address}</p></div>
              </div>
              <Button type="button" size="lg" className="w-full" isLoading={signingIn} onClick={() => void signIn()} rightIcon={<ArrowRight className="h-4 w-4" />}>Sign in with this wallet</Button>
              <button type="button" disabled={signingIn} onClick={() => { setError(''); void dAppKit.disconnectWallet(); }} className="hit mx-auto block text-xs font-semibold text-[var(--brand-blue)] hover:underline disabled:opacity-50 cursor-pointer">Use a different wallet</button>
            </div>
          ) : supportedWallets.length > 0 ? (
            <div className="mt-6 space-y-2.5">
              {supportedWallets.map((wallet) => (
                <Button key={wallet.name} type="button" size="lg" variant="outline" className="w-full justify-between" disabled={Boolean(connectingWallet)} isLoading={connectingWallet === wallet.name} onClick={() => void connect(wallet.name)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  <span className="flex items-center gap-3"><Wallet aria-hidden className="h-4 w-4" />Connect with {wallet.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div role="status" className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-well)] p-4 text-sm leading-relaxed text-[var(--ink-secondary)]">
              No Sui wallet was found in this browser. Install or unlock one, then reload this page.
            </div>
          )}

          {walletRuntimeReady && !account && installable.length > 0 && (
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
          <div className="mt-6 flex items-start gap-2.5 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--ink-muted)]"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]" /><p>Memeora never asks for your recovery phrase or private key. Each wallet has its own private workspace.</p></div>
          <Link href="/dashboard" className="hit mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-blue)] hover:underline">Look around without a wallet<ArrowRight aria-hidden className="h-3.5 w-3.5" /></Link>
        </section>
      </main>
    </div>
  );
}
