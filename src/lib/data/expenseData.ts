import { sumAmounts } from './financeData';

export const EXPENSE_TABLE = 'expense_items';
export const EXPENSE_DATE_KEYS = ['expense_date', 'date', 'created_at'];

export function totalExpenses(rows: any[] = []) {
  return sumAmounts(rows, ['amount']);
}

export function projectExpenseRows(rows: any[] = [], projectId?: string | null) {
  if (!projectId) return [];
  return rows.filter(row => row?.project_id === projectId || row?.related_project_id === projectId);
}
