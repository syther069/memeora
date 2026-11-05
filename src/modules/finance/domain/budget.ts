import { CurrencyCode, Money } from './money';

export interface BudgetProps {
  id: string;
  userId: string;
  period: string; // Format: 'YYYY-MM'
  amountMinor: number;
  currency?: CurrencyCode;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Budget {
  readonly id: string;
  readonly userId: string;
  readonly period: string;
  readonly amount: Money;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BudgetProps) {
    if (!props.id) throw new Error('Budget id is required.');
    if (!props.userId) throw new Error('Budget userId is required.');
    if (!props.period || !/^\d{4}-\d{2}$/.test(props.period)) {
      throw new Error(`Invalid budget period format: "${props.period}". Expected YYYY-MM.`);
    }
    if (props.amountMinor <= 0) {
      throw new Error('Budget amount must be strictly greater than zero.');
    }

    this.id = props.id;
    this.userId = props.userId;
    this.period = props.period;
    this.amount = Money.fromMinorUnits(props.amountMinor, props.currency || 'INR');
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(props: BudgetProps): Budget {
    return new Budget(props);
  }
}

