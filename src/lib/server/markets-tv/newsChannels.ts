import 'server-only';
import { TECH_STOCKS } from '@/lib/market/techStocks';
import type { NewsFetchParams } from '@/lib/market-news/types';
import type { TvLanguage } from '@/lib/markets-tv/types';

export type TvNewsChannel = 'all' | 'technology' | 'kuwait';
export function tvNewsParams(language: TvLanguage, channel: TvNewsChannel): NewsFetchParams {
  const base: NewsFetchParams = { language, languages: [language], limit: 12 };
  if (channel === 'kuwait') return { ...base, marketCodes: ['KW', 'KUWAIT'], countries: ['KW'], exchangeCodes: ['Boursa Kuwait'] };
  if (channel === 'technology') return { ...base,
    // Follow the website's stock-entity feed. An all-words topic search and a
    // native-UI-language filter can hide valid original-language headlines.
    languages: undefined,
    symbols: TECH_STOCKS.map(stock => stock.symbol), strictEntityFilter: true,
    marketCodes: ['US'], assetTypes: ['equity'],
  };
  return { ...base, limit: 8 };
}
