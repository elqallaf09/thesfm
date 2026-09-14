import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { buildFinancialTwinSnapshot } from './digitalTwin';
import { buildCrossWorkspaceBrief, type WorkspaceEvidence } from './crossWorkspaceBrain';

function normalizeCurrency(value: unknown) {
  const currency = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function currencyFromProfile(profile: Record<string, unknown> | null) {
  return normalizeCurrency(profile?.default_currency)
    ?? normalizeCurrency(profile?.preferred_currency)
    ?? normalizeCurrency(profile?.currency)
    ?? 'KWD';
}

export async function loadCrossWorkspaceEvidence(userId: string): Promise<WorkspaceEvidence> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const [income, expenses, debts, savings, investments, profile, watchlist, alerts, projects, funding] = await Promise.all([
    admin.from('monthly_income_sources').select('*').eq('user_id', userId).limit(2000),
    admin.from('expense_items').select('*').eq('user_id', userId).limit(2000),
    admin.from('debts').select('*').eq('user_id', userId).limit(2000),
    admin.from('savings_items').select('*').eq('user_id', userId).limit(2000),
    admin.from('investment_items').select('*').eq('user_id', userId).limit(2000),
    admin.from('profiles').select('default_currency,preferred_currency,currency').eq('id', userId).maybeSingle(),
    admin.from('market_watchlist').select('id,symbol,asset_type').eq('user_id', userId).limit(1000),
    admin.from('market_price_alerts').select('id,status').eq('user_id', userId).limit(1000),
    admin.from('projects').select('id,status').eq('user_id', userId).limit(1000),
    admin.from('project_funding_readiness').select('project_id,funding_needed,currency,readiness_score').eq('user_id', userId).limit(1000),
  ]);

  const failures = [income, expenses, debts, savings, investments, watchlist, alerts, projects, funding].filter(result => result.error);
  if (failures.length > 0) throw failures[0].error;

  const currency = currencyFromProfile((profile.data ?? null) as Record<string, unknown> | null);
  const snapshot = buildFinancialTwinSnapshot({
    income: income.data ?? [],
    expenses: expenses.data ?? [],
    debts: debts.data ?? [],
    savings: savings.data ?? [],
    investments: investments.data ?? [],
  }, currency);

  const alertRows = alerts.data ?? [];
  const projectRows = projects.data ?? [];
  const activeProjects = projectRows.filter((row: any) => !['completed', 'cancelled', 'archived'].includes(String(row.status ?? '').toLowerCase()));

  return {
    finance: { snapshot },
    trader: {
      watchlistCount: (watchlist.data ?? []).length,
      activeAlertCount: alertRows.filter((row: any) => !['triggered', 'disabled', 'archived'].includes(String(row.status ?? '').toLowerCase())).length,
      triggeredAlertCount: alertRows.filter((row: any) => String(row.status ?? '').toLowerCase() === 'triggered').length,
    },
    business: {
      activeProjectCount: activeProjects.length,
      fundingNeeds: (funding.data ?? []).map((row: any) => ({
        projectId: String(row.project_id ?? ''),
        amount: Number.isFinite(Number(row.funding_needed)) ? Math.max(0, Number(row.funding_needed)) : 0,
        currency: normalizeCurrency(row.currency) ?? currency,
        readinessScore: Number.isFinite(Number(row.readiness_score)) ? Number(row.readiness_score) : null,
      })),
    },
  };
}

export async function loadCrossWorkspaceBrief(userId: string) {
  return buildCrossWorkspaceBrief(await loadCrossWorkspaceEvidence(userId));
}
