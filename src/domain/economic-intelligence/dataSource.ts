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
): FinancialTwinSource {
  return {
    income: (records.income ?? []) as Record<string, unknown>[],
    expenses: (records.expenses ?? []) as Record<string, unknown>[],
    debts: (records.debts ?? []) as Record<string, unknown>[],
    savings: (records.savings ?? []) as Record<string, unknown>[],
    investments: (records.investments ?? []) as Record<string, unknown>[],
  };
}
