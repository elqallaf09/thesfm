import {
  personalExpenseRows,
  projectExpenseRows as linkedProjectExpenseRows,
  sumAmounts,
} from './financeData';

export const EXPENSE_TABLE = 'expense_items';
export const EXPENSE_DATE_KEYS = ['expense_date', 'date', 'created_at'];
export const PROJECT_EXPENSE_TABLE = 'project_expenses';

export function totalExpenses(rows: any[] = []) {
  return sumAmounts(personalExpenseRows(rows), ['amount']);
}

export function projectExpenseRows(rows: any[] = [], projectId?: string | null) {
  return linkedProjectExpenseRows(rows, projectId);
}

export { personalExpenseRows };
