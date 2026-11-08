import { afterEach, describe, expect, it, vi } from 'vitest';
import { directoryLocation, parsePair, parsePortfolio, readDirectory, request } from '../../../apps/markets-tv-native/src/receiverApi';
const now = Date.parse('2026-11-08T06:00:00Z');
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('native receiver account and directory contracts', () => {
  it('rejects malformed or already-expired pairing credentials', () => {
    const pair = { code: 'ABCDEF123456', secret: 'a'.repeat(64), expiresAt: new Date(now + 600_000).toISOString() };
    expect(parsePair(pair, now)).toEqual(pair);
    for (const change of [{ secret: 'bad' }, { code: '<script>' }, { expiresAt: new Date(now).toISOString() }, { expiresAt: new Date(now + 86400_000).toISOString() }]) {
      expect(() => parsePair({ ...pair, ...change }, now)).toThrow('INVALID_PAIR');
    }
  });
  it('keeps absent portfolio values unknown and rejects malformed account payloads', () => {
    const row = { currency: 'KWD', generatedAt: new Date(now).toISOString(), positions: [{ id: 'one', name: 'Test position', value: null }] };
    expect(parsePortfolio(row)).toMatchObject({ totalValue: null, total: 1, valueCoverage: 0, positions: [{ amount: null, currency: null, freshness: 'missing' }] });
    expect(() => parsePortfolio({ ...row, positions: [{}] })).toThrow('INVALID_POSITION');
    expect(() => parsePortfolio({ ...row, currency: 'unknown' })).toThrow('INVALID_PORTFOLIO');
  });
  it('crosses market boundaries and wraps without requesting nonexistent pages', () => {
    const markets = [{ id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 7 }, { id: 'global', group: 'global', labelAr: 'العالم', labelEn: 'World', labelFr: 'Monde', count: 6 }];
    expect(directoryLocation(markets, 1)).toMatchObject({ market: markets[0], page: 1, total: 3 });
    expect(directoryLocation(markets, 2)).toMatchObject({ market: markets[1], page: 0 });
    expect(directoryLocation(markets, 3)).toMatchObject({ market: markets[0], page: 0 });
    expect(directoryLocation([], 500)).toMatchObject({ market: undefined, page: 0, total: 1 });
  });
  it('pins private requests to SFM, sends device credentials only in headers, and refuses redirects', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ state: 'pending' })); vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal, token = 'b'.repeat(64);
    await request('/api/tv/pair', signal, token);
    expect(fetch).toHaveBeenCalledWith('https://www.the-sfm.com/api/tv/pair', expect.objectContaining({ cache: 'no-store', redirect: 'error', headers: expect.objectContaining({ origin: 'null', 'x-sfm-tv-token': token }) }));
    await expect(request('//external.example/api/test', signal, token)).rejects.toThrow('INVALID_PATH');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('honours Retry-After across manual retries of the same endpoint', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '120' } })); vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    await expect(request('/api/tv/device', signal)).rejects.toMatchObject({ status: 429, retryAfterMs: 120_000 });
    await expect(request('/api/tv/device', signal)).rejects.toMatchObject({ status: 429 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects a response from a different market before rendering its prices', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ group: 'us', market: 'NASDAQ', quotes: [] })));
    await expect(readDirectory({ id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: '', labelEn: '', labelFr: '', count: 1 }, 0, new AbortController().signal)).rejects.toThrow('INVALID_DIRECTORY');
  });
});
