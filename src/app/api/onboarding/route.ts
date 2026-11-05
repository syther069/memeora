import { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { isAppMode, type AppMode } from '@/lib/app-mode';
import { requireWalletSession } from '@/lib/auth/require-session';
import { withWalletTransaction } from '@/lib/postgres/wallet-transaction';
import { isCurrencyCode } from '@/modules/finance/domain/money';
import { GOAL_NAME_MAX_LENGTH, isValidGoalDate } from '@/modules/finance/domain/savings-goal';
import { MEMORY_CONSENT_POLICY_VERSION } from '@/modules/financial-memory/infrastructure/postgres-memory-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONSENT_POLICY_VERSION = MEMORY_CONSENT_POLICY_VERSION;

function isPositiveMinor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  try {
    const result = await withWalletTransaction(session.walletAddress, async (client) => {
      const profileResult = await client.query(
        `SELECT id, preferred_currency, active_mode, memory_consent_enabled,
                memory_consent_updated_at, memory_consent_policy_version,
                onboarding_completed_at, onboarding_skipped_at
         FROM profiles WHERE id = $1`, [session.userId],
      ) as { rows: Array<Record<string, unknown>> };
      const profile = profileResult.rows[0];
      if (!profile) return null;
      const budgetResult = await client.query(
        `SELECT period, amount_minor, currency FROM budgets
         WHERE user_id = $1 ORDER BY period DESC LIMIT 1`, [session.userId],
      ) as { rows: Array<{ period: string; amount_minor: string; currency: string }> };
      const goalsResult = await client.query(
        `SELECT id, name, target_amount_minor, current_amount_minor, currency, target_date
         FROM savings_goals WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`, [session.userId],
      ) as { rows: Array<Record<string, unknown>> };
      return { profile, budget: budgetResult.rows[0] ?? null, savingsGoal: goalsResult.rows[0] ?? null };
    });
    return jsonSuccess({ onboardingRequired: !result?.profile.onboarding_completed_at && !result?.profile.onboarding_skipped_at, ...result });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Could not load onboarding details.', 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWalletSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('VALIDATION_ERROR', 'Invalid JSON body.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400);
  const input = body as Record<string, unknown>;

  if (input.action === 'defer') {
    try {
      await withWalletTransaction(session.walletAddress, async (client) => {
        await client.query(
          `INSERT INTO profiles(id, onboarding_skipped_at)
           VALUES ($1, NOW())
           ON CONFLICT (id) DO UPDATE SET onboarding_skipped_at = NOW(), updated_at = NOW()`,
          [session.userId],
        );
      });
      return jsonSuccess({ onboardingDeferred: true });
    } catch {
      return jsonError('SERVICE_UNAVAILABLE', 'Onboarding could not be deferred. Try again.', 503);
    }
  }

  if (input.action !== 'complete' || !isCurrencyCode(input.currency) || typeof input.memoryConsentEnabled !== 'boolean') {
    return jsonError('VALIDATION_ERROR', 'Choose INR or USD and explicitly accept or decline memory storage.', 400);
  }
  const monthlyBudgetMinor = input.monthlyBudgetMinor;
  if (monthlyBudgetMinor !== undefined && monthlyBudgetMinor !== null && !isPositiveMinor(monthlyBudgetMinor)) {
    return jsonError('VALIDATION_ERROR', 'Monthly budget must be a positive safe integer in minor units.', 400);
  }
  let goal: { name: string; targetAmountMinor: number; targetDate?: string | null } | null = null;
  if (input.savingsGoal !== undefined && input.savingsGoal !== null) {
    if (!input.savingsGoal || typeof input.savingsGoal !== 'object' || Array.isArray(input.savingsGoal)) return jsonError('VALIDATION_ERROR', 'Savings goal must be an object.', 400);
    const candidate = input.savingsGoal as Record<string, unknown>;
    if (typeof candidate.name !== 'string' || candidate.name.trim().length < 1 || candidate.name.trim().length > GOAL_NAME_MAX_LENGTH || !isPositiveMinor(candidate.targetAmountMinor)) {
      return jsonError('VALIDATION_ERROR', `Savings goal needs a name (up to ${GOAL_NAME_MAX_LENGTH} characters) and a positive target amount.`, 400);
    }
    if (candidate.targetDate !== undefined && candidate.targetDate !== null && (typeof candidate.targetDate !== 'string' || !isValidGoalDate(candidate.targetDate))) {
      return jsonError('VALIDATION_ERROR', 'Savings goal target date must use YYYY-MM-DD.', 400);
    }
    if (typeof candidate.targetDate === 'string' && candidate.targetDate < new Date().toISOString().slice(0, 10)) {
      return jsonError('VALIDATION_ERROR', 'Savings goal target date cannot be in the past.', 400);
    }
    goal = { name: candidate.name.trim(), targetAmountMinor: candidate.targetAmountMinor, targetDate: candidate.targetDate as string | null | undefined };
  }

  if (input.activeMode !== undefined && !isAppMode(input.activeMode)) {
    return jsonError('VALIDATION_ERROR', 'Choose personal or business.', 400);
  }
  const mode: AppMode = input.activeMode ?? 'personal';

  const period = new Date().toISOString().slice(0, 7);
  try {
    const result = await withWalletTransaction(session.walletAddress, async (client) => {
      await client.query(
        `INSERT INTO profiles(id, preferred_currency, active_mode, onboarding_completed_at,
                              onboarding_skipped_at, memory_consent_enabled,
                              memory_consent_updated_at, memory_consent_policy_version,
                              memory_consent_source, updated_at)
         VALUES ($1, $2, $5, NOW(), NULL, $3, NOW(), $4, 'onboarding', NOW())
         ON CONFLICT (id) DO UPDATE SET
           preferred_currency = EXCLUDED.preferred_currency,
           active_mode = EXCLUDED.active_mode,
           onboarding_completed_at = NOW(), onboarding_skipped_at = NULL,
           memory_consent_enabled = EXCLUDED.memory_consent_enabled,
           memory_consent_updated_at = NOW(),
           memory_consent_policy_version = EXCLUDED.memory_consent_policy_version,
           memory_consent_source = EXCLUDED.memory_consent_source,
           updated_at = NOW()`,
        [session.userId, input.currency, input.memoryConsentEnabled, CONSENT_POLICY_VERSION, mode],
      );
      await client.query(
        `INSERT INTO profile_consent_events(user_id, consent_enabled, policy_version, source)
         VALUES ($1, $2, $3, 'onboarding')`,
        [session.userId, input.memoryConsentEnabled, CONSENT_POLICY_VERSION],
      );
      if (monthlyBudgetMinor !== undefined && monthlyBudgetMinor !== null) {
        await client.query(
          `INSERT INTO budgets(user_id, period, amount_minor, currency, mode)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, mode, period) DO UPDATE SET
             amount_minor = EXCLUDED.amount_minor, currency = EXCLUDED.currency, updated_at = NOW()`,
          [session.userId, period, monthlyBudgetMinor, input.currency, mode],
        );
      }
      let savingsGoalId: string | null = null;
      if (goal) {
        const inserted = await client.query(
          `INSERT INTO savings_goals(user_id, name, target_amount_minor, currency, target_date, mode)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [session.userId, goal.name, goal.targetAmountMinor, input.currency, goal.targetDate ?? null, mode],
        ) as { rows: Array<{ id: string }> };
        savingsGoalId = inserted.rows[0].id;
      }
      return { savingsGoalId };
    });
    return jsonSuccess({ onboardingCompleted: true, period, savingsGoalId: result.savingsGoalId }, 201);
  } catch {
    return jsonError('SERVICE_UNAVAILABLE', 'Onboarding could not be saved. Your profile was not partially updated; please retry.', 503);
  }
}
