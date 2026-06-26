export type GulfMarketId =
  | 'kuwait'
  | 'saudi'
  | 'oman'
  | 'bahrain'
  | 'uae-dfm'
  | 'uae-adx'
  | 'qatar';

export type GulfIndexSourceStrategy =
  | { provider: 'Yahoo Finance'; symbol: string; label?: string }
  | { provider: 'Bahrain Bourse' | 'Muscat Stock Exchange'; type: 'official' }
  | { provider: 'Mubasher'; symbol: string; label?: string }
  | { provider: 'Investing'; symbol: string; label?: string };

export type GulfMarket = {
  id: GulfMarketId;
  code: 'KW' | 'SA' | 'OM' | 'BH' | 'DFM' | 'ADX' | 'QA';
  countryCode: 'KW' | 'SA' | 'OM' | 'BH' | 'AE' | 'QA';
  exchangeCode: 'Boursa Kuwait' | 'Tadawul' | 'MSX' | 'Bahrain Bourse' | 'DFM' | 'ADX' | 'QSE';
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
    countryCode: 'SA',
    exchangeCode: 'Tadawul',
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
    countryCode: 'KW',
    exchangeCode: 'Boursa Kuwait',
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
    countryCode: 'OM',
    exchangeCode: 'MSX',
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
    countryCode: 'BH',
    exchangeCode: 'Bahrain Bourse',
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
    id: 'uae-dfm',
    code: 'DFM',
    countryCode: 'AE',
    exchangeCode: 'DFM',
    flag: '🇦🇪',
    labelKey: 'gulf_news_market_uae_dfm',
    nameAr: 'سوق دبي المالي',
    indexName: 'DFM General Index',
    indexNameAr: 'DFM General Index',
    yahooSymbols: ['DFMGI.AE'],
    preferredSources: [{ provider: 'Yahoo Finance', symbol: 'DFMGI.AE' }],
  },
  {
    id: 'uae-adx',
    code: 'ADX',
    countryCode: 'AE',
    exchangeCode: 'ADX',
    flag: '🇦🇪',
    labelKey: 'gulf_news_market_uae_adx',
    nameAr: 'سوق أبوظبي للأوراق المالية',
    indexName: 'FTSE ADX General Index',
    indexNameAr: 'FTSE ADX General Index',
    yahooSymbols: ['FADGI.FGI'],
    preferredSources: [{ provider: 'Yahoo Finance', symbol: 'FADGI.FGI' }],
  },
  {
    id: 'qatar',
    code: 'QA',
    countryCode: 'QA',
    exchangeCode: 'QSE',
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
