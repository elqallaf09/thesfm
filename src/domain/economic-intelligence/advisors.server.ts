import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { buildFinancialTwinSnapshot, forecastFinancialTwin } from './digitalTwin';
import { buildAdvisorGrounding, type AdvisorGrounding, type EconomicAdvisorId } from './advisors';
import { loadEconomicContext } from './economicContext.server';
import { assessPersonalEconomicImpact } from './personalEconomicImpact';
import { loadAdvisorDecisionMemoryFacts } from './decisionMemory.server';
import { buildCrossWorkspaceBrief, type WorkspaceEvidence } from './crossWorkspaceBrain';
import { highestDailyPriority } from './dailyPriority';
import { buildEconomicIntelligenceReadiness, type ReadinessConfirmationKey } from './readiness';
import { loadReadinessConfirmations } from './readinessConfirmations.server';

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
  watchlist: Record<string, unknown>[];
  marketAlerts: Record<string, unknown>[];
  fundingReadiness: Record<string, unknown>[];
};

const TABLES = {
  income: 'monthly_income_sources', expenses: 'expense_items', debts: 'debts', savings: 'savings_items', investments: 'investment_items',
  projects: 'projects', watchlist: 'market_watchlist', marketAlerts: 'market_price_alerts', fundingReadiness: 'project_funding_readiness',
} as const;

function normalizeCurrency(value: unknown) {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}
function normalizeCountry(value: unknown) {
  const country = typeof value === 'string' ? value.trim() : '';
  return country && /^[\p{L}\s.-]{2,64}$/u.test(country) ? country : null;
}

async function loadRows(userId: string): Promise<{ rows: RowMap; profile: Record<string, unknown> | null }> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');
  const [entries, profileResult] = await Promise.all([
    Promise.all(Object.entries(TABLES).map(async ([key, table]) => {
      const { data, error } = await admin.from(table).select('*').eq('user_id', userId).limit(2000);
      if (error) throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_FAILED:${key}:${error.code ?? 'unknown'}`);
      return [key, (data ?? []) as Record<string, unknown>[]] as const;
    })),
    admin.from('profiles').select('default_currency,preferred_currency,currency,country').eq('id', userId).maybeSingle(),
  ]);
  if (profileResult.error && profileResult.error.code !== 'PGRST116') throw new Error(`ECONOMIC_INTELLIGENCE_SOURCE_FAILED:profile:${profileResult.error.code ?? 'unknown'}`);
  return { rows: Object.fromEntries(entries) as RowMap, profile: (profileResult.data ?? null) as Record<string, unknown> | null };
}

function workspaceEvidence(rows: RowMap, twin: ReturnType<typeof buildFinancialTwinSnapshot>): WorkspaceEvidence {
  const activeProjects = rows.projects.filter(row => !['completed', 'cancelled', 'archived'].includes(String(row.status ?? '').toLowerCase()));
  const alerts = rows.marketAlerts;
  return {
    finance: { snapshot: twin },
    trader: {
      watchlistCount: rows.watchlist.length,
      activeAlertCount: alerts.filter(row => !['triggered', 'disabled', 'archived'].includes(String(row.status ?? '').toLowerCase())).length,
      triggeredAlertCount: alerts.filter(row => String(row.status ?? '').toLowerCase() === 'triggered').length,
    },
    business: {
      activeProjectCount: activeProjects.length,
      fundingNeeds: rows.fundingReadiness.map(row => ({
        projectId: String(row.project_id ?? ''),
        amount: Number.isFinite(Number(row.funding_needed)) ? Math.max(0, Number(row.funding_needed)) : 0,
        currency: normalizeCurrency(row.currency) ?? twin.currency,
        readinessScore: Number.isFinite(Number(row.readiness_score)) ? Number(row.readiness_score) : null,
      })),
    },
  };
}

function crossWorkspaceFacts(evidence: WorkspaceEvidence) {
  const brief = buildCrossWorkspaceBrief(evidence);
  const priority = highestDailyPriority(brief);
  if (!priority) return [];
  return [
    { key: 'daily_priority_code', value: priority.code },
    { key: 'daily_priority_severity', value: priority.severity },
    { key: 'daily_priority_action_url', value: priority.actionUrl },
    { key: 'daily_priority_explain_url', value: priority.explainUrl },
    { key: 'daily_priority_sources', value: priority.sources.join(',') },
    { key: 'cross_workspace_state', value: brief.state },
  ];
}

export async function loadAdvisorGrounding(options: LoadAdvisorGroundingOptions): Promise<AdvisorGrounding> {
  const [{ rows, profile }, decisionMemoryFacts, confirmations] = await Promise.all([
    loadRows(options.userId),
    loadAdvisorDecisionMemoryFacts(options.userId).catch(() => []),
    loadReadinessConfirmations(options.userId).catch((): ReadinessConfirmationKey[] => []),
  ]);
  const currency = normalizeCurrency(options.currency)
    ?? normalizeCurrency(profile?.default_currency)
    ?? normalizeCurrency(profile?.preferred_currency)
    ?? normalizeCurrency(profile?.currency);
  if (!currency) throw new Error('ECONOMIC_INTELLIGENCE_CURRENCY_NOT_CONFIGURED');

  const twin = buildFinancialTwinSnapshot({ income: rows.income, expenses: rows.expenses, debts: rows.debts, savings: rows.savings, investments: rows.investments }, currency);
  const forecast = forecastFinancialTwin(twin, 12);
  const evidence = workspaceEvidence(rows, twin);
  const readiness = buildEconomicIntelligenceReadiness(evidence, confirmations);

  const country = normalizeCountry(options.country) ?? normalizeCountry(profile?.country);
  const contextResult = country ? await loadEconomicContext(country).catch(() => null) : null;
  const economicContext = contextResult?.context ?? null;
  const impacts = economicContext ? assessPersonalEconomicImpact(twin, economicContext) : [];

  return buildAdvisorGrounding(options.advisor, {
    twin,
    forecast,
    economicContext,
    impacts,
    hasMarketEvidence: options.hasMarketEvidence || rows.watchlist.length > 0 || rows.marketAlerts.length > 0,
    hasBusinessEvidence: rows.projects.length > 0 || confirmations.includes('no_business_projects'),
    decisionMemoryFacts,
    crossWorkspaceFacts: crossWorkspaceFacts(evidence),
    readiness,
  });
}
