export type EuropeMarketId = 'uk' | 'germany' | 'france' | 'italy' | 'spain' | 'netherlands' | 'switzerland' | 'europe';

export type EuropeMarket = {
  id: EuropeMarketId;
  code: 'GB' | 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'CH' | 'EU';
  flag: string;
  labelKey: string;
  indexLabelKey: string;
  indexName: string;
  yahooSymbols: string[];
};

export const EUROPE_MARKETS: EuropeMarket[] = [
  { id: 'uk', code: 'GB', flag: '🇬🇧', labelKey: 'europe_news_market_uk', indexLabelKey: 'europe_news_index_ftse', indexName: 'FTSE 100', yahooSymbols: ['^FTSE'] },
  { id: 'germany', code: 'DE', flag: '🇩🇪', labelKey: 'europe_news_market_germany', indexLabelKey: 'europe_news_index_dax', indexName: 'DAX', yahooSymbols: ['^GDAXI'] },
  { id: 'france', code: 'FR', flag: '🇫🇷', labelKey: 'europe_news_market_france', indexLabelKey: 'europe_news_index_cac', indexName: 'CAC 40', yahooSymbols: ['^FCHI'] },
  { id: 'italy', code: 'IT', flag: '🇮🇹', labelKey: 'europe_news_market_italy', indexLabelKey: 'europe_news_index_mib', indexName: 'FTSE MIB', yahooSymbols: ['FTSEMIB.MI', '^FTMIB', 'FTSEMIB.FGI'] },
  { id: 'spain', code: 'ES', flag: '🇪🇸', labelKey: 'europe_news_market_spain', indexLabelKey: 'europe_news_index_ibex', indexName: 'IBEX 35', yahooSymbols: ['^IBEX'] },
  { id: 'netherlands', code: 'NL', flag: '🇳🇱', labelKey: 'europe_news_market_netherlands', indexLabelKey: 'europe_news_index_aex', indexName: 'AEX', yahooSymbols: ['^AEX'] },
  { id: 'switzerland', code: 'CH', flag: '🇨🇭', labelKey: 'europe_news_market_switzerland', indexLabelKey: 'europe_news_index_smi', indexName: 'SMI', yahooSymbols: ['^SSMI'] },
  { id: 'europe', code: 'EU', flag: '🇪🇺', labelKey: 'europe_news_market_europe', indexLabelKey: 'europe_news_index_stoxx', indexName: 'Euro Stoxx 50', yahooSymbols: ['^STOXX50E'] },
];

export function getEuropeMarket(id: EuropeMarketId) {
  return EUROPE_MARKETS.find(market => market.id === id) ?? EUROPE_MARKETS[0];
}
