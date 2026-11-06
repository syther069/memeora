import { CurrencyCode, Money } from './money';

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface SavingsGoalProps {
  id: string;
  userId: string;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor?: number;
  currency?: CurrencyCode;
  targetDate?: string;
  status?: GoalStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SavingsGoal {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly targetAmount: Money;
  readonly currentAmount: Money;
  readonly targetDate?: string;
  readonly status: GoalStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SavingsGoalProps) {
    if (!props.id) throw new Error('Goal id is required.');
    if (!props.userId) throw new Error('Goal userId is required.');
    if (!props.name || !props.name.trim()) throw new Error('Goal name is required.');
    if (props.targetAmountMinor <= 0) {
      throw new Error('Target amount must be strictly greater than zero.');
    }
    const current = props.currentAmountMinor ?? 0;
    if (current < 0) {
      throw new Error('Current amount cannot be negative.');
    }

    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name.trim();
    this.targetAmount = Money.fromMinorUnits(props.targetAmountMinor, props.currency || 'USD');
    this.currentAmount = Money.fromMinorUnits(current, props.currency || 'USD');
    this.targetDate = props.targetDate;
    this.status = props.status || 'active';
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  static create(props: SavingsGoalProps): SavingsGoal {
    return new SavingsGoal(props);
  }

  getProgressPercentage(): number {
    if (this.targetAmount.amountMinor === 0) return 0;
    const pct = Math.round((this.currentAmount.amountMinor / this.targetAmount.amountMinor) * 100);
    return Math.min(100, Math.max(0, pct));
  }
}


export const GOAL_NAME_MAX_LENGTH = 100;

export class GoalRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalRuleError';
  }
}

/** Accepts a real calendar date in YYYY-MM-DD form. */
export function isValidGoalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function statusForProgress(currentMinor: number, targetMinor: number, requested: GoalStatus): GoalStatus {
  if (currentMinor >= targetMinor) return 'completed';
  return requested === 'completed' ? 'active' : requested;
}

export interface GoalChanges {
  name?: string;
  targetAmountMinor?: number;
  currency?: CurrencyCode;
  /** null clears the target date. */
  targetDate?: string | null;
}

/**
 * Applies edits to a goal. Completion follows progress: reaching the target
 * completes the goal, and raising the target above the saved amount reopens a
 * completed goal. The currency is fixed once money has been saved.
 */
export function updateGoal(goal: SavingsGoal, changes: GoalChanges, now = new Date()): SavingsGoal {
  const name = changes.name ?? goal.name;
  if (name.trim().length > GOAL_NAME_MAX_LENGTH) {
    throw new GoalRuleError(`Goal name cannot exceed ${GOAL_NAME_MAX_LENGTH} characters.`);
  }
  const currency = changes.currency ?? goal.targetAmount.currency;
  if (currency !== goal.targetAmount.currency && goal.currentAmount.amountMinor > 0) {
    throw new GoalRuleError('The currency cannot change after money has been saved toward this goal.');
  }
  const targetDate = changes.targetDate === undefined ? goal.targetDate : changes.targetDate ?? undefined;
  if (targetDate !== undefined && !isValidGoalDate(targetDate)) {
    throw new GoalRuleError('Target date must be a valid date in YYYY-MM-DD format.');
  }
  const targetAmountMinor = changes.targetAmountMinor ?? goal.targetAmount.amountMinor;

  return SavingsGoal.create({
    id: goal.id,
    userId: goal.userId,
    name,
    targetAmountMinor,
    currentAmountMinor: goal.currentAmount.amountMinor,
    currency,
    targetDate,
    status: statusForProgress(goal.currentAmount.amountMinor, targetAmountMinor, goal.status === 'paused' ? 'paused' : 'active'),
    createdAt: goal.createdAt,
    updatedAt: now,
  });
}

/** Pauses or resumes a goal. Completed goals cannot be paused or resumed. */
export function setGoalStatus(goal: SavingsGoal, status: 'active' | 'paused', now = new Date()): SavingsGoal {
  if (goal.status === 'completed') {
    throw new GoalRuleError('A completed goal cannot be paused or resumed. Raise its target to reopen it.');
  }
  return SavingsGoal.create({
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetAmountMinor: goal.targetAmount.amountMinor,
    currentAmountMinor: goal.currentAmount.amountMinor,
    currency: goal.targetAmount.currency,
    targetDate: goal.targetDate,
    status,
    createdAt: goal.createdAt,
    updatedAt: now,
  });
}

/** Adds a contribution to an active goal and completes it when the target is reached. */
export function contributeToGoal(goal: SavingsGoal, amountMinor: number, now = new Date()): SavingsGoal {
  if (goal.status !== 'active') throw new GoalRuleError('Only active savings goals can receive contributions.');
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new GoalRuleError('Contribution must be a positive whole number of minor units.');
  }
  const currentAmountMinor = goal.currentAmount.amountMinor + amountMinor;
  if (!Number.isSafeInteger(currentAmountMinor)) {
    throw new GoalRuleError('Contribution exceeds the supported amount range.');
  }
  return SavingsGoal.create({
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetAmountMinor: goal.targetAmount.amountMinor,
    currentAmountMinor,
    currency: goal.targetAmount.currency,
    targetDate: goal.targetDate,
    status: statusForProgress(currentAmountMinor, goal.targetAmount.amountMinor, 'active'),
    createdAt: goal.createdAt,
    updatedAt: now,
  });
}

/**
 * Minor units to set aside in `period` (YYYY-MM) so the goal is reached by its
 * target month: the remaining amount divided evenly over the months left,
 * including the current one, rounded up. A goal whose target month has passed
 * needs the whole remainder now. Returns null when no monthly pace is defined:
 * the goal is not active, has no target date, or is already funded.
 */
export function calculateMonthlySetAside(goal: SavingsGoal, period: string): number | null {
  if (goal.status !== 'active' || !goal.targetDate || !isValidGoalDate(goal.targetDate)) return null;
  const remainingMinor = goal.targetAmount.amountMinor - goal.currentAmount.amountMinor;
  if (remainingMinor <= 0) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new GoalRuleError('Period must use YYYY-MM format.');
  const periodIndex = Number(match[1]) * 12 + Number(match[2]) - 1;
  const targetIndex = Number(goal.targetDate.slice(0, 4)) * 12 + Number(goal.targetDate.slice(5, 7)) - 1;
  const monthsLeft = targetIndex - periodIndex + 1;
  if (monthsLeft <= 1) return remainingMinor;
  return Math.ceil(remainingMinor / monthsLeft);
}
