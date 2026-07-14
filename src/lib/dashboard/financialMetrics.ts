import { parseMoneyValue } from '@/lib/money';

export type FinancialRow = Record<string, unknown>;
export type CashFlowPoint = {
  key: string;
  year: number;
  month: number;
  income: number;
  expenses: number;
};

const INCOME_DATE_KEYS = ['transaction_date', 'received_date', 'generated_for_date', 'date', 'created_at'];
const EXPENSE_DATE_KEYS = ['transaction_date', 'expense_date', 'date', 'recorded_at', 'created_at'];
const UNREALIZED_INCOME_STATUSES = new Set(['expected', 'pending', 'late', 'draft', 'cancelled', 'canceled', 'void']);
const UNREALIZED_EXPENSE_STATUSES = new Set(['scheduled', 'pending', 'draft', 'cancelled', 'canceled', 'void']);

export const FINANCIAL_HEALTH_MODEL = {
  surplusWeight: 35,
  surplusTarget: 0.2,
  liquidityWeight: 35,
  liquidityTargetMonths: 6,
  debtWeight: 30,
  debtHealthyMaximum: 0.2,
  debtZeroScoreAt: 0.5,
} as const;

function amount(value: unknown) {
  const parsed = parseMoneyValue(value);
  return parsed.status === 'valid' && Number.isFinite(parsed.value) ? parsed.value : 0;
}

function status(row: FinancialRow) {
  return String(row.status ?? row.payment_status ?? row.workflow_status ?? '').trim().toLowerCase();
}

function firstDate(row: FinancialRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsed = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
      : new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function realizedIncomeRows(rows: FinancialRow[], now = new Date()) {
  const cutoff = endOfDay(now);
  return rows.filter((row) => {
    if (!row.confirmed_at && UNREALIZED_INCOME_STATUSES.has(status(row))) return false;
    const date = firstDate(row, INCOME_DATE_KEYS);
    return !date || date <= cutoff;
  });
}

export function realizedExpenseRows(rows: FinancialRow[], now = new Date()) {
  const cutoff = endOfDay(now);
  return rows.filter((row) => {
    if (UNREALIZED_EXPENSE_STATUSES.has(status(row))) return false;
    const date = firstDate(row, EXPENSE_DATE_KEYS);
    return !date || date <= cutoff;
  });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthlyCashFlow(incomeRows: FinancialRow[], expenseRows: FinancialRow[], now = new Date()): CashFlowPoint[] {
  const points = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1, 12);
    return { key: monthKey(date), year: date.getFullYear(), month: date.getMonth(), income: 0, expenses: 0 };
  });
  const byKey = new Map(points.map((point) => [point.key, point]));

  for (const row of realizedIncomeRows(incomeRows, now)) {
    const date = firstDate(row, INCOME_DATE_KEYS);
    const point = date ? byKey.get(monthKey(date)) : undefined;
    if (point) point.income += amount(row.amount);
  }
  for (const row of realizedExpenseRows(expenseRows, now)) {
    const date = firstDate(row, EXPENSE_DATE_KEYS);
    const point = date ? byKey.get(monthKey(date)) : undefined;
    if (point) point.expenses += amount(row.amount);
  }
  return points;
}

export function monthOverMonthChange(current: number, previous: number, hasCurrent: boolean, hasPrevious: boolean) {
  if (!hasCurrent || !hasPrevious || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function calculateFinancialHealth(input: {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsBalance: number;
  monthlyDebtPayments: number;
  hasIncomeData: boolean;
  hasExpenseData: boolean;
  hasSavingsData: boolean;
  debtsLoaded: boolean;
}) {
  const {
    monthlyIncome,
    monthlyExpenses,
    savingsBalance,
    monthlyDebtPayments,
    hasIncomeData,
    hasExpenseData,
    hasSavingsData,
    debtsLoaded,
  } = input;
  if (!hasIncomeData || !hasExpenseData || !hasSavingsData || !debtsLoaded) return null;
  if (![monthlyIncome, monthlyExpenses, savingsBalance, monthlyDebtPayments].every(Number.isFinite)) return null;
  if (monthlyIncome <= 0 || monthlyExpenses <= 0 || savingsBalance < 0 || monthlyDebtPayments < 0) return null;

  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const savingsRatio = (monthlyIncome - monthlyExpenses) / monthlyIncome;
  const expenseCoverage = monthlyIncome / monthlyExpenses;
  const emergencyFundMonths = savingsBalance / monthlyExpenses;
  const debtToIncome = monthlyDebtPayments / monthlyIncome;

  const model = FINANCIAL_HEALTH_MODEL;
  const surplusPoints = clamp(savingsRatio / model.surplusTarget) * model.surplusWeight;
  const liquidityPoints = clamp(emergencyFundMonths / model.liquidityTargetMonths) * model.liquidityWeight;
  const debtPoints = debtToIncome <= model.debtHealthyMaximum
    ? model.debtWeight
    : debtToIncome >= model.debtZeroScoreAt
      ? 0
      : ((model.debtZeroScoreAt - debtToIncome) / (model.debtZeroScoreAt - model.debtHealthyMaximum)) * model.debtWeight;

  return {
    score: Math.round(surplusPoints + liquidityPoints + debtPoints),
    savingsRatio,
    expenseCoverage,
    emergencyFundMonths,
    debtToIncome,
  };
}

export function buildLinePoints(values: number[], width = 760, top = 18, bottom = 202, maximum?: number) {
  if (values.length < 2) return '';
  const max = maximum && maximum > 0 ? maximum : Math.max(...values, 0);
  if (max <= 0) return '';
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = bottom - (Math.max(0, value) / max) * (bottom - top);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
