import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDelayedGulfMarketData,
  gulfMarketDataToApiMarkets,
  validateGulfSourceTimestamp,
} from '@/lib/gulf/fetchGulfIndexData';

const NOW = Date.parse('2026-09-28T00:00:00.000Z');

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function yahooQuote(timestamp: number | null) {
  return {
    quoteResponse: {
      result: [{
        symbol: '^DJBH',
        longName: 'Dow Jones Bahrain Index',
        currency: 'BHD',
        regularMarketPrice: 1895.32,
        regularMarketChange: 3.1,
        regularMarketChangePercent: 0.16,
        regularMarketTime: timestamp,
      }],
    },
  };
}

function stubBahrainFallbacks(timestamp: number | null) {
  const fetchMock = vi.fn(async (input: string | URL) => {
    const url = String(input);
    if (url.includes('bahrainbourse.com')) return response('Attention Required', 403);
    if (url.includes('mubasher.info')) return response('<div class="market-summary__last-price">1,900.00</div>');
    if (url.includes('DJBH')) return response(yahooQuote(timestamp));
    return response({}, 503);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Gulf source timestamp guard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it.each([
    [null, 'provider_source_time_missing'],
    ['', 'provider_source_time_missing'],
    ['not-a-source-timestamp', 'provider_source_time_invalid'],
    ['2026-09-28T00:06:00.000Z', 'provider_source_time_future'],
  ])('rejects an unavailable, malformed, or future source time: %s', (timestamp, unavailableReason) => {
    expect(validateGulfSourceTimestamp(timestamp, NOW)).toEqual({ ok: false, unavailableReason });
  });

  it('uses the upstream Yahoo timestamp after skipping an untimestamped Bahrain fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const sourceTimestamp = Math.floor((NOW - 60_000) / 1000);
    const fetchMock = stubBahrainFallbacks(sourceTimestamp);

    const marketData = await fetchDelayedGulfMarketData();

    expect(marketData.bahrain).toMatchObject({
      available: true,
      source: 'Yahoo Finance',
      value: 1895.32,
      marketTime: '2026-09-27T23:59:00.000Z',
      updatedAt: '2026-09-27T23:59:00.000Z',
      sourceAsOf: '2026-09-27T23:59:00.000Z',
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('mubasher.info'))).toBe(true);
  });

  it.each([
    [null, 'provider_source_time_missing'],
    [Math.floor((NOW + 6 * 60_000) / 1000), 'provider_source_time_future'],
  ])('withholds Bahrain index values when Yahoo has no trustworthy source time', async (timestamp, unavailableReason) => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    stubBahrainFallbacks(timestamp);

    const marketData = await fetchDelayedGulfMarketData();
    const apiMarket = gulfMarketDataToApiMarkets(marketData).find(market => market.code === 'BH');

    expect(marketData.bahrain).toMatchObject({
      available: false,
      value: null,
      change: null,
      changePercent: null,
      marketTime: null,
      unavailableReason,
    });
    expect(apiMarket).toMatchObject({
      available: false,
      value: null,
      marketTime: null,
      sourceAsOf: null,
    });
  });
});
