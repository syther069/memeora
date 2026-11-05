import { describe, it, expect } from 'vitest';
import { parseMajorUnitsToMinor } from '@/modules/finance/domain/money';
import {
  GoalRuleError,
  SavingsGoal,
  calculateMonthlySetAside,
  contributeToGoal,
  isValidGoalDate,
  setGoalStatus,
  updateGoal,
} from '@/modules/finance/domain/savings-goal';

function goal(overrides: Partial<Parameters<typeof SavingsGoal.create>[0]> = {}) {
  return SavingsGoal.create({
    id: 'goal_1',
    userId: 'user_1',
    name: 'Goa trip',
    targetAmountMinor: 1500000,
    currentAmountMinor: 0,
    currency: 'INR',
    targetDate: '2027-12-01',
    ...overrides,
  });
}

describe('Savings goal rules', () => {
  it('validates calendar dates strictly', () => {
    expect(isValidGoalDate('2027-12-01')).toBe(true);
    expect(isValidGoalDate('2027-02-30')).toBe(false);
    expect(isValidGoalDate('2027-12')).toBe(false);
  });

  it('completes on reaching the target and reopens when the target is raised', () => {
    const funded = contributeToGoal(goal({ currentAmountMinor: 1400000 }), 100000);
    expect(funded.status).toBe('completed');
    expect(updateGoal(funded, { targetAmountMinor: 2000000 }).status).toBe('active');
    expect(updateGoal(goal({ currentAmountMinor: 500000 }), { targetAmountMinor: 500000 }).status).toBe('completed');
  });

  it('keeps a paused goal paused through edits', () => {
    const paused = setGoalStatus(goal(), 'paused');
    expect(updateGoal(paused, { name: 'Goa trip 2027' }).status).toBe('paused');
  });

  it('blocks currency changes after saving and contributions to inactive goals', () => {
    expect(() => updateGoal(goal({ currentAmountMinor: 100 }), { currency: 'USD' })).toThrow(GoalRuleError);
    expect(updateGoal(goal(), { currency: 'USD' }).targetAmount.currency).toBe('USD');
    expect(() => contributeToGoal(setGoalStatus(goal(), 'paused'), 100)).toThrow(GoalRuleError);
    expect(() => setGoalStatus(contributeToGoal(goal({ targetAmountMinor: 100 }), 100), 'paused')).toThrow(GoalRuleError);
  });

  it('clears a target date with null', () => {
    expect(updateGoal(goal(), { targetDate: null }).targetDate).toBeUndefined();
  });
});

describe('calculateMonthlySetAside', () => {
  it('spreads the remainder evenly over the months left, rounding up', () => {
    // Nov 2026 → Dec 2027 is 14 months inclusive: ceil(1,500,000 / 14) = 107,143 paise.
    expect(calculateMonthlySetAside(goal(), '2026-11')).toBe(107143);
    expect(calculateMonthlySetAside(goal({ currentAmountMinor: 100000 }), '2027-11')).toBe(700000);
  });

  it('asks for the whole remainder in the target month or after it', () => {
    expect(calculateMonthlySetAside(goal({ currentAmountMinor: 1000000 }), '2027-12')).toBe(500000);
    expect(calculateMonthlySetAside(goal({ currentAmountMinor: 1000000 }), '2028-03')).toBe(500000);
  });

  it('returns null when no monthly pace is defined', () => {
    expect(calculateMonthlySetAside(goal({ targetDate: undefined }), '2026-11')).toBeNull();
    expect(calculateMonthlySetAside(setGoalStatus(goal(), 'paused'), '2026-11')).toBeNull();
    expect(calculateMonthlySetAside(goal({ currentAmountMinor: 1500000, status: 'completed' }), '2026-11')).toBeNull();
  });
});

describe('parseMajorUnitsToMinor', () => {
  it('parses typed amounts exactly', () => {
    expect(parseMajorUnitsToMinor('1,500')).toBe(150000);
    expect(parseMajorUnitsToMinor('19.99')).toBe(1999);
    expect(parseMajorUnitsToMinor('0.1')).toBe(10);
  });

  it('rejects zero, negatives, and extra precision', () => {
    expect(parseMajorUnitsToMinor('0')).toBeNull();
    expect(parseMajorUnitsToMinor('-5')).toBeNull();
    expect(parseMajorUnitsToMinor('1.234')).toBeNull();
    expect(parseMajorUnitsToMinor('abc')).toBeNull();
  });
});
