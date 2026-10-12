/** Inventory of application data, not a promise of provider coverage or rights. */
export const MARKET_DATASETS = {
  quotes: { routes: ['/api/sfm-market/v1/quote/[symbol]', '/api/market-directory/quotes', '/api/world-stocks/quotes'], implementation: 'src/lib/market/marketDataProviders.ts', fields: ['price', 'change', 'changePercent', 'volume', 'currency', 'marketCap'] },
  history: { routes: ['/api/sfm-market/v1/history/[symbol]', '/api/market/history'], implementation: 'src/lib/sfm-market/history.ts', fields: ['date', 'open', 'high', 'low', 'close', 'volume'] },
  directory: { routes: ['/api/market-directory', '/api/world-stocks/search', '/api/market/search'], implementation: 'src/lib/server/globalMarketDirectory.ts', fields: ['symbol', 'providerSymbol', 'exchange', 'currency', 'name'] },
  profiles: { routes: ['/api/market/company-profile', '/api/market/asset-profile'], implementation: 'src/lib/market/marketDataProviders.ts', fields: ['name', 'sector', 'industry', 'financials', 'logo'] },
  news: { routes: ['/api/market-news'], implementation: 'src/lib/market-news/registry.ts', fields: ['title', 'summary', 'originalUrl', 'publishedAt', 'sourceId'] },
  economic: { routes: ['/api/market/economic-calendar', '/api/economic-calendar', '/api/trader/calendar/economic'], implementation: 'src/lib/providers/economic-calendar/index.ts', fields: ['event', 'date', 'actual', 'forecast', 'previous', 'country'] },
  earnings: { routes: ['/api/trader/calendar/earnings'], implementation: 'src/lib/trader/providers/providerStatus.ts', fields: ['symbol', 'reportDate', 'epsActual', 'epsEstimate', 'revenueActual', 'revenueEstimate'] },
  dividends: { routes: ['/api/trader/calendar/dividends', '/api/dividend-stocks/calendar'], implementation: 'src/lib/trader/providers/providerStatus.ts', fields: ['symbol', 'exDividendDate', 'dividendAmount', 'paymentDate'] },
  ipos: { routes: ['/api/trader/calendar/ipos'], implementation: 'src/lib/trader/providers/providerStatus.ts', fields: ['symbol', 'ipoDate', 'exchange', 'priceRange'] },
  sentiment: { routes: ['/api/market/sentiment'], implementation: 'src/lib/market/providers/myfxbook.ts', fields: ['symbol', 'longPercent', 'shortPercent', 'updatedAt'] },
  disclosures: { routes: ['/api/admin/market-data/disclosures'], implementation: 'src/lib/market-data/disclosureAudit.server.ts', fields: ['disclosureDate', 'transactionDate', 'symbol', 'owner', 'type', 'amount'] },
} as const;
export type MarketDataset = keyof typeof MARKET_DATASETS;

export const MARKET_DATA_PROVIDERS = {
  fmp: { name: 'Financial Modeling Prep', kind: 'provider', termsUrl: 'https://site.financialmodelingprep.com/terms-of-service', termsReviewedAt: '2026-10-12' },
  finnhub: { name: 'Finnhub', kind: 'provider', termsUrl: 'https://finnhub.io/terms-of-service', termsReviewedAt: '2026-10-12' },
  twelve_data: { name: 'Twelve Data', kind: 'provider', termsUrl: 'https://twelvedata.com/terms', termsReviewedAt: '2026-10-12' },
  eodhd: { name: 'EODHD', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  marketstack: { name: 'Marketstack', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  yahoo: { name: 'Yahoo Finance', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  gold_api: { name: 'Gold API', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  myfxbook: { name: 'Myfxbook', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  alphavantage: { name: 'Alpha Vantage', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  tradingeconomics: { name: 'Trading Economics', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  newsapi: { name: 'NewsAPI', kind: 'provider', termsUrl: null, termsReviewedAt: null },
  openbb: { name: 'OpenBB', kind: 'integration', termsUrl: null, termsReviewedAt: null },
  sfm: { name: 'THE SFM', kind: 'integration', termsUrl: null, termsReviewedAt: null },
} as const;

export function canonicalDataProvider(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    financialmodelingprep: 'fmp', twelvedata: 'twelve_data', yahoofinance: 'yahoo',
    tradingeconomics: 'tradingeconomics', goldapi: 'gold_api', thesfm: 'sfm',
  };
  // Keep unknown publisher IDs distinct. Never relabel an RSS publisher as Finnhub.
  return aliases[compact] ?? value.toLowerCase().trim().replace(/[^a-z0-9:_-]/g, '_').slice(0, 100);
}

/** Separate exchange review rows; their presence does not assert symbol coverage. */
export const PRIORITY_MARKET_SCOPES = [
  { exchange: 'BOURSA_KUWAIT', country: 'KW', currency: 'KWD' },
  { exchange: 'TADAWUL', country: 'SA', currency: 'SAR' },
  { exchange: 'ADX', country: 'AE', currency: 'AED' },
  { exchange: 'DFM', country: 'AE', currency: 'AED' },
  { exchange: 'NASDAQ_DUBAI', country: 'AE', currency: 'USD' },
  { exchange: 'QSE', country: 'QA', currency: 'QAR' },
  { exchange: 'BAHRAIN_BOURSE', country: 'BH', currency: 'BHD' },
  { exchange: 'MUSCAT', country: 'OM', currency: 'OMR' },
  { exchange: 'NASDAQ', country: 'US', currency: 'USD' },
  { exchange: 'NYSE', country: 'US', currency: 'USD' },
  { exchange: 'LSE', country: 'GB', currency: 'GBP' },
  { exchange: 'XETRA', country: 'DE', currency: 'EUR' },
  { exchange: 'EURONEXT_PARIS', country: 'FR', currency: 'EUR' },
  { exchange: 'EURONEXT_AMSTERDAM', country: 'NL', currency: 'EUR' },
] as const;
