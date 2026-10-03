import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketSystemState } from '@/lib/market-state/types';

const createServerSupabaseAdmin = vi.fn();
const getMarketSystemState = vi.fn();
const getMarketNewsAdminProviderStatus = vi.fn();
const computeShariahCounts = vi.fn();
const getOperationalServiceHealth = vi.fn();
const getCalendarHealthMeasurement = vi.fn();

vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args) }));
vi.mock('@/lib/market-state/aggregateMarketState', () => ({ getMarketSystemState: (...args: unknown[]) => getMarketSystemState(...args) }));
vi.mock('@/lib/market-news/persistence', () => ({ getMarketNewsAdminProviderStatus: (...args: unknown[]) => getMarketNewsAdminProviderStatus(...args) }));
vi.mock('@/lib/market/shariahAdminCatalog', () => ({ computeShariahCounts: (...args: unknown[]) => computeShariahCounts(...args) }));
vi.mock('@/lib/admin/opsCenter/serviceHealth', () => ({ getOperationalServiceHealth: (...args: unknown[]) => getOperationalServiceHealth(...args) }));
vi.mock('@/lib/admin/opsCenter/calendarHealth', () => ({ getCalendarHealthMeasurement: (...args: unknown[]) => getCalendarHealthMeasurement(...args) }));

function healthyMarketState(): MarketSystemState {
  return {
    generatedAt: '2026-07-11T00:00:00.000Z',
    overall: 'connected',
    providers: {},
    capabilityMatrix: [
      { provider: 'fmp', capability: 'quotes', status: 'connected', configured: true, healthy: true, lastSuccessAt: '2026-07-11T00:00:00.000Z', lastErrorAt: null, lastErrorReason: null, rateLimitedUntil: null, nextRetryAt: null, latencyMs: 120 },
    ],
    providerProfiles: [
      { provider: 'fmp', role: 'primary', status: 'connected', configured: true, latencyMs: 120, successRatePercent: 100, lastSuccessAt: '2026-07-11T00:00:00.000Z', lastErrorAt: null, rateLimitedUntil: null },
    ],
    configuration: null,
    featuresSucceeded: ['quotes'],
    featuresDegraded: [],
    featuresFailed: [],
    catalog: { discovered: 100, metadataAvailable: 100, liveQuoteAvailable: null, delayedQuoteAvailable: null, staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: '2026-07-11T00:00:00.000Z' },
    lastSynchronizedAt: '2026-07-11T00:00:00.000Z',
  };
}

function emptyQuery(error: { message: string } | null = null) {
  const chain: Record<string, unknown> = {};
  const result = { data: [], error };
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.then = (resolve: (value: typeof result) => void) => resolve(result);
  return chain;
}

function mockAdminClient() {
  return { from: (_table: string) => emptyQuery() };
}

describe('getOperationsCenterState', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerSupabaseAdmin.mockReset().mockReturnValue(mockAdminClient());
    getMarketSystemState.mockReset().mockResolvedValue(healthyMarketState());
    getMarketNewsAdminProviderStatus.mockReset().mockResolvedValue({ providers: [], available: true, generatedAt: '2026-07-11T00:00:00.000Z' });
    computeShariahCounts.mockReset().mockResolvedValue({ compliant: 5, non_compliant: 2, needs_review: 1, unclassified: 0 });
    getOperationalServiceHealth.mockReset().mockResolvedValue({
      ai_services: { status: 'unmeasured', detailKey: null },
      notifications: { status: 'unmeasured', detailKey: null },
      storage: { status: 'healthy', detailKey: null, evidence: [{ source: 'supabase', scope: 'runtime', checkedAt: '2026-07-11T00:00:00.000Z', lastSuccessAt: '2026-07-11T00:00:00.000Z', reasonKey: null, reason: null }] },
    });
    getCalendarHealthMeasurement.mockReset().mockResolvedValue({ status: 'unmeasured', detailKey: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('preserves measured successes and distinguishes missing observations from active incidents', async () => {
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.overview.overall).toBe('unmeasured');
    expect(state.overview.criticalIssueCount).toBe(0);
    expect(state.overview.warningCount).toBe(0);
    expect(state.degradedSources).toEqual({});
    expect(state.overview.measurementGapCount).toBeGreaterThan(0);
    expect(state.featureHealth.find(row => row.feature === 'storage')?.status).toBe('healthy');
  });

  it('reports overall critical and surfaces a provider root-cause issue when a capability cell is disconnected with a real error reason', async () => {
    const disconnected = healthyMarketState();
    disconnected.overall = 'disconnected';
    disconnected.capabilityMatrix = [
      { ...disconnected.capabilityMatrix[0], status: 'disconnected', lastErrorReason: 'provider_temporarily_unavailable', lastErrorAt: '2026-07-11T00:05:00.000Z' },
    ];
    disconnected.featuresFailed = ['quotes'];
    disconnected.featuresSucceeded = [];
    getMarketSystemState.mockResolvedValue(disconnected);

    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.overview.overall).toBe('critical');
    expect(state.overview.criticalIssueCount).toBe(1);
    expect(state.errorCenter.byCategory.provider.filter(issue => issue.kind !== 'measurement_gap')).toHaveLength(1);
  });

  it('identifies the failed database read without losing other measurements when Shariah counts reject', async () => {
    computeShariahCounts.mockRejectedValue(new Error('supabase_timeout'));
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.degradedSources.shariah).toContain('supabase_timeout');
    expect(state.shariah.counts).toEqual({ compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 });
    // Market-derived sections stay intact despite the Shariah failure.
    expect(state.overview.overall).toBe('degraded');
    expect(state.market.overall).toBe('connected');
    expect(state.featureHealth.find(row => row.feature === 'market_data')?.status).toBe('unmeasured');
    expect(state.featureHealth.find(row => row.feature === 'market_data')?.evidence).toContainEqual(expect.objectContaining({ capability: 'quotes', status: 'healthy' }));
    const database = state.featureHealth.find(row => row.feature === 'database');
    expect(database?.status).toBe('partial');
    expect(database?.evidence).toContainEqual(expect.objectContaining({ source: 'ops_center_source_database_shariah_catalog', status: 'failed', reason: 'supabase_timeout', checkedAt: expect.any(String), lastSuccessAt: null }));
    expect(database?.evidence).toContainEqual(expect.objectContaining({ source: 'sharia_research_jobs', status: 'healthy', lastSuccessAt: expect.any(String) }));
  });

  it('does not blame a market-provider collection failure on database reads that succeeded', async () => {
    getMarketSystemState.mockRejectedValue(new Error('upstream_unavailable'));
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.degradedSources.market).toBe('upstream_unavailable');
    expect(state.featureHealth.find(row => row.feature === 'database')?.status).toBe('healthy');
  });

  it('marks AI usage unavailable when the quota read fails instead of displaying a measured zero', async () => {
    createServerSupabaseAdmin.mockReturnValue({ from: (table: string) => emptyQuery(table === 'ai_usage_limits' ? { message: 'quota_read_failed token=private-value' } : null) });
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.degradedSources.aiUsage).toContain('quota_read_failed');
    expect(state.degradedSources.aiUsage).not.toContain('private-value');
    expect(state.featureHealth.find(row => row.feature === 'database')?.evidence).toContainEqual(expect.objectContaining({ source: 'ai_usage_events / ai_usage_limits', status: 'failed' }));
  });

  it('degrades the admin-only sections (never crashes) when no Supabase admin client is configured', async () => {
    createServerSupabaseAdmin.mockReturnValue(null);
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.degradedSources.shariah).toBeTruthy();
    expect(state.degradedSources.shariahJobs).toBeTruthy();
    expect(state.degradedSources.subscriptionReminders).toBeTruthy();
    expect(state.degradedSources.aiUsage).toBeTruthy();
    expect(state.backgroundJobs.shariahResearch.recent).toEqual([]);
    expect(state.featureHealth.find(row => row.feature === 'database')?.status).toBe('failed');
  });

  it('never fabricates a background-job-queue count — genericQueue is always explicitly not-instrumented', async () => {
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.backgroundJobs.genericQueue.instrumented).toBe(false);
    expect(state.performance.cacheHitRate.instrumented).toBe(false);
    expect(state.performance.apiRouteTiming.instrumented).toBe(false);
    expect(state.aiUsage.healthScore.instrumented).toBe(false);
  });

  it('reads real Node process telemetry for uptime/memory (process-level, not fabricated)', async () => {
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.performance.processUptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(state.performance.memory.rssBytes).toBeGreaterThan(0);
  });
});
