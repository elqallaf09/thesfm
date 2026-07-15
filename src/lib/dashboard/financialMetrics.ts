import { parseMoneyValue } from '@/lib/money';

export type FinancialRow = Record<string, unknown>;
export type CashFlowPoint = {
  key: string;
  year: number;
  month: number;
  income: number;
  expenses: number;
  incomeRecords: number;
  expenseRecords: number;
};

export type MonthlyHealthSnapshot = {
  monthlyIncome: number;
  monthlyExpenses: number;
  hasIncomeData: boolean;
  hasExpenseData: boolean;
  incomeAmountsComplete: boolean;
  expenseAmountsComplete: boolean;
};

export type FinancialHealthInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsBalance: number;
  monthlyDebtPayments: number;
  hasIncomeData: boolean;
  hasExpenseData: boolean;
  hasSavingsData: boolean;
  debtsLoaded: boolean;
};

const INCOME_DATE_KEYS = ['transaction_date', 'received_date', 'generated_for_date', 'date', 'created_at'];
const EXPENSE_DATE_KEYS = ['transaction_date', 'expense_date', 'date', 'recorded_at', 'created_at'];
const UNREALIZED_INCOME_STATUSES = new Set(['expected', 'pending', 'late', 'draft', 'cancelled', 'canceled', 'void']);
const UNREALIZED_EXPENSE_STATUSES = new Set(['scheduled', 'pending', 'draft', 'cancelled', 'canceled', 'void']);
const INACTIVE_PLAN_STATUSES = new Set(['cancelled', 'canceled', 'paused', 'inactive', 'archived', 'void']);

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
  return parsedAmount(value) ?? 0;
}

function parsedAmount(value: unknown) {
  const parsed = parseMoneyValue(value);
  return parsed.status === 'valid' && Number.isFinite(parsed.value) ? parsed.value : null;
}

function status(row: FinancialRow) {
  const enhanced = recordObject(row.enhanced);
  return String(
    row.status ??
    row.payment_status ??
    row.workflow_status ??
    enhanced.subscription_status ??
    enhanced.status ??
    '',
  ).trim().toLowerCase();
}

function recordObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function financialRowDate(row: FinancialRow, kind: 'income' | 'expense') {
  return firstDate(row, kind === 'income' ? INCOME_DATE_KEYS : EXPENSE_DATE_KEYS);
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

function isTruthy(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function isActive(row: FinancialRow) {
  const active = row.is_active !== false && row.is_active !== 'false' && row.is_active !== 0 && row.is_active !== '0';
  return active && !INACTIVE_PLAN_STATUSES.has(status(row));
}

function monthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end, days: end.getDate() };
}

function overlapsMonth(row: FinancialRow, startKeys: string[], endKeys: string[], now: Date) {
  const range = monthRange(now);
  const startsAt = firstDate(row, startKeys);
  const endsAt = firstDate(row, endKeys);
  return (!startsAt || startsAt <= range.end) && (!endsAt || endsAt >= range.start);
}

function activeDaysInMonth(row: FinancialRow, startKeys: string[], endKeys: string[], now: Date) {
  const range = monthRange(now);
  const startsAt = firstDate(row, startKeys);
  const endsAt = firstDate(row, endKeys);
  if ((startsAt && startsAt > range.end) || (endsAt && endsAt < range.start)) return 0;
  const activeStart = startsAt && startsAt > range.start ? startsAt : range.start;
  const activeEnd = endsAt && endsAt < range.end ? endsAt : range.end;
  const startDay = new Date(activeStart.getFullYear(), activeStart.getMonth(), activeStart.getDate()).getTime();
  const endDay = new Date(activeEnd.getFullYear(), activeEnd.getMonth(), activeEnd.getDate()).getTime();
  return Math.max(0, Math.round((endDay - startDay) / 86_400_000) + 1);
}

function frequency(row: FinancialRow) {
  const enhanced = recordObject(row.enhanced);
  return String(
    row.frequency ??
    row.expense_type ??
    enhanced.billing_frequency ??
    enhanced.frequency ??
    enhanced.recurring_frequency ??
    '',
  ).trim().toLowerCase();
}

function isRecurringIncome(row: FinancialRow) {
  return isTruthy(row.is_recurring) || Boolean(row.parent_recurring_income_id) || ['daily', 'weekly', 'monthly', 'yearly', 'annual'].includes(frequency(row));
}

function isRecurringExpense(row: FinancialRow) {
  const category = String(row.category ?? '').trim().toLowerCase();
  return isTruthy(row.is_recurring) || isTruthy(row.recurring) || ['subscriptions', 'subscription', 'bills', 'loans'].includes(category) || ['daily', 'weekly', 'monthly', 'recurring', 'yearly', 'annual'].includes(frequency(row));
}

function recurringRows(rows: FinancialRow[], kind: 'income' | 'expense') {
  const isRecurring = kind === 'income' ? isRecurringIncome : isRecurringExpense;
  const parentKey = kind === 'income' ? 'parent_recurring_income_id' : 'parent_recurring_expense_id';
  const parentIds = new Set(
    rows
      .filter((row) => isRecurring(row) && !row[parentKey] && row.id)
      .map((row) => String(row.id)),
  );
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    if (!isRecurring(row) || !isActive(row)) return false;
    const parentId = row[parentKey] ? String(row[parentKey]) : '';
    if (parentId && parentIds.has(parentId)) return false;
    const key = parentId || String(row.id ?? `${kind}-${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recurrenceCount(row: FinancialRow, startKeys: string[], endKeys: string[], now: Date) {
  if (!overlapsMonth(row, startKeys, endKeys, now)) return 0;
  const rowFrequency = frequency(row) || 'monthly';
  const range = monthRange(now);
  const startsAt = firstDate(row, startKeys) ?? range.start;
  const endsAt = firstDate(row, endKeys);

  if (rowFrequency === 'daily') return activeDaysInMonth(row, startKeys, endKeys, now);
  if (rowFrequency === 'weekly') {
    let cursor = new Date(startsAt);
    let guard = 0;
    while (cursor < range.start && guard < 540) {
      cursor.setDate(cursor.getDate() + 7);
      guard += 1;
    }
    let count = 0;
    while (cursor <= range.end && (!endsAt || cursor <= endsAt) && guard < 620) {
      count += 1;
      cursor.setDate(cursor.getDate() + 7);
      guard += 1;
    }
    return count;
  }
  if (rowFrequency === 'yearly' || rowFrequency === 'annual') {
    const occurrence = new Date(now.getFullYear(), startsAt.getMonth(), startsAt.getDate(), 12);
    return occurrence >= range.start && occurrence <= range.end && (!endsAt || occurrence <= endsAt) ? 1 : 0;
  }
  return 1;
}

function recurringAmount(row: FinancialRow, startKeys: string[], endKeys: string[], now: Date) {
  const enhanced = recordObject(row.enhanced);
  const rowAmount = amount(enhanced.monthly_amount ?? row.monthly_amount ?? row.amount);
  const count = recurrenceCount(row, startKeys, endKeys, now);
  if (rowAmount <= 0 || count <= 0) return 0;
  const rowFrequency = frequency(row) || 'monthly';
  if (rowFrequency !== 'monthly' && rowFrequency !== 'recurring') return rowAmount * count;
  if (row.calculation_mode !== 'prorated_current_month') return rowAmount;
  return rowAmount * (activeDaysInMonth(row, startKeys, endKeys, now) / monthRange(now).days);
}

function hasRecurringAmount(row: FinancialRow) {
  const enhanced = recordObject(row.enhanced);
  return parsedAmount(enhanced.monthly_amount ?? row.monthly_amount ?? row.amount) !== null;
}

function rowIsInMonth(row: FinancialRow, keys: string[], now: Date) {
  const date = firstDate(row, keys);
  if (!date) return false;
  const range = monthRange(now);
  return date >= range.start && date <= range.end;
}

export function buildMonthlyHealthSnapshot(
  incomeRows: FinancialRow[],
  expenseRows: FinancialRow[],
  now = new Date(),
  includeRow: (row: FinancialRow) => boolean = () => true,
): MonthlyHealthSnapshot {
  const compatibleIncome = incomeRows.filter(includeRow);
  const compatibleExpenses = expenseRows.filter(includeRow);
  const incomeStartKeys = ['start_date', 'recurrence_start_date', 'received_date', 'generated_for_date', 'created_at'];
  const incomeEndKeys = ['end_date', 'recurrence_end_date'];
  const expenseStartKeys = ['start_date', 'date', 'expense_date', 'created_at'];
  const expenseEndKeys = ['end_date'];
  const incomeRecurringCandidates = recurringRows(compatibleIncome, 'income').filter(
    (row) => recurrenceCount(row, incomeStartKeys, incomeEndKeys, now) > 0,
  );
  const expenseRecurringCandidates = recurringRows(compatibleExpenses, 'expense').filter(
    (row) => recurrenceCount(row, expenseStartKeys, expenseEndKeys, now) > 0,
  );
  const incomeRecurring = incomeRecurringCandidates.filter(hasRecurringAmount);
  const expenseRecurring = expenseRecurringCandidates.filter(hasRecurringAmount);
  const recurringIncomeSet = new Set(compatibleIncome.filter(isRecurringIncome));
  const recurringExpenseSet = new Set(compatibleExpenses.filter(isRecurringExpense));

  const oneTimeIncomeCandidates = realizedIncomeRows(compatibleIncome, now).filter((row) =>
    !recurringIncomeSet.has(row) && rowIsInMonth(row, INCOME_DATE_KEYS, now),
  );
  const oneTimeExpenseCandidates = realizedExpenseRows(compatibleExpenses, now).filter((row) =>
    !recurringExpenseSet.has(row) && rowIsInMonth(row, EXPENSE_DATE_KEYS, now),
  );
  const oneTimeIncome = oneTimeIncomeCandidates.filter((row) => parsedAmount(row.amount) !== null);
  const oneTimeExpenses = oneTimeExpenseCandidates.filter((row) => parsedAmount(row.amount) !== null);

  const monthlyIncome = oneTimeIncome.reduce((total, row) => total + amount(row.amount), 0) + incomeRecurring.reduce(
    (total, row) => total + recurringAmount(row, incomeStartKeys, incomeEndKeys, now),
    0,
  );
  const monthlyExpenses = oneTimeExpenses.reduce((total, row) => total + amount(row.amount), 0) + expenseRecurring.reduce(
    (total, row) => total + recurringAmount(row, expenseStartKeys, expenseEndKeys, now),
    0,
  );

  return {
    monthlyIncome,
    monthlyExpenses,
    hasIncomeData: oneTimeIncome.length > 0 || incomeRecurring.length > 0,
    hasExpenseData: oneTimeExpenses.length > 0 || expenseRecurring.length > 0,
    incomeAmountsComplete:
      oneTimeIncome.length === oneTimeIncomeCandidates.length &&
      incomeRecurring.length === incomeRecurringCandidates.length,
    expenseAmountsComplete:
      oneTimeExpenses.length === oneTimeExpenseCandidates.length &&
      expenseRecurring.length === expenseRecurringCandidates.length,
  };
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

export function buildMonthlyCashFlow(
  incomeRows: FinancialRow[],
  expenseRows: FinancialRow[],
  now = new Date(),
  includeRow: (row: FinancialRow) => boolean = () => true,
): CashFlowPoint[] {
  const points = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1, 12);
    return { key: monthKey(date), year: date.getFullYear(), month: date.getMonth(), income: 0, expenses: 0, incomeRecords: 0, expenseRecords: 0 };
  });
  const byKey = new Map(points.map((point) => [point.key, point]));

  for (const row of realizedIncomeRows(incomeRows, now).filter(includeRow)) {
    const rowAmount = parsedAmount(row.amount);
    if (rowAmount === null) continue;
    const date = firstDate(row, INCOME_DATE_KEYS);
    const point = date ? byKey.get(monthKey(date)) : undefined;
    if (point) {
      point.income += rowAmount;
      point.incomeRecords += 1;
    }
  }
  for (const row of realizedExpenseRows(expenseRows, now).filter(includeRow)) {
    const rowAmount = parsedAmount(row.amount);
    if (rowAmount === null) continue;
    const date = firstDate(row, EXPENSE_DATE_KEYS);
    const point = date ? byKey.get(monthKey(date)) : undefined;
    if (point) {
      point.expenses += rowAmount;
      point.expenseRecords += 1;
    }
  }
  return points;
}

export function monthOverMonthChange(current: number, previous: number, hasCurrent: boolean, hasPrevious: boolean) {
  if (!hasCurrent || !hasPrevious || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function calculateFinancialHealthIndicators(input: FinancialHealthInput) {
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
  const incomeAvailable = hasIncomeData && Number.isFinite(monthlyIncome) && monthlyIncome > 0;
  const expensesAvailable = hasExpenseData && Number.isFinite(monthlyExpenses) && monthlyExpenses > 0;
  const savingsAvailable = hasSavingsData && Number.isFinite(savingsBalance) && savingsBalance >= 0;
  const debtAvailable = debtsLoaded && Number.isFinite(monthlyDebtPayments) && monthlyDebtPayments >= 0;

  return {
    savingsRatio: incomeAvailable && expensesAvailable ? (monthlyIncome - monthlyExpenses) / monthlyIncome : null,
    expenseCoverage: incomeAvailable && expensesAvailable ? monthlyIncome / monthlyExpenses : null,
    emergencyFundMonths: expensesAvailable && savingsAvailable ? savingsBalance / monthlyExpenses : null,
    debtToIncome: incomeAvailable && debtAvailable ? monthlyDebtPayments / monthlyIncome : null,
  };
}

export function calculateFinancialHealth(input: FinancialHealthInput) {
  const indicators = calculateFinancialHealthIndicators(input);
  const { savingsRatio, expenseCoverage, emergencyFundMonths, debtToIncome } = indicators;
  if ([savingsRatio, expenseCoverage, emergencyFundMonths, debtToIncome].some((value) => value === null)) return null;

  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const actualSavingsRatio = savingsRatio as number;
  const actualExpenseCoverage = expenseCoverage as number;
  const actualEmergencyFundMonths = emergencyFundMonths as number;
  const actualDebtToIncome = debtToIncome as number;
  const model = FINANCIAL_HEALTH_MODEL;
  const surplusPoints = clamp(actualSavingsRatio / model.surplusTarget) * model.surplusWeight;
  const liquidityPoints = clamp(actualEmergencyFundMonths / model.liquidityTargetMonths) * model.liquidityWeight;
  const debtPoints = actualDebtToIncome <= model.debtHealthyMaximum
    ? model.debtWeight
    : actualDebtToIncome >= model.debtZeroScoreAt
      ? 0
      : ((model.debtZeroScoreAt - actualDebtToIncome) / (model.debtZeroScoreAt - model.debtHealthyMaximum)) * model.debtWeight;

  return {
    score: Math.round(surplusPoints + liquidityPoints + debtPoints),
    savingsRatio: actualSavingsRatio,
    expenseCoverage: actualExpenseCoverage,
    emergencyFundMonths: actualEmergencyFundMonths,
    debtToIncome: actualDebtToIncome,
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
