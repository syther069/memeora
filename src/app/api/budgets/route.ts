import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '../../../lib/api-response';
import { INVALID_MODE_MESSAGE, readAppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { claimIdempotencyKey, readIdempotencyKey, storeIdempotentResponse } from '@/lib/postgres/idempotency';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { Budget } from '../../../modules/finance/domain/budget';
import { periodBounds, toPeriodTotals } from '../../../modules/finance/domain/calculations';
import { CurrencyCode, isCurrencyCode } from '../../../modules/finance/domain/money';
import {
  GOAL_NAME_MAX_LENGTH,
  GoalRuleError,
  SavingsGoal,
  contributeToGoal,
  isValidGoalDate,
  setGoalStatus,
  updateGoal,
  type GoalChanges,
} from '../../../modules/finance/domain/savings-goal';


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidPeriod(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isPositiveMinor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Validates the editable goal fields shared by create-goal and update-goal. */
function parseGoalFields(
  input: Record<string, unknown>,
  required: boolean
): { ok: true; fields: GoalChanges } | { ok: false; message: string } {
  const fields: GoalChanges = {};
  if (input.name !== undefined || required) {
    if (typeof input.name !== 'string' || !input.name.trim()) return { ok: false, message: 'Goal name is required.' };
    if (input.name.trim().length > GOAL_NAME_MAX_LENGTH) {
      return { ok: false, message: `Goal name cannot exceed ${GOAL_NAME_MAX_LENGTH} characters.` };
    }
    fields.name = input.name.trim();
  }
  if (input.targetAmountMinor !== undefined || required) {
    if (!isPositiveMinor(input.targetAmountMinor)) {
      return { ok: false, message: 'targetAmountMinor must be a positive safe integer.' };
    }
    fields.targetAmountMinor = input.targetAmountMinor;
  }
  if (input.currency !== undefined) {
    if (!isCurrencyCode(input.currency)) return { ok: false, message: 'Choose a supported currency.' };
    fields.currency = input.currency;
  }
  if (input.targetDate !== undefined) {
    if (input.targetDate !== null && (typeof input.targetDate !== 'string' || !isValidGoalDate(input.targetDate))) {
      return { ok: false, message: 'targetDate must be a valid YYYY-MM-DD date or null.' };
    }
    fields.targetDate = input.targetDate;
  }
  return { ok: true, fields };
}

function serializeBudget(budget: Budget | null) {
  if (!budget) return null;
  return {
    id: budget.id,
    period: budget.period,
    amountMinor: budget.amount.amountMinor,
    currency: budget.amount.currency,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

function serializeGoal(goal: SavingsGoal) {
  return {
    id: goal.id,
    name: goal.name,
    targetAmountMinor: goal.targetAmount.amountMinor,
    currentAmountMinor: goal.currentAmount.amountMinor,
    currency: goal.targetAmount.currency,
    targetDate: goal.targetDate ?? null,
    status: goal.status,
    progressPercent: goal.getProgressPercentage(),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

type DbBudget = { id: string; user_id: string; period: string; amount_minor: string | number; currency: CurrencyCode; created_at: Date | string; updated_at: Date | string };
type DbGoal = { id: string; user_id: string; name: string; target_amount_minor: string | number; current_amount_minor: string | number; currency: CurrencyCode; target_date: string | null; status: 'active' | 'paused' | 'completed'; created_at: Date | string; updated_at: Date | string };

function toBudget(row: DbBudget): Budget {
  return Budget.create({
    id: row.id,
    userId: row.user_id,
    period: row.period,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function toSavingsGoal(row: DbGoal): SavingsGoal {
  return SavingsGoal.create({
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
  });
}

async function walletGet(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  const requestedPeriod = new URL(request.url).searchParams.get('period');
  const period = requestedPeriod ?? new Date().toISOString().slice(0, 7);
  if (!isValidPeriod(period)) return jsonError('VALIDATION_ERROR', 'Period must use YYYY-MM format with a valid month.', 400);
  try {
    const result = await withWalletTransaction(session.walletAddress, async (client) => {
      const profile = await client.query('SELECT preferred_currency FROM profiles WHERE id = $1', [session.userId]) as { rows: Array<{ preferred_currency: CurrencyCode }> };
      const budget = await client.query('SELECT * FROM budgets WHERE user_id = $1 AND period = $2 AND mode = $3', [session.userId, period, mode]) as { rows: DbBudget[] };
      const goals = await client.query(
        `SELECT * FROM savings_goals WHERE user_id = $1 AND mode = $2
         ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, created_at DESC`,
        [session.userId, mode],
      ) as { rows: DbGoal[] };
      // Exact month totals per currency, summed by the database over every entry in the period.
      const { start, end } = periodBounds(period);
      const totals = await client.query(
        `SELECT currency,
                COALESCE(SUM(amount_minor) FILTER (WHERE type = 'income'), 0) AS "incomeMinor",
                COALESCE(SUM(amount_minor) FILTER (WHERE type = 'expense'), 0) AS "expenseMinor",
                COUNT(*) AS "transactionCount"
         FROM transactions
         WHERE user_id = $1 AND mode = $4 AND occurred_at >= $2 AND occurred_at < $3
         GROUP BY currency
         ORDER BY COUNT(*) DESC, currency`,
        [session.userId, start, end, mode],
      ) as { rows: Array<Parameters<typeof toPeriodTotals>[0]> };
      return {
        preferredCurrency: profile.rows[0]?.preferred_currency ?? 'USD',
        budget: budget.rows[0] ? toBudget(budget.rows[0]) : null,
        goals: goals.rows.map(toSavingsGoal),
        periodTotals: totals.rows.map(toPeriodTotals),
      };
    });
    return jsonSuccess({ period, preferredCurrency: result.preferredCurrency, budget: serializeBudget(result.budget), savingsGoals: result.goals.map(serializeGoal), periodTotals: result.periodTotals });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to load budgets right now.', 503);
  }
}

async function walletPost(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const mode = readAppMode(request);
  if (!mode) return jsonError('VALIDATION_ERROR', INVALID_MODE_MESSAGE, 400);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400);
  const input = body as Record<string, unknown>;
  const idempotencyKey = readIdempotencyKey(request);
  if (idempotencyKey === null) return jsonError('VALIDATION_ERROR', 'The Idempotency-Key header is not valid.', 400);
  try {
    if (input.action === 'set-budget') {
      const { period, amountMinor, currency = 'USD' } = input;
      if (!isValidPeriod(period) || !isPositiveMinor(amountMinor) || !isCurrencyCode(currency)) return jsonError('VALIDATION_ERROR', 'A valid period, positive minor-unit amount, and a supported currency are required.', 400);
      const result = await withWalletTransaction(session.walletAddress, async (client) => {
        const saved = await client.query(
          `INSERT INTO budgets(user_id, period, amount_minor, currency, mode)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, mode, period) DO UPDATE SET amount_minor = EXCLUDED.amount_minor,
             currency = EXCLUDED.currency, updated_at = NOW()
           RETURNING *, (xmax = 0) AS inserted`, [session.userId, period, amountMinor, currency, mode],
        ) as { rows: Array<DbBudget & { inserted: boolean }> };
        // xmax = 0 only for a freshly inserted row, so an update answers 200, a new budget 201.
        return { budget: toBudget(saved.rows[0]), inserted: saved.rows[0].inserted };
      });
      return jsonSuccess({ budget: serializeBudget(result.budget) }, result.inserted ? 201 : 200);
    }

    if (input.action === 'create-goal') {
      const parsed = parseGoalFields(input, true);
      if (!parsed.ok) return jsonError('VALIDATION_ERROR', parsed.message, 400);
      const currentAmountMinor = input.currentAmountMinor ?? 0;
      if (typeof currentAmountMinor !== 'number' || !Number.isSafeInteger(currentAmountMinor) || currentAmountMinor < 0) return jsonError('VALIDATION_ERROR', 'currentAmountMinor must be a non-negative safe integer.', 400);
      if (parsed.fields.targetDate && parsed.fields.targetDate < new Date().toISOString().slice(0, 10)) return jsonError('VALIDATION_ERROR', 'A new goal cannot have a target date in the past.', 400);
      const scope = `budgets:create-goal:${mode}`;
      const body = await withWalletTransaction(session.walletAddress, async (client) => {
        const replay = await claimIdempotencyKey(client, session.userId, scope, idempotencyKey);
        if (replay) return replay.body;
        const inserted = await client.query(
          `INSERT INTO savings_goals(user_id, name, target_amount_minor, current_amount_minor, currency, target_date, status, mode)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [session.userId, parsed.fields.name, parsed.fields.targetAmountMinor, currentAmountMinor, parsed.fields.currency ?? 'USD', parsed.fields.targetDate ?? null, currentAmountMinor >= (parsed.fields.targetAmountMinor as number) ? 'completed' : 'active', mode],
        ) as { rows: DbGoal[] };
        const created = { savingsGoal: serializeGoal(toSavingsGoal(inserted.rows[0])) };
        await storeIdempotentResponse(client, session.userId, scope, idempotencyKey, { status: 201, body: created });
        return created;
      });
      return jsonSuccess(body, 201);
    }

    if (input.action === 'delete-goal' || input.action === 'update-goal' || input.action === 'set-goal-status' || input.action === 'contribute-goal') {
      if (typeof input.goalId !== 'string' || !UUID_PATTERN.test(input.goalId)) return jsonError('VALIDATION_ERROR', 'goalId must be a UUID.', 400);
      // Adding money is the one goal action a repeat would change.
      const scope = 'budgets:contribute-goal';
      const contributeKey = input.action === 'contribute-goal' ? idempotencyKey : undefined;
      const result = await withWalletTransaction(session.walletAddress, async (client) => {
        const replay = await claimIdempotencyKey(client, session.userId, scope, contributeKey);
        if (replay) return { replay: replay.body };
        const selected = await client.query('SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2 FOR UPDATE', [input.goalId, session.userId]) as { rows: DbGoal[] };
        if (!selected.rows[0]) return { notFound: true as const };
        const existing = toSavingsGoal(selected.rows[0]);
        if (input.action === 'delete-goal') {
          await client.query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [existing.id, session.userId]);
          return { deleted: existing.id };
        }
        let updated: SavingsGoal;
        if (input.action === 'update-goal') {
          const parsed = parseGoalFields(input, false);
          if (!parsed.ok) return { validationError: parsed.message };
          updated = updateGoal(existing, parsed.fields);
        } else if (input.action === 'set-goal-status') {
          if (input.status !== 'active' && input.status !== 'paused') return { validationError: 'status must be active or paused.' };
          updated = setGoalStatus(existing, input.status);
        } else {
          if (!isPositiveMinor(input.amountMinor)) return { validationError: 'amountMinor must be a positive safe integer.' };
          updated = contributeToGoal(existing, input.amountMinor);
        }
        await client.query(
          `UPDATE savings_goals SET name = $3, target_amount_minor = $4, current_amount_minor = $5,
             currency = $6, target_date = $7, status = $8, updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [existing.id, session.userId, updated.name, updated.targetAmount.amountMinor, updated.currentAmount.amountMinor, updated.targetAmount.currency, updated.targetDate ?? null, updated.status],
        );
        await storeIdempotentResponse(client, session.userId, scope, contributeKey, { status: 200, body: { savingsGoal: serializeGoal(updated) } });
        return { goal: updated };
      });
      if ('replay' in result) return jsonSuccess(result.replay);
      if ('notFound' in result) return jsonError('NOT_FOUND', 'Savings goal not found.', 404);
      if ('validationError' in result && typeof result.validationError === 'string') return jsonError('VALIDATION_ERROR', result.validationError, 400);
      if ('deleted' in result) return jsonSuccess({ deletedGoalId: result.deleted });
      return jsonSuccess({ savingsGoal: serializeGoal(result.goal) });
    }
    return jsonError('VALIDATION_ERROR', 'Unsupported budget or savings-goal action.', 400);
  } catch (error) {
    if (error instanceof GoalRuleError) return jsonError('CONFLICT', error.message, 409);
    return jsonError('SERVICE_UNAVAILABLE', 'Unable to save this budget or savings goal right now.', 503);
  }
}

export async function GET(request: NextRequest) {
  return walletGet(request);
}

export async function POST(request: NextRequest) {
  return walletPost(request);
}
