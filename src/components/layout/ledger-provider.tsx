'use client';

import * as React from 'react';
import { useAppSession } from '@/components/auth/app-session-guard';
import { AddOnChainDialog } from '@/components/transactions/add-onchain-dialog';
import { ImportSuiDialog } from '@/components/transactions/import-sui-dialog';
import { useToast } from '@/components/ui/toast';
import { financeApi, financeApiHeaders, formatMoney, type ApiTransaction } from '@/lib/finance-api';
import { useUndoable } from '@/lib/use-undoable';
import { AddTransactionModal, type SavedTransaction } from './add-transaction-modal';

interface LedgerContextValue {
  /** Changes whenever the ledger changes, so pages know to reload their figures. */
  version: number;
  /** Entries being deleted, hidden from lists while Undo is still possible. */
  hiddenIds: ReadonlySet<string>;
  openAddTransaction: () => void;
  openEditTransaction: (transaction: ApiTransaction) => void;
  openImportSui: () => void;
  openOtherChain: () => void;
  deleteTransaction: (transaction: ApiTransaction) => void;
  notifyLedgerChanged: () => void;
}

const NO_IDS: ReadonlySet<string> = new Set();

const LedgerContext = React.createContext<LedgerContextValue>({
  version: 0,
  hiddenIds: NO_IDS,
  openAddTransaction: () => undefined,
  openEditTransaction: () => undefined,
  openImportSui: () => undefined,
  openOtherChain: () => undefined,
  deleteTransaction: () => undefined,
  notifyLedgerChanged: () => undefined,
});

export function useLedger() {
  return React.useContext(LedgerContext);
}

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest?.('input,textarea,select,[contenteditable="true"]'));
}

/** One set of transaction forms for the whole signed-in app. */
export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { isGuest } = useAppSession();
  const { toast } = useToast();
  const undoable = useUndoable();
  const [version, setVersion] = React.useState(0);
  const [hiddenIds, setHiddenIds] = React.useState<ReadonlySet<string>>(NO_IDS);
  const [modal, setModal] = React.useState<{ key: number; transaction?: ApiTransaction } | null>(null);
  const [dialog, setDialog] = React.useState<'import' | 'other-chain' | null>(null);
  const nextKey = React.useRef(0);

  const notifyLedgerChanged = React.useCallback(() => setVersion((current) => current + 1), []);
  const openAddTransaction = React.useCallback(() => setModal({ key: ++nextKey.current }), []);
  const openEditTransaction = React.useCallback((transaction: ApiTransaction) => setModal({ key: ++nextKey.current, transaction }), []);
  const openImportSui = React.useCallback(() => setDialog('import'), []);
  const openOtherChain = React.useCallback(() => setDialog('other-chain'), []);

  const setHidden = React.useCallback((id: string, hidden: boolean) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const deleteTransaction = React.useCallback((transaction: ApiTransaction) => {
    // Captured now: the entry belongs to this workspace even if the user switches before it is sent.
    const headers = financeApiHeaders();
    undoable({
      title: 'Transaction deleted',
      description: `${transaction.description || transaction.category} · ${formatMoney(transaction.amountMinor, transaction.currency)}`,
      apply: () => setHidden(transaction.id, true),
      revert: () => setHidden(transaction.id, false),
      commit: () => financeApi(`/api/transactions/${encodeURIComponent(transaction.id)}`, { method: 'DELETE', headers, keepalive: true }).then(() => undefined),
      failureTitle: 'The transaction was not deleted',
      onCommitted: () => {
        setHidden(transaction.id, false);
        notifyLedgerChanged();
      },
    });
  }, [undoable, setHidden, notifyLedgerChanged]);

  const value = React.useMemo<LedgerContextValue>(() => ({
    version, hiddenIds, openAddTransaction, openEditTransaction, openImportSui, openOtherChain, deleteTransaction, notifyLedgerChanged,
  }), [version, hiddenIds, openAddTransaction, openEditTransaction, openImportSui, openOtherChain, deleteTransaction, notifyLedgerChanged]);

  // N adds a transaction from anywhere, unless the user is typing.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGuest || event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      openAddTransaction();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuest, openAddTransaction]);

  const handleSaved = (saved: SavedTransaction, wasEdit: boolean) => {
    notifyLedgerChanged();
    setModal(null);
    toast({
      type: 'success',
      title: wasEdit ? 'Transaction updated' : 'Transaction saved',
      description: `${saved.type === 'expense' ? 'Expense' : 'Income'} of ${formatMoney(saved.amountMinor, saved.currency)} in ${saved.category}.`,
    });
  };

  return (
    <LedgerContext.Provider value={value}>
      {children}
      {modal && <AddTransactionModal key={modal.key} transaction={modal.transaction} onClose={() => setModal(null)} onSaved={handleSaved} />}
      {dialog === 'import' && (
        <ImportSuiDialog
          onClose={() => setDialog(null)}
          onImported={(count) => {
            setDialog(null);
            notifyLedgerChanged();
            toast({ type: 'success', title: count === 1 ? 'Transaction added' : `${count} transactions added`, description: 'Verified on Sui and added to your ledger.' });
          }}
        />
      )}
      {dialog === 'other-chain' && (
        <AddOnChainDialog
          onClose={() => setDialog(null)}
          onUseSui={() => setDialog('import')}
          onSaved={() => {
            setDialog(null);
            notifyLedgerChanged();
            toast({ type: 'success', title: 'Transaction saved', description: 'Saved as not verified, because Memeora cannot check that chain.' });
          }}
        />
      )}
    </LedgerContext.Provider>
  );
}
