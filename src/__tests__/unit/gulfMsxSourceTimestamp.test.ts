import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDelayedGulfMarketData,
  gulfMarketDataToApiMarkets,
  parseMsxOfficialSourceMetadata,
} from '@/lib/gulf/fetchGulfIndexData';

const NOW = new Date('2026-09-27T23:00:00.000Z').getTime();

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function msxPayload(overrides: Record<string, unknown> = {}) {
  return {
    d: [{
      DateEn: 'Sep 28, 2026',
      TimeEn: '02:13 AM',
      DelayTimeEn: '01:58 AM',
      StatusEn: 'Closed',
      MSX30: '7,543.592',
      Change: '-0.140',
      ChangeValue: '-10.534',
      ...overrides,
    }],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('MSX official source timestamps', () => {
  it('normalizes the official delayed observation time, source report time, delay, and status', () => {
    const result = parseMsxOfficialSourceMetadata(msxPayload().d[0], NOW);

    expect(result).toEqual({
      ok: true,
      metadata: {
        sourceAsOf: '2026-09-27T21:58:00.000Z',
        sourceReportedAt: '2026-09-27T22:13:00.000Z',
        sourceDelayMinutes: 15,
        sourceStatus: 'Closed',
      },
    });
  });

  it('rejects missing, invalid, and stale official source observation times', () => {
    expect(parseMsxOfficialSourceMetadata(msxPayload({ DelayTimeEn: null }).d[0], NOW)).toEqual({
      ok: false,
      unavailableReason: 'official_source_time_missing',
    });
    expect(parseMsxOfficialSourceMetadata(msxPayload({ DateEn: 'not a date' }).d[0], NOW)).toEqual({
      ok: false,
      unavailableReason: 'official_source_time_invalid',
    });
    expect(parseMsxOfficialSourceMetadata(msxPayload({ DateEn: 'Aug 1, 2026' }).d[0], NOW)).toEqual({
      ok: false,
      unavailableReason: 'official_source_time_stale',
    });
  });

  it('keeps official MSX provenance through the Gulf API payload', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => (
      String(input).includes('msx.om') ? response(msxPayload()) : response('', 503)
    )));

    const marketData = await fetchDelayedGulfMarketData();
    const oman = marketData.oman;
    const apiOman = gulfMarketDataToApiMarkets(marketData).find(market => market.code === 'OM');

    expect(oman).toMatchObject({
      available: true,
      source: 'Muscat Stock Exchange',
      marketTime: '2026-09-27T21:58:00.000Z',
      updatedAt: '2026-09-27T21:58:00.000Z',
      sourceAsOf: '2026-09-27T21:58:00.000Z',
      sourceReportedAt: '2026-09-27T22:13:00.000Z',
      sourceDelayMinutes: 15,
      sourceStatus: 'Closed',
    });
    expect(apiOman).toMatchObject({
      sourceAsOf: '2026-09-27T21:58:00.000Z',
      sourceReportedAt: '2026-09-27T22:13:00.000Z',
      sourceDelayMinutes: 15,
      sourceStatus: 'Closed',
    });
  });

  it('does not substitute a fallback quote with server time when MSX has no source observation time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('msx.om')) return response(msxPayload({ DelayTimeEn: null }));
      if (url.includes('mubasher.info')) return response('<div class="market-summary__last-price">7,543.59</div>');
      return response('', 503);
    });
    vi.stubGlobal('fetch', fetchMock);

    const marketData = await fetchDelayedGulfMarketData();

    expect(marketData.oman).toMatchObject({
      available: false,
      value: null,
      marketTime: null,
      unavailableReason: 'official_source_time_missing',
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('markets/MSM'))).toBe(false);
  });
});
