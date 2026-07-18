import { calculateGoalProgress, parseGoalNotes } from '@/lib/goalProgress';
import { parseMoneyValue } from '@/lib/money';
import { financialRowDate, type FinancialRow } from './financialMetrics';
import { holdingCurrencyFromRow, holdingValueFromRow, investmentValueInCurrency, quoteCurrencyFromRow } from '@/lib/investments/currencyIntegrity';

export type DashboardSourceKey = 'profile' | 'income' | 'expenses' | 'savings' | 'goals' | 'investments' | 'debts';
export type DashboardSourceStatus = 'loading' | 'success' | 'empty' | 'permission' | 'network' | 'unavailable';

export type CurrencyAmount = {
  currency: string;
  amount: number;
  records: number;
};

export type GoalSummary = {
  id: string;
  title: string;
  currency: string | null;
  currentAmount: number | null;
  targetAmount: number | null;
  progressRatio: number | null;
  deadline: Date | null;
  status: 'completed' | 'on_track' | 'behind' | 'insufficient';
};

export type InvestmentValue = {
  amount: number;
  currency: string | null;
  converted: boolean;
};

const PERMISSION_CODES = new Set(['42501', 'PGRST301', 'PGRST302', '401', '403']);
const INACTIVE_DEBT_STATUSES = new Set(['paid', 'completed', 'closed', 'cancelled', 'canceled', 'archived']);

export function classifyDashboardError(error: unknown): Exclude<DashboardSourceStatus, 'loading' | 'success' | 'empty'> {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = String(value.code ?? value.status ?? '').trim();
  const message = String(value.message ?? error ?? '').toLowerCase();
  if (PERMISSION_CODES.has(code) || message.includes('permission denied') || message.includes('row-level security')) return 'permission';
  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('load failed') ||
    message.includes('timeout') ||
    message.includes('abort')
  ) return 'network';
  return 'unavailable';
}

export function numberValue(value: unknown): number | null {
  const parsed = parseMoneyValue(value);
  return parsed.status === 'valid' && Number.isFinite(parsed.value) ? parsed.value : null;
}

export function firstNumber(row: FinancialRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = numberValue(row[key]);
    if (value !== null) return value;
  }
  return null;
}

export function firstText(row: FinancialRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function currencyCode(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function rowCurrency(row: FinancialRow, keys = ['currency']): string | null {
  for (const key of keys) {
    const code = currencyCode(row[key]);
    if (code) return code;
  }
  return null;
}

export function isCurrency(row: FinancialRow, currency: string, keys = ['currency']) {
  return rowCurrency(row, keys) === currencyCode(currency);
}

export function sumRows(rows: FinancialRow[], valueKeys: string[] = ['amount']) {
  return rows.reduce((total, row) => total + (firstNumber(row, valueKeys) ?? 0), 0);
}

export function currentMonthRows(rows: FinancialRow[], kind: 'income' | 'expense', now = new Date()) {
  return rows.filter((row) => {
    const date = financialRowDate(row, kind);
    return date?.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

export function groupCurrencyAmounts(
  rows: FinancialRow[],
  value: (row: FinancialRow) => number | null = (row) => firstNumber(row, ['amount']),
  currency: (row: FinancialRow) => string | null = (row) => rowCurrency(row),
): CurrencyAmount[] {
  const grouped = new Map<string, CurrencyAmount>();
  for (const row of rows) {
    const code = currency(row);
    const amount = value(row);
    if (!code || amount === null) continue;
    const current = grouped.get(code) ?? { currency: code, amount: 0, records: 0 };
    current.amount += amount;
    current.records += 1;
    grouped.set(code, current);
  }
  return [...grouped.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function investmentValue(row: FinancialRow, primaryCurrency: string | null): InvestmentValue | null {
  const primary = currencyCode(primaryCurrency);
  const resolved = primary ? investmentValueInCurrency(row, primary) : null;
  if (resolved) return { amount: resolved.amount, currency: resolved.currency, converted: resolved.source !== 'holding' };

  const holdingCurrency = holdingCurrencyFromRow(row);
  const holdingAmount = holdingValueFromRow(row);
  if (holdingCurrency && holdingAmount !== null) return { amount: holdingAmount, currency: holdingCurrency, converted: false };

  const quoteCurrency = quoteCurrencyFromRow(row);
  const quoteAmount = firstNumber(row, ['native_market_value', 'current_market_value']);
  if (!quoteCurrency || quoteAmount === null) return null;
  return { amount: quoteAmount, currency: quoteCurrency, converted: false };
}

export function investmentBreakdown(rows: FinancialRow[], primaryCurrency: string | null): CurrencyAmount[] {
  return groupCurrencyAmounts(
    rows,
    (row) => investmentValue(row, primaryCurrency)?.amount ?? null,
    (row) => investmentValue(row, primaryCurrency)?.currency ?? null,
  );
}

export function primaryInvestmentTotal(rows: FinancialRow[], primaryCurrency: string | null) {
  const primary = currencyCode(primaryCurrency);
  return rows.reduce((total, row) => {
    const value = investmentValue(row, primaryCurrency);
    return value?.currency === primary ? total + value.amount : total;
  }, 0);
}

export function activeDebtRows(rows: FinancialRow[]) {
  return rows.filter((row) => !INACTIVE_DEBT_STATUSES.has(String(row.status ?? '').trim().toLowerCase()));
}

export function debtBalance(row: FinancialRow) {
  return firstNumber(row, ['calculated_remaining_amount', 'remaining_amount', 'balance', 'amount']);
}

export function debtBreakdown(rows: FinancialRow[]) {
  return groupCurrencyAmounts(activeDebtRows(rows), debtBalance, (row) => rowCurrency(row));
}

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addGoalDuration(createdAt: Date, duration: unknown, unit: unknown) {
  const amount = numberValue(duration);
  if (amount === null || amount <= 0) return null;
  const deadline = new Date(createdAt);
  const normalized = String(unit ?? '').trim().toLowerCase();
  if (['day', 'days', 'يوم', 'أيام'].includes(normalized)) deadline.setDate(deadline.getDate() + amount);
  else if (['year', 'years', 'سنة', 'سنوات'].includes(normalized)) deadline.setFullYear(deadline.getFullYear() + amount);
  else deadline.setMonth(deadline.getMonth() + amount);
  return deadline;
}

export function goalDeadline(row: FinancialRow) {
  const notes = parseGoalNotes(row.notes);
  const direct = parseDate(row.target_date ?? row.deadline ?? notes.deadline ?? notes.targetDate ?? notes.target_date);
  if (direct) return direct;
  const createdAt = parseDate(row.created_at);
  return createdAt ? addGoalDuration(createdAt, row.duration, row.duration_unit) : null;
}

export function summarizeGoal(row: FinancialRow, primaryCurrency: string | null, now = new Date()): GoalSummary {
  const notes = parseGoalNotes(row.notes);
  const progress = calculateGoalProgress(row);
  const deadline = goalDeadline(row);
  const createdAt = parseDate(row.created_at);
  const title = firstText(row, ['goal', 'title', 'name']) ?? '';
  const currency = currencyCode(row.currency ?? notes.currency) ?? currencyCode(primaryCurrency);
  const currentAmount = progress.hasCurrentAmount ? progress.currentAmount : null;
  const targetAmount = progress.hasTargetAmount ? progress.targetAmount : null;
  const progressRatio = progress.hasCurrentAmount && progress.hasTargetAmount ? progress.progressRatio : null;
  let status: GoalSummary['status'] = 'insufficient';

  if (progressRatio !== null && currentAmount !== null) {
    if (progressRatio >= 1) status = 'completed';
    else if (deadline && deadline.getTime() < now.getTime()) status = 'behind';
    else if (deadline && createdAt && deadline.getTime() > createdAt.getTime()) {
      const elapsed = Math.max(0, now.getTime() - createdAt.getTime());
      const duration = deadline.getTime() - createdAt.getTime();
      status = progressRatio + 0.05 >= Math.min(1, elapsed / duration) ? 'on_track' : 'behind';
    }
  }

  return {
    id: String(row.id ?? title),
    title,
    currency,
    currentAmount,
    targetAmount,
    progressRatio,
    deadline,
    status,
  };
}

export function expenseCategoryBreakdown(rows: FinancialRow[]) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const category = firstText(row, ['category', 'name', 'label']) ?? 'uncategorized';
    const amount = firstNumber(row, ['amount']);
    if (amount === null) continue;
    grouped.set(category, (grouped.get(category) ?? 0) + amount);
  }
  return [...grouped.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
