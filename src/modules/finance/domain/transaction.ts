import { CurrencyCode, Money } from './money';

export type TransactionType = 'income' | 'expense';

export interface TransactionProps {
  id: string;
  userId: string;
  type: TransactionType;
  amountMinor: number;
  currency?: CurrencyCode;
  category: string;
  description?: string;
  occurredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Transaction {
  readonly id: string;
  readonly userId: string;
  readonly type: TransactionType;
  readonly amount: Money;
  readonly category: string;
  readonly description: string;
  readonly occurredAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: TransactionProps) {
    if (!props.id) throw new Error('Transaction id is required.');
    if (!props.userId) throw new Error('Transaction userId is required.');
    if (!props.category || !props.category.trim()) throw new Error('Transaction category is required.');
    if (props.amountMinor <= 0) throw new Error('Transaction amount must be strictly greater than zero.');

    this.id = props.id;
    this.userId = props.userId;
    this.type = props.type;
    this.amount = Money.fromMinorUnits(props.amountMinor, props.currency || 'USD');
    this.category = props.category.trim();
    this.description = props.description?.trim() || '';
    this.occurredAt = props.occurredAt || new Date();
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(props: TransactionProps): Transaction {
    return new Transaction(props);
  }
}

