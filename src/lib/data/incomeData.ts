import { sumAmounts } from './financeData';

export const INCOME_TABLE = 'monthly_income_sources';
export const INCOME_DATE_KEYS = ['received_date', 'generated_for_date', 'created_at'];

export function totalIncome(rows: any[] = []) {
  return sumAmounts(rows, ['amount']);
}
