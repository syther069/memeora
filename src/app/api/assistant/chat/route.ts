import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '../../../../lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode, type AppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { PostgresMemoryRepository } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';
import { loadReadyMemoryAccount, walrusClientFor } from '@/modules/financial-memory/infrastructure/wallet-memory-account';
import { mergeRecall } from '@/modules/financial-memory/application/memory-sync';
import { PostgresFinanceReader } from '@/modules/finance/infrastructure/postgres-finance-reader';
import { readBusinessOverview, type BusinessOverview } from '@/modules/finance/infrastructure/postgres-business-reader';
import { formatRunway } from '@/modules/finance/domain/business-metrics';
import { Money } from '@/modules/finance/domain/money';
import type { Budget } from '../../../../modules/finance/domain/budget';
import type { SavingsGoal } from '../../../../modules/finance/domain/savings-goal';
import type { Transaction } from '../../../../modules/finance/domain/transaction';
import type { MemoryRecord } from '../../../../modules/financial-memory/domain/memory-record';
import { GroqAssistantClient } from '../../../../modules/assistant/infrastructure/groq-assistant-client';
import { buildFinanceContext } from '../../../../modules/assistant/application/build-finance-context';
import type { CalculationContext, MemoryContextStatus } from '../../../../modules/assistant/application/ports/assistant-port';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Walrus memories recalled for one question. */
const RECALL_LIMIT = 5;

interface FinanceRecords {
  transactions: Transaction[];
  budget: Budget | null;
  savingsGoals: SavingsGoal[];
  estimatedEntryCount: number;
  businessOverview: BusinessOverview | null;
}

/** Puts the server-calculated business figures in words for the Assistant. */
function businessFacts(overview: BusinessOverview): NonNullable<CalculationContext['business']> {
  const money = (minor: number) => Money.fromMinorUnits(minor, overview.currency).format();
  const { metrics } = overview;
  return {
    revenueFormatted: money(metrics.revenueMinor),
    expensesFormatted: money(metrics.expensesMinor),
    profitFormatted: money(metrics.profitMinor),
    burnFormatted: metrics.burnMinor === null ? null : money(metrics.burnMinor),
    notBurning: metrics.notBurning,
    cashFormatted: overview.cashMinor === null ? null : money(overview.cashMinor),
    runway: metrics.runwayTenths === null ? null : formatRunway(metrics.runwayTenths),
    topCounterparties: overview.counterparties.map((entry) => ({ name: entry.name, receivedFormatted: money(entry.receivedMinor), paidFormatted: money(entry.paidMinor) })),
  };
}

function isValidCycleMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

async function readChatInput(request: NextRequest):
  Promise<{ ok: true; prompt: string; cycleMonth: string } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Invalid JSON body', 400) };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400) };
  }

  const input = body as Record<string, unknown>;
  const prompt = input.prompt;
  const cycleMonth = input.cycleMonth === undefined ? new Date().toISOString().slice(0, 7) : input.cycleMonth;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Prompt is required', 400, [{ field: 'prompt', issue: 'Prompt cannot be empty' }]) };
  }
  if (prompt.length > 1000) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'Prompt cannot exceed 1000 characters', 400, [{ field: 'prompt', issue: 'Prompt exceeds 1000 characters' }]) };
  }
  if (!isValidCycleMonth(cycleMonth)) {
    return { ok: false, response: jsonError('VALIDATION_ERROR', 'cycleMonth must use YYYY-MM format with a valid month.', 400) };
  }
  return { ok: true, prompt: prompt.trim(), cycleMonth };
}

/** Builds the deterministic context and asks the assistant, after all reads are done. */
async function answer(
  mode: AppMode,
  userId: string,
  prompt: string,
  cycleMonth: string,
  records: FinanceRecords,
  memories: { recalledMemories: MemoryRecord[]; memoryStatus: MemoryContextStatus },
  memorySource?: 'walrus' | 'local_fallback',
) {
  let calculationContext: CalculationContext;
  try {
    calculationContext = buildFinanceContext({ ...records, prompt, cycleMonth, mode });
  } catch {
    return jsonError('FINANCE_DATA_INVALID', 'The loaded finance records could not be calculated safely. No answer was generated.', 500);
  }
  calculationContext.memoryStatus = memories.memoryStatus;
  if (records.businessOverview) calculationContext.business = businessFacts(records.businessOverview);

  const assistantResult = await new GroqAssistantClient().generateResponse({
    userId,
    prompt,
    cycleMonth,
    calculationContext,
    recalledMemories: memories.recalledMemories,
    memoryStatus: memories.memoryStatus,
  });
  return jsonSuccess(memorySource ? { ...assistantResult, memorySource } : assistantResult);
}

function memoryContext(hasConsent: boolean, memories: MemoryRecord[]) {
  if (!hasConsent) return { recalledMemories: [], memoryStatus: 'not_consented' as const };
  return { recalledMemories: memories, memoryStatus: memories.length > 0 ? 'used' as const : 'none_found' as const };
}

const FINANCE_UNAVAILABLE = 'Your saved finance records could not be loaded. No calculation was made.';

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const input = await readChatInput(request);
  if (!input.ok) return input.response;

  let records: FinanceRecords;
  try {
    records = await withWalletTransaction(session.walletAddress, async (client) => {
      const reader = new PostgresFinanceReader(client, mode);
      return {
        transactions: await reader.transactionsForPeriod(session.userId, input.cycleMonth),
        budget: await reader.budgetForPeriod(session.userId, input.cycleMonth),
        savingsGoals: await reader.savingsGoals(session.userId),
        estimatedEntryCount: await reader.estimatedEntryCount(session.userId, input.cycleMonth),
        businessOverview: mode === 'business' ? await readBusinessOverview(client, session.userId, input.cycleMonth) : null,
      };
    });
  } catch {
    return jsonError('FINANCE_DATA_UNAVAILABLE', FINANCE_UNAVAILABLE, 503);
  }

  // Separate transactions, so a memory failure still leaves a finance answer.
  let memories: { recalledMemories: MemoryRecord[]; memoryStatus: MemoryContextStatus };
  let memorySource: 'walrus' | 'local_fallback' | undefined;
  try {
    const { hasConsent, local } = await withWalletTransaction(session.walletAddress, async (client) => {
      const repository = new PostgresMemoryRepository(client, mode);
      const consent = await repository.getConsent(session.userId);
      return { hasConsent: consent, local: consent ? await repository.findAllByUserId(session.userId) : [] };
    });
    if (!hasConsent) {
      memories = memoryContext(false, []);
    } else {
      // Semantic recall from the wallet's own Walrus namespace, outside any transaction.
      // No account yet means no Walrus call: the memories Memeora holds are used as they are.
      const walrus = walrusClientFor(await loadReadyMemoryAccount(session), mode);
      const recall = await walrus.recallMemories({ namespaceOwner: session.walletAddress, query: input.prompt, limit: RECALL_LIMIT });
      const selection = mergeRecall(local, recall);
      memorySource = selection.source;
      const imported = selection.unknown.length
        ? await withWalletTransaction(session.walletAddress, (client) =>
          new PostgresMemoryRepository(client, mode).importRecalled(session.userId, walrus.namespaceFor(session.walletAddress), selection.unknown))
        : [];
      memories = memoryContext(true, [...selection.memories, ...imported]);
    }
  } catch {
    memories = { recalledMemories: [], memoryStatus: 'unavailable' };
  }
  return answer(mode, session.userId, input.prompt, input.cycleMonth, records, memories, memorySource);
}
