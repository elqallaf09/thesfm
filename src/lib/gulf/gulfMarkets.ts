export type GulfMarketId = 'kuwait' | 'saudi' | 'oman' | 'bahrain' | 'uae' | 'qatar';

export type GulfMarket = {
  id: GulfMarketId;
  code: 'KW' | 'SA' | 'OM' | 'BH' | 'AE' | 'QA';
  flag: string;
  labelKey: string;
  nameAr: string;
  indexName: string;
  indexNameAr: string;
  yahooSymbols: string[];
};

export const GULF_MARKETS: GulfMarket[] = [
  { id: 'saudi', code: 'SA', flag: '🇸🇦', labelKey: 'gulf_news_market_saudi', nameAr: 'بورصة السعودية', indexName: 'Tadawul All Share Index', indexNameAr: 'تاسي', yahooSymbols: ['^TASI.SR'] },
  { id: 'kuwait', code: 'KW', flag: '🇰🇼', labelKey: 'gulf_news_market_kuwait', nameAr: 'بورصة الكويت', indexName: 'Premier Market Index', indexNameAr: 'Premier Market Index', yahooSymbols: ['^BKP.KW', '^BKM50.KW'] },
  { id: 'oman', code: 'OM', flag: '🇴🇲', labelKey: 'gulf_news_market_oman', nameAr: 'بورصة عُمان', indexName: 'MSX 30', indexNameAr: 'MSX 30', yahooSymbols: [] },
  { id: 'bahrain', code: 'BH', flag: '🇧🇭', labelKey: 'gulf_news_market_bahrain', nameAr: 'بورصة البحرين', indexName: 'Bahrain All Share Index', indexNameAr: 'Bahrain All Share Index', yahooSymbols: [] },
  { id: 'uae', code: 'AE', flag: '🇦🇪', labelKey: 'gulf_news_market_uae', nameAr: 'بورصة الإمارات', indexName: 'DFM General Index', indexNameAr: 'DFM General Index', yahooSymbols: ['DFMGI.AE'] },
  { id: 'qatar', code: 'QA', flag: '🇶🇦', labelKey: 'gulf_news_market_qatar', nameAr: 'بورصة قطر', indexName: 'QE Index', indexNameAr: 'QE Index', yahooSymbols: ['^GNRI.QA', '^QEAS.QA'] },
];

export function getGulfMarket(id: GulfMarketId) {
  return GULF_MARKETS.find(market => market.id === id) ?? GULF_MARKETS[0];
}
