import { describe, expect, it } from 'vitest';
import { normalizeYahooChartHistory } from '@/lib/market/fetchYahooHistory';
import { isTvExternalIndex, tvIndexSessionPoints, verifiedTvIndex } from '@/lib/markets-tv/indexChart';

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
