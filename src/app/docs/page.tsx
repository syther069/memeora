import type { Metadata } from 'next';
import Link from 'next/link';
import { Brain, HelpCircle, Lock, Page, PiggyBank, Play, ShieldCheck, Sparks, Suitcase } from 'iconoir-react';
import { DocsLayout, type DocsSection } from '@/components/docs/docs-navigation';
import { BrandMark } from '@/components/layout/brand-mark';
import { linkButtonClass } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Docs · Memeora',
  description: 'How Memeora works: records, budgets, the Assistant, Walrus Memory and on-chain proof.',
};

const SECTIONS: DocsSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    icon: <Play />,
    content: (
      <>
        <p>Memeora keeps your income, spending, budgets and goals, and adds them up exactly. You save the rules you want followed, and the Assistant applies them when you ask about your money.</p>
        <p>It only knows what you record. It cannot see your bank balance, and it is not a bank or a financial adviser.</p>
        <h3>Look around first</h3>
        <p>You can open the dashboard without a wallet. To keep your own records, connect a Sui wallet.</p>
        <h3>Sign in with a wallet</h3>
        <ol>
          <li>Select Connect a wallet and choose your Sui wallet.</li>
          <li>Sign the message your wallet shows you. It is free: it sends no transaction and spends no SUI.</li>
          <li>Choose a workspace and currency, and decide whether to turn memory on.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'records',
    title: 'Your records',
    icon: <Page />,
    content: (
      <>
        <p>Select Add transaction on an overview or on Transactions, or press N, and enter the amount, category and date. You can search, filter and edit your entries.</p>
        <h3>Import from your Sui wallet</h3>
        <p>Memeora reads your transactions from Sui. The token, amount and date come from the chain, and you confirm the value. Past values use today’s rate, so they are marked as estimates.</p>
        <h3>Other chains</h3>
        <p>Enter the hash and amount yourself. Memeora does not check these on their chains, so they stay marked “Not verified, added by you”.</p>
        <h3>Currencies</h3>
        <p>You can record in USD, USDC, USDT, SUI, WAL or Other. USD is the default. Memeora does not convert between them, so totals stay separate for each currency, and ledger amounts have two decimal places.</p>
      </>
    ),
  },
  {
    id: 'budgets',
    title: 'Budgets and goals',
    icon: <PiggyBank />,
    content: (
      <>
        <p>Set a monthly budget to see how much of it you have used and what is left. Add savings goals with a target amount and an optional date, and add money to them as you save.</p>
        <p>Every total is calculated by Memeora’s server from your records, in whole cents. It is never produced by AI.</p>
      </>
    ),
  },
  {
    id: 'workspaces',
    title: 'Personal and Business',
    icon: <Suitcase />,
    content: (
      <>
        <p>Personal is for daily spending, crypto and saving. Business adds revenue, burn, runway, clients and vendors, and CSV export.</p>
        <p>Each workspace has its own transactions, budget, goals and memories. You can switch at any time.</p>
        <p>Runway uses a cash figure you enter. Memeora does not read your bank or wallet balance.</p>
      </>
    ),
  },
  {
    id: 'assistant',
    title: 'The Assistant',
    icon: <Sparks />,
    content: (
      <>
        <p>Ask a question such as “Can I afford a $450 purchase this month?”. The sums come from your records, and your saved rules guide the answer. Each answer shows the memories it used, and whether they came from Walrus or from Memeora’s own list.</p>
        <p>If you ask about a price in a different currency from your records, the Assistant says it cannot compare them, because it does not convert.</p>
        <p>A purchase fitting your budget is not financial advice, and it does not confirm the money is in your bank.</p>
      </>
    ),
  },
  {
    id: 'walrus-memory',
    title: 'Walrus Memory',
    icon: <Brain />,
    content: (
      <>
        <p>Memories are the rules, limits and goals you choose to save. Nothing is stored until you turn memory on, and your transactions stay in your private ledger.</p>
        <p>Memories are encrypted and stored on Walrus, in an account your wallet owns. To create it, you approve four prompts in your wallet. Walrus Memory pays the network fee, so you do not need SUI.</p>
        <p>Approving gives Memeora its own key for your account, kept encrypted on the server, so it can save and read your memories. You can remove that key from the Walrus Memory dashboard. Removing it stops future access, but cannot take back what Memeora has already read.</p>
        <p>Hiding a memory stops Memeora and the Assistant from using it, while its encrypted copy stays on Walrus. Never save passwords, card numbers or recovery phrases.</p>
      </>
    ),
  },
  {
    id: 'proof',
    title: 'On-chain proof',
    icon: <ShieldCheck />,
    content: (
      <>
        <p>The On-chain proof page reads Sui Mainnet through Tatum and compares each memory’s Walrus object with what Memeora recorded.</p>
        <p>It shows that a memory is stored. It cannot show what the encrypted text says, and it does not prove your ledger figures.</p>
        <h3>Where each thing lives</h3>
        <ul>
          <li><strong>PostgreSQL:</strong> transactions, budgets and goals. Every sum comes from here.</li>
          <li><strong>Walrus:</strong> the encrypted memories you choose to save.</li>
          <li><strong>Sui, read through Tatum:</strong> wallet transactions to import, and memory proofs.</li>
        </ul>
        <p>If Walrus, Tatum or the AI provider is down, your records, budgets and goals keep working.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security and privacy',
    icon: <Lock />,
    content: (
      <ul>
        <li>Memeora never asks for your recovery phrase or private key.</li>
        <li>Your identity comes from your wallet signature and a server session, and each wallet has its own private workspace, enforced in the database.</li>
        <li>Memory needs your recorded consent before anything is saved to Walrus.</li>
      </ul>
    ),
  },
  {
    id: 'help',
    title: 'Help',
    icon: <HelpCircle />,
    content: (
      <>
        <p>Inside the app, select Guide in the header for a short walkthrough. Press Ctrl K, or Cmd K on a Mac, to search pages and actions.</p>
        <p>Memeora’s code is public on <a href="https://github.com/syther069/memora" target="_blank" rel="noopener noreferrer">GitHub</a>. For the services it uses, see the <a href="https://docs.wal.app/walrus-memory" target="_blank" rel="noopener noreferrer">Walrus Memory</a> and <a href="https://docs.tatum.io/" target="_blank" rel="noopener noreferrer">Tatum</a> docs.</p>
      </>
    ),
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-[var(--surface-base)] text-[var(--ink-body)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8 lg:h-16">
          <Link href="/" className="flex items-center gap-2.5 rounded-[var(--radius-sm)]">
            <BrandMark className="h-8 w-8" />
            <span className="text-base font-bold tracking-tight text-[var(--ink-primary)]">Memeora</span>
          </Link>
          <Link href="/dashboard" className={linkButtonClass('primary', 'sm')}>Open the dashboard</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div className="py-8 lg:py-14">
          <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em] text-[var(--ink-primary)]">Memeora docs</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed">How Memeora works, what it keeps, and what it can and cannot show you.</p>
        </div>
        <DocsLayout sections={SECTIONS} />
      </main>
    </div>
  );
}
