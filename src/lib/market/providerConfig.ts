export type CentralBankNewsProvider = 'newsapi' | 'finnhub';
export type MarketSentimentProvider = 'finnhub' | 'alphavantage' | 'myfxbook';

export function cleanEnv(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCentralBankNewsProvider(value: string): CentralBankNewsProvider | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (!normalized || normalized === 'newsapi' || normalized === 'news-api') return 'newsapi';
  if (normalized === 'finnhub') return 'finnhub';
  return null;
}

function normalizeMarketSentimentProvider(value: string): MarketSentimentProvider | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (!normalized) return null;
  if (normalized === 'finnhub') return 'finnhub';
  if (normalized === 'alphavantage') return 'alphavantage';
  if (normalized === 'myfxbook') return 'myfxbook';
  return null;
}

export function getCentralBankNewsProviderConfig() {
  const centralBankNewsApiKey = cleanEnv(process.env.CENTRAL_BANK_NEWS_API_KEY);
  const newsApiKey = cleanEnv(process.env.NEWS_API_KEY);
  const finnhubApiKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const explicitProviderEnv = cleanEnv(process.env.CENTRAL_BANK_NEWS_PROVIDER) || cleanEnv(process.env.NEWS_PROVIDER);
  const explicitProvider = normalizeCentralBankNewsProvider(explicitProviderEnv);
  const inferredProvider: CentralBankNewsProvider | null = explicitProvider
    ?? (centralBankNewsApiKey || newsApiKey ? 'newsapi' : null)
    ?? (finnhubApiKey ? 'finnhub' : null);
  const providerEnv = explicitProviderEnv || inferredProvider || 'newsapi';
  const apiKey = inferredProvider === 'finnhub'
    ? finnhubApiKey
    : inferredProvider === 'newsapi'
      ? (centralBankNewsApiKey || newsApiKey)
      : (centralBankNewsApiKey || newsApiKey || finnhubApiKey);

  return {
    configured: Boolean(inferredProvider && apiKey),
    provider: inferredProvider,
    providerEnv,
    providerEnvConfigured: Boolean(explicitProviderEnv),
    apiKey,
    hasCentralBankNewsApiKey: Boolean(centralBankNewsApiKey),
    hasNewsApiKey: Boolean(newsApiKey),
    hasFinnhubApiKey: Boolean(finnhubApiKey),
  };
}

export function getMarketSentimentProviderConfig() {
  const marketSentimentApiKey = cleanEnv(process.env.MARKET_SENTIMENT_API_KEY);
  const finnhubApiKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const alphaVantageApiKey = cleanEnv(process.env.ALPHA_VANTAGE_API_KEY);
  const myfxbookEmail = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const myfxbookPassword = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  const providerEnv = cleanEnv(process.env.MARKET_SENTIMENT_PROVIDER);
  const explicitProvider = normalizeMarketSentimentProvider(providerEnv);
  const apiKey = marketSentimentApiKey || finnhubApiKey || alphaVantageApiKey;
  const inferredProvider: MarketSentimentProvider | null = explicitProvider
    ?? (finnhubApiKey ? 'finnhub' : null)
    ?? (alphaVantageApiKey ? 'alphavantage' : null);
  const configured = inferredProvider === 'myfxbook'
    ? Boolean(myfxbookEmail && myfxbookPassword)
    : Boolean(inferredProvider && apiKey);

  return {
    configured,
    provider: inferredProvider,
    providerEnv,
    providerEnvConfigured: Boolean(providerEnv),
    apiKey,
    hasMarketSentimentApiKey: Boolean(marketSentimentApiKey),
    hasFinnhubApiKey: Boolean(finnhubApiKey),
    hasAlphaVantageApiKey: Boolean(alphaVantageApiKey),
    hasMyfxbookCredentials: Boolean(myfxbookEmail && myfxbookPassword),
  };
}
