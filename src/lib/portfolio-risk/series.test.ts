import { describe, expect, it } from 'vitest';
import { analyzePortfolioSeries, type NavPoint } from './series';

function points(): NavPoint[] {
  return Array.from({ length: 62 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10),
    nav: 1000 + i * 10, netExternalFlow: 10,
  }));
}
// Fixed fixture calendar; production must use an independently verified source.
const calendar = Array.from({ length: 62 }, (_, i) => new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10));
const input = () => ({ points: points(), weights: [0.4, 0.6], currency: 'KWD', expectedDates: [...calendar] });
describe('portfolio NAV series', () => {
  it('subtracts end-of-period contributions instead of counting them as returns', () => {
    const result = analyzePortfolioSeries(input());
    if ('error' in result) throw new Error(result.error);
    expect(result.metrics.volatilityAnnualized).toBeCloseTo(0);
    expect(result.metrics.historicalVar95).toBe(0);
    expect(result.concentration.hhi).toBeCloseTo(0.52);
  });
  it('requires an independent valuation calendar', () => {
    expect(analyzePortfolioSeries({ ...input(), expectedDates: undefined })).toEqual({ error: 'MISSING_VALUATION_CALENDAR' });
  });
  it('does not annualize a history with missing sessions', () => {
    expect(analyzePortfolioSeries({ ...input(), points: points().filter((_, i) => i !== 12) })).toEqual({ error: 'INCOMPLETE_NAV_HISTORY' });
    expect(analyzePortfolioSeries({ ...input(), points: points().slice(0, 2) })).toEqual({ error: 'INCOMPLETE_NAV_HISTORY' });
  });
  it('rejects malformed, duplicate, unordered and short calendars', () => {
    for (const replacement of [calendar[9], '2025-02-30', '2024-01-01']) {
      const dates = [...calendar]; dates[10] = replacement;
      expect(analyzePortfolioSeries({ ...input(), expectedDates: dates })).toEqual({ error: 'INVALID_VALUATION_CALENDAR' });
    }
    expect(analyzePortfolioSeries({ ...input(), expectedDates: [] })).toEqual({ error: 'INVALID_VALUATION_CALENDAR' });
  });
  it('rejects invalid NAV, dates, currencies and position weights', () => {
    const duplicates = points(); duplicates[2].date = duplicates[1].date;
    expect(analyzePortfolioSeries({ ...input(), points: duplicates })).toEqual({ error: 'INVALID_NAV_SERIES' });
    const invalid = points(); invalid[5].nav = Number.NaN;
    expect(analyzePortfolioSeries({ ...input(), points: invalid })).toEqual({ error: 'INVALID_NAV_SERIES' });
    expect(analyzePortfolioSeries({ ...input(), currency: 'kwd' })).toEqual({ error: 'INVALID_CURRENCY' });
    expect(analyzePortfolioSeries({ ...input(), weights: [0.7] })).toEqual({ error: 'INVALID_POSITIONS' });
  });
});
