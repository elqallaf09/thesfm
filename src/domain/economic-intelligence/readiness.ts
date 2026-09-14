import type { WorkspaceEvidence } from './crossWorkspaceBrain';

export type ReadinessWorkspace = 'finance' | 'trader' | 'business';
export type ReadinessIssue = { code: string; workspace: ReadinessWorkspace; actionUrl: string; weight: number };
export type WorkspaceReadiness = { score: number; ready: boolean; issues: ReadinessIssue[] };
export type EconomicIntelligenceReadiness = {
  overallScore: number;
  level: 'low' | 'medium' | 'high';
  finance: WorkspaceReadiness;
  trader: WorkspaceReadiness;
  business: WorkspaceReadiness;
  nextActions: ReadinessIssue[];
};

const FINANCE_GROUPS = ['income', 'expenses', 'debts', 'savings', 'investments'] as const;
function clampScore(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function financeAction(code: string) {
  if (code.includes('income')) return '/income';
  if (code.includes('expense')) return '/expenses';
  if (code.includes('debt')) return '/debts';
  if (code.includes('saving')) return '/savings';
  if (code.includes('investment')) return '/investments';
  return '/dashboard';
}

export function buildEconomicIntelligenceReadiness(evidence: WorkspaceEvidence): EconomicIntelligenceReadiness {
  const financeIssues: ReadinessIssue[] = [];
  const quality = evidence.finance.snapshot.dataQuality;
  const missingOrEmpty = new Set<string>([
    ...quality.missing.map(String),
    ...quality.warnings.filter(value => String(value).endsWith(':empty')).map(value => String(value).replace(/:empty$/, '')),
  ]);
  const financeAvailable = FINANCE_GROUPS.filter(group => !missingOrEmpty.has(group)).length;
  const financeScore = clampScore((financeAvailable / FINANCE_GROUPS.length) * 100);
  for (const code of FINANCE_GROUPS.filter(group => missingOrEmpty.has(group))) {
    financeIssues.push({ code: `finance:${code}_missing`, workspace: 'finance', actionUrl: financeAction(code), weight: 20 });
  }

  const traderSignals = [
    evidence.trader.watchlistCount > 0,
    evidence.trader.activeAlertCount > 0 || evidence.trader.triggeredAlertCount > 0,
    evidence.finance.snapshot.investmentBalance > 0,
  ];
  const traderScore = clampScore((traderSignals.filter(Boolean).length / traderSignals.length) * 100);
  const traderIssues: ReadinessIssue[] = [];
  if (evidence.trader.watchlistCount === 0) traderIssues.push({ code: 'trader:watchlist_missing', workspace: 'trader', actionUrl: '/ai-analyst/watchlist', weight: 40 });
  if (evidence.trader.activeAlertCount === 0 && evidence.trader.triggeredAlertCount === 0) traderIssues.push({ code: 'trader:alerts_missing', workspace: 'trader', actionUrl: '/ai-analyst/alerts', weight: 25 });
  if (evidence.finance.snapshot.investmentBalance <= 0) traderIssues.push({ code: 'trader:portfolio_missing', workspace: 'trader', actionUrl: '/investments', weight: 35 });

  const activeProjects = evidence.business.activeProjectCount;
  const fundingCovered = activeProjects > 0 && evidence.business.fundingNeeds.length >= activeProjects;
  const businessScore = activeProjects === 0 ? 0 : fundingCovered ? 100 : 50;
  const businessIssues: ReadinessIssue[] = [];
  if (activeProjects === 0) businessIssues.push({ code: 'business:projects_missing', workspace: 'business', actionUrl: '/projects', weight: 60 });
  else if (!fundingCovered) businessIssues.push({ code: 'business:funding_readiness_missing', workspace: 'business', actionUrl: '/business-hub', weight: 40 });

  const overallScore = clampScore(financeScore * 0.5 + traderScore * 0.25 + businessScore * 0.25);
  const nextActions = [...financeIssues, ...traderIssues, ...businessIssues]
    .sort((a, b) => b.weight - a.weight || a.code.localeCompare(b.code))
    .slice(0, 5);

  return {
    overallScore,
    level: overallScore >= 80 ? 'high' : overallScore >= 50 ? 'medium' : 'low',
    finance: { score: financeScore, ready: financeScore >= 80, issues: financeIssues },
    trader: { score: traderScore, ready: traderScore >= 67, issues: traderIssues },
    business: { score: businessScore, ready: businessScore >= 75, issues: businessIssues },
    nextActions,
  };
}
