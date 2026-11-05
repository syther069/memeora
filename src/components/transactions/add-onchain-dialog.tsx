'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useAppSession } from '@/components/auth/app-session-guard';
import { financeApi } from '@/lib/finance-api';
import { dateInputToOccurredAt, localDateInput } from '@/lib/dates';
import { categoriesFor } from '@/modules/finance/domain/categories';
import { parseMajorUnitsToMinor } from '@/modules/finance/domain/money';

const CHAINS: Array<{ value: string; label: string }> = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'base', label: 'Base' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'bnb', label: 'BNB Chain' },
  { value: 'solana', label: 'Solana' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'other', label: 'Other chain' },
];

/** A transaction on another chain, entered by hand. Memeora cannot verify these, and says so. */
export function AddOnChainDialog({ onClose, onSaved, onUseSui }: {
  onClose: () => void;
  onSaved: () => void;
  /** Sui transactions take the verified path instead. */
  onUseSui: () => void;
}) {
  const { mode, preferredCurrency } = useAppSession();
  const [chain, setChain] = React.useState('ethereum');
  const [txHash, setTxHash] = React.useState('');
  const [type, setType] = React.useState<'expense' | 'income'>('expense');
  const [assetSymbol, setAssetSymbol] = React.useState('');
  const [assetAmount, setAssetAmount] = React.useState('');
  const [value, setValue] = React.useState('');
  const [currency, setCurrency] = React.useState<'INR' | 'USD'>(preferredCurrency);
  const [category, setCategory] = React.useState(categoriesFor(mode, 'expense', true)[0]);
  const [date, setDate] = React.useState(localDateInput());
  const [note, setNote] = React.useState('');
  const [counterparty, setCounterparty] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const chooseType = (next: 'expense' | 'income') => {
    setType(next);
    setCategory(categoriesFor(mode, next, true)[0]);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const amountMinor = parseMajorUnitsToMinor(value);
    if (amountMinor === null) {
      setError(`Enter the ${currency} value with up to two decimal places.`);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await financeApi('/api/transactions/onchain', {
        method: 'POST',
        body: JSON.stringify({
          chain,
          txHash: txHash.trim(),
          assetSymbol: assetSymbol.trim(),
          assetAmount: assetAmount.trim(),
          type,
          amountMinor,
          currency,
          category,
          description: note.trim(),
          occurredAt: dateInputToOccurredAt(date),
          counterparty: counterparty.trim() || null,
        }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This transaction could not be saved. Please retry.');
      setIsSaving(false);
    }
  };

  const selectClass = 'h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-field)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink-primary)] hover:border-[var(--border-strong)]';

  return (
    <Modal isOpen onClose={onClose} title="Add a transaction from another chain" description="Memeora cannot check other chains, so this is saved as “Not verified, added by you”.">
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5 text-left">
          <label htmlFor="onchain-chain" className="block text-xs font-bold text-[var(--ink-primary)]">Chain</label>
          <select id="onchain-chain" value={chain} onChange={(event) => setChain(event.target.value)} className={selectClass}>
            {CHAINS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <p className="text-[11px] text-[var(--ink-muted)]">On Sui? <button type="button" onClick={onUseSui} className="font-bold text-[var(--brand-blue)] hover:underline cursor-pointer">Import it from your wallet</button>, and it will be verified.</p>
        </div>

        <Input label="Transaction hash" required placeholder="0x…" value={txHash} onChange={(event) => setTxHash(event.target.value)} />

        <div role="group" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-full bg-[var(--surface-sunken)] p-1 text-xs">
          {([['expense', 'Sent or spent'], ['income', 'Received']] as const).map(([option, label]) => (
            <button key={option} type="button" aria-pressed={type === option} onClick={() => chooseType(option)} className={`rounded-full py-2 font-bold cursor-pointer ${type === option ? 'bg-[var(--brand-blue)] text-white' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'}`}>{label}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Token" required maxLength={32} placeholder="ETH" value={assetSymbol} onChange={(event) => setAssetSymbol(event.target.value)} />
          <Input label="Token amount" required inputMode="decimal" placeholder="0.25" value={assetAmount} onChange={(event) => setAssetAmount(event.target.value)} />
        </div>

        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <Input label="Value in your ledger" type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="0.00" value={value} onChange={(event) => setValue(event.target.value)} />
          <div className="space-y-1.5 text-left">
            <label htmlFor="onchain-currency" className="block text-xs font-bold text-[var(--ink-primary)]">Currency</label>
            <select id="onchain-currency" value={currency} onChange={(event) => setCurrency(event.target.value as 'INR' | 'USD')} className={selectClass}>
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="onchain-category" className="block text-xs font-bold text-[var(--ink-primary)]">Category</label>
          <select id="onchain-category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
            {categoriesFor(mode, type, true).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        <Input label="Date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        {mode === 'business' && <Input label="Client or vendor (optional)" maxLength={100} value={counterparty} onChange={(event) => setCounterparty(event.target.value)} />}
        <Input label="Note (optional)" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />

        {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="pill" isLoading={isSaving}>Save transaction</Button>
        </div>
      </form>
    </Modal>
  );
}
