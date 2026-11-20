import { describe, expect, it } from 'vitest';
import { normalizeYahooChartHistory } from '@/lib/market/fetchYahooHistory';
import { isTvExternalIndex, tvIndexSessionClosed, tvIndexSessionPoints, verifiedTvIndex } from '@/lib/markets-tv/indexChart';

const now = Date.parse('2026-11-06T15:00:00Z');
function data(overrides: Record<string, unknown> = {}) {
  const payload = { chart: { result: [{ meta: {
    symbol: '^GDAXI', currency: 'EUR', instrumentType: 'INDEX', regularMarketTime: now / 1000,
    regularMarketPrice: 23000, previousClose: 22800, chartPreviousClose: 10000, ...overrides,
  }, timestamp: [now / 1000], indicators: { quote: [{ close: [23000] }] } }] } };
  return normalizeYahooChartHistory(payload, { symbol: '^GDAXI', providerSymbol: '^GDAXI', assetType: 'index', period: '1d', interval: '5m' });
}
describe('TV external cash-index evidence', () => {
  it('requires the exact index and preserves its source clock and point unit', () => {
    const row = verifiedTvIndex('^GDAXI', data(), now)!;
    expect(row.quote).toMatchObject({ symbol: '^GDAXI', price: 23000, currency: null, source: 'Yahoo Finance',
      observedAt: '2026-11-06T15:00:00.000Z', status: 'delayed' });
    expect(row.quote.changePercent).toBeCloseTo(200 / 22800 * 100);
    expect(isTvExternalIndex('DAX')).toBe(false);
    expect(isTvExternalIndex('SPY')).toBe(false);
  });
  it.each([
    { instrumentType: 'ETF', regularMarketPrice: 44.72 }, { symbol: 'DAX' },
    { currency: 'USD' }, { instrumentType: undefined }, { regularMarketPrice: 0 },
    { regularMarketTime: now / 1000 + 120 }, { regularMarketTime: now / 1000 - 11 * 86400 },
  ])('rejects unverified identity or timestamps: %j', meta => {
    expect(verifiedTvIndex('^GDAXI', data(meta), now)).toBeNull();
  });
  it('does not invent a daily change from a chart-range baseline', () => {
    expect(verifiedTvIndex('^GDAXI', data({ previousClose: undefined }), now)?.quote.changePercent).toBeNull();
  });
  it('keeps old observations explicitly stale', () => {
    expect(verifiedTvIndex('^GDAXI', data({ regularMarketTime: now / 1000 - 3600 }), now)?.quote.status).toBe('stale');
  });
});
describe('New York intraday session bars', () => {
  it('uses UTC instants, latest session only, sorted and deduplicated, excluding future and out-of-hours bars', () => {
    const result = tvIndexSessionPoints([
      { date: '2026-11-05T20:55:00Z', close: 7000 },
      { date: '2026-11-06T14:25:00Z', close: 7001 },
      { date: '2026-11-06T14:35:00Z', close: 7003 },
      { date: '2026-11-06T14:30:00Z', close: 7002 },
      { date: '2026-11-06T14:35:00Z', close: 7004 },
      { date: '2026-11-06T15:05:00Z', close: 7005 },
      { date: 'bad', close: 7006 }, { date: '2026-11-06T14:40:00Z', close: NaN },
    ], now);
    expect(result).toEqual({ sessionDate: '2026-11-06', points: [
      { at: '2026-11-06T14:30:00.000Z', price: 7002 }, { at: '2026-11-06T14:35:00.000Z', price: 7004 },
    ] });
  });
  it('handles summer DST and rejects weekend bars', () => {
    const summer = Date.parse('2026-07-06T15:00:00Z');
    expect(tvIndexSessionPoints([
      { date: '2026-07-04T13:30:00Z', close: 1 },
      { date: '2026-07-06T13:30:00Z', close: 2 }, { date: '2026-07-06T13:35:00Z', close: 3 },
    ], summer).points).toHaveLength(2);
  });
});

describe('TV external cash-index coverage for quota-paused primaries', () => {
  function index(symbol: string, currency: string, overrides: Record<string, unknown> = {}) {
    const payload = { chart: { result: [{ meta: {
      symbol, currency, instrumentType: 'INDEX', regularMarketTime: now / 1000,
      regularMarketPrice: 1000, previousClose: 990, ...overrides,
    }, timestamp: [now / 1000], indicators: { quote: [{ close: [1000] }] } }] } };
    return normalizeYahooChartHistory(payload, { symbol, providerSymbol: symbol, assetType: 'index', period: '1d', interval: '5m' });
  }
  it.each([
    ['^DJI', 'USD', 'US'], ['^FTSE', 'GBP', 'GB'], ['^N225', 'JPY', 'JP'],
  ])('verifies %s with its own currency and country', (symbol, currency, country) => {
    expect(isTvExternalIndex(symbol)).toBe(true);
    expect(verifiedTvIndex(symbol as never, index(symbol, currency), now)?.quote)
      .toMatchObject({ symbol, price: 1000, currency: null, country, source: 'Yahoo Finance', status: 'delayed' });
  });
  it.each([
    ['^FTSE', 'GBp'], ['^FTSE', 'USD'], ['^N225', 'USD'], ['^DJI', 'EUR'],
  ])('rejects %s quoted in %s rather than relabelling it', (symbol, currency) => {
    expect(verifiedTvIndex(symbol as never, index(symbol, currency), now)).toBeNull();
  });
  it('keeps ETF and futures aliases out of the external index path', () => {
    for (const alias of ['DIA', 'EWU', 'EWJ', 'YM=F', 'NKD=F', 'DJI', 'FTSE', 'N225']) expect(isTvExternalIndex(alias)).toBe(false);
  });
  it('labels a closed-session observation as dated, never as live', () => {
    const quote = verifiedTvIndex('^N225' as never, index('^N225', 'JPY', { regularMarketTime: now / 1000 - 6 * 3600 }), now)!.quote;
    expect(quote.status).toBe('stale');
    expect(quote.observedAt).toBe(new Date(now - 6 * 3600_000).toISOString());
  });
});

describe('TV index session status', () => {
  const session = (start: number, end: number) => ({ currentTradingPeriod: { regular: { start: start / 1000, end: end / 1000 } } });
  it('marks an index closed after its session ends, keeping the closing clock', () => {
    // DAX closed at 16:30 UTC; the last value is 16:35 and it is now 15:00 the next day.
    const close = Date.parse('2026-11-05T16:35:00Z'), later = Date.parse('2026-11-06T15:00:00Z');
    const quote = verifiedTvIndex('^GDAXI', data({ regularMarketTime: close / 1000, ...session(Date.parse('2026-11-05T08:00:00Z'), Date.parse('2026-11-05T16:30:00Z')) }), later)!.quote;
    expect(quote).toMatchObject({ status: 'closed', observedAt: new Date(close).toISOString(), observation: { marketOpen: false } });
  });
  it('accepts a closing value a few minutes before Yahoo marks the session end', () => {
    expect(tvIndexSessionClosed({ start: now - 25_000_000, end: now - 3_600_000 }, now - 3_720_000, now)).toBe(true);
    expect(tvIndexSessionClosed({ start: now - 25_000_000, end: now - 3_600_000 }, now - 7_200_000, now)).toBe(false);
  });
  it('marks a value from before the next session as closed while it waits to open', () => {
    expect(tvIndexSessionClosed({ start: now + 3_600_000, end: now + 30_000_000 }, now - 36_000_000, now)).toBe(true);
  });
  it('never claims closed during a session or without a session clock', () => {
    expect(tvIndexSessionClosed({ start: now - 3_600_000, end: now + 3_600_000 }, now - 60_000, now)).toBe(false);
    expect(tvIndexSessionClosed(undefined, now - 36_000_000, now)).toBe(false);
    expect(verifiedTvIndex('^GDAXI', data({ regularMarketTime: now / 1000 - 600, ...session(now - 3_600_000, now + 3_600_000) }), now)!.quote.status).toBe('delayed');
  });
  it('still flags a week-old close as stale', () => {
    const close = now - 8 * 86_400_000;
    expect(verifiedTvIndex('^GDAXI', data({ regularMarketTime: close / 1000, ...session(close - 30_000_000, close - 60_000) }), now)!.quote.status).toBe('stale');
  });
});
