import { moneyNumber } from './money';

export type GoalProgressInput = {
  amount?: unknown;
  target_amount?: unknown;
  targetAmount?: unknown;
  goal_amount?: unknown;
  goalAmount?: unknown;
  target?: unknown;
  current_amount?: unknown;
  currentAmount?: unknown;
  saved_amount?: unknown;
  savedAmount?: unknown;
  saved?: unknown;
  progress_amount?: unknown;
  progressAmount?: unknown;
  amountSaved?: unknown;
  monthly_contribution?: unknown;
  monthlyContribution?: unknown;
  monthly_saving?: unknown;
  monthlySaving?: unknown;
  notes?: unknown;
};

export type GoalProgress = {
  currentAmount: number;
  targetAmount: number;
  remainingAmount: number;
  progressPercent: number;
  progressPercentExact: number | null;
  progressRatio: number | null;
  monthlyContribution: number;
  monthsToGoal: number | null;
  hasCurrentAmount: boolean;
  hasTargetAmount: boolean;
  hasMonthlyContribution: boolean;
};

export function parseMoney(value: unknown): number {
  return moneyNumber(value, 0);
}

export function parseGoalNotes(notes: unknown): Record<string, unknown> {
  if (!notes) return {};
  if (typeof notes === 'object') return notes as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(notes)) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function firstParsedMoney(values: unknown[]) {
  for (const value of values) {
    const parsed = moneyNumber(value, Number.NaN);
    if (Number.isFinite(parsed)) return { value: parsed, found: true };
  }
  return { value: 0, found: false };
}

export function calculateGoalProgress(goal: GoalProgressInput): GoalProgress {
  const notes = parseGoalNotes(goal.notes);
  const target = firstParsedMoney([
    goal.target_amount,
    goal.targetAmount,
    goal.goal_amount,
    goal.goalAmount,
    goal.target,
    notes.targetAmount,
    notes.target_amount,
    notes.goalAmount,
    notes.goal_amount,
    goal.amount,
  ]);
  const current = firstParsedMoney([
    goal.current_amount,
    goal.currentAmount,
    goal.saved_amount,
    goal.savedAmount,
    goal.progress_amount,
    goal.progressAmount,
    goal.amountSaved,
    goal.saved,
    notes.currentAmount,
    notes.current_amount,
    notes.savedAmount,
    notes.saved_amount,
    notes.progressAmount,
    notes.progress_amount,
    notes.amountSaved,
    notes.saved,
  ]);
  const monthly = firstParsedMoney([
    goal.monthly_contribution,
    goal.monthlyContribution,
    goal.monthly_saving,
    goal.monthlySaving,
    notes.monthlyContribution,
    notes.monthly_contribution,
    notes.monthlySaving,
    notes.monthly_saving,
  ]);

  const targetAmount = target.value;
  const currentAmount = current.value;
  const monthlyContribution = monthly.value;
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const progressRatio = targetAmount > 0
    ? Math.min(1, Math.max(0, currentAmount / targetAmount))
    : null;
  const progressPercentExact = progressRatio === null ? null : progressRatio * 100;
  const progressPercent = progressPercentExact === null
    ? 0
    : Number(progressPercentExact.toFixed(progressPercentExact > 0 && progressPercentExact < 1 ? 2 : 1));
  const monthsToGoal = monthlyContribution > 0
    ? Math.ceil(remainingAmount / monthlyContribution)
    : null;

  return {
    currentAmount,
    targetAmount,
    remainingAmount,
    progressPercent,
    progressPercentExact,
    progressRatio,
    monthlyContribution,
    monthsToGoal,
    hasCurrentAmount: current.found,
    hasTargetAmount: target.found,
    hasMonthlyContribution: monthly.found,
  };
}
