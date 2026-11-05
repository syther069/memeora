'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { ArrowRight, Check, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

function safeDestination(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

async function readApiResult(response: Response) {
  const result = await response.json();
  if (!response.ok || result?.success !== true) throw new Error(result?.error?.message ?? 'The request could not be completed.');
  return result.data;
}

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

  const supportedWallets = wallets.filter(({ name }) => /slush|suiet|sui wallet/i.test(name));

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface-base)] px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-card)] sm:p-9">
        <Link href="/" className="text-xs font-black uppercase tracking-[.18em] text-[var(--brand-deep-current)]">Memeora</Link>
        <div className="mt-7 flex items-center gap-3 text-[var(--brand-deep-current)]"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-sky-solid)]"><Wallet className="h-6 w-6" /></div><p className="text-xs font-bold uppercase tracking-[.12em]">Sui Mainnet</p></div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-[var(--ink-primary)]">A finance assistant that remembers</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">Track your spending with exact sums. Save your rules and goals to Walrus, and get advice that follows them, session after session. You can check every memory on Sui.</p>
        <p className="mt-5 text-xs font-bold text-[var(--ink-primary)]">{account ? 'Step 2 of 2: sign to prove this wallet is yours' : 'Step 1 of 2: connect your Sui wallet'}</p>

        {!walletRuntimeReady ? (
          <div role="status" className="mt-7 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-subtle)] p-4 text-sm text-[var(--ink-secondary)]">Looking for your Sui wallet…</div>
        ) : account ? (
          <div className="mt-7 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent-positive-border)] bg-[var(--accent-positive-bg)] p-4">
              <Check className="h-5 w-5 shrink-0 text-[var(--accent-positive)]" />
              <div className="min-w-0"><p className="text-xs font-bold text-[var(--accent-positive)]">Wallet connected</p><p className="mt-1 truncate font-mono text-xs text-[var(--ink-primary)]">{account.address}</p></div>
            </div>
            <Button type="button" size="lg" className="w-full" isLoading={signingIn} onClick={() => void signIn()} rightIcon={!signingIn ? <ArrowRight className="h-4 w-4" /> : undefined}>Sign in with this wallet</Button>
            <p className="text-xs leading-5 text-[var(--ink-muted)]">Your wallet will ask you to sign a message. It is free: it sends no transaction and spends no SUI.</p>
            <button type="button" disabled={signingIn} onClick={() => { setError(''); void dAppKit.disconnectWallet(); }} className="text-xs font-bold text-[var(--brand-deep-current)] hover:underline cursor-pointer disabled:opacity-50">Use a different wallet</button>
          </div>
        ) : supportedWallets.length > 0 ? (
          <div className="mt-7 space-y-3">
            {supportedWallets.map((wallet) => (
              <Button key={wallet.name} type="button" size="lg" variant="outline" className="w-full justify-between" disabled={Boolean(connectingWallet)} isLoading={connectingWallet === wallet.name} onClick={() => void connect(wallet.name)}>
                <span className="flex items-center gap-3"><Wallet className="h-4 w-4" />Connect with {wallet.name}</span>
                {connectingWallet !== wallet.name && <ArrowRight className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        ) : (
          <div role="status" className="mt-7 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-subtle)] p-4 text-sm leading-6 text-[var(--ink-secondary)]">
            No supported Sui wallet was detected. Install or unlock Slush, Suiet, or Sui Wallet, then reload this page.
          </div>
        )}

        <div className="mt-6 flex items-start gap-3 border-t border-[var(--border-subtle)] pt-5 text-xs leading-5 text-[var(--ink-muted)]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-deep-current)]" /><p>Memeora never asks for your recovery phrase or private key. Each wallet has its own private workspace.</p></div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--accent-danger-border)] bg-[var(--accent-danger-bg)] p-3 text-sm text-[var(--accent-danger)]">{error}</p>}
      </section>
    </main>
  );
}
