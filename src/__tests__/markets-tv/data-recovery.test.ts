import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/server/market-provider-cooldown', () => ({ readTwelveDataCooldown: vi.fn().mockResolvedValue(null), publishTwelveDataCooldown: vi.fn().mockResolvedValue(undefined) }));
const now = Date.parse('2026-10-28T05:15:00Z');
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now);
  for (const key of ['TWELVE_DATA_API_KEY', 'FINNHUB_API_KEY', 'EODHD_API_KEY', 'MARKETSTACK_API_KEY', 'FMP_API_KEY']) vi.stubEnv(key, '');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('TV source recovery integration', () => {
  it('prefers the proven US source, preserves the close timestamp, and falls back with the same identity if it fails', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'test-td'); vi.stubEnv('FINNHUB_API_KEY', 'test-fh');
    const observedAt = '2026-10-27T20:00:00.000Z';
    const fetch = vi.fn().mockImplementation(async input => {
      const url = new URL(String(input));
      if (url.pathname === '/api/v1/stock/market-status') return Response.json({ exchange: 'US', isOpen: false, t: now / 1000 });
      if (url.hostname === 'finnhub.io') return Response.json({ c: 200, pc: 198, dp: 1.01, t: Date.parse(observedAt) / 1000 });
      throw new Error('Unexpected additional price provider');
    }); vi.stubGlobal('fetch', fetch);
    const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
    const asset = { symbol: 'AMZN', name: 'Amazon', currency: 'USD', region: 'US', country: 'US', assetType: 'stock' as const };
    const [quote] = await resolveTvQuotes([asset], 'us');
    expect(quote).toMatchObject({ symbol: 'AMZN', currency: 'USD', source: 'Finnhub', price: 200, status: 'closed', observedAt, receivedAt: new Date(now).toISOString() });
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.setSystemTime(now + 60_000);
    fetch.mockImplementation(async input => {
      const url = new URL(String(input));
      if (url.hostname === 'finnhub.io') return Response.json({ c: 0 });
      expect(url.hostname).toBe('api.twelvedata.com'); expect(url.searchParams.get('symbol')).toBe('AMZN');
      return Response.json({ symbol: 'AMZN', currency: 'USD', close: '201', previous_close: '198', last_quote_at: Date.parse(observedAt) / 1000, is_market_open: false });
    });
    const before = fetch.mock.calls.length;
    const [fallback] = await resolveTvQuotes([{ symbol: 'AMZN', name: 'Amazon', currency: 'USD', region: 'US', country: 'US' }], 'us');
    expect(new URL(fetch.mock.calls[before][0]).hostname).toBe('finnhub.io');
    expect(fallback).toMatchObject({ symbol: 'AMZN', currency: 'USD', price: 201, source: 'Twelve Data', status: 'closed', observedAt });
  });
  it('maps verified international index symbols with MIC lock and refuses a mismatched listing', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'test-td');
    const fetch = vi.fn().mockImplementation(async input => {
      const url = new URL(String(input)), symbol = url.searchParams.get('symbol');
      expect(symbol).not.toMatch(/^\^/);
      return Response.json({ symbol, mic_code: symbol === 'FTSE' ? 'XLON' : 'WRONG', currency: 'GBP', close: 8500,
        last_quote_at: Date.parse('2026-10-27T16:30:00Z') / 1000, is_market_open: false });
    }); vi.stubGlobal('fetch', fetch);
    const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
    const rows = await resolveTvQuotes([{ symbol: '^FTSE', name: 'FTSE 100', assetType: 'index' }, { symbol: '^GDAXI', name: 'DAX', assetType: 'index' }], 'global');
    expect(rows[0]).toMatchObject({ symbol: '^FTSE', price: 8500, source: 'Twelve Data', status: 'closed', observedAt: '2026-10-27T16:30:00.000Z' });
    expect(rows[1].price).toBeNull(); expect(fetch).toHaveBeenCalledTimes(2);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('mic_code')).toBe('XLON');
  });
  it('returns one truthful Gulf cooldown without fetching a directory or repeating ten quota failures', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'test-td');
    const fetch = vi.fn().mockImplementation(async () => Response.json({ code: 429, status: 'error', message: 'limit per minute reached' }, { status: 429 })); vi.stubGlobal('fetch', fetch);
    const { loadTvSnapshot } = await import('@/lib/server/markets-tv/snapshot');
    const snapshot = await loadTvSnapshot('gulf', [], { scene: 'gulf' });
    expect(snapshot.retryAt).toBe('2026-10-28T05:16:01.000Z');
    expect([...snapshot.summary!, ...snapshot.quotes].map(quote => ({symbol: quote.symbol, price: quote.price, issue: quote.issue, retryAt: quote.retryAt}))).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: 'KFH.KW', price: null, issue: 'rate_limited', retryAt: snapshot.retryAt })]));
    expect([...snapshot.summary!, ...snapshot.quotes].filter(quote => quote.price !== null || quote.issue !== 'rate_limited' || quote.retryAt !== snapshot.retryAt)).toEqual([]);
    expect(fetch.mock.calls.length).toBeLessThanOrEqual(2);
    const again = await loadTvSnapshot('gulf', [], { scene: 'gulf' });
    expect(again.retryAt).toBe(snapshot.retryAt); expect(fetch.mock.calls.length).toBeLessThanOrEqual(2);
  });
  it('keeps healthy Binance refreshing when indices are blocked and chooses the first blocked retry otherwise', async () => {
    const { tvSnapshotRetryAt } = await import('@/lib/server/markets-tv/quoteAvailability');
    const { emptyInstrument } = await import('@/lib/server/markets-tv/instruments');
    const missing = { ...emptyInstrument({ symbol: '^GSPC', name: 'S&P' }, 'rate_limited'), retryAt: new Date(now + 60_000).toISOString() };
    const later = { ...missing, symbol: '^DJI', retryAt: new Date(now + 120_000).toISOString() };
    const bitcoin = { ...missing, symbol: 'BTC/USDT', currency: 'USDT', price: 100, issue: undefined, retryAt: undefined };
    expect(tvSnapshotRetryAt([missing, later], now)).toBe(missing.retryAt);
    expect(tvSnapshotRetryAt([missing, bitcoin], now)).toBeUndefined();
    expect(tvSnapshotRetryAt([{ ...missing, price: 6000 }, later], now)).toBe(missing.retryAt);
  });
});
