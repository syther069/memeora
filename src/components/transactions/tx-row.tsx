import * as React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'iconoir-react';
import { MotionRow } from '@/components/ui/motion-row';
import { Badge } from '@/components/ui/badge';
import { formatMoney, type ApiTransaction } from '@/lib/finance-api';
import { formatLedgerDate } from '@/lib/dates';

/** One ledger entry. The same row everywhere, so an entry always reads the same way. */
export function TxRow({ tx, actions }: { tx: ApiTransaction; actions?: React.ReactNode }) {
  const isExpense = tx.type === 'expense';
  const Icon = isExpense ? ArrowDownRight : ArrowUpRight;
  return (
    <MotionRow><div className="-mx-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[var(--radius-sm)] px-2 py-3 transition-colors hover:bg-[var(--surface-hover)]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${isExpense ? 'bg-[var(--surface-sunken)] text-[var(--ink-primary)]' : 'bg-[var(--accent-positive-bg)] text-[var(--accent-positive)]'}`}>
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ink-primary)]">{tx.description || tx.counterparty || tx.category}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {tx.category} · {formatLedgerDate(tx.occurredAt)}{tx.counterparty && tx.description ? ` · ${tx.counterparty}` : ''}{tx.reference ? ` · ${tx.reference}` : ''}
          </p>
          {(tx.onChain || tx.fiatEstimated) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]">
              {tx.onChain && <span className="tabular-nums">{tx.onChain.assetAmount} {tx.onChain.assetSymbol}</span>}
              {tx.onChain && <Badge variant={tx.onChain.verified ? 'success' : 'warning'} className="px-2 text-xs">{tx.onChain.verified ? 'Verified on Sui' : 'Not verified, added by you'}</Badge>}
              {tx.fiatEstimated && <Badge className="px-2 text-xs">Value is an estimate</Badge>}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <p className={`whitespace-nowrap text-sm font-semibold tabular-nums ${isExpense ? 'text-[var(--ink-primary)]' : 'text-[var(--accent-positive)]'}`}>
          {isExpense ? '−' : '+'}{formatMoney(tx.amountMinor, tx.currency)}
        </p>
      </div>
      {actions && <div className="flex w-full flex-wrap justify-end gap-1 lg:w-auto">{actions}</div>}
    </div></MotionRow>
  );
}
