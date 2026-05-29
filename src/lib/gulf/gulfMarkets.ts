export type GulfMarketId = 'kuwait' | 'saudi' | 'oman' | 'bahrain' | 'uae' | 'qatar';

export type GulfMarket = {
  id: GulfMarketId;
  code: 'KW' | 'SA' | 'OM' | 'BH' | 'AE' | 'QA';
  flag: string;
  labelKey: string;
  indexName: string;
  yahooSymbol?: string;
};

export const GULF_MARKETS: GulfMarket[] = [
  { id: 'saudi', code: 'SA', flag: '🇸🇦', labelKey: 'gulf_news_market_saudi', indexName: 'Tadawul All Share Index', yahooSymbol: '^TASI.SR' },
  { id: 'kuwait', code: 'KW', flag: '🇰🇼', labelKey: 'gulf_news_market_kuwait', indexName: 'Boursa Kuwait Premier Market' },
  { id: 'oman', code: 'OM', flag: '🇴🇲', labelKey: 'gulf_news_market_oman', indexName: 'MSX 30' },
  { id: 'bahrain', code: 'BH', flag: '🇧🇭', labelKey: 'gulf_news_market_bahrain', indexName: 'Bahrain All Share Index' },
  { id: 'uae', code: 'AE', flag: '🇦🇪', labelKey: 'gulf_news_market_uae', indexName: 'DFM / ADX Market Indices' },
  { id: 'qatar', code: 'QA', flag: '🇶🇦', labelKey: 'gulf_news_market_qatar', indexName: 'Qatar Exchange Index' },
];

export function getGulfMarket(id: GulfMarketId) {
  return GULF_MARKETS.find(market => market.id === id) ?? GULF_MARKETS[0];
}

