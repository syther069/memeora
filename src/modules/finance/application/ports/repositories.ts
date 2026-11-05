import { Transaction } from '../../domain/transaction';
import { Budget } from '../../domain/budget';
import { SavingsGoal } from '../../domain/savings-goal';
import { TransactionType } from '../../domain/transaction';

export interface TransactionListFilters {
  type?: TransactionType;
  category?: string;
}

export interface TransactionRepository {
  findByUserId(userId: string, limit?: number, filters?: TransactionListFilters): Promise<Transaction[]>;
  save(transaction: Transaction): Promise<void>;
  delete(id: string, userId: string): Promise<boolean>;
}

export interface BudgetRepository {
  findByUserAndPeriod(userId: string, period: string): Promise<Budget | null>;
  save(budget: Budget): Promise<void>;
}

export interface SavingsGoalRepository {
  findByUserId(userId: string): Promise<SavingsGoal[]>;
  save(goal: SavingsGoal): Promise<void>;
  delete(id: string, userId: string): Promise<boolean>;
}

