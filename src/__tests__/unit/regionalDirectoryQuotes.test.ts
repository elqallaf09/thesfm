import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const quote = (overrides: Record<string, unknown> = {}) => ({ symbol: '1010', mic_code: 'XSAU', currency: 'SAR', close: '31.8', percent_change: '0.5', change: '0.2', timestamp: Date.now() / 1000 - 3600, ...overrides });
beforeEach(() => { vi.resetModules(); vi.stubEnv('TWELVE_DATA_API_KEY', 'test-server-key'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('keeps MIC-qualified identity, quote time and shared requests without exposing credentials', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(quote())); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryQuote } = await import('@/lib/server/regionalDirectoryQuotes');
  const first = getRegionalDirectoryQuote('TD:XSAU:1010');
  expect(getRegionalDirectoryQuote('TD:XSAU:1010')).toBe(first);
  const result = await first;
  expect(result).toMatchObject({ symbol: 'TD:XSAU:1010', available: true, price: 31.8, source: 'Twelve Data' });
  expect(result.asOf).toMatch(/^20/);
  expect(JSON.stringify(result)).not.toContain('test-server-key');
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('mic_code')).toBe('XSAU');
  await getRegionalDirectoryQuote('TD:XSAU:1010');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([{ mic_code: 'XNAS' }, { currency: 'USD' }, { symbol: '1020' }, { timestamp: null }, { close: null }, { close: true }])('withholds an invalid or mismatched observation %j', async overrides => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(quote(overrides))));
  const { getRegionalDirectoryQuote } = await import('@/lib/server/regionalDirectoryQuotes');
  expect(await getRegionalDirectoryQuote('TD:XSAU:1010')).toMatchObject({ available: false, price: null });
});
it('does not relabel old observations as current prices', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(quote({ timestamp: Date.now() / 1000 - 8 * 86400 }))));
  const { getRegionalDirectoryQuote } = await import('@/lib/server/regionalDirectoryQuotes');
  expect(await getRegionalDirectoryQuote('TD:XSAU:1010')).toMatchObject({ available: false, price: null, unavailableReason: 'provider_stale_quote' });
});
it('bounds simultaneous requests and stops queued calls after a 429', async () => {
  const fetch = vi.fn().mockImplementation(async () => Response.json({ status: 'error', code: 429 }, { status: 429 })); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryQuote } = await import('@/lib/server/regionalDirectoryQuotes');
  const results = await Promise.all(Array.from({ length: 24 }, (_, i) => getRegionalDirectoryQuote(`TD:XSAU:${1010 + i}`)));
  expect(fetch.mock.calls.length).toBeLessThanOrEqual(3);
  expect(results.every(row => row.unavailableReason === 'provider_rate_limited')).toBe(true);
});
it('an exchange entitlement failure does not block another exchange', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ status: 'error', code: 403 }, { status: 403 })).mockResolvedValueOnce(Response.json(quote({ symbol: 'QNBK', mic_code: 'DSMD', currency: 'QAR' })));
  vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryQuote } = await import('@/lib/server/regionalDirectoryQuotes');
  expect(await getRegionalDirectoryQuote('TD:XSAU:1010')).toMatchObject({ unavailableReason: 'provider_access_required' });
  expect(await getRegionalDirectoryQuote('TD:DSMD:QNBK')).toMatchObject({ available: true });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('makes no upstream request when credentials are unavailable', async () => {
  vi.stubEnv('TWELVE_DATA_API_KEY', ''); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryQuote } = await import('@/lib/server/regionalDirectoryQuotes');
  expect(await getRegionalDirectoryQuote('TD:XSAU:1010')).toMatchObject({ unavailableReason: 'provider_not_configured' });
  expect(fetch).not.toHaveBeenCalled();
});
