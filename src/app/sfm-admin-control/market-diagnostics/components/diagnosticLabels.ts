const CAPABILITY_LABEL_KEYS: Record<string, string> = {
  symbols: 'ops_center_capability_symbols',
  historical_prices: 'ops_center_capability_historical_prices',
  logos: 'ops_center_capability_logos',
  recommendations: 'ops_center_feature_recommendations',
  ipos: 'ops_center_feature_ipos',
  commodities: 'market_asset_commodities',
  quotes: 'market_capability_quotes',
  news: 'market_capability_news',
  earnings: 'market_capability_earnings',
  dividends: 'market_capability_dividends',
  economic_calendar: 'market_capability_economic_calendar',
  profiles: 'market_capability_profiles',
  technical_data: 'market_capability_technical_data',
  gcc_markets: 'market_capability_gcc_markets',
  forex: 'market_capability_forex',
  crypto: 'market_capability_crypto',
  shariah_financials: 'market_capability_shariah_financials',
};

export function diagnosticCapabilityKey(capability: string): string {
  return CAPABILITY_LABEL_KEYS[capability] ?? capability;
}
