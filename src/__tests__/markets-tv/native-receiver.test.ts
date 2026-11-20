import { afterEach, describe, expect, it, vi } from 'vitest';
import { directoryLocation, parsePair, parsePortfolio, portfolioDisplayValue, readDirectory, request } from '../../../apps/markets-tv-native/src/receiverApi';
import { portfolioStatusLabel, r } from '../../../apps/markets-tv-native/src/receiverCopy';
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
  it('preserves distinct holding identities and independent market and FX evidence', () => {
    const observed = '2026-11-08T05:50:00Z', fxAt = '2026-11-07T16:00:00Z';
    const row = { currency: 'KWD', generatedAt: new Date(now).toISOString(), totalValue: 150, total: 2, valueCoverage: 2,
      positions: [
        { id: 'holding-a', name: 'My first holding', symbol: 'AMD', value: { amount: 400, currency: 'USD' }, baseValue: 120,
          valuationKind: 'market', quoteStatus: 'delayed', freshness: 'recorded', source: 'Quote provider', valuedAt: observed, fxSource: 'FX provider', fxAt },
        { id: 'holding-b', name: 'My second holding', symbol: 'AMD', value: { amount: 100, currency: 'USD' }, baseValue: 30,
          valuationKind: 'recorded', freshness: 'stale', source: 'Saved source', valuedAt: '2026-09-01T00:00:00Z', valuationIssue: 'quote_unavailable' },
      ] };
    const original = JSON.stringify(row), data = parsePortfolio(row);
    expect(data.positions).toMatchObject([
      { id: 'holding-a', name: 'My first holding', symbol: 'AMD', amount: 400, currency: 'USD', baseValue: 120,
        valuationKind: 'market', quoteStatus: 'delayed', source: 'Quote provider', valuedAt: observed, fxSource: 'FX provider', fxAt },
      { id: 'holding-b', name: 'My second holding', valuationKind: 'recorded', valuationIssue: 'quote_unavailable', source: 'Saved source' },
    ]);
    expect(portfolioDisplayValue(data.positions[0], data.currency)).toEqual({ amount: 120, currency: 'KWD' });
    expect(data.generatedAt).not.toBe(data.positions[0].valuedAt);
    expect(data.positions[0].valuedAt).not.toBe(data.positions[0].fxAt);
    expect(JSON.stringify(row)).toBe(original);
  });
  it.each(['USD', 'USDT'])('keeps an unconverted %s value out of the base-currency total', currency => {
    const data = parsePortfolio({ currency: 'KWD', generatedAt: new Date(now).toISOString(), totalValue: null, valueCoverage: 0,
      positions: [{ id: 'one', name: 'Unconverted holding', value: { amount: 400, currency }, baseValue: null,
        valuationKind: 'market', quoteStatus: 'closed', source: 'Close provider', valuedAt: '2026-11-06T21:00:00Z', valuationIssue: 'fx_unavailable' }] });
    expect(data).toMatchObject({ totalValue: null, valueCoverage: 0, positions: [{ amount: 400, currency, baseValue: null, valuationIssue: 'fx_unavailable', fxSource: null, fxAt: null }] });
    expect(portfolioDisplayValue(data.positions[0], data.currency)).toEqual({ amount: 400, currency });
    expect(portfolioStatusLabel('en', data.positions[0])).toBe('Market values · Last close');
  });
  it('falls back to a known base amount without inventing a missing original currency', () => {
    const data = parsePortfolio({ currency: 'KWD', generatedAt: new Date(now).toISOString(), positions: [
      { id: 'base-only', name: 'Saved base amount', value: null, baseValue: 0, freshness: 'recorded' },
      { id: 'missing-currency', name: 'Unknown unit', value: { amount: 25 }, baseValue: null },
    ] });
    expect(portfolioDisplayValue(data.positions[0], data.currency)).toEqual({ amount: 0, currency: 'KWD' });
    expect(portfolioDisplayValue(data.positions[1], data.currency)).toEqual({ amount: 25, currency: null });
    expect(data.positions[0].valuationKind).toBe('recorded');
  });
  it.each([
    ['ar', 'قيم سوقية · بيانات متأخرة', 'تقييم يدوي · تقييم قديم', 'قيمة مسجلة'],
    ['en', 'Market values · Delayed data', 'Manual valuation · Older valuation', 'Recorded value'],
    ['fr', 'Valeurs de marché · Données différées', 'Valorisation manuelle · Valorisation ancienne', 'Valeur enregistrée'],
  ] as const)('labels market, manual and legacy recorded valuations accurately in %s', (language, market, manual, recorded) => {
    const position = { id: 'one', name: 'Holding', value: { amount: 10, currency: 'KWD' }, baseValue: 10, freshness: 'recorded' };
    const data = parsePortfolio({ currency: 'KWD', generatedAt: new Date(now).toISOString(), positions: [
      { ...position, valuationKind: 'market', quoteStatus: 'delayed' },
      { ...position, valuationKind: 'manual', freshness: 'stale' },
      position,
    ] });
    expect(data.positions.map(value => portfolioStatusLabel(language, value))).toEqual([market, manual, recorded]);
    expect(r(language, 'portfolioSync')).not.toMatch(/live|direct|لحظي/i);
  });
  it('does not promote absent or unrecognized quote status to available', () => {
    const data = parsePortfolio({ currency: 'KWD', generatedAt: new Date(now).toISOString(), positions: [
      { id: 'cached', name: 'Cached value', value: { amount: 10, currency: 'KWD' }, valuationKind: 'market', quoteStatus: 'cached' },
      { id: 'no-status', name: 'No status', value: { amount: 10, currency: 'KWD' }, valuationKind: 'market' },
      { id: 'missing', name: 'No valuation', value: null, valuationKind: 'manual' },
    ] });
    expect(data.positions.slice(0, 2).map(value => value.quoteStatus)).toEqual([null, null]);
    expect(data.positions.slice(0, 2).map(value => portfolioStatusLabel('en', value))).toEqual(['Market values · Delay unverified', 'Market values · Delay unverified']);
    expect(portfolioStatusLabel('en', data.positions[2])).toBe('Manual valuation · Valuation unavailable');
  });
  it('crosses market boundaries and wraps without requesting nonexistent pages', () => {
    const markets = [{ id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 7 }, { id: 'global', group: 'global', labelAr: 'العالم', labelEn: 'World', labelFr: 'Monde', count: 6 }];
    expect(directoryLocation(markets, 2)).toMatchObject({ market: markets[0], page: 2, total: 5 });
    expect(directoryLocation(markets, 3)).toMatchObject({ market: markets[1], page: 0 });
    expect(directoryLocation(markets, 5)).toMatchObject({ market: markets[0], page: 0 });
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
