import { CurrencyCode } from '@/modules/finance/domain/money';
import { Transaction, TransactionType } from '@/modules/finance/domain/transaction';

export interface DbTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount_minor: string | number;
  currency: CurrencyCode;
  category: string;
  description: string;
  occurred_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  counterparty?: string | null;
  reference?: string | null;
  chain?: string | null;
  tx_hash?: string | null;
  coin_type?: string | null;
  asset_symbol?: string | null;
  asset_amount?: string | null;
  verification?: 'sui_verified' | 'unverified' | null;
  fiat_estimated?: boolean;
}

export function toTransaction(row: DbTransaction): Transaction {
  return Transaction.create({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    category: row.category,
    description: row.description,
    occurredAt: new Date(row.occurred_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export function serializeTransaction(transaction: Transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    amountMinor: transaction.amount.amountMinor,
    currency: transaction.amount.currency,
    category: transaction.category,
    description: transaction.description,
    occurredAt: transaction.occurredAt.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

/** A stored row for the client: the ledger entry plus its business and on-chain details. */
export function serializeRow(row: DbTransaction) {
  return {
    ...serializeTransaction(toTransaction(row)),
    counterparty: row.counterparty ?? null,
    reference: row.reference ?? null,
    onChain: row.tx_hash
      ? {
        chain: row.chain ?? '',
        txHash: row.tx_hash,
        coinType: row.coin_type ?? null,
        assetSymbol: row.asset_symbol ?? null,
        assetAmount: row.asset_amount ?? null,
        verified: row.verification === 'sui_verified',
      }
      : null,
    fiatEstimated: row.fiat_estimated === true,
  };
}
