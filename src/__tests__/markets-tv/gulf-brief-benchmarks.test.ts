import { describe, expect, it, vi } from 'vitest';
import { TV_GULF_CASH_INDICES } from '@/lib/markets-tv/gulfCashIndices';
import { briefMetrics } from '@/lib/markets-tv/obsidian';
import { tvSceneQuoteUnit } from '@/lib/markets-tv/scene-display';
import { verifiedGulfCashIndex, loadTvGulfCashIndex } from '@/lib/server/markets-tv/gulfCashIndexFeed';
import { tvBriefAssets, tvSceneAssets } from '@/lib/server/markets-tv/sceneCatalog';

vi.mock('server-only', () => ({}));
const [kuwait, dubai, qatar] = TV_GULF_CASH_INDICES;
const close = Date.parse('2026-11-19T10:30:00Z');
const now = close + 86_400_000;
const row = (s = kuwait.symbol as string, d: unknown[] = []) => ({ s, d });
const fields: unknown[] = ['BKA', 'KSE', 'index', 8100, -0.5, close / 1000, 'out_of_session', 'delayed_streaming_900'];

describe('regional and world market brief', () => {
  it('puts the four Gulf benchmarks first and keeps the six original cash indices once each', () => {
    const selection = tvBriefAssets();
    expect(selection.slice(0, 4).map(asset => asset.symbol)).toEqual(['KSE:BKA', '^TASI.SR', 'DFM:DFMGI', 'QSE:GNRI']);
    expect(selection.slice(4)).toEqual(tvSceneAssets('overview').summary);
    expect(new Set(selection.map(asset => asset.symbol)).size).toBe(10);
    expect(selection.every(asset => asset.assetType === 'index')).toBe(true);
  });

  it('preserves the dated Kuwait close in points and omits an unreported change from breadth', () => {
    const quote = verifiedGulfCashIndex(kuwait, { data: [row(kuwait.symbol, fields)] }, now)!;
    expect(quote).toMatchObject({ price: 8100, country: 'KW', source: 'TradingView', observedAt: new Date(close).toISOString(),
      receivedAt: new Date(now).toISOString(), status: 'closed', changePercent: -0.5 });
    expect(tvSceneQuoteUnit(quote, 'ar')).toBe('نقطة');
    const noChange = fields.with(4, null);
    const missing = verifiedGulfCashIndex(kuwait, { data: [row(kuwait.symbol, noChange)] }, now)!;
    expect(briefMetrics([missing], now)).toMatchObject({ available: 1, comparable: 0, average: null });
  });

  it('rejects an equity, another venue, missing clocks, stale or conflicting rows', () => {
    for (const invalid of [fields.with(2, 'stock'), fields.with(1, 'QSE'), fields.with(0, 'BKP'),
      fields.with(3, 0), fields.with(5, null), fields.with(5, (now + 3600_000) / 1000),
      fields.with(5, (now - 8 * 86400_000) / 1000)]) {
      expect(verifiedGulfCashIndex(kuwait, { data: [row(kuwait.symbol, invalid)] }, now)).toBeNull();
    }
    const valid = row(kuwait.symbol, fields);
    expect(verifiedGulfCashIndex(kuwait, { data: [valid, valid] }, now)).toBeNull();
    expect(verifiedGulfCashIndex(dubai, { data: [valid] }, now)).toBeNull();
  });

  it('makes one bounded request for the three venues and isolates a missing Qatar reading', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const fetcher = vi.fn(async () => Response.json({ data: [row(kuwait.symbol, fields),
      row(dubai.symbol, ['DFMGI', 'DFM', ...fields.slice(2)])] }));
    vi.stubGlobal('fetch', fetcher);
    try {
      const result = await Promise.all(TV_GULF_CASH_INDICES.map(loadTvGulfCashIndex));
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.map(quote => quote?.country ?? null)).toEqual(['KW', 'AE', null]);
      expect(await loadTvGulfCashIndex(qatar)).toBeNull();
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); vi.useRealTimers(); }
  });
});
