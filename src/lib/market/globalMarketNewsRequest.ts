import type { Lang } from '@/lib/translations';

export const EMPTY_NEWS_FILTERS = { country: '', exchange: '', symbol: '', region: '', language: '', source: '', asset: '', from: '', to: '', sort: 'latest' };
export type MarketNewsFilters = typeof EMPTY_NEWS_FILTERS;

// Region choices cover countries represented in the Global Markets selector.
const GULF_COUNTRIES = ['KW', 'SA', 'AE', 'QA', 'BH', 'OM'];
const REGION_COUNTRIES: Record<string, string[]> = {
  GULF: GULF_COUNTRIES,
  ARAB: [...GULF_COUNTRIES, 'EG', 'JO', 'MA'],
  MIDDLE_EAST: [...GULF_COUNTRIES, 'EG', 'JO'],
  CHINA_HONGKONG: ['CN', 'HK'],
  ASIA: ['CN', 'HK', 'JP', 'IN', 'KR'],
  NORTH_AMERICA: ['US', 'CA'],
};

export function globalMarketNewsRequest(lang: Lang, selectedMarketIds: string, filters: MarketNewsFilters | null) {
  const params = new URLSearchParams({ scope: 'general', lang, limit: '24', sort: filters?.sort ?? 'latest' });
  if (!filters) params.set('marketIds', selectedMarketIds);
  else {
    const countries = filters.country || (REGION_COUNTRIES[filters.region] ?? []).join(',');
    if (countries) params.set('countries', countries);
    if (filters.exchange) params.set('exchangeCode', filters.exchange);
    if (filters.symbol) params.set('symbols', filters.symbol.toUpperCase());
    if (filters.language) params.set('sourceLanguages', filters.language);
    if (filters.source) params.set('sourceNames', filters.source);
    if (filters.asset) params.set('assetTypes', filters.asset === 'stock' ? 'equity' : filters.asset === 'forex' ? 'currency' : filters.asset);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  return `/api/market-news?${params.toString()}`;
}
