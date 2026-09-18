import { describe, expect, it } from 'vitest';
import { observationIso, twelveDataObservation } from '@/lib/market/quoteObservation';

describe('source observation timestamps', () => {
  it('uses the last quote event rather than the daily candle opening time', () => {
    const last = Date.parse('2026-09-17T19:59:59Z') / 1000;
    expect(twelveDataObservation({ datetime: '2026-09-17', timestamp: last - 86_399,
      last_quote_at: last, is_market_open: false })).toEqual({
      lastUpdated: '2026-09-17T19:59:59.000Z', delayType: 'eod',
      observation: { precision: 'instant', marketOpen: false },
    });
  });
  it('retains daily precision even if the bar has a Unix opening timestamp', () => {
    expect(twelveDataObservation({ datetime: '2026-09-17', timestamp: 1789603200, is_market_open: true }))
      .toMatchObject({ delayType: 'eod', observation: { precision: 'date', marketOpen: true } });
    expect(twelveDataObservation({ timestamp: 1789603200 }).observation.precision).toBe('date');
  });
  it('handles the requested UTC intraday wall clock without assuming realtime entitlement', () => {
    expect(twelveDataObservation({ datetime: '2026-09-18 14:35:00', is_market_open: true }))
      .toEqual({ lastUpdated: '2026-09-18T14:35:00.000Z', delayType: 'delayed',
        observation: { precision: 'instant', marketOpen: true } });
  });
  it('uses a valid fallback when the precise timestamp is malformed', () => {
    expect(twelveDataObservation({ datetime: '2026-09-17', timestamp: false, last_quote_at: 'bad' }))
      .toMatchObject({ lastUpdated: '2026-09-17T00:00:00.000Z', observation: { precision: 'date', marketOpen: null } });
  });
  it.each([null, undefined, '', true, false, 'bad', 0, -1, Infinity, 1e30, '2026-02-30', '2026-09-18 14:35:00'])
    ('does not invent an observation time for %s', value => expect(observationIso(value)).toBeNull());
  it('normalizes seconds, milliseconds and explicit timezone offsets to the same instant', () => {
    const instant = '2026-09-18T14:35:00.000Z';
    for (const value of [Date.parse(instant), Date.parse(instant) / 1000, '2026-09-18T10:35:00-04:00']) {
      expect(observationIso(value)).toBe(instant);
    }
    expect(twelveDataObservation({})).toMatchObject({ lastUpdated: null, observation: { precision: 'unknown' } });
  });
});
