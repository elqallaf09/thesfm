import { describe, expect, it } from 'vitest';
import { matchingMarketIds, parseMarketNewsIds, storyMatchesSelectedMarkets } from '@/lib/market/globalMarketNews';

describe('personalized global market news', () => {
  it('validates at most four real market IDs', () => {
    expect(parseMarketNewsIds(['kuwait_boursa', 'forex'])).toEqual(['kuwait_boursa', 'forex']);
    expect(() => parseMarketNewsIds(['kuwait_boursa', 'saudi_tadawul', 'us_nasdaq', 'forex', 'crypto'])).toThrow();
  });

  it('matches verified company symbols and exchange metadata', () => {
    expect(matchingMarketIds({ symbols: ['2222.SR'] }, ['saudi_tadawul', 'us_nasdaq'])).toEqual(['saudi_tadawul']);
    expect(storyMatchesSelectedMarkets({ exchangeCodes: ['BOURSA_KUWAIT'] }, ['kuwait_boursa'])).toBe(true);
  });

  it('does not pass vague or unrelated stories through a strict selection', () => {
    expect(storyMatchesSelectedMarkets({ symbols: [], countries: ['CA'] }, ['kuwait_boursa', 'saudi_tadawul'])).toBe(false);
  });

  it('matches asset-only selections without fabricating an exchange', () => {
    expect(matchingMarketIds({ assetTypes: ['crypto'] }, ['crypto', 'kuwait_boursa'])).toEqual(['crypto']);
  });
});
