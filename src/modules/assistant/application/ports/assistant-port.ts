import { MemoryRecord } from '../../../financial-memory/domain/memory-record';
import type { CurrencyCode } from '../../../finance/domain/money';

export type MemoryContextStatus = 'used' | 'none_found' | 'not_consented' | 'unavailable';

export interface CalculationContext {
  budgetLimitMinor?: number;
  spentMinor?: number;
  remainingBudgetMinor?: number;
  proposedPurchaseMinor?: number;
  remainingBudgetFormatted: string;
  proposedPurchaseFormatted?: string;
  currency?: CurrencyCode;
  period?: string;
  recordWindowDescription?: string;
  incomeFormatted?: string;
  spendingFormatted?: string;
  netCashFlowFormatted?: string;
  budgetLimitFormatted?: string;
  spendingByCategory?: Array<{ category: string; amountFormatted: string }>;
  savingsGoals?: Array<{
    name: string;
    progressPercent: number;
    savedFormatted: string;
    targetFormatted: string;
    targetDate?: string;
    /** This month's share of the remaining amount, for goals with a target date. */
    monthlySetAsideFormatted?: string;
  }>;
  /** Total monthly set-aside across active goals in the ledger currency. */
  monthlySetAsideMinor?: number;
  monthlySetAsideFormatted?: string;
  memoryStatus?: MemoryContextStatus;
  /** Which workspace this answer is about. */
  mode?: 'personal' | 'business';
  /** Entries this period valued at today's rate rather than the rate on their date. */
  estimatedEntryCount?: number;
  /** Server-calculated figures, in Business only. */
  business?: {
    revenueFormatted: string;
    expensesFormatted: string;
    profitFormatted: string;
    burnFormatted: string | null;
    notBurning: boolean;
    cashFormatted: string | null;
    runway: string | null;
    topCounterparties: Array<{ name: string; receivedFormatted: string; paidFormatted: string }>;
  };
  verdict: string;
}

export interface AssistantChatInput {
  userId: string;
  prompt: string;
  cycleMonth?: string;
  calculationContext: CalculationContext;
  recalledMemories: MemoryRecord[];
  memoryStatus?: MemoryContextStatus;
}

export interface AssistantChatOutput {
  message: string;
  calculationContext: CalculationContext;
  recalledMemories: Array<{ id: string; category: string; text: string }>;
  memoryStatus?: MemoryContextStatus;
  /** walrus: memories chosen by Walrus semantic recall. local_fallback: Walrus did not answer. */
  memorySource?: 'walrus' | 'local_fallback';
  isFallback?: boolean;
  timestamp: string;
}

export interface AssistantPort {
  generateResponse(input: AssistantChatInput): Promise<AssistantChatOutput>;
}
