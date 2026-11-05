'use client';

import * as React from 'react';
import { useToast } from '@/components/ui/toast';
import { formatMoney, type ApiTransaction } from '@/lib/finance-api';
import { AddTransactionModal, type SavedTransaction } from './add-transaction-modal';

interface LedgerContextValue {
  /** Changes whenever the ledger changes, so pages know to reload their figures. */
  version: number;
  openAddTransaction: () => void;
  openEditTransaction: (transaction: ApiTransaction) => void;
  notifyLedgerChanged: () => void;
}

const LedgerContext = React.createContext<LedgerContextValue>({
  version: 0,
  openAddTransaction: () => undefined,
  openEditTransaction: () => undefined,
  notifyLedgerChanged: () => undefined,
});

export function useLedger() {
  return React.useContext(LedgerContext);
}

/** One Add/Edit Transaction form for the whole signed-in app. */
export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [version, setVersion] = React.useState(0);
  const [modal, setModal] = React.useState<{ key: number; transaction?: ApiTransaction } | null>(null);
  const nextKey = React.useRef(0);

  const value = React.useMemo<LedgerContextValue>(() => ({
    version,
    openAddTransaction: () => setModal({ key: ++nextKey.current }),
    openEditTransaction: (transaction) => setModal({ key: ++nextKey.current, transaction }),
    notifyLedgerChanged: () => setVersion((current) => current + 1),
  }), [version]);

  const handleSaved = (saved: SavedTransaction, wasEdit: boolean) => {
    setVersion((current) => current + 1);
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
      {modal && (
        <AddTransactionModal
          key={modal.key}
          transaction={modal.transaction}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </LedgerContext.Provider>
  );
}
