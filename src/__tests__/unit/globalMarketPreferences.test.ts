import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GLOBAL_MARKET_STRIPS,
  addSelectedMarket,
  normalizeSelectedMarketIds,
  reorderSelectedMarket,
  replaceSelectedMarket,
} from '@/lib/market/globalMarketPreferences';

describe('global market preferences', () => {
  it('always normalizes to four valid unique IDs', () => {
    expect(normalizeSelectedMarketIds(['us_nasdaq', 'unknown', 'us_nasdaq', 'forex'])).toHaveLength(4);
  });

  it('prevents a fifth selection', () => {
    expect(addSelectedMarket(DEFAULT_GLOBAL_MARKET_STRIPS, 'crypto')).toEqual(DEFAULT_GLOBAL_MARKET_STRIPS);
  });

  it('replaces one selected strip', () => {
    expect(replaceSelectedMarket(DEFAULT_GLOBAL_MARKET_STRIPS, 'us_nyse', 'crypto')).toContain('crypto');
  });

  it('persists ordering through normalization', () => {
    const reordered = reorderSelectedMarket(DEFAULT_GLOBAL_MARKET_STRIPS, 0, 3);
    expect(normalizeSelectedMarketIds(reordered)).toEqual(reordered);
  });

  it('restores defaults for malformed storage', () => {
    expect(normalizeSelectedMarketIds({ ids: ['crypto'] })).toEqual(DEFAULT_GLOBAL_MARKET_STRIPS);
  });
});
