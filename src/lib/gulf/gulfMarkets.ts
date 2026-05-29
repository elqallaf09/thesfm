export type GulfMarketId = 'kuwait' | 'saudi' | 'oman' | 'bahrain' | 'uae' | 'qatar';

export type GulfMarket = {
  id: GulfMarketId;
  flag: string;
  labelKey: string;
  indexName: string;
  yahooSymbol?: string;
};

export const GULF_MARKETS: GulfMarket[] = [
  { id: 'kuwait', flag: '🇰🇼', labelKey: 'gulf_news_market_kuwait', indexName: 'Boursa Kuwait Premier Market' },
  { id: 'saudi', flag: '🇸🇦', labelKey: 'gulf_news_market_saudi', indexName: 'Tadawul All Share Index', yahooSymbol: '^TASI.SR' },
  { id: 'oman', flag: '🇴🇲', labelKey: 'gulf_news_market_oman', indexName: 'MSX 30' },
  { id: 'bahrain', flag: '🇧🇭', labelKey: 'gulf_news_market_bahrain', indexName: 'Bahrain All Share Index' },
  { id: 'uae', flag: '🇦🇪', labelKey: 'gulf_news_market_uae', indexName: 'DFM / ADX Market Indices' },
  { id: 'qatar', flag: '🇶🇦', labelKey: 'gulf_news_market_qatar', indexName: 'Qatar Exchange Index' },
];

export function getGulfMarket(id: GulfMarketId) {
  return GULF_MARKETS.find(market => market.id === id) ?? GULF_MARKETS[0];
}
