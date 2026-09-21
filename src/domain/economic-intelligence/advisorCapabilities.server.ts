import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { buildCapabilityReport, type AdvisorRequest } from './advisorCapabilities';
import { advisorSourceFromRows, type AdvisorRows } from './advisorSource';
import { loadCompleteEconomicRows } from './sourceRows.server';
const tables = { income: 'monthly_income_sources', expenses: 'expense_items', savings: 'savings_items', investments: 'investment_items', debts: 'debts', goals: 'financial_goals' } as const;
export async function loadCapabilityReport(userId: string, input: AdvisorRequest) {
 const db = createServerSupabaseAdmin();
 if (!db) throw new Error('UNAVAILABLE');
 const rows = Object.fromEntries(await Promise.all(Object.entries(tables).map(async ([key, table]) => [key, await loadCompleteEconomicRows(db, table, userId)]))) as AdvisorRows;
 return buildCapabilityReport(input, advisorSourceFromRows(rows, input.currency, input.month));
}
