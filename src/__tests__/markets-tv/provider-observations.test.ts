import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/world-stocks/providerDirectory', () => ({ getProviderDirectory: vi.fn() }));
const now = Date.parse('2026-10-24T09:00:00Z');
const listing = { providerSymbol: 'NBK', mic: 'XKUW', currency: 'KWD' };
const body = { symbol: 'NBK', mic_code: 'XKUW', currency: 'KWD', close: '1.012', percent_change: '1',
  last_quote_at: Date.parse('2026-10-22T10:00:00Z') / 1000, is_market_open: false };
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv('TWELVE_DATA_API_KEY', 'test-only-key');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('TV exchange-bound provider observations', () => {
  it('preserves source closure and both clocks through shared cache hits', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(body)); vi.stubGlobal('fetch', fetch);
    const { providerStockQuote } = await import('@/lib/world-stocks/providerQuote');
    const [first, parallel] = await Promise.all([
      providerStockQuote('TD_XKUW', 'NBK', listing), providerStockQuote('TD_XKUW', 'NBK', listing),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1); expect(parallel).toEqual(first);
    expect(first).toMatchObject({ price: 1.012, quoteTimestamp: '2026-10-22T10:00:00.000Z', receivedAt: new Date(now).toISOString(),
      observation: { precision: 'instant', marketOpen: false }, delayType: 'eod', delayed: true });
    vi.setSystemTime(now + 10_000);
    expect((await providerStockQuote('TD_XKUW', 'NBK', listing)).receivedAt).toBe(first.receivedAt);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports a denied market without retrying other symbols behind its access restriction', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('Denied by upstream', { status: 403 })); vi.stubGlobal('fetch', fetch);
    const { providerStockQuote } = await import('@/lib/world-stocks/providerQuote');
    expect(await providerStockQuote('TD_XKUW', 'NBK', listing)).toMatchObject({ price: null, quoteTimestamp: null, issue: 'access_denied' });
    expect(await providerStockQuote('TD_XKUW', 'KFH', { ...listing, providerSymbol: 'KFH' })).toMatchObject({ price: null, issue: 'access_denied' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('never reuses a cached quote when the requested currency or MIC changes', async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json(body)); vi.stubGlobal('fetch', fetch);
    const { providerStockQuote } = await import('@/lib/world-stocks/providerQuote');
    expect((await providerStockQuote('TD_XKUW', 'NBK', listing)).price).toBe(1.012);
    expect(await providerStockQuote('TD_XKUW', 'NBK', { ...listing, currency: 'USD' })).toMatchObject({ price: null, issue: 'identity_mismatch' });
    expect(await providerStockQuote('TD_XKUW', 'NBK', { ...listing, mic: 'XNAS' })).toMatchObject({ price: null, issue: 'identity_mismatch' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('retains last good evidence on quota failure without advancing its timestamps', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(body))
      .mockResolvedValueOnce(Response.json({ code: 429, status: 'error' }, { status: 429 })); vi.stubGlobal('fetch', fetch);
    const { providerStockQuote } = await import('@/lib/world-stocks/providerQuote');
    const first = await providerStockQuote('TD_XKUW', 'NBK', listing);
    vi.setSystemTime(now + 301_000);
    const retained = await providerStockQuote('TD_XKUW', 'NBK', listing);
    expect(retained).toMatchObject({ price: first.price, quoteTimestamp: first.quoteTimestamp, receivedAt: first.receivedAt, issue: 'rate_limited', status: 'unavailable' });
    expect(await providerStockQuote('TD_XDFM', 'DIB', { providerSymbol: 'DIB', mic: 'XDFM', currency: 'AED' })).toMatchObject({ price: null, issue: 'rate_limited' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('identifies a missing configuration without issuing a provider request', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', ''); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { providerStockQuote } = await import('@/lib/world-stocks/providerQuote');
    expect(await providerStockQuote('TD_XKUW', 'NBK', listing)).toMatchObject({ price: null, issue: 'not_configured' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
