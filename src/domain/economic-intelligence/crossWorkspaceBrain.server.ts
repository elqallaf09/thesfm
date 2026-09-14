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

function latestTimestamp(groups: unknown[][]) {
  let latest = 0;
  let value: string | null = null;
  for (const row of groups.flat() as any[]) {
    for (const candidate of [row?.updated_at, row?.created_at]) {
      const time = candidate ? new Date(String(candidate)).getTime() : 0;
      if (Number.isFinite(time) && time > latest) { latest = time; value = new Date(time).toISOString(); }
    }
  }
  return value;
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
    admin.from('market_watchlist').select('id,symbol,asset_type,created_at').eq('user_id', userId).limit(1000),
    admin.from('market_price_alerts').select('id,status,created_at').eq('user_id', userId).limit(1000),
    admin.from('projects').select('id,status,created_at,updated_at').eq('user_id', userId).limit(1000),
    admin.from('project_funding_readiness').select('project_id,funding_needed,currency,readiness_score,created_at,updated_at').eq('user_id', userId).limit(1000),
  ]);

  const failures = [income, expenses, debts, savings, investments, watchlist, alerts, projects, funding].filter(result => result.error);
  if (failures.length > 0) throw failures[0].error;

  const incomeRows = income.data ?? [];
  const expenseRows = expenses.data ?? [];
  const debtRows = debts.data ?? [];
  const savingRows = savings.data ?? [];
  const investmentRows = investments.data ?? [];
  const watchlistRows = watchlist.data ?? [];
  const alertRows = alerts.data ?? [];
  const projectRows = projects.data ?? [];
  const fundingRows = funding.data ?? [];
  const currency = currencyFromProfile((profile.data ?? null) as Record<string, unknown> | null);
  const financeGroups = [incomeRows, expenseRows, debtRows, savingRows, investmentRows];
  const snapshot = buildFinancialTwinSnapshot({
    income: incomeRows,
    expenses: expenseRows,
    debts: debtRows,
    savings: savingRows,
    investments: investmentRows,
  }, currency);

  const activeProjects = projectRows.filter((row: any) => !['completed', 'cancelled', 'archived'].includes(String(row.status ?? '').toLowerCase()));

  return {
    finance: { snapshot },
    trader: {
      watchlistCount: watchlistRows.length,
      activeAlertCount: alertRows.filter((row: any) => !['triggered', 'disabled', 'archived'].includes(String(row.status ?? '').toLowerCase())).length,
      triggeredAlertCount: alertRows.filter((row: any) => String(row.status ?? '').toLowerCase() === 'triggered').length,
    },
    business: {
      activeProjectCount: activeProjects.length,
      fundingNeeds: fundingRows.map((row: any) => ({
        projectId: String(row.project_id ?? ''),
        amount: Number.isFinite(Number(row.funding_needed)) ? Math.max(0, Number(row.funding_needed)) : 0,
        currency: normalizeCurrency(row.currency) ?? currency,
        readinessScore: Number.isFinite(Number(row.readiness_score)) ? Number(row.readiness_score) : null,
      })),
    },
    freshness: {
      finance: latestTimestamp(financeGroups),
      trader: latestTimestamp([watchlistRows, alertRows]),
      business: latestTimestamp([projectRows, fundingRows]),
    },
    recordCounts: {
      monthly_income_sources: incomeRows.length,
      expense_items: expenseRows.length,
      debts: debtRows.length,
      savings_items: savingRows.length,
      investment_items: investmentRows.length,
      market_watchlist: watchlistRows.length,
      market_price_alerts: alertRows.length,
      projects: projectRows.length,
      project_funding_readiness: fundingRows.length,
    },
  };
}

export async function loadCrossWorkspaceBrief(userId: string) {
  return buildCrossWorkspaceBrief(await loadCrossWorkspaceEvidence(userId));
}
