import type { SfmDataTable } from '@/lib/data/financeData';
import type { FinancialTwinSource } from './digitalTwin';

export const ECONOMIC_INTELLIGENCE_TABLES: SfmDataTable[] = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'debts', table: 'debts' },
  { key: 'savings', table: 'savings_items' },
  { key: 'investments', table: 'investment_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'projects', table: 'projects' },
];

export function financialTwinSourceFromRecords(
  records: Partial<Record<string, unknown[]>>,
  errors: Partial<Record<string, string>> = {},
): FinancialTwinSource {
  const source: FinancialTwinSource = {};
  for (const key of ['income', 'expenses', 'debts', 'savings', 'investments'] as const) {
    // Failed or unrequested data is not a confirmed empty account.
    if (!errors[key] && Array.isArray(records[key])) source[key] = records[key] as Record<string, unknown>[];
  }
  return source;
}
