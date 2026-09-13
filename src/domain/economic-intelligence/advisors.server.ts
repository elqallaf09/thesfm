import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { buildFinancialTwinSnapshot, forecastFinancialTwin } from './digitalTwin';
import { buildAdvisorGrounding, type AdvisorGrounding, type EconomicAdvisorId } from './advisors';
import { loadEconomicContext } from './economicContext.server';
import { assessPersonalEconomicImpact } from './personalEconomicImpact';

type LoadAdvisorGroundingOptions = {
  userId: string;
  advisor: EconomicAdvisorId;
  currency?: string | null;
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

function normalizeCurrency(value: unknown) {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

async function loadRows(userId: string): Promise<{ rows: RowMap; profile: Record<string, unknown> | null }> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const [entries, profileResult] = await Promise.all([
    Promise.all(
      Object.entries(TABLES).map(async ([key, table]) => {
        const { data, error } = await admin.from(table).select('*').eq('user_id', userId).limit(2000);
        if (error) throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_FAILED:${key}:${error.code ?? 'unknown'}`);
        return [key, (data ?? []) as Record<string, unknown>[]] as const;
      }),
    ),
    admin.from('profiles').select('default_currency,preferred_currency,currency').eq('id', userId).maybeSingle(),
  ]);

  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_FAILED:profile:${profileResult.error.code ?? 'unknown'}`);
  }

  return {
    rows: Object.fromEntries(entries) as RowMap,
    profile: (profileResult.data ?? null) as Record<string, unknown> | null,
  };
}

export async function loadAdvisorGrounding(options: LoadAdvisorGroundingOptions): Promise<AdvisorGrounding> {
  const { rows, profile } = await loadRows(options.userId);
  const currency = normalizeCurrency(options.currency)
    ?? normalizeCurrency(profile?.default_currency)
    ?? normalizeCurrency(profile?.preferred_currency)
    ?? normalizeCurrency(profile?.currency);
  if (!currency) throw new Error('ECONOMIC_INTELLIGENCE_CURRENCY_NOT_CONFIGURED');

  const twin = buildFinancialTwinSnapshot({
    income: rows.income,
    expenses: rows.expenses,
    debts: rows.debts,
    savings: rows.savings,
    investments: rows.investments,
  }, currency);
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
