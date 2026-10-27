import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => storage }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: vi.fn() }));
vi.mock('@/lib/world-stocks/providerQuote', () => ({ providerStockQuote: vi.fn() }));

import { ownedTvData } from '@/lib/server/markets-tv/devices';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import { resolveTvQuotes } from '@/lib/server/markets-tv/quoteLoader';
import { tvWatchlistAssets } from '@/lib/server/markets-tv/watchlistAssets';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { TvSnapshot } from '@/lib/markets-tv/types';

function table(data: Record<string, unknown>[]) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error: null }) };
}
const displayed = (snapshot: TvSnapshot) => [...(snapshot.summary ?? []), ...snapshot.quotes];
const fallback = (currency: string): SfmMarketQuote => ({ symbol: 'BTC/USD', assetType: 'crypto', price: 100,
  currency, quality: { state: 'complete' }, provenance: { upstreamProvider: 'finnhub',
    providerSymbol: 'BINANCE:BTCUSDT', delayType: 'delayed', observedAt: new Date().toISOString() } } as SfmMarketQuote);

beforeEach(() => {
  const watchlist = table([{ symbol: 'BTC/USDT' }, { symbol: 'BTCUSDT' }]);
  const alerts = table([]);
  storage.from.mockImplementation(name => name === 'market_watchlist' ? watchlist : alerts);
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify([
    { symbol: 'BTCUSDT', lastPrice: '65000', priceChangePercent: '1.5', closeTime: Date.now(), count: 1000 },
  ]), { status: 200, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe('owned TV crypto watchlist denominations', () => {
  it.each([undefined, 'watchlist'] as const)('uses the exact Binance pair through the owned list and %s scene', async scene => {
    const owned = await ownedTvData('owner-1');
    expect(owned.symbols).toEqual(['BTC/USDT', 'BTCUSDT']);
    expect(storage.from.mock.results[0].value.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    const snapshot = await loadTvSnapshot('watchlist', owned.symbols, scene ? { scene } : {});
    const quotes = displayed(snapshot);
    expect(quotes.map(quote => quote.symbol)).toEqual(owned.symbols);
    expect(quotes).toHaveLength(2);
    for (const quote of quotes) expect(quote).toMatchObject({ price: 65000, currency: 'USDT',
      exchange: 'BINANCE', source: 'Binance Spot · 24h', changeBasis: '24h', status: 'available' });
    expect(getSfmMarketQuote).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(request.origin + request.pathname).toBe('https://data-api.binance.vision/api/v3/ticker/24hr');
    expect(JSON.parse(request.searchParams.get('symbols')!)).toEqual(['BTCUSDT']);
  });

  it.each([429, 503])('keeps USDT unavailable on Binance HTTP %s without substituting a USD fallback', async status => {
    vi.mocked(fetch).mockResolvedValue(new Response('unavailable', { status }));
    vi.mocked(getSfmMarketQuote).mockResolvedValue(fallback('USD'));
    const owned = await ownedTvData('owner-1');
    const snapshot = await loadTvSnapshot('watchlist', owned.symbols, { scene: 'watchlist' });
    for (const quote of displayed(snapshot)) expect(quote).toMatchObject({ price: null, currency: 'USDT',
      status: 'unavailable', issue: status === 429 ? 'rate_limited' : 'provider_unavailable', observedAt: null });
    expect(getSfmMarketQuote).not.toHaveBeenCalled();
  });

  it('does not infer a Binance pair from bare tickers, an unknown base, or a USD pair', () => {
    const symbols = ['BTC', 'AAPL', 'AAPLUSDT', 'BTC/USD', 'BTC-USD', 'BTCUSDT.L'];
    expect(tvWatchlistAssets(symbols)).toEqual(symbols.map(symbol => ({ symbol, name: symbol })));
  });

  it.each(['BTC/USDT', 'BTCUSDT'])('rejects generic USD evidence for %s even without asset currency metadata', async symbol => {
    vi.mocked(getSfmMarketQuote).mockResolvedValue(fallback('USD'));
    const [quote] = await resolveTvQuotes([{ symbol, name: symbol }], 'watchlist');
    expect(quote).toMatchObject({ symbol, price: null, status: 'unavailable', issue: 'identity_mismatch' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts matching USDT evidence in the generic identity check', async () => {
    vi.mocked(getSfmMarketQuote).mockResolvedValue(fallback('USDT'));
    const [quote] = await resolveTvQuotes([{ symbol: 'BTCUSDT', name: 'Bitcoin' }], 'watchlist');
    expect(quote).toMatchObject({ symbol: 'BTCUSDT', price: 100, currency: 'USDT', status: 'delayed' });
  });
});
