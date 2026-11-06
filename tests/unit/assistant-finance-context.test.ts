import { describe, expect, it } from 'vitest';
import { Budget } from '@/modules/finance/domain/budget';
import { SavingsGoal } from '@/modules/finance/domain/savings-goal';
import { Transaction } from '@/modules/finance/domain/transaction';
import { buildFinanceContext } from '@/modules/assistant/application/build-finance-context';
import { FallbackAssistantClient } from '@/modules/assistant/infrastructure/fallback-assistant-client';

const userId = 'usr_assistant_context_test';
const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

function transaction(id: string, type: 'income' | 'expense', amountMinor: number, currency: 'USD' | 'USDC', category: string, occurredAt: string) {
  return Transaction.create({ id, userId, type, amountMinor, currency, category, occurredAt: date(occurredAt) });
}

describe('Assistant finance context', () => {
  it('uses only the selected period and budget currency, with totals that reconcile', () => {
    const budget = Budget.create({ id: 'budget-1', userId, period: '2026-11', amountMinor: 3000000, currency: 'USD' });
    const goal = SavingsGoal.create({ id: 'goal-1', userId, name: 'Emergency reserve', targetAmountMinor: 1000000, currentAmountMinor: 250000, currency: 'USD' });
    const context = buildFinanceContext({
      prompt: 'Can I afford a $5,000 purchase this month?',
      cycleMonth: '2026-11',
      budget,
      savingsGoals: [goal],
      transactions: [
        transaction('income', 'income', 5000000, 'USD', 'Salary', '2026-11-01'),
        transaction('dining', 'expense', 120000, 'USD', 'Dining', '2026-11-02'),
        transaction('groceries', 'expense', 30000, 'USD', 'Groceries', '2026-11-03'),
        transaction('old', 'expense', 200000, 'USD', 'Dining', '2026-10-31'),
        transaction('foreign', 'expense', 100000, 'USDC', 'Travel', '2026-11-04'),
      ],
    });

    expect(context.incomeFormatted).toBe('$50,000.00');
    expect(context.spendingFormatted).toBe('$1,500.00');
    expect(context.netCashFlowFormatted).toBe('$48,500.00');
    expect(context.remainingBudgetFormatted).toBe('$28,500.00');
    expect(context.proposedPurchaseFormatted).toBe('$5,000.00');
    expect(context.verdict).toContain('leaving $23,500.00');
    expect(context.spendingByCategory).toEqual([
      { category: 'Dining', amountFormatted: '$1,200.00' },
      { category: 'Groceries', amountFormatted: '$300.00' },
    ]);
    expect(context.savingsGoals?.[0]).toEqual({ name: 'Emergency reserve', progressPercent: 25, savedFormatted: '$2,500.00', targetFormatted: '$10,000.00' });
  });

  it('does not invent a budget or financial baseline for an empty account', () => {
    const context = buildFinanceContext({
      prompt: 'Can I afford $1,500 this month?',
      cycleMonth: '2026-11',
      budget: null,
      savingsGoals: [],
      transactions: [],
    });

    expect(context.budgetLimitMinor).toBeUndefined();
    expect(context.remainingBudgetMinor).toBeUndefined();
    expect(context.spentMinor).toBe(0);
    expect(context.incomeFormatted).toBe('$0.00');
    expect(context.spendingFormatted).toBe('$0.00');
    expect(context.remainingBudgetFormatted).toBe('No USD budget is set for 2026-11');
    expect(context.verdict).toContain('cannot be assessed against a budget');
  });

  it('does not convert a proposed purchase into the ledger currency', () => {
    const budget = Budget.create({ id: 'budget-usd', userId, period: '2026-11', amountMinor: 300000, currency: 'USD' });
    const context = buildFinanceContext({ prompt: 'Can I afford 50 SUI this month?', cycleMonth: '2026-11', budget, savingsGoals: [], transactions: [] });
    expect(context.proposedPurchaseMinor).toBeUndefined();
    expect(context.verdict).toContain('No conversion rate is configured');
  });

  it('answers category questions using the precomputed category total when the model is unavailable', async () => {
    const context = buildFinanceContext({
      prompt: 'How much did I spend on dining this month?',
      cycleMonth: '2026-11',
      budget: null,
      savingsGoals: [],
      transactions: [transaction('dining', 'expense', 120000, 'USD', 'Dining', '2026-11-02')],
    });
    const response = await new FallbackAssistantClient().generateResponse({
      userId,
      prompt: 'How much did I spend on dining this month?',
      cycleMonth: '2026-11',
      calculationContext: context,
      recalledMemories: [],
    });
    expect(response.message).toContain('$1,200.00 in Dining expenses');
  });

  it('changes the purchase verdict when a dated savings goal changes', () => {
    const budget = Budget.create({ id: 'budget-demo', userId, period: '2026-11', amountMinor: 1500000, currency: 'USD' });
    const transactions = [
      transaction('salary', 'income', 2000000, 'USD', 'Salary', '2026-11-01'),
      transaction('rent', 'expense', 1200000, 'USD', 'Housing', '2026-11-02'),
    ];
    const prompt = 'Can I afford a $1,500 purchase this month?';
    // $3,000 left by December 2026: $1,500 set aside in each of November and December.
    const smallGoal = SavingsGoal.create({ id: 'goal-demo', userId, name: 'Laptop', targetAmountMinor: 300000, currency: 'USD', targetDate: '2026-12-15' });
    const before = buildFinanceContext({ prompt, cycleMonth: '2026-11', budget, transactions, savingsGoals: [smallGoal] });
    expect(before.monthlySetAsideFormatted).toBe('$1,500.00');
    expect(before.savingsGoals?.[0].monthlySetAsideFormatted).toBe('$1,500.00');
    expect(before.verdict).toContain('leaving $1,500.00');
    expect(before.verdict).toContain("which still covers this month's $1,500.00 savings-goal set-aside");

    // Raising the goal to $15,000 makes the set-aside $7,500, which net cash flow after the purchase cannot cover.
    const biggerGoal = SavingsGoal.create({ id: 'goal-demo', userId, name: 'Laptop', targetAmountMinor: 1500000, currency: 'USD', targetDate: '2026-12-15' });
    const after = buildFinanceContext({ prompt, cycleMonth: '2026-11', budget, transactions, savingsGoals: [biggerGoal] });
    expect(after.monthlySetAsideFormatted).toBe('$7,500.00');
    expect(after.verdict).toContain('Recorded net cash flow after it would be $6,500.00, which is $1,000.00 short');
  });
});
