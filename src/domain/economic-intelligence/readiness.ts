import type { WorkspaceEvidence } from './crossWorkspaceBrain';

export type ReadinessWorkspace = 'finance' | 'trader' | 'business';
export type ReadinessConfirmationKey = 'no_debts' | 'no_investments' | 'no_business_projects';
export type ReadinessIssue = { code: string; workspace: ReadinessWorkspace; actionUrl: string; weight: number };
export type WorkspaceReadiness = { score: number; ready: boolean; issues: ReadinessIssue[] };
export type WorkspaceFreshness = { asOf: string | null; ageDays: number | null; stale: boolean; veryStale: boolean; available: boolean };
export type EconomicIntelligenceReadiness = {
  overallScore: number;
  level: 'low' | 'medium' | 'high';
  finance: WorkspaceReadiness;
  trader: WorkspaceReadiness;
  business: WorkspaceReadiness;
  freshness: Record<ReadinessWorkspace, WorkspaceFreshness>;
  nextActions: ReadinessIssue[];
  confirmations: ReadinessConfirmationKey[];
  invalidatedConfirmations: ReadinessConfirmationKey[];
};

const FINANCE_GROUPS = ['income', 'expenses', 'debts', 'savings', 'investments'] as const;
const CONFIRMATION_KEYS: ReadinessConfirmationKey[] = ['no_debts', 'no_investments', 'no_business_projects'];
const STALE_DAYS: Record<ReadinessWorkspace, { stale: number; veryStale: number }> = {
  finance: { stale: 45, veryStale: 90 },
  trader: { stale: 30, veryStale: 60 },
  business: { stale: 60, veryStale: 120 },
};

function clampScore(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function financeAction(code: string) {
  if (code.includes('income')) return '/income';
  if (code.includes('expense')) return '/expenses';
  if (code.includes('debt')) return '/debts';
  if (code.includes('saving')) return '/savings';
  if (code.includes('investment')) return '/investments';
  return '/dashboard';
}
function freshnessFor(asOf: string | null | undefined, workspace: ReadinessWorkspace, now = new Date(), metadataAvailable = true): WorkspaceFreshness {
  if (!metadataAvailable) return { asOf: null, ageDays: null, stale: false, veryStale: false, available: false };
  if (!asOf) return { asOf: null, ageDays: null, stale: true, veryStale: true, available: true };
  const time = new Date(asOf).getTime();
  if (!Number.isFinite(time)) return { asOf: null, ageDays: null, stale: true, veryStale: true, available: true };
  const ageDays = Math.max(0, Math.floor((now.getTime() - time) / 86_400_000));
  const thresholds = STALE_DAYS[workspace];
  return { asOf: new Date(time).toISOString(), ageDays, stale: ageDays > thresholds.stale, veryStale: ageDays > thresholds.veryStale, available: true };
}
function freshnessPenalty(freshness: WorkspaceFreshness) {
  if (!freshness.available) return 1;
  if (freshness.veryStale) return 0.6;
  if (freshness.stale) return 0.8;
  return 1;
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
  now = new Date(),
): EconomicIntelligenceReadiness {
  const reconciled = reconcileReadinessConfirmations(evidence, confirmationKeys);
  const confirmations = new Set(reconciled.confirmations);
  const hasFreshnessMetadata = evidence.freshness !== undefined;
  const freshness = {
    finance: freshnessFor(hasFreshnessMetadata ? evidence.freshness?.finance ?? null : null, 'finance', now, hasFreshnessMetadata),
    trader: freshnessFor(hasFreshnessMetadata ? evidence.freshness?.trader ?? null : null, 'trader', now, hasFreshnessMetadata),
    business: freshnessFor(hasFreshnessMetadata ? evidence.freshness?.business ?? null : null, 'business', now, hasFreshnessMetadata),
  } satisfies Record<ReadinessWorkspace, WorkspaceFreshness>;

  const financeIssues: ReadinessIssue[] = [];
  const quality = evidence.finance.snapshot.dataQuality;
  const missingOrEmpty = new Set<string>([
    ...quality.missing.map(String),
    ...quality.warnings.filter(value => String(value).endsWith(':empty')).map(value => String(value).replace(/:empty$/, '')),
  ]);
  if (confirmations.has('no_debts')) missingOrEmpty.delete('debts');
  if (confirmations.has('no_investments')) missingOrEmpty.delete('investments');

  const financeAvailable = FINANCE_GROUPS.filter(group => !missingOrEmpty.has(group)).length;
  const financeBaseScore = clampScore((financeAvailable / FINANCE_GROUPS.length) * 100);
  const financeScore = clampScore(financeBaseScore * freshnessPenalty(freshness.finance));
  for (const code of FINANCE_GROUPS.filter(group => missingOrEmpty.has(group))) {
    financeIssues.push({ code: `finance:${code}_missing`, workspace: 'finance', actionUrl: financeAction(code), weight: 20 });
  }
  if (financeAvailable > 0 && freshness.finance.available && freshness.finance.stale) financeIssues.push({ code: 'finance:stale', workspace: 'finance', actionUrl: '/dashboard', weight: freshness.finance.veryStale ? 55 : 30 });

  const noInvestmentsConfirmed = confirmations.has('no_investments');
  const traderSignals = [
    evidence.trader.watchlistCount > 0,
    evidence.trader.activeAlertCount > 0 || evidence.trader.triggeredAlertCount > 0,
    evidence.finance.snapshot.investmentBalance > 0 || noInvestmentsConfirmed,
  ];
  const traderBaseScore = clampScore((traderSignals.filter(Boolean).length / traderSignals.length) * 100);
  const traderScore = clampScore(traderBaseScore * freshnessPenalty(freshness.trader));
  const traderIssues: ReadinessIssue[] = [];
  if (evidence.trader.watchlistCount === 0) traderIssues.push({ code: 'trader:watchlist_missing', workspace: 'trader', actionUrl: '/ai-analyst/watchlist', weight: 40 });
  if (evidence.trader.activeAlertCount === 0 && evidence.trader.triggeredAlertCount === 0) traderIssues.push({ code: 'trader:alerts_missing', workspace: 'trader', actionUrl: '/ai-analyst/alerts', weight: 25 });
  if (evidence.finance.snapshot.investmentBalance <= 0 && !noInvestmentsConfirmed) traderIssues.push({ code: 'trader:portfolio_missing', workspace: 'trader', actionUrl: '/investments', weight: 35 });
  if (traderSignals.some(Boolean) && freshness.trader.available && freshness.trader.stale) traderIssues.push({ code: 'trader:stale', workspace: 'trader', actionUrl: '/ai-analyst', weight: freshness.trader.veryStale ? 60 : 35 });

  const activeProjects = evidence.business.activeProjectCount;
  const noBusinessProjectsConfirmed = confirmations.has('no_business_projects');
  const fundingCovered = activeProjects > 0 && evidence.business.fundingNeeds.length >= activeProjects;
  const businessBaseScore = noBusinessProjectsConfirmed ? 100 : activeProjects === 0 ? 0 : fundingCovered ? 100 : 50;
  const businessScore = noBusinessProjectsConfirmed ? 100 : clampScore(businessBaseScore * freshnessPenalty(freshness.business));
  const businessIssues: ReadinessIssue[] = [];
  if (activeProjects === 0 && !noBusinessProjectsConfirmed) businessIssues.push({ code: 'business:projects_missing', workspace: 'business', actionUrl: '/projects', weight: 60 });
  else if (activeProjects > 0 && !fundingCovered) businessIssues.push({ code: 'business:funding_readiness_missing', workspace: 'business', actionUrl: '/business-hub', weight: 40 });
  if (activeProjects > 0 && freshness.business.available && freshness.business.stale) businessIssues.push({ code: 'business:stale', workspace: 'business', actionUrl: '/business-hub', weight: freshness.business.veryStale ? 55 : 30 });

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
    freshness,
    nextActions,
    confirmations: [...confirmations],
    invalidatedConfirmations: reconciled.invalidated,
  };
}
