export type GulfMarketId = 'kuwait' | 'saudi' | 'oman' | 'bahrain' | 'uae' | 'qatar';

export type GulfIndexSourceStrategy =
  | { provider: 'Yahoo Finance'; symbol: string; label?: string }
  | { provider: 'Bahrain Bourse' | 'Muscat Stock Exchange'; type: 'official' }
  | { provider: 'Mubasher'; symbol: string; label?: string }
  | { provider: 'Investing'; symbol: string; label?: string };

export type GulfMarket = {
  id: GulfMarketId;
  code: 'KW' | 'SA' | 'OM' | 'BH' | 'AE' | 'QA';
  flag: string;
  labelKey: string;
  nameAr: string;
  indexName: string;
  indexNameAr: string;
  yahooSymbols: string[];
  preferredSources: GulfIndexSourceStrategy[];
};

export const GULF_MARKETS: GulfMarket[] = [
  {
    id: 'saudi',
    code: 'SA',
    flag: '🇸🇦',
    labelKey: 'gulf_news_market_saudi',
    nameAr: 'بورصة السعودية',
    indexName: 'Tadawul All Share Index',
    indexNameAr: 'تاسي',
    yahooSymbols: ['^TASI.SR'],
    preferredSources: [{ provider: 'Yahoo Finance', symbol: '^TASI.SR' }],
  },
  {
    id: 'kuwait',
    code: 'KW',
    flag: '🇰🇼',
    labelKey: 'gulf_news_market_kuwait',
    nameAr: 'بورصة الكويت',
    indexName: 'Premier Market Index',
    indexNameAr: 'Premier Market Index',
    yahooSymbols: ['^BKP.KW', '^BKM50.KW'],
    preferredSources: [
      { provider: 'Yahoo Finance', symbol: '^BKP.KW' },
      { provider: 'Yahoo Finance', symbol: '^BKM50.KW' },
    ],
  },
  {
    id: 'oman',
    code: 'OM',
    flag: '🇴🇲',
    labelKey: 'gulf_news_market_oman',
    nameAr: 'بورصة عُمان',
    indexName: 'MSX 30',
    indexNameAr: 'MSX 30',
    yahooSymbols: [],
    preferredSources: [
      { provider: 'Muscat Stock Exchange', type: 'official' },
      { provider: 'Mubasher', symbol: 'MSX30', label: 'MSX 30' },
      { provider: 'Investing', symbol: 'MSX30' },
    ],
  },
  {
    id: 'bahrain',
    code: 'BH',
    flag: '🇧🇭',
    labelKey: 'gulf_news_market_bahrain',
    nameAr: 'بورصة البحرين',
    indexName: 'Bahrain All Share Index',
    indexNameAr: 'Bahrain All Share Index',
    yahooSymbols: ['^DJBH', '^DJBHD'],
    preferredSources: [
      { provider: 'Bahrain Bourse', type: 'official' },
      { provider: 'Mubasher', symbol: 'BHBX', label: 'Bahrain All Share Index' },
      { provider: 'Yahoo Finance', symbol: '^DJBH', label: 'Dow Jones Bahrain Index' },
      { provider: 'Yahoo Finance', symbol: '^DJBHD', label: 'Dow Jones Bahrain Index (USD)' },
    ],
  },
  {
    id: 'uae',
    code: 'AE',
    flag: '🇦🇪',
    labelKey: 'gulf_news_market_uae',
    nameAr: 'بورصة الإمارات',
    indexName: 'DFM General Index',
    indexNameAr: 'DFM General Index',
    yahooSymbols: ['DFMGI.AE'],
    preferredSources: [{ provider: 'Yahoo Finance', symbol: 'DFMGI.AE' }],
  },
  {
    id: 'qatar',
    code: 'QA',
    flag: '🇶🇦',
    labelKey: 'gulf_news_market_qatar',
    nameAr: 'بورصة قطر',
    indexName: 'QE Index',
    indexNameAr: 'QE Index',
    yahooSymbols: ['^GNRI.QA', '^QEAS.QA'],
    preferredSources: [
      { provider: 'Yahoo Finance', symbol: '^GNRI.QA' },
      { provider: 'Yahoo Finance', symbol: '^QEAS.QA' },
    ],
  },
];

export function getGulfMarket(id: GulfMarketId) {
  return GULF_MARKETS.find(market => market.id === id) ?? GULF_MARKETS[0];
}
