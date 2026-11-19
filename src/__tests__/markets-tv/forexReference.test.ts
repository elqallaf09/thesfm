import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
// Deliberately bypass Next's cache, as happens when nested in the quote cache.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/server/twelve-data-fetch', () => ({ twelveDataFetch: vi.fn(), TWELVE_RETRY_HEADER: 'x-sfm-provider-retry-at' }));
import { __resetForexReferenceForTests, dailyForexReference, forexReferenceQuote, isCurrentReferenceDate, parseForexReferenceTable } from '@/lib/server/markets-tv/forexReference';
import { __resetTvInstrumentReferenceForTests, forexTvQuote, referenceForexQuote } from '@/lib/server/markets-tv/instruments';
import { twelveDataFetch } from '@/lib/server/twelve-data-fetch';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';

const now = Date.parse('2026-11-19T10:00:00Z');
const date = '2026-11-19';
const asset = (symbol: string): TvAsset => ({ symbol, name: symbol, baseCurrency: symbol.split('/')[0], currency: symbol.split('/')[1], region: 'FOREX' });
const rows = () => [
  { base: 'USD', quote: 'USD', date, rate: 1 },
  { base: 'USD', quote: 'AED', date, rate: 4 },
  { base: 'USD', quote: 'KWD', date, rate: 0.3 },
  { base: 'USD', quote: 'KRW', date, rate: 1400 },
];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  __resetForexReferenceForTests();
  __resetTvInstrumentReferenceForTests();
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('daily Forex reference fallback', () => {
  it('converts both directions using the same dated table and labels references honestly', () => {
    const table = parseForexReferenceTable(rows());
    expect(forexReferenceQuote(asset('AED/KWD'), table)).toMatchObject({
      price: 0.075, currency: 'KWD', source: 'Frankfurter · reference', observedAt: date,
      status: 'reference', delayType: 'eod', changeBasis: 'reference', changePercent: null,
      observation: { precision: 'date', marketOpen: null },
    });
    expect(forexReferenceQuote(asset('KWD/AED'), table)?.price).toBeCloseTo(1 / 0.075);
    expect(forexReferenceQuote(asset('AED/KRW'), table)?.price).toBe(350);
  });

  it('rejects unknown currencies, mismatched identity and different observation dates', () => {
    const table = parseForexReferenceTable(rows());
    expect(forexReferenceQuote(asset('AED/XYZ'), table)).toBeNull();
    expect(forexReferenceQuote({ ...asset('AED/KWD'), currency: 'USD' }, table)).toBeNull();
    expect(forexReferenceQuote({ ...asset('AED/KWD'), baseCurrency: 'EUR' }, table)).toBeNull();
    expect(forexReferenceQuote(asset('AED/KWD'), { ...table, KWD: { ...table.KWD, date: '2026-11-18' } })).toBeNull();
  });

  it('rejects malformed, missing, future and expired dates without substituting fetch time', () => {
    for (const bad of [null, '', '2026-02-30', '2026-11-20', '2026-11-11', '2026-11-19T00:00:00Z']) {
      expect(isCurrentReferenceDate(bad)).toBe(false);
      const payload = rows().map(row => row.quote === 'KWD' ? { ...row, date: bad } : row);
      expect(forexReferenceQuote(asset('AED/KWD'), parseForexReferenceTable(payload))).toBeNull();
    }
    const table = parseForexReferenceTable(rows());
    vi.setSystemTime(now + 8 * 86_400_000);
    expect(forexReferenceQuote(asset('AED/KWD'), table)).toBeNull();
  });

  it('rejects malformed rates, wrong base tables, conflicts and overflow', () => {
    for (const rate of [0, -1, NaN, Infinity, null, '0.3']) {
      expect(parseForexReferenceTable([...rows().slice(0, 2), { base: 'USD', quote: 'KWD', date, rate }]).KWD).toBeUndefined();
    }
    expect(() => parseForexReferenceTable({ rates: rows() })).toThrow('INVALID_FOREX_REFERENCE');
    expect(() => parseForexReferenceTable(rows().map(row => ({ ...row, base: 'EUR' })))).toThrow('EMPTY_FOREX_REFERENCE');
    expect(parseForexReferenceTable([...rows(), { ...rows()[2], rate: 0.4 }]).KWD).toBeUndefined();
    expect(forexReferenceQuote(asset('AED/KWD'), { AED: { date, rate: Number.MIN_VALUE }, KWD: { date, rate: Number.MAX_VALUE } })).toBeNull();
  });

  it('coalesces concurrent pairs and caches successful tables even when Next caching is bypassed', async () => {
    const fetch = vi.fn().mockResolvedValue(json(rows()));
    vi.stubGlobal('fetch', fetch);
    const values = await Promise.all(Array.from({ length: 12 }, (_, index) => dailyForexReference(asset(index % 2 ? 'KWD/AED' : 'AED/KWD'))));
    expect(values.every(value => value?.status === 'reference')).toBe(true);
    await dailyForexReference(asset('AED/KRW'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe('https://api.frankfurter.dev/v2/rates?base=USD');
    vi.setSystemTime(now + 3600_001);
    fetch.mockResolvedValue(json(rows()));
    await dailyForexReference(asset('AED/KWD'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('backs off failed reference fetches while preserving an actual still-valid dated table', async () => {
    const fetch = vi.fn().mockResolvedValue(json(rows()));
    vi.stubGlobal('fetch', fetch);
    await dailyForexReference(asset('AED/KWD'));
    vi.setSystemTime(now + 3600_001);
    fetch.mockResolvedValue(json({ error: 'unavailable' }, 503));
    expect(await dailyForexReference(asset('AED/KWD'))).toMatchObject({ observedAt: date, price: 0.075 });
    await dailyForexReference(asset('AED/KRW'));
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.setSystemTime(now + 8 * 86_400_000);
    expect(await dailyForexReference(asset('AED/KWD'))).toBeNull();
  });

  it('backs off errors before any successful reference is available', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ error: 'unavailable' }, 503));
    vi.stubGlobal('fetch', fetch);
    expect(await dailyForexReference(asset('AED/KWD'))).toBeNull();
    expect(await dailyForexReference(asset('AED/KRW'))).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 60_001);
    fetch.mockResolvedValue(json(rows()));
    expect((await dailyForexReference(asset('AED/KWD')))?.price).toBe(0.075);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('Forex provider fallback integration', () => {
  const retryAt = '2026-11-19T10:01:00.000Z';
  const ecb = `<Cube><Cube time="${date}"><Cube currency="USD" rate="1.2"/><Cube currency="GBP" rate="0.8"/></Cube></Cube>`;
  function setup() {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'synthetic-key');
    vi.mocked(twelveDataFetch).mockImplementation(async () => new Response(JSON.stringify({ code: 429, status: 'error' }), {
      status: 429, headers: { 'x-sfm-provider-retry-at': retryAt },
    }));
    const fetch = vi.fn().mockImplementation(async (url: string) => String(url).includes('ecb.europa.eu') ? new Response(ecb) : json(rows()));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('fills AED/KWD during primary cooldown and keeps retry time separate from source date', async () => {
    const fetch = setup();
    const quote = await forexTvQuote(asset('AED/KWD'));
    expect(quote).toMatchObject({ price: 0.075, observedAt: date, source: 'Frankfurter · reference', status: 'reference', retryAt });
    expect(quote.issue).toBeUndefined();
    await forexTvQuote(asset('AED/KRW'));
    expect(fetch.mock.calls.filter(([url]) => String(url).includes('frankfurter.dev'))).toHaveLength(1);
    expect(fetch.mock.calls.filter(([url]) => String(url).includes('ecb.europa.eu'))).toHaveLength(1);
  });

  it('preserves ECB for covered pairs without fetching the broader source', async () => {
    const fetch = setup();
    const quote = await forexTvQuote(asset('GBP/USD'));
    expect(quote).toMatchObject({ observedAt: date, source: 'ECB · reference', status: 'reference', retryAt });
    expect(quote.price).toBeCloseTo(1.5);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves the original failure when no source covers the pair', async () => {
    setup();
    expect(await forexTvQuote(asset('AED/XYZ'))).toMatchObject({ price: null, status: 'unavailable', issue: 'rate_limited', retryAt });
  });

  it('uses the broader reference table when ECB is unavailable', async () => {
    const fetch = setup();
    fetch.mockImplementation(async (url: string) => String(url).includes('ecb.europa.eu') ? json({}, 503) : json(rows()));
    expect(await forexTvQuote(asset('AED/KWD'))).toMatchObject({ price: 0.075, source: 'Frankfurter · reference' });
  });

  it('returns a ready broader reference within the quote budget despite a slow primary and ECB', async () => {
    const fetch = setup();
    vi.mocked(twelveDataFetch).mockImplementation(() => new Promise((_resolve, reject) => {
      setTimeout(() => reject(new DOMException('Timed out', 'TimeoutError')), 4000);
    }));
    fetch.mockImplementation(async (url: string) => String(url).includes('ecb.europa.eu')
      ? new Promise<Response>(resolve => { setTimeout(() => resolve(new Response(ecb)), 5000); })
      : json(rows()));
    const result = forexTvQuote(asset('AED/KWD'));
    await vi.advanceTimersByTimeAsync(4100);
    expect(await result).toMatchObject({ price: 0.075, source: 'Frankfurter · reference', observedAt: date });
    expect(Date.now() - now).toBe(4100);
    expect(fetch.mock.calls.filter(([url]) => String(url).includes('frankfurter.dev'))).toHaveLength(1);
  });

  it('does not let a quick unavailable broader response hide a delayed valid ECB reference', async () => {
    const fetch = setup();
    fetch.mockImplementation(async (url: string) => String(url).includes('ecb.europa.eu')
      ? new Promise<Response>(resolve => { setTimeout(() => resolve(new Response(ecb)), 250); })
      : json({}, 503));
    const result = forexTvQuote(asset('GBP/USD'));
    await vi.advanceTimersByTimeAsync(250);
    expect(await result).toMatchObject({ source: 'ECB · reference', observedAt: date, status: 'reference' });
  });

  it('rejects invalid ECB dates, units and prices too', () => {
    for (const invalidDate of ['2026-02-30', '2026-11-20', '2026-11-11']) {
      expect(referenceForexQuote(asset('GBP/USD'), [{ date: invalidDate, rates: { GBP: 0.8, USD: 1.2 } }]).price).toBeNull();
    }
    expect(referenceForexQuote({ ...asset('GBP/USD'), currency: 'KWD' }, [{ date, rates: { GBP: 0.8, USD: 1.2 } }]).price).toBeNull();
    expect(referenceForexQuote(asset('GBP/USD'), [{ date, rates: { GBP: Number.MIN_VALUE, USD: Number.MAX_VALUE } }]).price).toBeNull();
  });
});
