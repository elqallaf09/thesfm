import { describe, expect, it } from 'vitest';
import { groupedIntelligenceWarnings, signedScorePoints } from '@/lib/intelligence/warningPresentation';

describe('timeline warning presentation', () => {
  it.each(['ar', 'en', 'fr'] as const)('groups repeated warnings while retaining affected factors in %s', locale => {
    const result = groupedIntelligenceWarnings([
      { code: 'STALE_FACTOR_DATA', factor: 'TECHNICAL' },
      { code: 'STALE_FACTOR_DATA', factor: 'TECHNICAL' },
      { code: 'STALE_FACTOR_DATA', factor: 'LIQUIDITY' },
      { code: 'STALE_FACTOR_DATA', factor: null },
      { code: 'NEWS_NO_RELEVANT_RESULTS', factor: 'NEWS' },
    ], locale);
    expect(result).toHaveLength(2);
    expect(result[0]?.factors).toEqual(['TECHNICAL', 'LIQUIDITY']);
    expect(result[0]?.text).not.toContain('STALE_FACTOR_DATA');
    expect(result[1]?.text).not.toContain('NEWS_NO_RELEVANT_RESULTS');
    expect(groupedIntelligenceWarnings([{ code: 'FUTURE_LIMITATION' }], locale)[0]?.text).toBeTruthy();
  });

  it('uses score points, not relative returns, and preserves missing values', () => {
    expect(signedScorePoints(23, 'ar')).toBe('+23 نقطة');
    expect(signedScorePoints(-10, 'en')).toBe('-10 points');
    expect(signedScorePoints(0, 'fr')).toBe('0 points');
    expect(signedScorePoints(null, 'ar')).toBe('—');
    expect(signedScorePoints(Number.NaN, 'en')).toBe('—');
  });
});
