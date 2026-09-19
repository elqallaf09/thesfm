import { describe, expect, it } from 'vitest';
import { buildTruthfulFeatureHealth, buildTruthfulOverview } from '@/lib/admin/opsCenter/healthTruth';
import type { OperationsCenterState } from '@/lib/admin/opsCenter/types';
import type { ProviderCapabilityCell } from '@/lib/market-state/types';

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
    expect(buildTruthfulFeatureHealth(ops).find(row => row.feature === 'economic_calendar')?.status).toBe('maintenance');
    ops.calendarHealth = 'failed';
    expect(buildTruthfulFeatureHealth(ops).find(row => row.feature === 'economic_calendar')?.status).toBe('failed');
  });
  it('keeps a capability healthy when one provider fails but a connected fallback serves it', () => {
    const ops = fixture([
      cell({ provider: 'marketstack', status: 'misconfigured', configured: false, healthy: false, lastSuccessAt: null, lastErrorReason: 'marketstack_not_configured' }),
      cell({ provider: 'twelvedata', status: 'connected' }),
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
    expect(rows.find(row => row.feature === 'market_data')?.status).toBe('partial');
    const overview = buildTruthfulOverview(ops, rows);
    expect(overview.healthScorePercent).toBeGreaterThan(ops.overview.healthScorePercent);
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
