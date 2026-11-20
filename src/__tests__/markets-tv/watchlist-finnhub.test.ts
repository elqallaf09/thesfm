import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { SfmMarketRequest } from '@/lib/sfm-market/engine';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';

const { loadQuote } = vi.hoisted(() => ({ loadQuote: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: loadQuote }));
vi.mock('@/lib/world-stocks/providerQuote', () => ({ providerStockQuote: vi.fn().mockResolvedValue({
  price: null, currency: null, changePercent: null, quoteTimestamp: null, dataSource: null, issue: 'provider_unavailable',
}) }));
vi.mock('@/lib/server/markets-tv/regionalFallback', () => ({ withTvRegionalFallback: (_asset: unknown, primary: Promise<unknown>) => primary }));

const now = Date.parse('2026-11-19T21:57:00Z');
const observedAt = '2026-11-19T21:00:00.000Z';
const receivedAt = '2026-11-19T21:03:00.000Z';
function quote(symbol = 'GE', overrides: Partial<SfmMarketQuote> = {}): SfmMarketQuote {
  return { symbol, name: null, assetType: 'stock', country: null, exchange: null, market: null,
    price: 318.88, currency: 'USD', changePercent: -2.81, quality: { state: 'complete' },
    provenance: { upstreamProvider: 'finnhub', upstreamProviderName: 'Finnhub', providerSymbol: symbol,
      observedAt, receivedAt, delayType: 'delayed' }, ...overrides } as SfmMarketQuote;
}
const asset = (symbol = 'GE'): TvAsset => ({ symbol, name: symbol });
async function resolve(assets = [asset()]) {
  const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
  return resolveTvQuotes(assets, 'watchlist');
}
function state(body: Record<string, unknown> = { exchange: 'US', isOpen: false, t: now / 1000 }, status = 200) {
  const fetch = vi.fn().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv('FINNHUB_API_KEY', 'test-only');
  loadQuote.mockImplementation(async (symbol: string) => quote(symbol));
  state();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('verified Finnhub identities for symbol-only TV watchlists', () => {
  it('restores exact catalog names and the source-reported close with one shared status request', async () => {
    const [ge, htco] = await resolve([asset(), asset('HTCO')]);
    expect(ge).toMatchObject({ name: 'GE Aerospace Common Stock', nameAr: 'GE Aerospace Common Stock',
      country: 'US', exchange: 'NYSE', status: 'closed', observedAt, receivedAt, source: 'Finnhub', price: 318.88 });
    expect(htco).toMatchObject({ name: 'High-Trend International Group', country: 'US', exchange: 'NASDAQ',
      status: 'closed', observedAt, receivedAt });
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(request.hostname + request.pathname).toBe('finnhub.io/api/v1/stock/market-status');
    expect(request.searchParams.get('exchange')).toBe('US');
  });

  it('preserves meaningful provider names and explicit display aliases', async () => {
    loadQuote.mockImplementation(async (symbol: string) => quote(symbol, { name: 'Source company name' }));
    const [named] = await resolve();
    expect(named).toMatchObject({ name: 'Source company name', nameAr: 'Source company name' });
    const [alias] = await resolve([{ ...asset(), name: 'My GE holding', nameAr: 'استثماري في جي إي' }]);
    expect(alias).toMatchObject({ name: 'My GE holding', nameAr: 'استثماري في جي إي' });
  });

  it('preserves provider names for other providers without requesting Finnhub market state', async () => {
    const row = quote();
    loadQuote.mockResolvedValue({ ...row, name: 'GE provider name', provenance: { ...row.provenance, upstreamProvider: 'fmp', upstreamProviderName: 'FMP' } });
    expect((await resolve())[0]).toMatchObject({ name: 'GE provider name', nameAr: 'GE provider name', status: 'stale' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps a recent quote delayed while the verified US market state is open', async () => {
    state({ exchange: 'US', isOpen: true, t: now / 1000 });
    const row = quote();
    const recentAt = new Date(now - 60_000).toISOString();
    loadQuote.mockResolvedValue({ ...row, provenance: { ...row.provenance, observedAt: recentAt } });
    expect((await resolve())[0]).toMatchObject({ status: 'delayed', observedAt: recentAt,
      observation: { precision: 'instant', marketOpen: true }, receivedAt });
  });

  it.each([
    { exchange: 'US', isOpen: false },
    { exchange: 'US', isOpen: false, t: now / 1000 - 3600 },
    { exchange: 'L', isOpen: false, t: now / 1000 },
  ])('retains stale timing when market-state evidence is unverifiable %#', async body => {
    state(body);
    expect((await resolve())[0]).toMatchObject({ status: 'stale', observedAt, receivedAt, price: 318.88 });
  });

  it.each([403, 429])('backs off HTTP %s without manufacturing a closing observation', async status => {
    state({}, status);
    expect((await resolve())[0]).toMatchObject({ status: 'stale', observedAt, price: 318.88 });
    vi.setSystemTime(now + 60_000);
    expect((await resolve())[0]).toMatchObject({ status: 'stale', observedAt, price: 318.88 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('leaves a failed market-state request unknown without losing the last quote', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Request timed out'));
    expect((await resolve())[0]).toMatchObject({ status: 'stale', observedAt, receivedAt, price: 318.88 });
  });

  it('retains stale-on-provider-failure even when the exchange reports closed', async () => {
    const row = quote();
    loadQuote.mockImplementation(async (_symbol: string, request: SfmMarketRequest) => {
      request.onQuoteAttempts?.([{ provider: 'finnhub', code: 'RATE_LIMITED', message: 'limited', category: 'rate_limit', retryable: true,
        retryAt: new Date(now + 60_000).toISOString() }]);
      return { ...row, provenance: { ...row.provenance, cached: true } };
    });
    expect((await resolve())[0]).toMatchObject({ status: 'stale', issue: 'rate_limited', price: 318.88, observedAt, receivedAt });
  });

  it('rejects a supplied listing that contradicts the requested venue before checking market state', async () => {
    loadQuote.mockResolvedValue(quote('GE', { exchange: 'NASDAQ', country: 'US' }));
    expect((await resolve([{ ...asset(), exchange: 'NYSE', country: 'US', currency: 'USD', assetType: 'stock' }]))[0])
      .toMatchObject({ price: null, issue: 'identity_mismatch', status: 'unavailable' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { exchange: 'LSE' }, { exchange: 'NASDAQ' }, { country: 'AE' }, { currency: 'EUR' }, { market: 'NASDAQ_DUBAI' },
  ])('does not classify conflicting supplied metadata as a US close %#', async conflicting => {
    loadQuote.mockResolvedValue(quote('GE', conflicting));
    expect((await resolve())[0].status).toBe('stale');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { exchange: 'LSE' }, { country: 'AE' }, { region: 'NASDAQ_DUBAI' }, { currency: 'EUR' }, { providerSymbol: 'FOREIGN' },
  ])('does not infer US identity over conflicting requested metadata %#', async conflicting => {
    expect((await resolve([{ ...asset(), ...conflicting }]))[0].status).not.toBe('closed');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not infer a US exchange from an unknown bare symbol', async () => {
    expect((await resolve([asset('ZZZTESTSFM')]))[0]).toMatchObject({ name: 'ZZZTESTSFM', country: null, exchange: null, status: 'stale' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves an explicit verified US listing even when it is absent from the bundled catalog', async () => {
    const selected: TvAsset = { ...asset('ZZZTESTSFM'), name: 'Explicit US listing', country: 'US', exchange: 'NASDAQ', currency: 'USD', assetType: 'stock' };
    const [result] = await resolve([selected]);
    expect(result).toMatchObject({ name: selected.name, country: 'US', exchange: 'NASDAQ', status: 'closed', observedAt, receivedAt });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retains the verified class-share spelling for an explicit US listing', async () => {
    const row = quote('BRK.B');
    loadQuote.mockResolvedValue({ ...row, provenance: { ...row.provenance, providerSymbol: 'BRK-B' } });
    const [result] = await resolve([{ ...asset('BRK.B'), country: 'US', exchange: 'NYSE', currency: 'USD', assetType: 'stock' }]);
    expect(result).toMatchObject({ symbol: 'BRK.B', status: 'closed', observedAt, receivedAt });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([{ country: 'AE' }, { market: 'LSE' }])('does not override contradictory source metadata for an explicit uncatalogued US listing %#', async conflicting => {
    loadQuote.mockResolvedValue(quote('ZZZTESTSFM', conflicting));
    const [result] = await resolve([{ ...asset('ZZZTESTSFM'), country: 'US', exchange: 'NASDAQ', currency: 'USD', assetType: 'stock' }]);
    expect(result.status).toBe('stale');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves unknown observation precision even when a timestamp string exists', async () => {
    const row = quote();
    loadQuote.mockResolvedValue({ ...row, provenance: { ...row.provenance, observation: { precision: 'unknown', marketOpen: null } } });
    expect((await resolve())[0]).toMatchObject({ status: 'unknown_time', observedAt: null, receivedAt });
    expect(fetch).not.toHaveBeenCalled();
  });
});
