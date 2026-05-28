export type AnalysisMoneyRow = {
  name?: string;
  category?: string;
  amount?: number | null;
};

export type AnalysisGoalRow = {
  id?: string;
  name?: string;
  target?: number | null;
  current?: number | null;
  monthly?: number | null;
  deadline?: string;
};

export type GoalRealityCheck = {
  id?: string;
  name: string;
  target: number;
  current: number;
  remaining: number;
  progressPercent: number;
  monthsRequiredAtCurrentSaving: number | null;
  requiredMonthlySaving: number | null;
  realistic: boolean | null;
};

export type FinancialAnalysisResult = {
  monthlyIncome: number;
  totalMonthlyExpenses: number;
  remainingSalary: number;
  currentSavingAmount: number;
  currentSavingPercentage: number;
  recommendedSavingPercentage: number;
  recommendedMonthlySaving: number;
  expenseRatio: number;
  expenseReductionTarget: number;
  categoriesToReduce: Array<{ name: string; amount: number; suggestedReduction: number }>;
  goals: GoalRealityCheck[];
  missingCoreData: boolean;
  actionPlan: string[];
};

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function monthsUntil(date?: string) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const months = (target.getFullYear() - today.getFullYear()) * 12 + target.getMonth() - today.getMonth();
  return Math.max(1, months);
}

function sum(rows: AnalysisMoneyRow[]) {
  return rows.reduce((total, row) => total + amount(row.amount), 0);
}

function groupExpenses(expenses: AnalysisMoneyRow[]) {
  const grouped = new Map<string, number>();
  for (const row of expenses) {
    const key = String(row.category || row.name || 'other').trim() || 'other';
    grouped.set(key, (grouped.get(key) ?? 0) + amount(row.amount));
  }
  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, amount: value }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculateFinancialAnalysis(input: {
  income: AnalysisMoneyRow[];
  expenses: AnalysisMoneyRow[];
  savings?: AnalysisMoneyRow[];
  investments?: AnalysisMoneyRow[];
  goals?: AnalysisGoalRow[];
}): FinancialAnalysisResult {
  const monthlyIncome = sum(input.income);
  const totalMonthlyExpenses = sum(input.expenses);
  const recordedSavings = sum(input.savings ?? []);
  const remainingSalary = monthlyIncome - totalMonthlyExpenses;
  const currentSavingAmount = recordedSavings > 0 ? recordedSavings : Math.max(0, remainingSalary);
  const currentSavingPercentage = monthlyIncome > 0 ? (currentSavingAmount / monthlyIncome) * 100 : 0;
  const expenseRatio = monthlyIncome > 0 ? (totalMonthlyExpenses / monthlyIncome) * 100 : 0;
  const recommendedSavingPercentage = monthlyIncome <= 0
    ? 0
    : expenseRatio > 75
      ? 10
      : expenseRatio > 60
        ? 15
        : 20;
  const recommendedMonthlySaving = monthlyIncome * (recommendedSavingPercentage / 100);
  const targetExpenseLimit = monthlyIncome > 0 ? monthlyIncome * 0.65 : totalMonthlyExpenses;
  const expenseReductionTarget = Math.max(0, totalMonthlyExpenses - targetExpenseLimit);
  const categories = groupExpenses(input.expenses);
  const categoriesToReduce = categories.slice(0, 3).map(category => ({
    name: category.name,
    amount: category.amount,
    suggestedReduction: Math.round(category.amount * 0.12),
  }));

  const goals = (input.goals ?? []).map(goal => {
    const target = amount(goal.target);
    const current = amount(goal.current);
    const monthly = amount(goal.monthly) || recommendedMonthlySaving;
    const remaining = Math.max(0, target - current);
    const monthsByDeadline = monthsUntil(goal.deadline);
    const requiredMonthlySaving = monthsByDeadline && remaining > 0 ? remaining / monthsByDeadline : null;
    const monthsRequiredAtCurrentSaving = monthly > 0 && remaining > 0 ? Math.ceil(remaining / monthly) : null;
    const realistic = requiredMonthlySaving === null || monthlyIncome <= 0
      ? null
      : requiredMonthlySaving <= monthlyIncome * 0.25 && requiredMonthlySaving <= Math.max(recommendedMonthlySaving, remainingSalary);

    return {
      id: goal.id,
      name: goal.name || 'Goal',
      target,
      current,
      remaining,
      progressPercent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
      monthsRequiredAtCurrentSaving,
      requiredMonthlySaving,
      realistic,
    };
  });

  return {
    monthlyIncome,
    totalMonthlyExpenses,
    remainingSalary,
    currentSavingAmount,
    currentSavingPercentage,
    recommendedSavingPercentage,
    recommendedMonthlySaving,
    expenseRatio,
    expenseReductionTarget,
    categoriesToReduce,
    goals,
    missingCoreData: monthlyIncome <= 0 || input.expenses.length === 0,
    actionPlan: [
      'review_top_expenses',
      'set_saving_transfer',
      'update_goal_deadline',
      'review_after_30_days',
    ],
  };
}

