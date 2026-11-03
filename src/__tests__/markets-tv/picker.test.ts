import { describe, expect, it } from 'vitest';
import { matchesTvSearch, moveTvMarket, selectedTvInstruments, selectedTvMarkets } from '@/lib/markets-tv/picker';
import { DEFAULT_TV_SETTINGS, type TvMarket } from '@/lib/markets-tv/types';

const markets: TvMarket[] = [
  { id: 'KW', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 10, status: 'directory' },
  { id: 'US', group: 'us', labelAr: 'أمريكا', labelEn: 'US', labelFr: 'États-Unis', count: 20, status: 'directory' },
];
describe('TV customization', () => {
  it('keeps explicit empty choices and order while ignoring obsolete markets', () => {
    expect(selectedTvMarkets(markets, { ...DEFAULT_TV_SETTINGS, marketIds: [] })).toEqual([]);
    expect(selectedTvMarkets(markets, { ...DEFAULT_TV_SETTINGS, marketIds: ['US', 'OLD', 'KW'] })).toEqual(['US', 'KW']);
    expect(selectedTvMarkets(markets, { ...DEFAULT_TV_SETTINGS, groups: ['gulf'] })).toEqual(['KW']);
    expect(selectedTvMarkets(markets, DEFAULT_TV_SETTINGS)).toEqual(['KW', 'US']);
  });
  it('reorders without mutating the saved list or losing hidden search results', () => {
    const original = ['KW', 'US', 'OTHER'];
    expect(moveTvMarket(original, 'US', -1)).toEqual(['US', 'KW', 'OTHER']);
    expect(original).toEqual(['KW', 'US', 'OTHER']);
    expect(moveTvMarket(original, 'KW', -1)).toBe(original);
    expect(moveTvMarket(original, 'OTHER', 1)).toBe(original);
    expect(moveTvMarket(original, 'MISSING', 1)).toBe(original);
  });
  it('matches Arabic diacritics, hamza and French accents', () => {
    expect(matchesTvSearch('امريكا', 'أَمْرِيكا')).toBe(true);
    expect(matchesTvSearch(' KOWEIT ', 'Koweït')).toBe(true);
  });
  it('shows saved selections across directory pages, including symbols not yet loaded', () => {
    const known = { 'KFH.KW': { symbol: 'KFH.KW', name: 'Kuwait Finance House', nameAr: 'بيت التمويل الكويتي' } };
    expect(selectedTvInstruments(['KFH.KW', 'QA1999'], known, '').map(item => item.symbol)).toEqual(['KFH.KW', 'QA1999']);
    expect(selectedTvInstruments(['KFH.KW', 'QA1999'], known, 'التمويل')).toHaveLength(1);
    expect(selectedTvInstruments(['KFH.KW', 'QA1999'], known, 'qa1999')).toEqual([{ symbol: 'QA1999', name: 'QA1999' }]);
  });
});
