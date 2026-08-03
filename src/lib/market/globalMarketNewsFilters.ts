import {
  GLOBAL_MARKET_STRIPS,
  type GlobalMarketStripConfig,
  type GlobalMarketStripKind,
} from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';

export type GlobalNewsRegion = 'gulf' | 'arab' | 'middle_east' | 'china_hongkong' | 'asia' | 'north_america' | 'global';
export type GlobalNewsSort = 'latest' | 'relevance';

export type GlobalNewsFilters = {
  countries: string[];
  exchanges: string[];
  symbols: string[];
  regions: GlobalNewsRegion[];
  languages: string[];
  sources: string[];
  assetTypes: GlobalMarketStripKind[];
  from: string;
  to: string;
  sort: GlobalNewsSort;
  latestOnly: boolean;
};

export type SelectOption = { value: string; label: string; searchText?: string };

export const EMPTY_GLOBAL_NEWS_FILTERS: GlobalNewsFilters = {
  countries: [],
  exchanges: [],
  symbols: [],
  regions: [],
  languages: [],
  sources: [],
  assetTypes: [],
  from: '',
  to: '',
  sort: 'latest',
  latestOnly: true,
};

const COUNTRY_NAMES: Record<string, Record<Lang, string>> = {
  KW: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' }, SA: { ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' },
  AE: { ar: 'الإمارات', en: 'United Arab Emirates', fr: 'Émirats arabes unis' }, QA: { ar: 'قطر', en: 'Qatar', fr: 'Qatar' },
  BH: { ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' }, OM: { ar: 'عُمان', en: 'Oman', fr: 'Oman' },
  EG: { ar: 'مصر', en: 'Egypt', fr: 'Égypte' }, JO: { ar: 'الأردن', en: 'Jordan', fr: 'Jordanie' },
  MA: { ar: 'المغرب', en: 'Morocco', fr: 'Maroc' }, US: { ar: 'الولايات المتحدة', en: 'United States', fr: 'États-Unis' },
  JP: { ar: 'اليابان', en: 'Japan', fr: 'Japon' }, CN: { ar: 'الصين', en: 'China', fr: 'Chine' },
  HK: { ar: 'هونغ كونغ', en: 'Hong Kong', fr: 'Hong Kong' }, IN: { ar: 'الهند', en: 'India', fr: 'Inde' },
  KR: { ar: 'كوريا الجنوبية', en: 'South Korea', fr: 'Corée du Sud' }, CA: { ar: 'كندا', en: 'Canada', fr: 'Canada' },
  AU: { ar: 'أستراليا', en: 'Australia', fr: 'Australie' },
};

export const NEWS_REGION_OPTIONS: Record<Lang, SelectOption[]> = {
  ar: [
    ['gulf', 'الخليج'], ['arab', 'العالم العربي'], ['middle_east', 'الشرق الأوسط'], ['china_hongkong', 'الصين وهونغ كونغ'],
    ['asia', 'آسيا'], ['north_america', 'الولايات المتحدة وكندا'], ['global', 'دولي / عالمي'],
  ].map(([value, label]) => ({ value, label })),
  en: [
    ['gulf', 'Gulf'], ['arab', 'Arab world'], ['middle_east', 'Middle East'], ['china_hongkong', 'China & Hong Kong'],
    ['asia', 'Asia'], ['north_america', 'United States & Canada'], ['global', 'International / global'],
  ].map(([value, label]) => ({ value, label })),
  fr: [
    ['gulf', 'Golfe'], ['arab', 'Monde arabe'], ['middle_east', 'Moyen-Orient'], ['china_hongkong', 'Chine et Hong Kong'],
    ['asia', 'Asie'], ['north_america', 'États-Unis et Canada'], ['global', 'International / mondial'],
  ].map(([value, label]) => ({ value, label })),
};

export function countryOptions(lang: Lang): SelectOption[] {
  const codes = new Set(GLOBAL_MARKET_STRIPS.map(strip => strip.countryCode).filter((code): code is string => Boolean(code)));
  return [...codes].map(value => ({ value, label: COUNTRY_NAMES[value]?.[lang] ?? value })).sort((a, b) => a.label.localeCompare(b.label));
}

export function exchangeOptions(lang: Lang): SelectOption[] {
  return GLOBAL_MARKET_STRIPS.filter(strip => strip.exchangeCode).map(strip => ({
    value: strip.exchangeCode as string,
    label: localizedStripLabel(strip, lang),
  }));
}

export function companyOptions(lang: Lang): SelectOption[] {
  const seen = new Set<string>();
  return GLOBAL_MARKET_STRIPS.flatMap(strip => strip.items.flatMap(item => {
    if (seen.has(item.symbol)) return [];
    seen.add(item.symbol);
    const localized = lang === 'ar' ? item.nameAr : item.name;
    return [{ value: item.symbol, label: `${localized} · ${item.symbol}`, searchText: `${item.name} ${item.nameAr} ${item.symbol}` }];
  }));
}

export function localizedStripLabel(strip: GlobalMarketStripConfig, lang: Lang) {
  return lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn;
}

export function activeFilterCount(filters: GlobalNewsFilters) {
  return filters.countries.length + filters.exchanges.length + filters.symbols.length + filters.regions.length
    + filters.languages.length + filters.sources.length + filters.assetTypes.length
    + Number(Boolean(filters.from)) + Number(Boolean(filters.to)) + Number(filters.sort !== 'latest') + Number(!filters.latestOnly);
}

export function appendNewsFilters(params: URLSearchParams, filters: GlobalNewsFilters) {
  if (filters.countries.length) params.set('countries', filters.countries.join(','));
  if (filters.exchanges.length) params.set('exchangeCodes', filters.exchanges.join(','));
  if (filters.symbols.length) params.set('symbols', filters.symbols.join(','));
  if (filters.regions.length) params.set('newsRegions', filters.regions.join(','));
  if (filters.languages.length) params.set('sourceLanguages', filters.languages.join(','));
  if (filters.sources.length) params.set('sources', filters.sources.join(','));
  if (filters.assetTypes.length) params.set('assetTypes', filters.assetTypes.map(value => value === 'forex' ? 'currency' : value).join(','));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('sort', filters.latestOnly ? 'latest' : filters.sort);
}
