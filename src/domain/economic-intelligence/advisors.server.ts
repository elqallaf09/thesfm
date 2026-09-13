import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { buildFinancialTwinSnapshot, forecastFinancialTwin } from './digitalTwin';
import { buildAdvisorGrounding, type AdvisorGrounding, type EconomicAdvisorId } from './advisors';
import { loadEconomicContext } from './economicContext.server';
import { assessPersonalEconomicImpact } from './personalEconomicImpact';

type LoadAdvisorGroundingOptions = {
  userId: string;
  advisor: EconomicAdvisorId;
  currency: string;
  country?: string | null;
  hasMarketEvidence?: boolean;
};

type RowMap = {
  income: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  debts: Record<string, unknown>[];
  savings: Record<string, unknown>[];
  investments: Record<string, unknown>[];
  projects: Record<string, unknown>[];
};

const TABLES = {
  income: 'monthly_income_sources',
  expenses: 'expense_items',
  debts: 'debts',
  savings: 'savings_items',
  investments: 'investment_items',
  projects: 'projects',
} as const;

async function loadRows(userId: string): Promise<RowMap> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const entries = await Promise.all(
    Object.entries(TABLES).map(async ([key, table]) => {
      const { data, error } = await admin.from(table).select('*').eq('user_id', userId).limit(2000);
      if (error) throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_FAILED:${key}:${error.code ?? 'unknown'}`);
      return [key, (data ?? []) as Record<string, unknown>[]] as const;
    }),
  );

  return Object.fromEntries(entries) as RowMap;
}

export async function loadAdvisorGrounding(options: LoadAdvisorGroundingOptions): Promise<AdvisorGrounding> {
  const rows = await loadRows(options.userId);
  const twin = buildFinancialTwinSnapshot({
    income: rows.income,
    expenses: rows.expenses,
    debts: rows.debts,
    savings: rows.savings,
    investments: rows.investments,
  }, options.currency);
  const forecast = forecastFinancialTwin(twin, 12);

  const country = options.country?.trim();
  const contextResult = country ? await loadEconomicContext(country).catch(() => null) : null;
  const economicContext = contextResult?.context ?? null;
  const impacts = economicContext ? assessPersonalEconomicImpact(twin, economicContext) : [];

  return buildAdvisorGrounding(options.advisor, {
    twin,
    forecast,
    economicContext,
    impacts,
    hasMarketEvidence: options.hasMarketEvidence,
    hasBusinessEvidence: rows.projects.length > 0,
  });
}
