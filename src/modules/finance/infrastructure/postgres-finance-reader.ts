import type { AppMode } from '@/lib/app-mode';
import type { PostgresClient } from '@/lib/postgres/wallet-transaction';
import { Budget } from '../domain/budget';
import { periodBounds } from '../domain/calculations';
import type { CurrencyCode } from '../domain/money';
import { GoalStatus, SavingsGoal } from '../domain/savings-goal';
import { Transaction, TransactionType } from '../domain/transaction';

interface DbTransaction {
  id: string; user_id: string; type: TransactionType; amount_minor: string | number; currency: CurrencyCode;
  category: string; description: string; occurred_at: Date | string; created_at: Date | string; updated_at: Date | string;
}
interface DbBudget {
  id: string; user_id: string; period: string; amount_minor: string | number; currency: CurrencyCode;
  created_at: Date | string; updated_at: Date | string;
}
interface DbGoal {
  id: string; user_id: string; name: string; target_amount_minor: string | number; current_amount_minor: string | number;
  currency: CurrencyCode; target_date: string | null; status: GoalStatus; created_at: Date | string; updated_at: Date | string;
}

/**
 * Reads the canonical finance records of one workspace of an account. The client
 * must come from `withWalletTransaction` so row-level security applies.
 */
export class PostgresFinanceReader {
  constructor(private readonly client: PostgresClient, private readonly mode: AppMode = 'personal') {}

  /** Every transaction of a YYYY-MM period (UTC), so period totals are complete. */
  async transactionsForPeriod(userId: string, period: string): Promise<Transaction[]> {
    const { start, end } = periodBounds(period);
    const result = await this.client.query(
      `SELECT * FROM transactions
       WHERE user_id = $1 AND mode = $4 AND occurred_at >= $2 AND occurred_at < $3
       ORDER BY occurred_at DESC, created_at DESC`,
      [userId, start, end, this.mode],
    ) as { rows: DbTransaction[] };
    return result.rows.map((row) => Transaction.create({
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
    }));
  }

  /** How many entries of the period carry a value estimated from today's rate. */
  async estimatedEntryCount(userId: string, period: string): Promise<number> {
    const { start, end } = periodBounds(period);
    const result = await this.client.query(
      `SELECT COUNT(*) AS n FROM transactions
       WHERE user_id = $1 AND mode = $4 AND fiat_estimated AND occurred_at >= $2 AND occurred_at < $3`,
      [userId, start, end, this.mode],
    ) as { rows: Array<{ n: string | number }> };
    return Number(result.rows[0]?.n ?? 0);
  }

  async budgetForPeriod(userId: string, period: string): Promise<Budget | null> {
    const result = await this.client.query(
      'SELECT * FROM budgets WHERE user_id = $1 AND period = $2 AND mode = $3',
      [userId, period, this.mode],
    ) as { rows: DbBudget[] };
    const row = result.rows[0];
    return row
      ? Budget.create({
        id: row.id,
        userId: row.user_id,
        period: row.period,
        amountMinor: Number(row.amount_minor),
        currency: row.currency,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      })
      : null;
  }

  async savingsGoals(userId: string): Promise<SavingsGoal[]> {
    const result = await this.client.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 AND mode = $2 ORDER BY created_at DESC',
      [userId, this.mode],
    ) as { rows: DbGoal[] };
    return result.rows.map((row) => SavingsGoal.create({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      targetAmountMinor: Number(row.target_amount_minor),
      currentAmountMinor: Number(row.current_amount_minor),
      currency: row.currency,
      targetDate: row.target_date ?? undefined,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }
}
