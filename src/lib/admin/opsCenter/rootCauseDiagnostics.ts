import type { MarketCapabilityKey, MarketSystemState } from '@/lib/market-state/types';
import type { MarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import { isMeasuredCapabilityCell } from '@/lib/market-state/capabilityMatrixView';
import { sanitizeOpsDiagnosticReason } from './diagnosticSafety';
import type { FeatureHealthRow, OperationsCenterState, OpsFeatureKey, OpsHealthEvidence, OpsSeverity, RootCauseIssue } from './types';

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
  if (status === 'disconnected' || status === 'misconfigured') return 'critical';
  return 'warning';
}

function latestReminderRunPerType(
  runs: OperationsCenterState['subscriptionReminders']['recentRuns'],
): OperationsCenterState['subscriptionReminders']['recentRuns'] {
  const latest = new Map<string, OperationsCenterState['subscriptionReminders']['recentRuns'][number]>();
  for (const run of runs) {
    const current = latest.get(run.runType);
    if (!current) {
      latest.set(run.runType, run);
      continue;
    }
    const runTime = run.startedAt ? Date.parse(run.startedAt) : Number.NEGATIVE_INFINITY;
    const currentTime = current.startedAt ? Date.parse(current.startedAt) : Number.NEGATIVE_INFINITY;
    if (runTime > currentTime) latest.set(run.runType, run);
  }
  return Array.from(latest.values());
}

/**
 * Turns already-collected outcomes into explorable issues. A measured failure remains visible
 * when its source omits error text; the explanation explicitly says the cause was not reported.
 * Timestamps and technical reasons are never invented. A provider-level
 * failure is considered an active platform root cause only when no connected provider currently
 * serves the same capability; redundant-provider failures remain visible in provider diagnostics
 * without falsely degrading the whole Operations Center. Historical reminder failures likewise
 * stop being active once a newer run of the same type succeeds.
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
    if (!problematic || !isMeasuredCapabilityCell(cell)) continue;

    const connectedAlternative = input.market.capabilityMatrix.some(other =>
      other.capability === cell.capability
      && other.provider !== cell.provider
      && other.status === 'connected',
    );
    if (connectedAlternative) continue;

    issues.push({
      id: `market:${cell.provider}:${cell.capability}`,
      kind: cell.status === 'misconfigured' ? 'configuration' : 'incident',
      problemKey: 'ops_center_root_cause_problem_provider_capability',
      problemParams: { provider: cell.provider, capability: cell.capability },
      severity: severityForProviderStatus(cell.status),
      rootCauseKey: cell.lastErrorReason ? 'ops_center_root_cause_reason_generic' : 'ops_center_root_cause_reason_not_reported',
      rootCauseParams: cell.lastErrorReason ? { reason: cell.lastErrorReason } : {},
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
    if (!provider.enabled || !problematic) continue;

    const healthyAlternative = input.marketNews.some(other =>
      other.providerId !== provider.providerId
      && other.enabled
      && other.healthStatus === 'healthy',
    );
    if (healthyAlternative) continue;

    issues.push({
      id: `market_news:${provider.providerId}`,
      kind: 'incident',
      problemKey: 'ops_center_root_cause_problem_news_provider',
      problemParams: { provider: provider.providerName },
      severity: provider.healthStatus === 'unhealthy' ? 'critical' : 'warning',
      rootCauseKey: provider.latestErrorSummary ? 'ops_center_root_cause_reason_generic' : 'ops_center_root_cause_reason_not_reported',
      rootCauseParams: provider.latestErrorSummary ? { reason: provider.latestErrorSummary } : {},
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
    if (job.status !== 'failed') continue;
    issues.push({
      id: `shariah_job:${job.id}`,
      kind: 'incident',
      problemKey: 'ops_center_root_cause_problem_shariah_job',
      problemParams: { jobId: job.id },
      severity: 'warning',
      rootCauseKey: job.errorCode ? 'ops_center_root_cause_reason_generic' : 'ops_center_root_cause_reason_not_reported',
      rootCauseParams: job.errorCode ? { reason: job.errorCode } : {},
      affectedFeature: 'shariah_research',
      affectedProvider: null,
      firstOccurrence: job.createdAt,
      lastOccurrence: job.completedAt,
      suggestedFixKey: 'ops_center_fix_retry_shariah_job',
      retryAvailable: true,
      expectedImpactKey: 'ops_center_impact_shariah_research_delayed',
    });
  }

  for (const run of latestReminderRunPerType(input.reminderRuns)) {
    if (run.status !== 'failed' && run.status !== 'partial') continue;
    issues.push({
      id: `reminder_run:${run.id}`,
      kind: 'incident',
      problemKey: 'ops_center_root_cause_problem_reminder_run',
      problemParams: { runType: run.runType, failedCount: run.emailFailedCount },
      severity: run.status === 'failed' ? 'critical' : 'warning',
      rootCauseKey: run.message ? 'ops_center_root_cause_reason_generic' : 'ops_center_root_cause_reason_not_reported',
      rootCauseParams: run.message ? { reason: run.message } : {},
      affectedFeature: 'email',
      affectedProvider: null,
      firstOccurrence: run.startedAt,
      lastOccurrence: run.finishedAt,
      suggestedFixKey: 'ops_center_fix_check_smtp_configuration',
      retryAvailable: false,
      expectedImpactKey: 'ops_center_impact_email_reminders_missed',
    });
  }

  return issues.map(sanitizeIssue);
}

function sanitizeIssue(issue: RootCauseIssue): RootCauseIssue {
  return {
    ...issue,
    rootCauseParams: Object.fromEntries(Object.entries(issue.rootCauseParams).map(([key, value]) => [key, typeof value === 'string' ? sanitizeOpsDiagnosticReason(value) ?? '' : value])),
  };
}

const GENERATED_ISSUE_PREFIXES = ['market:', 'market_news:', 'shariah_job:', 'reminder_run:', 'ops_feature:', 'ops_measurement:'];

function availableFeatureCheck(ops: OperationsCenterState, feature: OpsFeatureKey): boolean {
  return ops.actions.some(action => action.available && (
    (feature === 'market_data' && (action.kind === 'retry_market_providers' || action.kind === 'refresh_symbol_catalog'))
    || (feature === 'economic_calendar' && action.kind === 'refresh_economic_calendar')
    || (['ai_services', 'notifications', 'storage'].includes(feature) && action.kind === 'check_service_health')
  ));
}

function observedReason(evidence: OpsHealthEvidence | undefined, fallbackKey: string): Pick<RootCauseIssue, 'rootCauseKey' | 'rootCauseParams'> {
  return {
    rootCauseKey: evidence?.reasonKey ?? (evidence?.reason ? 'ops_center_root_cause_reason_generic' : fallbackKey),
    rootCauseParams: evidence?.reason ? { reason: evidence.reason } : {},
  };
}

/**
 * Cards, counts, and the error table share this reconciled list. A known bad outcome always has
 * an incident, while absent observation has an explicit information item and no invented cause.
 * Rebuilding owned IDs from observations makes normalization idempotent after a refresh/recovery.
 */
export function reconcileHealthIssues(ops: OperationsCenterState, rows: FeatureHealthRow[]): RootCauseIssue[] {
  const byFeature = new Map(rows.map(row => [row.feature, row]));
  const observed = buildRootCauseIssues({
    market: ops.market,
    marketNews: ops.marketNews,
    shariahJobs: ops.shariah.recentJobs,
    reminderRuns: ops.subscriptionReminders.recentRuns,
  }).filter(issue => !issue.affectedFeature || (
    // A dedicated measurement is authoritative for this feature. Its evidence below supplies
    // the incident/gap; a legacy provider snapshot must not replace its cause or severity.
    !ops.featureMeasurements?.[issue.affectedFeature]
    && byFeature.get(issue.affectedFeature)?.status !== 'healthy'
  ));
  const supplied = ops.rootCause.filter(issue => !GENERATED_ISSUE_PREFIXES.some(prefix => issue.id.startsWith(prefix)));
  const issues = new Map([...observed, ...supplied].map(issue => [issue.id, issue]));

  for (const row of rows) {
    const evidence = row.evidence ?? [];
    if (row.status === 'failed' || row.status === 'partial') {
      const severity = row.status === 'failed' ? 'critical' : 'warning';
      const hasIncident = Array.from(issues.values()).some(issue => issue.affectedFeature === row.feature
        && issue.kind !== 'measurement_gap' && (issue.severity === 'critical' || (severity === 'warning' && issue.severity === 'warning')));
      if (!hasIncident) {
        const outcome = evidence.find(item => item.status === row.status && (item.reason || item.reasonKey))
          ?? evidence.find(item => item.status === 'failed' || item.status === 'partial');
        const issue: RootCauseIssue = {
          id: `ops_feature:${row.feature}`,
          kind: 'incident',
          problemKey: 'ops_center_root_cause_problem_feature_status',
          problemParams: { feature: row.feature },
          severity,
          ...observedReason(outcome, 'ops_center_root_cause_reason_not_reported'),
          affectedFeature: row.feature,
          affectedProvider: outcome?.provider ?? null,
          firstOccurrence: null,
          lastOccurrence: outcome?.checkedAt ?? null,
          suggestedFixKey: 'ops_center_fix_run_feature_check',
          retryAvailable: availableFeatureCheck(ops, row.feature),
          expectedImpactKey: 'ops_center_impact_feature_degraded',
        };
        issues.set(issue.id, issue);
      }
    }

    const missing = evidence.find(item => item.status === 'unmeasured' || item.status === 'uninstrumented');
    if (row.status === 'unmeasured' || row.status === 'uninstrumented' || missing) {
      const issue: RootCauseIssue = {
        id: `ops_measurement:${row.feature}`,
        kind: 'measurement_gap',
        problemKey: 'ops_center_root_cause_problem_measurement_gap',
        problemParams: { feature: row.feature },
        severity: 'info',
        ...observedReason(missing, row.status === 'uninstrumented' ? 'ops_center_feature_detail_uninstrumented' : 'ops_center_feature_detail_unmeasured'),
        affectedFeature: row.feature,
        affectedProvider: missing?.provider ?? null,
        firstOccurrence: null,
        lastOccurrence: missing?.checkedAt ?? null,
        suggestedFixKey: row.status === 'uninstrumented' ? 'ops_center_fix_connect_measurement' : 'ops_center_fix_run_feature_check',
        retryAvailable: availableFeatureCheck(ops, row.feature),
        expectedImpactKey: 'ops_center_impact_health_unknown',
      };
      issues.set(issue.id, issue);
    }
  }
  const rank: Record<OpsSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return Array.from(issues.values()).sort((a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id)).map(sanitizeIssue);
}
