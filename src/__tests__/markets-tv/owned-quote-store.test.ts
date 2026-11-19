import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { table, admin } = vi.hoisted(() => {
  const table = new Map<string, { payload: unknown; expires_at: string }>();
  const admin = { from: vi.fn(() => {
    let key = '';
    const query = {
      upsert: (row: { cache_key: string; payload: unknown; expires_at: string }) => { table.set(row.cache_key, row); return { abortSignal: async () => ({ error: null }) }; },
      select: () => query,
      eq: (_column: string, value: string) => { key = value; return query; },
      abortSignal: () => query,
      maybeSingle: async () => ({ data: table.get(key) ?? null, error: null }),
    };
    return query;
  }) };
  return { table, admin };
});
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => admin }));
import { __resetOwnedTvQuotesForTests, isOwnableQuote, readOwnedTvQuote, saveOwnedTvQuote } from '@/lib/server/markets-tv/ownedQuoteStore';
import { isCronApiPath, isProtectedApiPath } from '@/lib/auth/accessPolicy';
import type { TvQuote } from '@/lib/markets-tv/types';

const now = Date.parse('2026-11-19T22:10:00Z');
const quote: TvQuote = { symbol: '^DJI', name: 'Dow Jones', nameAr: 'داو جونز', currency: null, price: 49161.52, changePercent: -1.2,
  source: 'Yahoo Finance', observedAt: '2026-11-19T21:59:00.000Z', receivedAt: '2026-11-19T22:00:00.000Z', status: 'delayed',
  exchange: 'DJI', country: 'US', delayType: 'delayed', changeBasis: 'session' };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); table.clear(); admin.from.mockClear(); __resetOwnedTvQuotesForTests(); });
afterEach(() => { vi.useRealTimers(); });

describe('THE SFM owned quote store', () => {
  it('keeps only verified observations', () => {
    expect(isOwnableQuote(quote, now)).toBe(true);
    expect(isOwnableQuote({ ...quote, price: null }, now)).toBe(false);
    expect(isOwnableQuote({ ...quote, source: null }, now)).toBe(false);
    expect(isOwnableQuote({ ...quote, issue: 'rate_limited' }, now)).toBe(false);
    expect(isOwnableQuote({ ...quote, observedAt: null }, now)).toBe(false);
    expect(isOwnableQuote({ ...quote, observedAt: '2026-11-19T23:30:00Z' }, now)).toBe(false);
  });

  it('answers with the original source and clock, labelled stale, never as live', async () => {
    await saveOwnedTvQuote('dji-key', quote);
    vi.setSystemTime(now + 3 * 3_600_000);
    expect(await readOwnedTvQuote('dji-key', '^DJI')).toMatchObject({
      price: 49161.52, source: 'Yahoo Finance', observedAt: quote.observedAt, status: 'stale' });
  });

  it('never answers for another listing or after expiry', async () => {
    await saveOwnedTvQuote('dji-key', quote);
    expect(await readOwnedTvQuote('dji-key', '^GSPC')).toBeNull();
    expect(await readOwnedTvQuote('other-key', '^DJI')).toBeNull();
    vi.setSystemTime(now + 9 * 86_400_000);
    expect(await readOwnedTvQuote('dji-key', '^DJI')).toBeNull();
  });

  it('does not rewrite an unchanged observation', async () => {
    await saveOwnedTvQuote('dji-key', quote);
    await saveOwnedTvQuote('dji-key', { ...quote });
    await saveOwnedTvQuote('dji-key', { ...quote, issue: 'timeout' });
    expect(admin.from).toHaveBeenCalledTimes(1);
  });
});

describe('collector access', () => {
  it('is a protected cron-only route', () => {
    expect(isCronApiPath('/api/tv/collect')).toBe(true);
    expect(isProtectedApiPath('/api/tv/collect')).toBe(true);
    expect(isProtectedApiPath('/api/tv/snapshot')).toBe(false);
  });

  it('refuses to run without the cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret');
    const collect = vi.fn();
    vi.doMock('@/lib/server/markets-tv/collector', () => ({ collectTvCore: collect }));
    const { GET } = await import('@/app/api/tv/collect/route');
    expect((await GET(new Request('https://the-sfm.com/api/tv/collect'))).status).toBe(401);
    expect((await GET(new Request('https://the-sfm.com/api/tv/collect', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    collect.mockResolvedValue([]);
    expect((await GET(new Request('https://the-sfm.com/api/tv/collect', { headers: { authorization: 'Bearer cron-test-secret' } }))).status).toBe(200);
    expect(collect).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });
});
