import { isMeasuredCapabilityCell } from '@/lib/market-state/capabilityMatrixView';
import type { MarketCapabilityKey, MarketSystemState, ProviderCapabilityCell } from '@/lib/market-state/types';
import { reconcileHealthIssues } from './rootCauseDiagnostics';
import { buildErrorCenterFromIssues } from './healthIssueSummary';
import { sanitizeOpsDiagnosticReason } from './diagnosticSafety';
import type {
  FeatureHealthRow,
  OperationsCenterState,
  OpsFeatureHealthStatus,
  OpsFeatureKey,
  OpsFeatureMeasurement,
  OpsHealthEvidence,
  RootCauseIssue,
} from './types';

const FEATURE_CAPABILITIES: Partial<Record<OpsFeatureKey, MarketCapabilityKey[]>> = {
  market_data: ['symbols', 'quotes', 'historical_prices', 'profiles', 'logos', 'forex', 'crypto', 'commodities', 'gcc_markets'],
  economic_calendar: ['economic_calendar'],
  earnings: ['earnings'],
  dividends: ['dividends'],
  ipos: ['ipos'],
  recommendations: ['recommendations'],
  technical_analysis: ['technical_data'],
  shariah_research: ['shariah_financials'],
};

const PROBED_SERVICES = new Set<OpsFeatureKey>(['ai_services', 'notifications', 'storage']);

type MarketDeliveryGap = { reasonKey: string; reason: string | null };

function marketDeliveryGap(ops: OperationsCenterState): MarketDeliveryGap | null {
  const delivery = ops.market.delivery;
  if (ops.degradedSources.market || delivery?.reason === 'live_aggregation_failed') {
    return { reasonKey: 'ops_center_feature_detail_market_refresh_failed', reason: ops.degradedSources.market ?? delivery?.reason ?? null };
  }
  if (delivery?.delayed) {
    return { reasonKey: 'ops_center_feature_detail_market_refresh_delayed', reason: delivery.reason };
  }
  if (delivery?.source === 'unavailable') {
    return { reasonKey: 'ops_center_feature_detail_collection_failed', reason: delivery.reason };
  }
  // The aggregator explicitly permits its short-lived memory/persistent cache. Cached alone
  // does not mean stale; a failed refresh is significant even before the fallback's TTL expires.
  return null;
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  return values.filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) ?? null;
}

function missingMeasurement(status: 'unmeasured' | 'uninstrumented', source: string, capability?: string): OpsFeatureMeasurement {
  const detailKey = 'ops_center_feature_detail_' + status;
  return {
    status,
    detailKey,
    evidence: [{ source, scope: 'none', capability, status, checkedAt: null, lastSuccessAt: null, reasonKey: detailKey, reason: null }],
  };
}

function statusForCell(cell: ProviderCapabilityCell): OpsFeatureHealthStatus {
  if (cell.status === 'connected') return 'healthy';
  if (cell.status === 'disabled') return 'disabled';
  if (cell.status === 'unsupported') return 'uninstrumented';
  if (!isMeasuredCapabilityCell(cell)) return 'unmeasured';
  if (cell.status === 'degraded' || cell.status === 'rate_limited') return 'partial';
  if (cell.status === 'disconnected' || cell.status === 'misconfigured') return 'failed';
  return 'unmeasured';
}

function evidenceForCell(cell: ProviderCapabilityCell): OpsHealthEvidence {
  const status = statusForCell(cell);
  const unmeasured = status === 'unmeasured' || status === 'uninstrumented';
  return {
    source: 'ops_center_evidence_source_market_capability',
    scope: unmeasured ? 'none' : cell.status === 'misconfigured' || cell.status === 'disabled' ? 'configuration' : 'runtime',
    capability: cell.capability,
    provider: cell.provider,
    status,
    checkedAt: status === 'healthy' ? cell.lastSuccessAt : latestTimestamp([cell.lastSuccessAt, cell.lastErrorAt]),
    lastSuccessAt: cell.lastSuccessAt,
    reasonKey: unmeasured ? 'ops_center_feature_detail_' + status
      : !cell.lastErrorReason && (status === 'failed' || status === 'partial') ? 'ops_center_root_cause_reason_not_reported' : null,
    reason: status === 'healthy' ? null : cell.lastErrorReason,
    latencyMs: cell.latencyMs,
  };
}

/** Availability failures and incomplete monitoring have different meanings. */
function combineStatuses(statuses: OpsFeatureHealthStatus[]): OpsFeatureHealthStatus {
  if (statuses.length === 0) return 'uninstrumented';
  if (statuses.every(status => status === 'disabled')) return 'disabled';
  const active = statuses.filter(status => status !== 'disabled');
  if (active.some(status => status === 'partial')) return 'partial';
  if (active.some(status => status === 'failed')) return active.some(status => status === 'healthy') ? 'partial' : 'failed';
  if (active.every(status => status === 'maintenance')) return 'maintenance';
  if (active.every(status => status === 'uninstrumented')) return 'uninstrumented';
  if (active.some(status => status === 'unmeasured' || status === 'uninstrumented' || status === 'maintenance')) return 'unmeasured';
  return 'healthy';
}

function capabilityMeasurement(market: MarketSystemState, capability: MarketCapabilityKey, deliveryGap: MarketDeliveryGap | null): OpsFeatureMeasurement {
  const cells = market.capabilityMatrix.filter(cell => cell.capability === capability && cell.status !== 'unsupported');
  if (cells.length === 0) return missingMeasurement('uninstrumented', 'ops_center_evidence_source_market_capability', capability);

  // Optional providers do not affect feature availability when a connected fallback serves it.
  const connected = cells.filter(cell => cell.status === 'connected');
  if (connected.length > 0 && !deliveryGap) {
    const selected = [...connected].sort((a, b) => (Date.parse(b.lastSuccessAt ?? '') || 0) - (Date.parse(a.lastSuccessAt ?? '') || 0))[0];
    return { status: 'healthy', detailKey: null, evidence: [evidenceForCell(selected)] };
  }

  const observed = cells.filter(cell => isMeasuredCapabilityCell(cell) && cell.status !== 'disabled');
  const relevant = observed.length > 0 ? observed : cells;
  const evidence = relevant.map(cell => {
    const item = evidenceForCell(cell);
    // Retain actual failure/rate-limit evidence, including a cooldown applied to an old
    // snapshot. A copied success cannot establish that its fallback still works right now.
    return deliveryGap && item.status === 'healthy'
      ? { ...item, status: 'unmeasured' as const, scope: 'none' as const, ...deliveryGap }
      : item;
  });
  return { status: combineStatuses(evidence.map(item => item.status!)), detailKey: null, evidence };
}

function marketFeatureMeasurement(ops: OperationsCenterState, feature: OpsFeatureKey): OpsFeatureMeasurement | null {
  const capabilities = FEATURE_CAPABILITIES[feature];
  if (!capabilities) return null;
  const deliveryGap = marketDeliveryGap(ops);
  const measurements = capabilities.map(capability => capabilityMeasurement(ops.market, capability, deliveryGap));
  const status = combineStatuses(measurements.map(item => item.status));
  const evidence = measurements.flatMap(item => item.evidence ?? []);
  if (deliveryGap) {
    return {
      status: status === 'failed' || status === 'partial' ? status : 'unmeasured',
      detailKey: deliveryGap.reasonKey,
      evidence: [
        // Delivery exposes no timestamp for the unsuccessful/pending refresh. Do not use the
        // old snapshot generation time as the time of this new failure or invent one from now.
        { source: 'ops_center_evidence_source_market_snapshot', scope: 'none', status: 'unmeasured', checkedAt: null, lastSuccessAt: null, ...deliveryGap },
        ...evidence,
      ],
    };
  }
  return {
    status,
    detailKey: status === 'unmeasured' || status === 'uninstrumented' ? 'ops_center_feature_detail_' + status : null,
    evidence,
  };
}

function newsMeasurement(ops: OperationsCenterState): OpsFeatureMeasurement {
  const enabled = ops.marketNews.filter(provider => provider.enabled);
  if (ops.degradedSources.marketNews || ops.marketNews.length === 0) {
    const result = missingMeasurement('unmeasured', 'ops_center_evidence_source_news');
    if (ops.degradedSources.marketNews) result.evidence![0].reason = ops.degradedSources.marketNews;
    return result;
  }
  if (enabled.length === 0) {
    return { status: 'disabled', detailKey: 'ops_center_feature_detail_disabled_configuration', evidence: [{ source: 'ops_center_evidence_source_news', scope: 'configuration', status: 'disabled', checkedAt: null, lastSuccessAt: null, reasonKey: 'ops_center_feature_detail_disabled_configuration', reason: null }] };
  }
  const successful = enabled.find(provider => provider.healthStatus === 'healthy');
  const providers = successful ? [successful] : enabled;
  const evidence: OpsHealthEvidence[] = providers.map(provider => {
    const status: OpsFeatureHealthStatus = provider.healthStatus === 'healthy' ? 'healthy'
      : provider.healthStatus === 'unhealthy' ? 'failed'
      : provider.healthStatus === 'degraded' || provider.healthStatus === 'rate_limited' ? 'partial' : 'unmeasured';
    return {
      source: 'ops_center_evidence_source_news', scope: status === 'unmeasured' ? 'none' : 'runtime', provider: provider.providerId, capability: 'news', status,
      checkedAt: status === 'healthy' ? provider.lastSuccessfulFetch : latestTimestamp([provider.lastSuccessfulFetch, provider.lastFailedFetch]), lastSuccessAt: provider.lastSuccessfulFetch,
      reasonKey: !provider.latestErrorSummary && (status === 'partial' || status === 'failed') ? 'ops_center_root_cause_reason_not_reported' : null,
      reason: status === 'healthy' ? null : provider.latestErrorSummary, latencyMs: provider.averageLatency,
    };
  });
  return { status: combineStatuses(evidence.map(item => item.status!)), detailKey: null, evidence };
}

function latestReminderRunPerType(ops: OperationsCenterState) {
  const latest = new Map<string, OperationsCenterState['subscriptionReminders']['recentRuns'][number]>();
  for (const run of ops.subscriptionReminders.recentRuns) {
    const current = latest.get(run.runType);
    if (!current || (Date.parse(run.startedAt ?? '') || 0) > (Date.parse(current.startedAt ?? '') || 0)) latest.set(run.runType, run);
  }
  return Array.from(latest.values());
}

function emailMeasurement(ops: OperationsCenterState): OpsFeatureMeasurement {
  const latestRuns = latestReminderRunPerType(ops);
  if (ops.degradedSources.subscriptionReminders || latestRuns.length === 0) {
    const result = missingMeasurement('unmeasured', 'ops_center_evidence_source_email_runs');
    if (ops.degradedSources.subscriptionReminders) result.evidence![0].reason = ops.degradedSources.subscriptionReminders;
    return result;
  }
  const evidence: OpsHealthEvidence[] = latestRuns.map(run => ({
    source: 'ops_center_evidence_source_email_runs', scope: run.status === 'completed' || run.status === 'partial' || run.status === 'failed' ? 'runtime' : 'none', capability: run.runType,
    status: run.status === 'completed' ? 'healthy' : run.status === 'partial' ? 'partial' : run.status === 'failed' ? 'failed' : 'unmeasured',
    checkedAt: run.finishedAt ?? run.startedAt,
    lastSuccessAt: run.status === 'completed' ? run.finishedAt : null,
    reasonKey: run.message ? null : run.status === 'failed' || run.status === 'partial' ? 'ops_center_root_cause_reason_not_reported' : null,
    reason: run.message,
  }));
  return { status: combineStatuses(evidence.map(item => item.status!)), detailKey: 'ops_center_feature_detail_email_subscription_only', evidence };
}

function measurementForBase(ops: OperationsCenterState, base: FeatureHealthRow): OpsFeatureMeasurement {
  const provided = ops.featureMeasurements?.[base.feature];
  if (provided) return { ...provided, evidence: provided.evidence?.map(item => ({ ...item })) };
  if (base.feature === 'economic_calendar') {
    if (!ops.calendarHealth) return missingMeasurement('unmeasured', 'ops_center_evidence_source_calendar');
    return {
      status: ops.calendarHealth,
      detailKey: base.detailKey,
      evidence: [{ source: 'ops_center_evidence_source_calendar', scope: ['healthy', 'partial', 'failed'].includes(ops.calendarHealth) ? 'runtime' : 'none', capability: 'economic_calendar', status: ops.calendarHealth, checkedAt: null, lastSuccessAt: null, reasonKey: ops.calendarHealth === 'partial' || ops.calendarHealth === 'failed' ? 'ops_center_root_cause_reason_not_reported' : base.detailKey, reason: null }],
    };
  }
  if (base.feature === 'news') return newsMeasurement(ops);
  if (base.feature === 'email') return emailMeasurement(ops);
  const market = marketFeatureMeasurement(ops, base.feature);
  if (market) return market;
  if (PROBED_SERVICES.has(base.feature) && !base.evidence?.length) return missingMeasurement('uninstrumented', 'ops_center_evidence_source_service_probe');
  if (base.status === 'maintenance' && !base.evidence?.some(item => item.scope === 'configuration')) return missingMeasurement('unmeasured', 'ops_center_evidence_source_service_probe');
  return {
    ...base,
    evidence: base.evidence?.map(item => ({ ...item })) ?? [{ source: base.feature === 'authentication' ? 'ops_center_evidence_source_request' : 'ops_center_evidence_source_service_probe', scope: ['healthy', 'partial', 'failed'].includes(base.status) ? 'runtime' : 'none', status: base.status, checkedAt: null, lastSuccessAt: null, reasonKey: base.detailKey, reason: null }],
  };
}

/** Derive each card from its own observation without turning missing telemetry into an outage. */
export function buildTruthfulFeatureHealth(ops: OperationsCenterState): FeatureHealthRow[] {
  const bases = new Map(ops.featureHealth.map(row => [row.feature, row]));
  for (const [feature, measurement] of Object.entries(ops.featureMeasurements ?? {})) {
    if (measurement && !bases.has(feature as OpsFeatureKey)) bases.set(feature as OpsFeatureKey, { feature: feature as OpsFeatureKey, ...measurement });
  }
  return Array.from(bases.values()).map(base => {
    const measurement = measurementForBase(ops, base);
    const evidence = measurement.evidence ?? [];
    if ((measurement.status === 'healthy' || measurement.status === 'partial')
      && evidence.some(item => item.status === 'unmeasured' || item.status === 'uninstrumented')
      && !evidence.some(item => item.status === 'failed' || item.status === 'partial')) {
      measurement.status = 'unmeasured';
      measurement.detailKey ??= 'ops_center_feature_detail_unmeasured';
    }
    if (base.feature === 'shariah_research') {
      const activeIssue = ops.rootCause.find(issue => issue.affectedFeature === 'shariah_research' && issue.kind !== 'measurement_gap'
        && !['market:', 'shariah_job:', 'ops_feature:', 'ops_measurement:'].some(prefix => issue.id.startsWith(prefix)));
      const failedJob = ops.shariah.recentJobs.find(job => job.status === 'failed');
      if (activeIssue?.severity === 'critical') measurement.status = 'failed';
      else if ((activeIssue || failedJob) && measurement.status === 'healthy') measurement.status = 'partial';
      if (failedJob) measurement.evidence = [...(measurement.evidence ?? []), {
        source: 'ops_center_evidence_source_shariah_jobs', scope: 'runtime', status: 'partial',
        checkedAt: failedJob.completedAt ?? failedJob.createdAt, lastSuccessAt: null,
        reasonKey: failedJob.errorCode ? null : 'ops_center_root_cause_reason_not_reported', reason: failedJob.errorCode,
      }];
    }
    return {
      feature: base.feature,
      ...measurement,
      evidence: measurement.evidence?.map(item => ({ ...item, reason: sanitizeOpsDiagnosticReason(item.reason) })),
    };
  });
}

export function buildTruthfulOverview(
  ops: OperationsCenterState,
  featureHealth: FeatureHealthRow[] = buildTruthfulFeatureHealth(ops),
  issues: RootCauseIssue[] = reconcileHealthIssues(ops, featureHealth),
): OperationsCenterState['overview'] {
  const count = (status: OpsFeatureHealthStatus) => featureHealth.filter(row => row.status === status).length;
  const healthyServiceCount = count('healthy');
  const partialServiceCount = count('partial');
  const failedServiceCount = count('failed');
  const disabledServiceCount = count('disabled');
  const maintenanceServiceCount = count('maintenance');
  const unmeasuredServiceCount = count('unmeasured');
  const uninstrumentedServiceCount = count('uninstrumented');
  const measuredServiceCount = healthyServiceCount + partialServiceCount + failedServiceCount;
  const eligibleServiceCount = featureHealth.length - disabledServiceCount - maintenanceServiceCount;
  const criticalIssueCount = issues.filter(issue => issue.severity === 'critical').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  const measurementGapCount = issues.filter(issue => issue.kind === 'measurement_gap').length;
  const overall = criticalIssueCount > 0 || failedServiceCount > 0 ? 'critical'
    : warningCount > 0 || partialServiceCount > 0 ? 'degraded'
    : measuredServiceCount === 0 && maintenanceServiceCount > 0 && eligibleServiceCount === 0 ? 'maintenance'
    : measuredServiceCount === 0 || unmeasuredServiceCount > 0 || uninstrumentedServiceCount > 0 ? 'unmeasured'
    : 'healthy';
  return {
    ...ops.overview,
    overall,
    healthScorePercent: measuredServiceCount > 0 ? Math.round(((healthyServiceCount + partialServiceCount * 0.5) / measuredServiceCount) * 100) : null,
    criticalIssueCount, warningCount, healthyServiceCount,
    measurementCoveragePercent: eligibleServiceCount > 0 ? Math.round((measuredServiceCount / eligibleServiceCount) * 100) : null,
    measuredServiceCount, eligibleServiceCount, totalServiceCount: featureHealth.length,
    unmeasuredServiceCount, uninstrumentedServiceCount, disabledServiceCount, maintenanceServiceCount,
    partialServiceCount, failedServiceCount, measurementGapCount,
  };
}

/** The sole health model consumed by cards, counts, diagnostics, and the error center. */
export function buildOperationsHealthSummary(ops: OperationsCenterState): Pick<OperationsCenterState, 'featureHealth' | 'rootCause' | 'overview' | 'errorCenter'> {
  const featureHealth = buildTruthfulFeatureHealth(ops);
  const rootCause = reconcileHealthIssues(ops, featureHealth);
  return {
    featureHealth,
    rootCause,
    overview: buildTruthfulOverview(ops, featureHealth, rootCause),
    errorCenter: buildErrorCenterFromIssues(rootCause, featureHealth),
  };
}
