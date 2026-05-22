export type GoalProgressInput = {
  amount?: unknown;
  target_amount?: unknown;
  targetAmount?: unknown;
  goalAmount?: unknown;
  current_amount?: unknown;
  currentAmount?: unknown;
  saved_amount?: unknown;
  savedAmount?: unknown;
  saved?: unknown;
  progressAmount?: unknown;
  amountSaved?: unknown;
  notes?: unknown;
};

export type GoalProgress = {
  currentAmount: number;
  targetAmount: number;
  remainingAmount: number;
  progressPercent: number;
};

export function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === '') return 0;

  const normalized = String(value)
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\d.,-]/g, '');

  if (!normalized) return 0;

  const decimalComma = /,\d{1,3}$/.test(normalized) && normalized.lastIndexOf(',') > normalized.lastIndexOf('.');
  const numeric = decimalComma
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized.replace(/,/g, '');

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
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

export function calculateGoalProgress(goal: GoalProgressInput): GoalProgress {
  const notes = parseGoalNotes(goal.notes);
  const targetAmount = parseMoney(
    goal.target_amount
      ?? goal.targetAmount
      ?? goal.amount
      ?? goal.goalAmount
      ?? notes.targetAmount
      ?? notes.target_amount
      ?? 0,
  );
  const currentAmount = parseMoney(
    goal.current_amount
      ?? goal.currentAmount
      ?? goal.saved_amount
      ?? goal.savedAmount
      ?? goal.saved
      ?? goal.progressAmount
      ?? goal.amountSaved
      ?? notes.currentAmount
      ?? notes.current_amount
      ?? notes.savedAmount
      ?? notes.saved_amount
      ?? notes.saved
      ?? 0,
  );
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const progressPercent = targetAmount > 0
    ? Math.min(100, Math.max(0, Math.round((currentAmount / targetAmount) * 100)))
    : 0;

  return {
    currentAmount,
    targetAmount,
    remainingAmount,
    progressPercent,
  };
}
