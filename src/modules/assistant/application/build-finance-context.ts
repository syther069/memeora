import type { Budget } from '../../finance/domain/budget';
import { calculateCashFlowSummary, evaluatePurchaseAffordability, type TransactionRecord } from '../../finance/domain/calculations';
import type { CurrencyCode } from '../../finance/domain/money';
import { Money, parseMajorUnitsToMinor } from '../../finance/domain/money';
import { calculateMonthlySetAside, type SavingsGoal } from '../../finance/domain/savings-goal';
import type { Transaction } from '../../finance/domain/transaction';
import type { CalculationContext } from './ports/assistant-port';

interface BuildFinanceContextInput {
  transactions: Transaction[];
  budget: Budget | null;
  savingsGoals: SavingsGoal[];
  prompt: string;
  cycleMonth: string;
  mode?: 'personal' | 'business';
  estimatedEntryCount?: number;
}

function parseProposedPurchase(prompt: string, currency: CurrencyCode): { amountMinor?: number; currencyMismatch: boolean } {
  if (!/\b(can i afford|afford|purchase|buy)\b/i.test(prompt)) return { currencyMismatch: false };
  const amount = '((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?)';
  const prefixed = new RegExp(`(₹|\\brs\\.?|\\binr\\b|\\$|\\busd[ct]?\\b|\\bsui\\b|\\bwal\\b)\\s*${amount}`, 'i').exec(prompt);
  const suffixed = new RegExp(`${amount}\\s*(usd[ct]?|sui|wal|inr|rupees?|dollars?)\\b`, 'i').exec(prompt);
  const amountText = prefixed?.[2] ?? suffixed?.[1] ?? new RegExp(`\\b(?:for|cost(?:s|ing)?|of)\\s+${amount}\\b`, 'i').exec(prompt)?.[1];
  if (!amountText) return { currencyMismatch: false };
  const marker = (prefixed?.[1] ?? suffixed?.[2])?.toLowerCase();
  // A price in anything other than the ledger's currency, rupees included, must not be read as ledger money.
  const detected = !marker ? undefined : marker === '$' || marker === 'usd' || marker.startsWith('dollar') ? 'USD' : marker.toUpperCase();
  if (detected && detected !== currency) return { currencyMismatch: true };
  return { amountMinor: parseMajorUnitsToMinor(amountText) ?? undefined, currencyMismatch: false };
}

export function buildFinanceContext(input: BuildFinanceContextInput): CalculationContext {
  const periodTransactions = input.transactions.filter(
    (transaction) => transaction.occurredAt.toISOString().slice(0, 7) === input.cycleMonth
  );
  const currency = input.budget?.amount.currency ?? periodTransactions[0]?.amount.currency ?? 'USD';
  const selectedTransactions = periodTransactions.filter((transaction) => transaction.amount.currency === currency);
  const records: TransactionRecord[] = selectedTransactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amountMinor: transaction.amount.amountMinor,
    currency: transaction.amount.currency,
    category: transaction.category,
    description: transaction.description,
    occurredAt: transaction.occurredAt.toISOString(),
  }));
  const summary = calculateCashFlowSummary(records, currency);
  const categoryTotals = new Map<string, Money>();
  for (const transaction of selectedTransactions) {
    if (transaction.type !== 'expense') continue;
    const current = categoryTotals.get(transaction.category) ?? Money.zero(currency);
    categoryTotals.set(transaction.category, current.add(transaction.amount));
  }

  const budgetLimitMinor = input.budget?.amount.amountMinor;
  const remainingBudgetMinor = budgetLimitMinor === undefined ? undefined : budgetLimitMinor - summary.outflow.amountMinor;
  const remainingBudgetFormatted = remainingBudgetMinor === undefined
    ? `No ${currency} budget is set for ${input.cycleMonth}`
    : Money.fromMinorUnits(remainingBudgetMinor, currency).format();
  const proposedPurchase = parseProposedPurchase(input.prompt, currency);
  const proposedPurchaseMinor = proposedPurchase.amountMinor;
  const proposedPurchaseFormatted = proposedPurchaseMinor === undefined
    ? undefined
    : Money.fromMinorUnits(proposedPurchaseMinor, currency).format();

  // Monthly set-aside for active goals in the ledger currency that have a target date.
  const activeGoals = input.savingsGoals.filter((goal) => goal.status === 'active');
  const goalSetAsides = new Map<string, number>();
  for (const goal of activeGoals) {
    if (goal.targetAmount.currency !== currency) continue;
    const setAside = calculateMonthlySetAside(goal, input.cycleMonth);
    if (setAside !== null) goalSetAsides.set(goal.id, setAside);
  }
  const monthlySetAsideMinor = [...goalSetAsides.values()].reduce((sum, value) => sum + value, 0);
  const monthlySetAsideFormatted = Money.fromMinorUnits(monthlySetAsideMinor, currency).format();

  let verdict = input.budget
    ? `Recorded income is ${summary.inflow.format()}, recorded expenses are ${summary.outflow.format()}, and net cash flow is ${summary.netCashFlow.format()} for ${input.cycleMonth}. Remaining recorded budget is ${remainingBudgetFormatted}.`
    : `No monthly budget is saved for ${currency} in ${input.cycleMonth}. Recorded income is ${summary.inflow.format()} and expenses are ${summary.outflow.format()}; the ledger does not contain bank balances, so available cash cannot be inferred.`;

  if (proposedPurchase.currencyMismatch) {
    verdict = `The requested purchase currency differs from the recorded ${currency} budget/ledger currency. No conversion rate is configured, so affordability cannot be calculated.`;
  } else if (proposedPurchaseMinor !== undefined) {
    if (!input.budget || remainingBudgetMinor === undefined) {
      verdict = `No saved monthly budget is available for ${currency} in ${input.cycleMonth}, so this purchase cannot be assessed against a budget. The ledger does not contain bank balances.`;
    } else {
      const afterPurchaseMinor = remainingBudgetMinor - proposedPurchaseMinor;
      const afterPurchaseFormatted = Money.fromMinorUnits(afterPurchaseMinor, currency).format();
      verdict = afterPurchaseMinor < 0
        ? `Exceeds the recorded monthly budget by ${Money.fromMinorUnits(Math.abs(afterPurchaseMinor), currency).format()}.`
        : `Fits the recorded monthly budget, leaving ${afterPurchaseFormatted} within that budget.`;
      if (monthlySetAsideMinor > 0) {
        const affordability = evaluatePurchaseAffordability({
          proposedPurchaseMinor,
          budgetLimitMinor: budgetLimitMinor as number,
          currentSpentMinor: summary.outflow.amountMinor,
          currentInflowMinor: summary.inflow.amountMinor,
          monthlySavingsTargetMinor: monthlySetAsideMinor,
        });
        const netAfterFormatted = Money.fromMinorUnits(affordability.projectedNetAfterPurchaseMinor, currency).format();
        verdict += affordability.preservesSavingsTarget
          ? ` Recorded net cash flow after it would be ${netAfterFormatted}, which still covers this month's ${monthlySetAsideFormatted} savings-goal set-aside.`
          : ` Recorded net cash flow after it would be ${netAfterFormatted}, which is ${Money.fromMinorUnits(monthlySetAsideMinor - affordability.projectedNetAfterPurchaseMinor, currency).format()} short of this month's ${monthlySetAsideFormatted} savings-goal set-aside.`;
      }
      if (afterPurchaseMinor >= 0) verdict += ' This does not confirm available bank cash.';
    }
  }

  return {
    ...(budgetLimitMinor === undefined ? {} : { budgetLimitMinor, budgetLimitFormatted: Money.fromMinorUnits(budgetLimitMinor, currency).format() }),
    spentMinor: summary.outflow.amountMinor,
    ...(remainingBudgetMinor === undefined ? {} : { remainingBudgetMinor }),
    ...(proposedPurchaseMinor === undefined ? {} : { proposedPurchaseMinor, proposedPurchaseFormatted }),
    remainingBudgetFormatted,
    currency,
    period: input.cycleMonth,
    recordWindowDescription: `All ${input.mode === 'business' ? 'business ' : ''}ledger records saved for ${input.cycleMonth} (UTC).`,
    mode: input.mode ?? 'personal',
    ...(input.estimatedEntryCount ? { estimatedEntryCount: input.estimatedEntryCount } : {}),
    incomeFormatted: summary.inflow.format(),
    spendingFormatted: summary.outflow.format(),
    netCashFlowFormatted: summary.netCashFlow.format(),
    spendingByCategory: [...categoryTotals.entries()]
      .sort((a, b) => b[1].amountMinor - a[1].amountMinor)
      .map(([category, amount]) => ({ category, amountFormatted: amount.format() })),
    savingsGoals: activeGoals.map((goal) => {
      const setAside = goalSetAsides.get(goal.id);
      return {
        name: goal.name,
        progressPercent: goal.getProgressPercentage(),
        savedFormatted: goal.currentAmount.format(),
        targetFormatted: goal.targetAmount.format(),
        ...(goal.targetDate ? { targetDate: goal.targetDate } : {}),
        ...(setAside === undefined ? {} : { monthlySetAsideFormatted: Money.fromMinorUnits(setAside, currency).format() }),
      };
    }),
    ...(monthlySetAsideMinor > 0 ? { monthlySetAsideMinor, monthlySetAsideFormatted } : {}),
    verdict,
  };
}
