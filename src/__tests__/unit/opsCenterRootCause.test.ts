import { describe, expect, it } from 'vitest';
import { buildRootCauseIssues } from '@/lib/admin/opsCenter/rootCauseDiagnostics';
import type { MarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import type { MarketSystemState, ProviderCapabilityCell } from '@/lib/market-state/types';

function cell(overrides: Partial<ProviderCapabilityCell> = {}): ProviderCapabilityCell {
  return {
    provider: 'fmp',
    capability: 'quotes',
    status: 'connected',
    configured: true,
    healthy: true,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorReason: null,
    rateLimitedUntil: null,
    nextRetryAt: null,
    latencyMs: null,
    ...overrides,
  };
}

function market(capabilityMatrix: ProviderCapabilityCell[]): MarketSystemState {
  return {
    generatedAt: '2026-07-11T00:00:00.000Z',
    overall: 'connected',
    providers: {},
    capabilityMatrix,
    providerProfiles: [],
    configuration: null,
    featuresSucceeded: [],
    featuresDegraded: [],
    featuresFailed: [],
    catalog: {
      discovered: 0, metadataAvailable: 0, liveQuoteAvailable: null, delayedQuoteAvailable: null,
      staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: null,
    },
    lastSynchronizedAt: null,
  };
}

describe('buildRootCauseIssues', () => {
  it('turns a rate-limited provider cell with a real lastErrorReason into a warning issue with retry available', () => {
    const issues = buildRootCauseIssues({
      market: market([cell({ status: 'rate_limited', lastErrorReason: 'provider_rate_limited', lastErrorAt: '2026-07-11T01:00:00.000Z' })]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'warning', retryAvailable: true, affectedProvider: 'fmp', affectedFeature: 'market_data' });
    expect(issues[0].firstOccurrence).toBeNull();
    expect(issues[0].lastOccurrence).toBe('2026-07-11T01:00:00.000Z');
  });

  it('does not treat a broken redundant provider as an active root cause when a connected fallback serves the same capability', () => {
    const issues = buildRootCauseIssues({
      market: market([
        cell({ provider: 'marketstack', status: 'misconfigured', healthy: false, lastErrorReason: 'marketstack_not_configured' }),
        cell({ provider: 'twelvedata', status: 'connected', healthy: true }),
      ]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [],
    });
    expect(issues).toEqual([]);
  });

  it('marks a misconfigured provider as not retry-available when no connected fallback exists', () => {
    const issues = buildRootCauseIssues({
      market: market([cell({ status: 'misconfigured', lastErrorReason: 'fmp_not_configured' })]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [],
    });
    expect(issues[0].retryAvailable).toBe(false);
    expect(issues[0].suggestedFixKey).toBe('ops_center_fix_check_configuration');
  });

  it('marks a disconnected provider as critical severity when the capability has no connected fallback', () => {
    const issues = buildRootCauseIssues({
      market: market([cell({ status: 'disconnected', lastErrorReason: 'provider_temporarily_unavailable' })]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [],
    });
    expect(issues[0].severity).toBe('critical');
  });

  it('never emits an issue for a healthy cell or a problem cell with no real error reason', () => {
    const issues = buildRootCauseIssues({
      market: market([
        cell({ status: 'connected' }),
        cell({ provider: 'yahoo', status: 'degraded', lastErrorReason: null }),
      ]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [],
    });
    expect(issues).toEqual([]);
  });

  it('surfaces a real market-news provider failure with lastFailedFetch as the last occurrence when no healthy alternative exists', () => {
    const newsProvider: MarketNewsAdminProviderStatus = {
      providerId: 'rss-example', providerName: 'Example RSS', sourceType: 'public_rss', sourceDomain: 'example.com',
      reliabilityScore: 0.5, priority: 1, officialSource: false, supportedMarkets: [], enabled: true,
      healthStatus: 'unhealthy', lastSuccessfulFetch: null, lastFailedFetch: '2026-07-10T12:00:00.000Z',
      averageLatency: null, failureCount: 5, rateLimitState: 'none', disabledUntil: null,
      latestErrorSummary: 'upstream_error', latestFetch: null,
    };
    const issues = buildRootCauseIssues({ market: market([]), marketNews: [newsProvider], shariahJobs: [], reminderRuns: [] });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'critical', affectedFeature: 'news', lastOccurrence: '2026-07-10T12:00:00.000Z' });
  });

  it('does not promote one failed news source to an active platform issue while another enabled source is healthy', () => {
    const failed: MarketNewsAdminProviderStatus = {
      providerId: 'rss-bad', providerName: 'Bad RSS', sourceType: 'public_rss', sourceDomain: 'bad.example',
      reliabilityScore: 0.5, priority: 2, officialSource: false, supportedMarkets: [], enabled: true,
      healthStatus: 'unhealthy', lastSuccessfulFetch: null, lastFailedFetch: '2026-07-10T12:00:00.000Z',
      averageLatency: null, failureCount: 5, rateLimitState: 'none', disabledUntil: null,
      latestErrorSummary: 'upstream_error', latestFetch: null,
    };
    const healthy: MarketNewsAdminProviderStatus = {
      ...failed,
      providerId: 'rss-good', providerName: 'Good RSS', sourceDomain: 'good.example',
      healthStatus: 'healthy', failureCount: 0, latestErrorSummary: null,
    };
    const issues = buildRootCauseIssues({ market: market([]), marketNews: [failed, healthy], shariahJobs: [], reminderRuns: [] });
    expect(issues).toEqual([]);
  });

  it('surfaces a failed Shariah research job with both first and last occurrence', () => {
    const issues = buildRootCauseIssues({
      market: market([]),
      marketNews: [],
      shariahJobs: [{ id: 'job-1', status: 'failed', currentStep: 'extracting_financial_data', progress: 40, createdAt: '2026-07-10T00:00:00.000Z', completedAt: '2026-07-10T00:05:00.000Z', errorCode: 'SOURCE_UNAVAILABLE' }],
      reminderRuns: [],
    });
    expect(issues[0]).toMatchObject({ firstOccurrence: '2026-07-10T00:00:00.000Z', lastOccurrence: '2026-07-10T00:05:00.000Z', retryAvailable: true });
  });

  it('keeps only the latest reminder outcome per run type so a recovered schedule does not remain an active warning', () => {
    const issues = buildRootCauseIssues({
      market: market([]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [
        { id: 'run-new', runType: 'scheduled', status: 'completed', startedAt: '2026-07-11T00:00:00.000Z', finishedAt: '2026-07-11T00:01:00.000Z', emailSentCount: 5, emailFailedCount: 0, message: null },
        { id: 'run-old', runType: 'scheduled', status: 'failed', startedAt: '2026-07-10T00:00:00.000Z', finishedAt: '2026-07-10T00:01:00.000Z', emailSentCount: 2, emailFailedCount: 3, message: 'smtp_not_configured' },
      ],
    });
    expect(issues).toEqual([]);
  });

  it('surfaces the latest failed subscription-reminder run but never marks it retry-available', () => {
    const issues = buildRootCauseIssues({
      market: market([]),
      marketNews: [],
      shariahJobs: [],
      reminderRuns: [
        { id: 'run-new', runType: 'scheduled', status: 'failed', startedAt: '2026-07-11T00:00:00.000Z', finishedAt: '2026-07-11T00:01:00.000Z', emailSentCount: 2, emailFailedCount: 3, message: 'smtp_not_configured' },
        { id: 'run-old', runType: 'scheduled', status: 'failed', startedAt: '2026-07-10T00:00:00.000Z', finishedAt: '2026-07-10T00:01:00.000Z', emailSentCount: 0, emailFailedCount: 5, message: 'smtp_not_configured' },
      ],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ id: 'reminder_run:run-new', affectedFeature: 'email', retryAvailable: false });
  });
});
