import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  aggregateFinancialNews: vi.fn(),
  requireAdminApiAccess: vi.fn(),
}));

vi.mock('@/lib/market-news/engine', () => ({
  aggregateFinancialNews: mocks.aggregateFinancialNews,
}));

vi.mock('@/lib/server/adminAccess', () => ({
  requireAdminApiAccess: mocks.requireAdminApiAccess,
}));

function aggregation() {
  return {
    stories: [],
    total: 0,
    page: 1,
    pageSize: 60,
    totalPages: 1,
    appliedFilters: {},
    providerCoverage: [],
    partialFailure: false,
    liveUpdatesAvailable: true,
    storedFallbackUsed: false,
    lastUpdated: null,
    lastSuccessfulUpdate: '2026-10-30T03:00:00.000Z',
    cacheStatus: 'miss' as const,
    searchDurationMs: 10,
    warnings: [],
  };
}

describe('/api/market-news/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'market-news-test-secret');
    mocks.aggregateFinancialNews.mockResolvedValue(aggregation());
    mocks.requireAdminApiAccess.mockResolvedValue({ ok: false, status: 401, code: 'UNAUTHORIZED' });
  });

  it('bounds every external provider window below the function deadline', async () => {
    const { GET } = await import('@/app/api/market-news/ingest/route');
    const response = await GET(new Request('https://example.com/api/market-news/ingest', {
      headers: { authorization: 'Bearer market-news-test-secret' },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, batchCount: 4, completedBatches: 4, failedBatches: 0 });
    expect(mocks.requireAdminApiAccess).not.toHaveBeenCalled();
    expect(mocks.aggregateFinancialNews).toHaveBeenCalledTimes(4);
    for (const [, options] of mocks.aggregateFinancialNews.mock.calls) {
      expect(options).toMatchObject({
        mode: 'ingest',
        forceExternal: true,
        providerBudgetMs: 12_000,
      });
    }
  });

  it('returns a truthful partial result before the platform deadline when persistence stalls', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    mocks.aggregateFinancialNews.mockImplementation(() => {
      callCount += 1;
      return callCount <= 2 ? Promise.resolve(aggregation()) : new Promise(() => {});
    });

    try {
      const { GET } = await import('@/app/api/market-news/ingest/route');
      const responsePromise = GET(new Request('https://example.com/api/market-news/ingest', {
        headers: { authorization: 'Bearer market-news-test-secret' },
      }));
      await vi.advanceTimersByTimeAsync(45_000);
      const response = await responsePromise;
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        code: 'NEWS_INGESTION_PARTIAL',
        batchCount: 4,
        completedBatches: 2,
        failedBatches: 2,
        deadlineExceeded: true,
      });
      expect(mocks.aggregateFinancialNews).toHaveBeenCalledTimes(4);
      for (const [params] of mocks.aggregateFinancialNews.mock.calls) {
        expect(params.signal).toBeInstanceOf(AbortSignal);
        expect(params.signal.aborted).toBe(true);
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
