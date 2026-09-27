import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FmpRateLimitError } from '@/lib/trader/providers/fmpRuntime';

const mocks = vi.hoisted(() => ({
  fmpQueuedFetch: vi.fn(),
  globalFetch: vi.fn(),
}));

vi.mock('@/lib/trader/providers/fmpRuntime.server', () => ({
  fmpQueuedFetch: (...args: unknown[]) => mocks.fmpQueuedFetch(...args),
}));

describe('FMP dividend requests', () => {
  beforeEach(() => {
    mocks.fmpQueuedFetch.mockReset();
    mocks.globalFetch.mockReset();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubGlobal('fetch', mocks.globalFetch);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('reports an active shared cooldown without trying the legacy calendar endpoint', async () => {
    mocks.fmpQueuedFetch.mockRejectedValue(new FmpRateLimitError());
    const { getFmpDividendCalendar } = await import('@/lib/market/fmpDividends');

    const result = await getFmpDividendCalendar({ from: '2026-07-01', to: '2026-07-31' });

    expect(mocks.fmpQueuedFetch).toHaveBeenCalledTimes(1);
    expect(String(mocks.fmpQueuedFetch.mock.calls[0]?.[0])).toContain('/stable/dividends-calendar');
    expect(mocks.globalFetch).not.toHaveBeenCalled();
    expect(result.events).toEqual([]);
    expect(result.diagnostics).toMatchObject({
      status: 'rate_limited',
      responseStatus: 429,
      attempts: [expect.objectContaining({ status: 'rate_limited', responseStatus: 429 })],
    });
  });

  it('does not fall back to the legacy symbol endpoint after an FMP 429 response', async () => {
    mocks.fmpQueuedFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'rate limit reached' }), { status: 429 }));
    const { getFmpDividendsForSymbol } = await import('@/lib/market/fmpDividends');

    const result = await getFmpDividendsForSymbol('AAPL');

    expect(mocks.fmpQueuedFetch).toHaveBeenCalledTimes(1);
    expect(String(mocks.fmpQueuedFetch.mock.calls[0]?.[0])).toContain('/stable/dividends');
    expect(mocks.globalFetch).not.toHaveBeenCalled();
    expect(result.diagnostics).toMatchObject({
      status: 'rate_limited',
      responseStatus: 429,
      attempts: [expect.objectContaining({ status: 'rate_limited', responseStatus: 429 })],
    });
  });
});
