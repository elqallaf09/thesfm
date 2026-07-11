import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketSystemState } from '@/lib/market-state/types';

const createServerSupabaseAdmin = vi.fn();
const getMarketSystemState = vi.fn();
const getMarketNewsAdminProviderStatus = vi.fn();
const computeShariahCounts = vi.fn();

vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args) }));
vi.mock('@/lib/market-state/aggregateMarketState', () => ({ getMarketSystemState: (...args: unknown[]) => getMarketSystemState(...args) }));
vi.mock('@/lib/market-news/persistence', () => ({ getMarketNewsAdminProviderStatus: (...args: unknown[]) => getMarketNewsAdminProviderStatus(...args) }));
vi.mock('@/lib/market/shariahAdminCatalog', () => ({ computeShariahCounts: (...args: unknown[]) => computeShariahCounts(...args) }));

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

function emptyQuery() {
  const chain: Record<string, unknown> = {};
  const result = { data: [], error: null };
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports overall healthy with zero issues for a fully healthy fixture and no degraded sources', async () => {
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.overview.overall).toBe('healthy');
    expect(state.overview.criticalIssueCount).toBe(0);
    expect(state.overview.warningCount).toBe(0);
    expect(state.degradedSources).toEqual({});
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
    expect(state.errorCenter.byCategory.provider).toHaveLength(1);
  });

  it('degrades only the Shariah section (never throws, never blanks the rest) when computeShariahCounts rejects', async () => {
    computeShariahCounts.mockRejectedValue(new Error('supabase_timeout'));
    const { getOperationsCenterState } = await import('@/lib/admin/opsCenter/aggregateOperationsCenter');
    const state = await getOperationsCenterState();
    expect(state.degradedSources.shariah).toContain('supabase_timeout');
    expect(state.shariah.counts).toEqual({ compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 });
    // Market-derived sections stay intact despite the Shariah failure.
    expect(state.overview.overall).toBe('healthy');
    expect(state.market.overall).toBe('connected');
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
