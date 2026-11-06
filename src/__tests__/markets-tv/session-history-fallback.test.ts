import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { fmp, external } = vi.hoisted(() => ({ fmp: vi.fn(), external: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/trader/providers/fmpRuntime.server', () => ({ fmpQueuedFetch: fmp }));
vi.mock('@/lib/server/markets-tv/indexFallback', () => ({ loadTvExternalIndex: external }));
const now = Date.parse('2026-11-06T15:00:00Z');
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('FMP_API_KEY', 'test-only'); fmp.mockReset(); external.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
it('draws real session bars from the external source after FMP denies access', async () => {
  fmp.mockResolvedValue(new Response('', { status: 403 }));
  external.mockResolvedValue({ quote: { source: 'Yahoo Finance', receivedAt: new Date(now).toISOString() }, history: [
    { date: '2026-11-06T14:30:00Z', close: 7001 }, { date: '2026-11-06T14:35:00Z', close: 7002 },
  ] });
  const { loadTvSessionHistory } = await import('@/lib/server/markets-tv/history');
  const result = await loadTvSessionHistory();
  expect(result).toMatchObject({ symbol: '^GSPC', source: 'Yahoo Finance', sessionDate: '2026-11-06' });
  expect(result.points).toHaveLength(2); expect(result.issue).toBeUndefined();
});
it('keeps FMP when it supplies a usable session', async () => {
  fmp.mockResolvedValue(Response.json([{ date: '2026-11-06 09:30:00', close: 7001 }, { date: '2026-11-06 09:35:00', close: 7002 }]));
  const { loadTvSessionHistory } = await import('@/lib/server/markets-tv/history');
  expect((await loadTvSessionHistory()).source).toBe('Financial Modeling Prep');
  expect(external).not.toHaveBeenCalled();
});
it('never manufactures a chart when neither source supplies two valid points', async () => {
  fmp.mockResolvedValue(new Response('', { status: 403 })); external.mockResolvedValue(null);
  const { loadTvSessionHistory } = await import('@/lib/server/markets-tv/history');
  expect(await loadTvSessionHistory()).toMatchObject({ points: [], issue: 'access_denied' });
});
