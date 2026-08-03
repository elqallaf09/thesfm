import { describe, expect, it } from 'vitest';
import {
  EMPTY_GLOBAL_NEWS_FILTERS,
  activeFilterCount,
  appendNewsFilters,
  companyOptions,
  countryOptions,
  exchangeOptions,
} from '@/lib/market/globalMarketNewsFilters';

describe('Global Markets selection-based news filters', () => {
  it('builds choices only from the verified market catalog', () => {
    expect(countryOptions('en').some(option => option.value === 'KW')).toBe(true);
    expect(exchangeOptions('ar').some(option => option.value === 'TADAWUL')).toBe(true);
    expect(companyOptions('en').some(option => option.value === 'AAPL' && option.label.includes('Apple'))).toBe(true);
    expect(companyOptions('en').some(option => option.value === 'FAKE')).toBe(false);
  });

  it('serializes multi-select filters using the API contract', () => {
    const params = new URLSearchParams({ scope: 'general' });
    appendNewsFilters(params, {
      ...EMPTY_GLOBAL_NEWS_FILTERS,
      countries: ['KW', 'SA', 'US'],
      exchanges: ['TADAWUL'],
      symbols: ['2222.SR', 'AAPL'],
      regions: ['gulf'],
      languages: ['ar', 'en'],
      sources: ['Reuters'],
      assetTypes: ['equity', 'forex'],
      latestOnly: false,
      sort: 'relevance',
    });
    expect(params.get('countries')).toBe('KW,SA,US');
    expect(params.get('exchangeCodes')).toBe('TADAWUL');
    expect(params.get('symbols')).toBe('2222.SR,AAPL');
    expect(params.get('newsRegions')).toBe('gulf');
    expect(params.get('assetTypes')).toBe('equity,currency');
    expect(params.get('sort')).toBe('relevance');
  });

  it('counts removable active selections without counting defaults', () => {
    expect(activeFilterCount(EMPTY_GLOBAL_NEWS_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_GLOBAL_NEWS_FILTERS, countries: ['KW'], symbols: ['NBK.KW'] })).toBe(2);
  });
});
