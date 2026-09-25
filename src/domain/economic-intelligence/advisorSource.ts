import { activeDebtRows, debtBalance, firstNumber, firstText, investmentValue, rowCurrency, summarizeGoal } from '@/lib/dashboard/executiveOverview';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import type { AdvisorSource } from './advisorCapabilities';
type Row = Record<string, unknown>;
export type AdvisorRows = Record<'income' | 'expenses' | 'savings' | 'investments' | 'debts' | 'goals', Row[]>;

export function advisorSourceFromRows(rows: AdvisorRows, currency: string, month: string): AdvisorSource {
  const source: AdvisorSource = { income: null, expenses: null, savings: null, holdings: [], debts: [], goals: [], spending: [], missing: [], excluded: 0 };
  const accept = (row: Row) => {
    if (rowCurrency(row) === currency) return true;
    source.excluded += 1; return false;
  };
  const dated = (row: Row, income: boolean) => {
    // Recurring templates are not cash received; use generated occurrences only.
    if (income && row.status !== 'received') return false;
    if (income && row.is_recurring === true && !row.parent_recurring_income_id) return false;
    const date = firstText(row, income ? ['received_date', 'generated_for_date', 'created_at'] : ['date', 'created_at']);
    if (!date || !Number.isFinite(Date.parse(date))) { source.excluded += 1; return false; }
    return date.slice(0, 7) === month;
  };
  const total = (items: Row[], keys: string[]) => {
    let amount = 0; let count = 0;
    for (const row of items) {
      const n = firstNumber(row, keys);
      if (!accept(row)) continue;
      if (n === null || n < 0) { source.excluded += 1; continue; }
      amount += n; count += 1;
    }
    return count ? amount : null;
  };
  source.income = total(personalIncomeRows(rows.income).filter(r => dated(r, true)), ['amount', 'monthly_amount', 'net_amount']);
  const expenses = personalExpenseRows(rows.expenses).filter(r => dated(r, false));
  source.expenses = total(expenses, ['amount', 'monthly_amount', 'cost']);
  source.savings = total(rows.savings, ['current_amount', 'amount', 'balance', 'saved_amount']);
  const categories = new Map<string, number>();
  const recordedDebtPayments = new Map<string, number>();
  for (const row of expenses) {
    const n = firstNumber(row, ['amount', 'monthly_amount', 'cost']);
    if (rowCurrency(row) !== currency || n === null || n < 0) continue;
    const key = firstText(row, ['category']) ?? 'uncategorized';
    categories.set(key, (categories.get(key) ?? 0) + n);
    const enhanced = row.enhanced && typeof row.enhanced === 'object' ? row.enhanced as Row : {};
    const debtId = firstText(row, ['debt_id']) ?? firstText(enhanced, ['debt_id']);
    if (debtId) recordedDebtPayments.set(debtId, (recordedDebtPayments.get(debtId) ?? 0) + n);
  }
  source.spending = [...categories].map(([category, amount]) => ({ category, amount })).sort((a,b) => b.amount - a.amount);
  for (const row of rows.investments) {
    const value = investmentValue(row, currency);
    if (!value || value.currency !== currency || value.amount < 0) { source.excluded += 1; continue; }
    source.holdings.push({ id: String(row.id), name: firstText(row, ['name', 'symbol']) ?? String(row.id), value: value.amount });
  }
  for (const row of activeDebtRows(rows.debts)) {
    if (!accept(row)) continue;
    const balance = debtBalance(row); const payment = firstNumber(row, ['monthly_payment', 'payment_amount', 'installment_amount']);
    if (balance === null || balance < 0 || payment === null || payment < 0) { source.excluded += 1; source.missing.push('debt_balance_or_payment'); continue; }
    const rate = firstNumber(row, ['interest_rate']);
    const monthlyRate = row.interest_type === 'none' ? 0 : rate !== null && rate >= 0 && (row.interest_type === 'annual' || row.interest_type === 'monthly') ? rate / 100 / (row.interest_type === 'annual' ? 12 : 1) : null;
    source.debts.push({ id: String(row.id), balance, payment, monthlyRate });
  }
  for (const row of rows.goals) {
    if (!accept(row)) continue;
    const goal = summarizeGoal(row, null, new Date(`${month}-01T00:00:00Z`));
    const target = goal.targetAmount; const saved = goal.currentAmount;
    if (target === null || target < 0 || saved === null || saved < 0) { source.excluded += 1; continue; }
    const end = goal.deadline; const start = new Date(`${month}-01T00:00:00Z`);
    const months = end && Number.isFinite(end.getTime()) ? Math.max(1, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth()) : null;
    source.goals.push({ id: String(row.id), name: goal.title || String(row.id), target, saved, months });
  }
  source.debtPaymentsNotInExpenses = source.debts.reduce((total, debt) => total + Math.max(0, debt.payment - (recordedDebtPayments.get(debt.id) ?? 0)), 0);
  for (const key of ['income', 'expenses', 'savings'] as const) if (source[key] === null) source.missing.push(key);
  return source;
}
