import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TV_GULF_BANKS } from '@/lib/markets-tv/gulfBankQuote';
import type { TvQuote } from '@/lib/markets-tv/types';
const { afterTasks, quoteCache } = vi.hoisted(() => ({
  afterTasks: [] as Array<() => Promise<void>>,
  quoteCache: new Map<string, TvQuote>(),
}));
vi.mock('next/server', () => ({ after: (work: () => Promise<void>) => { afterTasks.push(work); } }));
vi.mock('@/lib/server/markets-tv/quoteCache', () => ({ cachedTvQuote: async (key: string, read: () => Promise<TvQuote>) => {
  const cached = quoteCache.get(key); if (cached) return cached;
  const quote = await read(); if (quote.price !== null) quoteCache.set(key, quote); return quote;
} }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/world-stocks/providerQuote', () => ({ providerStockQuote: vi.fn().mockResolvedValue({ price: null, issue: 'rate_limited' }) }));
const now = Date.parse('2026-11-06T22:00:00Z');
const assets = TV_GULF_BANKS.map(bank => ({ ...bank, name: bank.ticker, assetType: 'stock' as const }));
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); afterTasks.length = 0; quoteCache.clear(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('keeps the 6.5s UI deadline and completes slow cold recovery after the response', async () => {
  let finish!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal('fetch', fetch);
  const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
  const coldRequest = resolveTvQuotes(assets, 'gulf');
  await vi.advanceTimersByTimeAsync(6500);
  expect((await coldRequest).map(q => q.issue)).toEqual(['timeout', 'timeout', 'timeout']);
  expect(afterTasks).toHaveLength(3);
  const background = Promise.all(afterTasks.map(work => work()));
  await vi.advanceTimersByTimeAsync(7500);
  finish(Response.json({ data: TV_GULF_BANKS.map(bank => ({ s: `${bank.exchange}:${bank.ticker}`,
    d: [bank.ticker, 'Test bank', bank.exchange, 'stock', bank.currency, .5, 0, (now - 86400000) / 1000, bank.isin, 'delayed_streaming_900', 'out_of_session'] })) }));
  await background;
  const warm = await resolveTvQuotes(assets, 'gulf');
  expect(warm.map(q => q.price)).toEqual([.5, .5, .5]); expect(fetch).toHaveBeenCalledTimes(1);
  expect(warm.every(q => q.status === 'closed' && q.observedAt === '2026-11-05T22:00:00.000Z')).toBe(true);
});
