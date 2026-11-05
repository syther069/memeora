'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppSession } from '@/components/auth/app-session-guard';
import { ArrowDownRight, ArrowUpRight } from 'iconoir-react';
import { cn } from '@/lib/utils';
import { createIdempotencyKeys, financeApi, type ApiTransaction } from '@/lib/finance-api';
import { dateInputToOccurredAt, localDateInput, occurredAtToDateInput } from '@/lib/dates';
import { categoriesFor } from '@/modules/finance/domain/categories';
import { parseMajorUnitsToMinor } from '@/modules/finance/domain/money';

export interface SavedTransaction {
  type: 'expense' | 'income';
  amountMinor: number;
  currency: 'INR' | 'USD';
  category: string;
}

export interface AddTransactionModalProps {
  /** Present when editing an existing entry. */
  transaction?: ApiTransaction;
  onClose: () => void;
  onSaved: (saved: SavedTransaction, wasEdit: boolean) => void;
}

export function AddTransactionModal({ transaction, onClose, onSaved }: AddTransactionModalProps) {
  const { preferredCurrency, mode } = useAppSession();
  const onChain = transaction?.onChain ?? null;
  const isBusiness = mode === 'business';
  // On an entry verified on Sui, direction and date are what the chain says.
  const chainFactsLocked = onChain?.verified === true;
  const [type, setType] = React.useState<'expense' | 'income'>(transaction?.type ?? 'expense');
  const [currency, setCurrency] = React.useState<'INR' | 'USD'>(transaction?.currency ?? preferredCurrency);
  const [amount, setAmount] = React.useState(transaction ? (transaction.amountMinor / 100).toFixed(2) : '');
  const [category, setCategory] = React.useState(transaction?.category ?? categoriesFor(mode, 'expense')[0]);
  const [description, setDescription] = React.useState(transaction?.description ?? '');
  const [date, setDate] = React.useState(transaction ? occurredAtToDateInput(transaction.occurredAt) : localDateInput());
  const [counterparty, setCounterparty] = React.useState(transaction?.counterparty ?? '');
  const [reference, setReference] = React.useState(transaction?.reference ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const idempotencyKeys = React.useRef(createIdempotencyKeys());

  // Keep a saved category that is no longer in the default list selectable when editing.
  const baseCategories = categoriesFor(mode, type, Boolean(onChain));
  const categories = baseCategories.includes(category) ? baseCategories : [category, ...baseCategories];

  const chooseType = (next: 'expense' | 'income') => {
    setType(next);
    setCategory(categoriesFor(mode, next, Boolean(onChain))[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amountMinor = parseMajorUnitsToMinor(amount);
    if (amountMinor === null) {
      setError('Enter a positive amount with no more than two decimal places.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const body = JSON.stringify({
        type,
        amountMinor,
        currency,
        category,
        description: description.trim(),
        occurredAt: dateInputToOccurredAt(date),
        counterparty: counterparty.trim() || null,
        reference: reference.trim() || null,
      });
      await financeApi(transaction ? `/api/transactions/${encodeURIComponent(transaction.id)}` : '/api/transactions', {
        method: transaction ? 'PATCH' : 'POST',
        body,
        // A retry of a new entry after a dropped connection must not add it twice.
        ...(transaction ? {} : { idempotencyKey: idempotencyKeys.current(body) }),
      });
      onSaved({ type, amountMinor, currency, category }, Boolean(transaction));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save this transaction. Please retry.');
      setIsSubmitting(false);
    }
  };

  const selectClass = 'w-full bg-[var(--surface-elevated)] border border-[var(--border-field)] rounded-[var(--radius-sm)] text-sm text-[var(--ink-primary)] h-11 px-3 hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={transaction ? 'Edit transaction' : 'Add a transaction'}
      description="Saved to your private ledger. Your totals update straight away."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {onChain && (
          <div className="rounded-xl border border-[var(--brand-blue-soft)]/70 bg-[var(--surface-tint)] p-3 text-xs leading-relaxed text-[var(--ink-secondary)]">
            <p className="font-bold text-[var(--ink-primary)]">{onChain.assetAmount} {onChain.assetSymbol} on {onChain.chain}</p>
            <p className="mt-0.5 break-all font-mono text-[11px]">{onChain.txHash}</p>
            <p className="mt-1">{chainFactsLocked ? 'Verified on Sui, so direction and date stay as the chain recorded them. You can change the value below.' : 'Not verified, added by you.'}</p>
          </div>
        )}
        <div role="group" aria-label="Transaction type" className="grid grid-cols-2 gap-1 p-1 bg-[var(--surface-sunken)] rounded-full">
          {(['expense', 'income'] as const).map((option) => {
            const Icon = option === 'expense' ? ArrowDownRight : ArrowUpRight;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={type === option}
                disabled={chainFactsLocked}
                onClick={() => chooseType(option)}
                className={cn(
                  'disabled:cursor-not-allowed flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer',
                  type === option
                    ? option === 'expense' ? 'bg-[var(--brand-blue)] text-[var(--ink-inverse)]' : 'bg-[var(--accent-positive)] text-[var(--ink-inverse)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="space-y-1.5 text-left">
            <label htmlFor="transaction-currency" className="block text-xs font-bold text-[var(--ink-primary)]">Currency</label>
            <select id="transaction-currency" value={currency} onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')} className={selectClass}>
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="transaction-category" className="block text-xs font-bold text-[var(--ink-primary)]">Category</label>
          <select id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {isBusiness && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Client or vendor (optional)" type="text" maxLength={100} placeholder="e.g. Acme Labs" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
            <Input label="Invoice or reference (optional)" type="text" maxLength={100} placeholder="e.g. INV-1042" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        )}

        <Input
          label="Note (optional)"
          type="text"
          maxLength={500}
          placeholder={isBusiness ? 'e.g. October retainer' : 'e.g. Weekly grocery run'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input label="Date" type="date" required disabled={chainFactsLocked} value={date} onChange={(e) => setDate(e.target.value)} />

        {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="pill" isLoading={isSubmitting}>
            {transaction ? 'Save changes' : 'Save transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
