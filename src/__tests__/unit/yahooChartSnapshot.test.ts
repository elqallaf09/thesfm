import { describe, expect, it } from 'vitest';
import { parseYahooChartSnapshot } from '@/lib/trader/yahooChartSnapshot';

const time = (value: string) => Date.parse(value) / 1000;
const payload = (meta = {}, timestamps = [time('2026-09-17T13:30:00Z'), time('2026-09-18T13:30:00Z')]) => ({
  chart: { result: [{ meta: { symbol: 'HUBS', longName: 'HubSpot, Inc.', regularMarketPrice: 216.12,
    chartPreviousClose: 513.10, regularMarketTime: time('2026-09-18T20:00:00Z'), gmtoffset: -14400,
    regularMarketVolume: 456789, marketCap: 12000000000, ...meta }, timestamp: timestamps,
    indicators: { quote: [{ close: [215, 216.12], volume: [123, 456789] }] } }] },
});
describe('Yahoo daily quote snapshot', () => {
  it('uses the prior daily session, never the yearly chart baseline', () => {
    const quote = parseYahooChartSnapshot(payload())!;
    expect(quote.previousClose).toBe(215);
    expect((quote.price! / quote.previousClose! - 1) * 100).toBeCloseTo(0.52, 2);
    expect(quote).toMatchObject({ name: 'HubSpot, Inc.', volume: 456789, marketCap: 12000000000 });
  });
  it('prefers an explicit daily close and preserves reported zero volume', () => {
    expect(parseYahooChartSnapshot(payload({ previousClose: 214, regularMarketVolume: 0 }))?.previousClose).toBe(214);
    expect(parseYahooChartSnapshot(payload({ regularMarketVolume: 0 }))?.volume).toBe(0);
  });
  it('leaves daily change unavailable if only a range baseline or old bars exist', () => {
    expect(parseYahooChartSnapshot(payload({}, []))?.previousClose).toBeNull();
    expect(parseYahooChartSnapshot(payload({}, [time('2026-01-01T13:30:00Z')]))?.previousClose).toBeNull();
  });
  it('uses the exchange day when UTC dates cross midnight', () => {
    const quote = parseYahooChartSnapshot(payload({ regularMarketTime: time('2026-09-18T01:00:00Z'), gmtoffset: 32400 },
      [time('2026-09-17T01:00:00Z'), time('2026-09-18T00:00:00Z')]))!;
    expect(quote.previousClose).toBe(215);
  });
});
