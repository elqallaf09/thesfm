import { describe, expect, it } from 'vitest';
import { buildOperationsHealthSummary, buildTruthfulFeatureHealth, buildTruthfulOverview } from '@/lib/admin/opsCenter/healthTruth';
import type { FeatureHealthRow, OperationsCenterState, OpsFeatureHealthStatus, OpsFeatureKey } from '@/lib/admin/opsCenter/types';
import type { MarketCapabilityKey, ProviderCapabilityCell } from '@/lib/market-state/types';

function cell(overrides: Partial<ProviderCapabilityCell> = {}): ProviderCapabilityCell {
  return {
    provider: 'fmp',
    capability: 'quotes',
    status: 'connected',
    configured: true,
    healthy: true,
    lastSuccessAt: '2026-09-14T00:00:00.000Z',
    lastErrorAt: null,
    lastErrorReason: null,
    rateLimitedUntil: null,
    nextRetryAt: null,
    latencyMs: 80,
    ...overrides,
  };
}

function fixture(cells: ProviderCapabilityCell[]): OperationsCenterState {
  return {
    generatedAt: '2026-09-14T00:00:00.000Z',
    overview: {
      overall: 'degraded',
      healthScorePercent: 10,
      criticalIssueCount: 7,
      warningCount: 11,
      healthyServiceCount: 1,
      lastSyncAt: '2026-09-14T00:00:00.000Z',
      processUptimeSeconds: 60,
    },
    market: {
      generatedAt: '2026-09-14T00:00:00.000Z',
      overall: 'degraded',
      providers: {},
      capabilityMatrix: cells,
      providerProfiles: [],
      configuration: null,
      featuresSucceeded: [],
      featuresDegraded: [],
      featuresFailed: [],
      catalog: { discovered: 1, metadataAvailable: 1, liveQuoteAvailable: null, delayedQuoteAvailable: null, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: '2026-09-14T00:00:00.000Z' },
      lastSynchronizedAt: '2026-09-14T00:00:00.000Z',
    },
    marketNews: [],
    featureHealth: [
      { feature: 'market_data', status: 'partial', detailKey: null },
      { feature: 'news', status: 'disabled', detailKey: null },
      { feature: 'email', status: 'partial', detailKey: 'ops_center_feature_detail_email_subscription_only' },
      { feature: 'authentication', status: 'healthy', detailKey: null },
      { feature: 'database', status: 'healthy', detailKey: null },
    ],
    rootCause: [],
    symbolCoverage: {} as OperationsCenterState['symbolCoverage'],
    shariah: { counts: { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 }, recentJobs: [] },
    subscriptionReminders: { recentRuns: [] },
    backgroundJobs: {} as OperationsCenterState['backgroundJobs'],
    errorCenter: {} as OperationsCenterState['errorCenter'],
    dataQuality: {} as OperationsCenterState['dataQuality'],
    performance: {} as OperationsCenterState['performance'],
    aiUsage: {} as OperationsCenterState['aiUsage'],
    actions: [],
    degradedSources: {},
  };
}

describe('Operations Center truthful health aggregation', () => {
  it('uses measured calendar health rather than a healthy quote provider', () => {
    const ops = fixture([cell({ capability: 'economic_calendar' })]);
    ops.featureHealth.push({ feature: 'economic_calendar', status: 'healthy', detailKey: null });
    expect(buildTruthfulFeatureHealth(ops).find(row => row.feature === 'economic_calendar')?.status).toBe('unmeasured');
    ops.calendarHealth = 'failed';
    expect(buildTruthfulFeatureHealth(ops).find(row => row.feature === 'economic_calendar')?.status).toBe('failed');
  });
  it('keeps a capability healthy when one provider fails but a connected fallback serves it', () => {
    const ops = fixture([
      cell({ provider: 'marketstack', status: 'misconfigured', configured: false, healthy: false, lastSuccessAt: null, lastErrorReason: 'marketstack_not_configured' }),
      cell({ provider: 'twelvedata', status: 'connected' }),
      ...(['symbols', 'historical_prices', 'profiles', 'logos', 'forex', 'crypto', 'commodities', 'gcc_markets'] as MarketCapabilityKey[]).map(capability => cell({ capability })),
    ]);
    const rows = buildTruthfulFeatureHealth(ops);
    expect(rows.find(row => row.feature === 'market_data')?.status).toBe('healthy');
  });

  it('does not count declaration-only degraded rows as an outage', () => {
    const ops = fixture([
      cell({ provider: 'twelvedata', status: 'connected' }),
      cell({ provider: 'twelvedata', capability: 'forex', status: 'degraded', healthy: false, lastSuccessAt: null, lastErrorAt: null, lastErrorReason: null, latencyMs: null }),
    ]);
    const rows = buildTruthfulFeatureHealth(ops);
    expect(rows.find(row => row.feature === 'market_data')?.status).toBe('unmeasured');
    const overview = buildTruthfulOverview(ops, rows);
    expect(overview.healthScorePercent).toBeGreaterThan(10);
  });

  it('uses only the latest reminder run of each type for current email health', () => {
    const ops = fixture([cell()]);
    ops.subscriptionReminders.recentRuns = [
      { id: 'new', runType: 'scheduled', status: 'completed', startedAt: '2026-09-14T00:00:00.000Z', finishedAt: '2026-09-14T00:01:00.000Z', emailSentCount: 2, emailFailedCount: 0, message: null },
      { id: 'old', runType: 'scheduled', status: 'failed', startedAt: '2026-09-13T00:00:00.000Z', finishedAt: '2026-09-13T00:01:00.000Z', emailSentCount: 0, emailFailedCount: 2, message: 'smtp_not_configured' },
    ];
    const rows = buildTruthfulFeatureHealth(ops);
    expect(rows.find(row => row.feature === 'email')?.status).toBe('healthy');
  });

  it('recomputes issue counts from active root causes instead of stale overview counters', () => {
    const ops = fixture([cell()]);
    const rows = buildTruthfulFeatureHealth(ops);
    const overview = buildTruthfulOverview(ops, rows);
    expect(overview.criticalIssueCount).toBe(0);
    expect(overview.warningCount).toBe(0);
    expect(overview.overall).not.toBe('critical');
  });
});

function measuredRow(feature: OpsFeatureKey, status: OpsFeatureHealthStatus): FeatureHealthRow {
  return {
    feature,
    status,
    detailKey: null,
    evidence: [{
      source: 'test_observation', scope: status === 'disabled' || status === 'maintenance' ? 'configuration' : 'runtime', status,
      checkedAt: '2026-09-14T00:00:00.000Z', lastSuccessAt: status === 'healthy' ? '2026-09-14T00:00:00.000Z' : null,
      reasonKey: null, reason: status === 'partial' || status === 'failed' ? 'observed_probe_outcome' : null,
    }],
  };
}

function withMeasurements(rows: FeatureHealthRow[]): OperationsCenterState {
  const ops = fixture([]);
  ops.featureHealth = rows;
  ops.featureMeasurements = Object.fromEntries(rows.map(({ feature, ...measurement }) => [feature, measurement]));
  return ops;
}

describe('one Operations Center health model', () => {
  it('explains the screenshot score while matching both partial services to visible warnings and errors', () => {
    const healthy: OpsFeatureKey[] = ['news', 'earnings', 'dividends', 'ipos', 'technical_analysis', 'shariah_research', 'authentication', 'email', 'database'];
    const ops = withMeasurements([
      ...healthy.map(feature => measuredRow(feature, 'healthy')),
      measuredRow('market_data', 'partial'), measuredRow('economic_calendar', 'partial'),
      measuredRow('recommendations', 'maintenance'),
      ...(['ai_services', 'notifications', 'storage'] as OpsFeatureKey[]).map(feature => measuredRow(feature, 'disabled')),
    ]);
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.overview).toMatchObject({
      overall: 'degraded', healthScorePercent: 91, healthyServiceCount: 9,
      warningCount: 2, criticalIssueCount: 0, measuredServiceCount: 11, eligibleServiceCount: 11,
      totalServiceCount: 15, disabledServiceCount: 3, maintenanceServiceCount: 1, measurementCoveragePercent: 100,
    });
    expect(summary.rootCause.map(issue => issue.affectedFeature).sort()).toEqual(['economic_calendar', 'market_data']);
    const errors = Object.values(summary.errorCenter.byCategory).flat();
    expect(errors.map(error => error.id).sort()).toEqual(summary.rootCause.map(issue => issue.id).sort());
    expect(errors.filter(error => error.severity === 'warning')).toHaveLength(summary.overview.warningCount);
  });

  it('reports no score, no made-up downtime, and explicit gaps when services have never been measured', () => {
    const ops = fixture([]);
    ops.featureHealth = [
      { feature: 'ai_services', status: 'disabled', detailKey: null },
      { feature: 'economic_calendar', status: 'healthy', detailKey: null },
    ];
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth.map(row => row.status)).toEqual(['uninstrumented', 'unmeasured']);
    expect(summary.overview).toMatchObject({ overall: 'unmeasured', healthScorePercent: null, measurementCoveragePercent: 0, measuredServiceCount: 0, eligibleServiceCount: 2, measurementGapCount: 2, warningCount: 0, criticalIssueCount: 0 });
    expect(summary.rootCause.every(issue => issue.kind === 'measurement_gap' && issue.severity === 'info')).toBe(true);
    expect(summary.rootCause.every(issue => issue.lastOccurrence === null)).toBe(true);
  });

  it('keeps a supported but unprobed recommendation explicitly unmeasured instead of calling it maintenance', () => {
    const ops = fixture([cell({ capability: 'recommendations', status: 'degraded', lastSuccessAt: null, lastErrorAt: null, latencyMs: null })]);
    ops.featureHealth = [{ feature: 'recommendations', status: 'maintenance', detailKey: null }];
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth[0].status).toBe('unmeasured');
    expect(summary.rootCause).toHaveLength(1);
    expect(summary.rootCause[0]).toMatchObject({ kind: 'measurement_gap', severity: 'info', affectedFeature: 'recommendations', lastOccurrence: null });
    expect(summary.overview.healthScorePercent).toBeNull();
  });

  it('preserves the measured calendar outcome even when its adapter provides no technical error reason', () => {
    const ops = fixture([cell()]);
    ops.featureHealth = [{ feature: 'economic_calendar', status: 'healthy', detailKey: null }];
    ops.calendarHealth = 'failed';
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.overview).toMatchObject({ overall: 'critical', criticalIssueCount: 1, healthScorePercent: 0 });
    expect(summary.rootCause[0]).toMatchObject({ affectedFeature: 'economic_calendar', rootCauseKey: 'ops_center_root_cause_reason_not_reported', rootCauseParams: {}, lastOccurrence: null });
    expect(summary.errorCenter.byCategory.provider[0].id).toBe(summary.rootCause[0].id);
  });

  it('shows probe failures in their real service categories without a contradictory not-instrumented label', () => {
    const ops = withMeasurements((['ai_services', 'notifications', 'storage', 'database'] as OpsFeatureKey[]).map(feature => measuredRow(feature, 'failed')));
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.overview.criticalIssueCount).toBe(4);
    for (const category of ['ai', 'notifications', 'storage', 'database'] as const) {
      expect(summary.errorCenter.byCategory[category]).toHaveLength(1);
      expect(summary.errorCenter.notInstrumented).not.toContain(category);
    }
  });

  it('is idempotent and removes its prior diagnostic after the source recovers', () => {
    const ops = withMeasurements([measuredRow('economic_calendar', 'partial')]);
    const first = buildOperationsHealthSummary(ops);
    expect(buildOperationsHealthSummary({ ...ops, ...first })).toEqual(first);
    const recovered = withMeasurements([measuredRow('economic_calendar', 'healthy')]);
    recovered.rootCause = first.rootCause;
    const summary = buildOperationsHealthSummary(recovered);
    expect(summary.rootCause).toEqual([]);
    expect(summary.overview).toMatchObject({ overall: 'healthy', warningCount: 0, criticalIssueCount: 0 });
  });

  it('does not show an old provider failure as the current reason of a successful fallback', () => {
    const ops = fixture([cell({ capability: 'earnings', lastErrorAt: '2026-09-13T00:00:00.000Z', lastErrorReason: 'old_provider_timeout' })]);
    ops.featureHealth = [{ feature: 'earnings', status: 'partial', detailKey: null }];
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth[0].evidence?.[0]).toMatchObject({ status: 'healthy', reason: null, checkedAt: '2026-09-14T00:00:00.000Z' });
    expect(summary.rootCause).toEqual([]);
  });

  it('redacts sensitive diagnostic strings on the server model without mutating the input', () => {
    const ops = withMeasurements([measuredRow('storage', 'failed')]);
    const raw = 'probe failed https://example.test/read?api_key=secret-value Authorization: Bearer secret-bearer api_key=secret-key to user@example.test';
    ops.featureMeasurements!.storage!.evidence![0].reason = raw;
    const summary = buildOperationsHealthSummary(ops);
    const exposed = JSON.stringify(summary);
    expect(exposed).toContain('probe failed');
    for (const secret of ['secret-value', 'secret-bearer', 'secret-key', 'user@example.test']) expect(exposed).not.toContain(secret);
    expect(ops.featureMeasurements!.storage!.evidence![0].reason).toBe(raw);
    expect(buildOperationsHealthSummary({ ...ops, ...summary })).toEqual(summary);
  });

  it('does not mistake a successful sub-check plus missing delivery proof for an observed outage', () => {
    const ops = withMeasurements([measuredRow('notifications', 'partial')]);
    ops.featureMeasurements!.notifications!.evidence = [
      ...measuredRow('notifications', 'healthy').evidence!,
      { source: 'delivery_observation', scope: 'none', status: 'unmeasured', checkedAt: null, lastSuccessAt: null, reasonKey: null, reason: null },
    ];
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth[0].status).toBe('unmeasured');
    expect(summary.overview).toMatchObject({ overall: 'unmeasured', warningCount: 0, measurementGapCount: 1 });
  });

  it('does not let an informational note suppress the warning for an observed partial service', () => {
    const ops = withMeasurements([measuredRow('economic_calendar', 'partial')]);
    ops.rootCause = [{
      id: 'calendar_adapter_note', kind: 'incident', severity: 'info', problemKey: 'adapter_note', problemParams: {},
      rootCauseKey: 'adapter_note', rootCauseParams: {}, affectedFeature: 'economic_calendar', affectedProvider: null,
      firstOccurrence: null, lastOccurrence: null, suggestedFixKey: 'adapter_note', retryAvailable: false, expectedImpactKey: 'adapter_note',
    }];
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.overview.warningCount).toBe(1);
    expect(summary.rootCause.filter(issue => issue.severity === 'warning')).toHaveLength(1);
  });

  it.each([
    { source: 'persistent_cache', cached: true, delayed: false, reason: 'live_aggregation_failed' },
    { source: 'persistent_cache', cached: true, delayed: true, reason: 'live_aggregation_failed' },
    { source: 'persistent_cache', cached: true, delayed: true, reason: 'aggregate_refresh_in_progress' },
    { source: 'memory_cache', cached: true, delayed: true, reason: 'aggregate_cache_hit' },
  ] as const)('does not certify a copied connected snapshot after a failed or lagged refresh: $reason/$delayed', delivery => {
    const lastSuccessAt = '2026-09-14T00:00:00.000Z';
    const ops = fixture([cell({ capability: 'earnings', lastSuccessAt })]);
    ops.generatedAt = '2026-09-14T00:05:00.000Z';
    ops.featureHealth = [{ feature: 'earnings', status: 'healthy', detailKey: null }];
    ops.market.delivery = delivery;
    const original = JSON.stringify(ops);
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.overview).toMatchObject({ overall: 'unmeasured', healthScorePercent: null, measuredServiceCount: 0, measurementGapCount: 1 });
    expect(summary.featureHealth[0]).toMatchObject({ status: 'unmeasured' });
    expect(summary.featureHealth[0].evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'ops_center_evidence_source_market_snapshot', status: 'unmeasured', checkedAt: null, reason: delivery.reason }),
      expect.objectContaining({ capability: 'earnings', status: 'unmeasured', checkedAt: lastSuccessAt, lastSuccessAt }),
    ]));
    expect(summary.rootCause).toHaveLength(1);
    expect(summary.rootCause[0]).toMatchObject({ kind: 'measurement_gap', severity: 'info', lastOccurrence: null, rootCauseParams: { reason: delivery.reason } });
    expect(JSON.stringify(ops)).toBe(original);
    expect(buildOperationsHealthSummary({ ...ops, ...summary })).toEqual(summary);
  });

  it.each(['memory_cache', 'persistent_cache'] as const)('keeps an explicitly valid %s useful with its original check time', source => {
    const ops = fixture([cell({ capability: 'earnings' })]);
    ops.featureHealth = [{ feature: 'earnings', status: 'healthy', detailKey: null }];
    ops.market.delivery = { source, cached: true, delayed: false, reason: source === 'memory_cache' ? 'aggregate_cache_hit' : 'aggregate_persistent_cache_hit' };
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth[0]).toMatchObject({ status: 'healthy' });
    expect(summary.featureHealth[0].evidence?.[0].checkedAt).toBe('2026-09-14T00:00:00.000Z');
    expect(summary.overview).toMatchObject({ overall: 'healthy', healthScorePercent: 100, measurementGapCount: 0 });
    expect(summary.rootCause).toEqual([]);
  });

  it('preserves a real rate limit instead of hiding it behind a stale connected fallback', () => {
    const ops = fixture([
      cell({ capability: 'earnings', status: 'rate_limited', lastErrorReason: 'provider_rate_limited', lastErrorAt: '2026-09-14T00:05:00.000Z' }),
      cell({ capability: 'earnings', provider: 'twelvedata', status: 'connected' }),
    ]);
    ops.featureHealth = [{ feature: 'earnings', status: 'healthy', detailKey: null }];
    ops.market.delivery = { source: 'persistent_cache', cached: true, delayed: false, reason: 'live_aggregation_failed' };
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth[0].status).toBe('partial');
    expect(summary.featureHealth[0].evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'fmp', status: 'partial', checkedAt: '2026-09-14T00:05:00.000Z', reason: 'provider_rate_limited' }),
      expect.objectContaining({ provider: 'twelvedata', status: 'unmeasured', lastSuccessAt: '2026-09-14T00:00:00.000Z' }),
    ]));
    expect(summary.overview).toMatchObject({ warningCount: 1, measurementGapCount: 1 });
    expect(summary.rootCause.find(issue => issue.kind === 'incident')).toMatchObject({ rootCauseParams: { reason: 'provider_rate_limited' } });
    expect(buildOperationsHealthSummary({ ...ops, ...summary })).toEqual(summary);
  });

  it.each(['partial', 'unmeasured'] as const)('uses the dedicated calendar %s measurement instead of a legacy FMP calendar failure', status => {
    const ops = withMeasurements([measuredRow('economic_calendar', status)]);
    ops.featureMeasurements!.economic_calendar!.evidence![0].reason = 'calendar_source_observation';
    ops.market.capabilityMatrix = [cell({ capability: 'economic_calendar', status: 'disconnected', lastErrorReason: 'legacy_fmp_calendar_failure' })];
    const summary = buildOperationsHealthSummary(ops);
    expect(summary.featureHealth[0].status).toBe(status);
    expect(summary.overview.criticalIssueCount).toBe(0);
    expect(summary.overview.warningCount).toBe(status === 'partial' ? 1 : 0);
    expect(summary.rootCause).toHaveLength(1);
    expect(summary.rootCause[0].rootCauseParams).toEqual({ reason: 'calendar_source_observation' });
    expect(JSON.stringify(summary.rootCause)).not.toContain('legacy_fmp_calendar_failure');
  });
});
