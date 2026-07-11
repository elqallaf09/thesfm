import type { MarketCapabilityKey, MarketSystemState } from '@/lib/market-state/types';
import type { MarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import type { OperationsCenterState, OpsFeatureKey, OpsSeverity, RootCauseIssue } from './types';

const CAPABILITY_TO_FEATURE: Record<MarketCapabilityKey, OpsFeatureKey> = {
  symbols: 'market_data',
  quotes: 'market_data',
  historical_prices: 'market_data',
  profiles: 'market_data',
  logos: 'market_data',
  technical_data: 'technical_analysis',
  recommendations: 'recommendations',
  news: 'news',
  earnings: 'earnings',
  dividends: 'dividends',
  ipos: 'ipos',
  economic_calendar: 'economic_calendar',
  forex: 'market_data',
  crypto: 'market_data',
  commodities: 'market_data',
  gcc_markets: 'market_data',
  shariah_financials: 'shariah_research',
};

function severityForProviderStatus(status: MarketSystemState['capabilityMatrix'][number]['status']): OpsSeverity {
  if (status === 'disconnected') return 'critical';
  return 'warning';
}

/**
 * Turns real, already-collected error text into a flat, explorable issue list. Every field is
 * sourced from an existing timestamp/reason string — nothing here is invented. Where the
 * underlying tracker only records the LAST failure (not the first), `firstOccurrence` is
 * deliberately left `null` rather than guessed equal to `lastOccurrence`.
 */
export function buildRootCauseIssues(input: {
  market: MarketSystemState;
  marketNews: MarketNewsAdminProviderStatus[];
  shariahJobs: OperationsCenterState['shariah']['recentJobs'];
  reminderRuns: OperationsCenterState['subscriptionReminders']['recentRuns'];
}): RootCauseIssue[] {
  const issues: RootCauseIssue[] = [];

  for (const cell of input.market.capabilityMatrix) {
    const problematic = cell.status === 'disconnected' || cell.status === 'degraded' || cell.status === 'rate_limited' || cell.status === 'misconfigured';
    if (!problematic || !cell.lastErrorReason) continue;
    issues.push({
      id: `market:${cell.provider}:${cell.capability}`,
      problemKey: 'ops_center_root_cause_problem_provider_capability',
      problemParams: { provider: cell.provider, capability: cell.capability },
      severity: severityForProviderStatus(cell.status),
      rootCauseKey: 'ops_center_root_cause_reason_generic',
      rootCauseParams: { reason: cell.lastErrorReason },
      affectedFeature: CAPABILITY_TO_FEATURE[cell.capability] ?? null,
      affectedProvider: cell.provider,
      firstOccurrence: null,
      lastOccurrence: cell.lastErrorAt,
      suggestedFixKey: cell.status === 'misconfigured' ? 'ops_center_fix_check_configuration' : cell.status === 'rate_limited' ? 'ops_center_fix_wait_rate_limit' : 'ops_center_fix_retry_provider',
      retryAvailable: cell.status !== 'misconfigured',
      expectedImpactKey: 'ops_center_impact_feature_degraded',
    });
  }

  for (const provider of input.marketNews) {
    const problematic = provider.healthStatus === 'degraded' || provider.healthStatus === 'unhealthy' || provider.healthStatus === 'rate_limited';
    if (!problematic || !provider.latestErrorSummary) continue;
    issues.push({
      id: `market_news:${provider.providerId}`,
      problemKey: 'ops_center_root_cause_problem_news_provider',
      problemParams: { provider: provider.providerName },
      severity: provider.healthStatus === 'unhealthy' ? 'critical' : 'warning',
      rootCauseKey: 'ops_center_root_cause_reason_generic',
      rootCauseParams: { reason: provider.latestErrorSummary },
      affectedFeature: 'news',
      affectedProvider: provider.providerId,
      firstOccurrence: null,
      lastOccurrence: provider.lastFailedFetch,
      suggestedFixKey: provider.healthStatus === 'rate_limited' ? 'ops_center_fix_wait_rate_limit' : 'ops_center_fix_retry_provider',
      retryAvailable: true,
      expectedImpactKey: 'ops_center_impact_feature_degraded',
    });
  }

  for (const job of input.shariahJobs) {
    if (job.status !== 'failed' || !job.errorCode) continue;
    issues.push({
      id: `shariah_job:${job.id}`,
      problemKey: 'ops_center_root_cause_problem_shariah_job',
      problemParams: { jobId: job.id },
      severity: 'warning',
      rootCauseKey: 'ops_center_root_cause_reason_generic',
      rootCauseParams: { reason: job.errorCode },
      affectedFeature: 'shariah_research',
      affectedProvider: null,
      firstOccurrence: job.createdAt,
      lastOccurrence: job.completedAt,
      suggestedFixKey: 'ops_center_fix_retry_shariah_job',
      retryAvailable: true,
      expectedImpactKey: 'ops_center_impact_shariah_research_delayed',
    });
  }

  for (const run of input.reminderRuns) {
    if ((run.status !== 'failed' && run.status !== 'partial') || !run.message) continue;
    issues.push({
      id: `reminder_run:${run.id}`,
      problemKey: 'ops_center_root_cause_problem_reminder_run',
      problemParams: { runType: run.runType, failedCount: run.emailFailedCount },
      severity: run.status === 'failed' ? 'warning' : 'info',
      rootCauseKey: 'ops_center_root_cause_reason_generic',
      rootCauseParams: { reason: run.message },
      affectedFeature: 'email',
      affectedProvider: null,
      firstOccurrence: run.startedAt,
      lastOccurrence: run.finishedAt,
      suggestedFixKey: 'ops_center_fix_check_smtp_configuration',
      retryAvailable: false,
      expectedImpactKey: 'ops_center_impact_email_reminders_missed',
    });
  }

  return issues;
}
