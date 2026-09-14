import type { WorkspaceEvidence } from './crossWorkspaceBrain';

export type ReadinessWorkspace = 'finance' | 'trader' | 'business';
export type ReadinessConfirmationKey = 'no_debts' | 'no_investments' | 'no_business_projects';
export type ReadinessIssue = { code: string; workspace: ReadinessWorkspace; actionUrl: string; weight: number };
export type WorkspaceReadiness = { score: number; ready: boolean; issues: ReadinessIssue[] };
export type EconomicIntelligenceReadiness = {
  overallScore: number;
  level: 'low' | 'medium' | 'high';
  finance: WorkspaceReadiness;
  trader: WorkspaceReadiness;
  business: WorkspaceReadiness;
  nextActions: ReadinessIssue[];
  confirmations: ReadinessConfirmationKey[];
  invalidatedConfirmations: ReadinessConfirmationKey[];
};

const FINANCE_GROUPS = ['income', 'expenses', 'debts', 'savings', 'investments'] as const;
const CONFIRMATION_KEYS: ReadinessConfirmationKey[] = ['no_debts', 'no_investments', 'no_business_projects'];
function clampScore(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function financeAction(code: string) {
  if (code.includes('income')) return '/income';
  if (code.includes('expense')) return '/expenses';
  if (code.includes('debt')) return '/debts';
  if (code.includes('saving')) return '/savings';
  if (code.includes('investment')) return '/investments';
  return '/dashboard';
}

export function reconcileReadinessConfirmations(evidence: WorkspaceEvidence, confirmationKeys: Iterable<string> = []) {
  const requested = new Set([...confirmationKeys].filter((key): key is ReadinessConfirmationKey => CONFIRMATION_KEYS.includes(key as ReadinessConfirmationKey)));
  const invalidated: ReadinessConfirmationKey[] = [];

  if (requested.has('no_debts') && (evidence.finance.snapshot.debtBalance > 0 || evidence.finance.snapshot.monthlyDebtPayments > 0)) {
    requested.delete('no_debts'); invalidated.push('no_debts');
  }
  if (requested.has('no_investments') && evidence.finance.snapshot.investmentBalance > 0) {
    requested.delete('no_investments'); invalidated.push('no_investments');
  }
  if (requested.has('no_business_projects') && evidence.business.activeProjectCount > 0) {
    requested.delete('no_business_projects'); invalidated.push('no_business_projects');
  }

  return { confirmations: [...requested], invalidated };
}

export function buildEconomicIntelligenceReadiness(
  evidence: WorkspaceEvidence,
  confirmationKeys: Iterable<string> = [],
): EconomicIntelligenceReadiness {
  const reconciled = reconcileReadinessConfirmations(evidence, confirmationKeys);
  const confirmations = new Set(reconciled.confirmations);
  const financeIssues: ReadinessIssue[] = [];
  const quality = evidence.finance.snapshot.dataQuality;
  const missingOrEmpty = new Set<string>([
    ...quality.missing.map(String),
    ...quality.warnings.filter(value => String(value).endsWith(':empty')).map(value => String(value).replace(/:empty$/, '')),
  ]);
  if (confirmations.has('no_debts')) missingOrEmpty.delete('debts');
  if (confirmations.has('no_investments')) missingOrEmpty.delete('investments');

  const financeAvailable = FINANCE_GROUPS.filter(group => !missingOrEmpty.has(group)).length;
  const financeScore = clampScore((financeAvailable / FINANCE_GROUPS.length) * 100);
  for (const code of FINANCE_GROUPS.filter(group => missingOrEmpty.has(group))) {
    financeIssues.push({ code: `finance:${code}_missing`, workspace: 'finance', actionUrl: financeAction(code), weight: 20 });
  }

  const noInvestmentsConfirmed = confirmations.has('no_investments');
  const traderSignals = [
    evidence.trader.watchlistCount > 0,
    evidence.trader.activeAlertCount > 0 || evidence.trader.triggeredAlertCount > 0,
    evidence.finance.snapshot.investmentBalance > 0 || noInvestmentsConfirmed,
  ];
  const traderScore = clampScore((traderSignals.filter(Boolean).length / traderSignals.length) * 100);
  const traderIssues: ReadinessIssue[] = [];
  if (evidence.trader.watchlistCount === 0) traderIssues.push({ code: 'trader:watchlist_missing', workspace: 'trader', actionUrl: '/ai-analyst/watchlist', weight: 40 });
  if (evidence.trader.activeAlertCount === 0 && evidence.trader.triggeredAlertCount === 0) traderIssues.push({ code: 'trader:alerts_missing', workspace: 'trader', actionUrl: '/ai-analyst/alerts', weight: 25 });
  if (evidence.finance.snapshot.investmentBalance <= 0 && !noInvestmentsConfirmed) traderIssues.push({ code: 'trader:portfolio_missing', workspace: 'trader', actionUrl: '/investments', weight: 35 });

  const activeProjects = evidence.business.activeProjectCount;
  const noBusinessProjectsConfirmed = confirmations.has('no_business_projects');
  const fundingCovered = activeProjects > 0 && evidence.business.fundingNeeds.length >= activeProjects;
  const businessScore = noBusinessProjectsConfirmed ? 100 : activeProjects === 0 ? 0 : fundingCovered ? 100 : 50;
  const businessIssues: ReadinessIssue[] = [];
  if (activeProjects === 0 && !noBusinessProjectsConfirmed) businessIssues.push({ code: 'business:projects_missing', workspace: 'business', actionUrl: '/projects', weight: 60 });
  else if (activeProjects > 0 && !fundingCovered) businessIssues.push({ code: 'business:funding_readiness_missing', workspace: 'business', actionUrl: '/business-hub', weight: 40 });

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
    confirmations: [...confirmations],
    invalidatedConfirmations: reconciled.invalidated,
  };
}
