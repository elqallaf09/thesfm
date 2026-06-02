export type CentralBankNewsProvider = 'newsapi';
export type MarketSentimentProvider = 'finnhub' | 'alphavantage';

export function cleanEnv(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCentralBankNewsProvider(value: string): CentralBankNewsProvider | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'newsapi' || normalized === 'news-api') return 'newsapi';
  return null;
}

function normalizeMarketSentimentProvider(value: string): MarketSentimentProvider | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (!normalized) return null;
  if (normalized === 'finnhub') return 'finnhub';
  if (normalized === 'alphavantage') return 'alphavantage';
  return null;
}

export function getCentralBankNewsProviderConfig() {
  const centralBankNewsApiKey = cleanEnv(process.env.CENTRAL_BANK_NEWS_API_KEY);
  const newsApiKey = cleanEnv(process.env.NEWS_API_KEY);
  const explicitProviderEnv = cleanEnv(process.env.CENTRAL_BANK_NEWS_PROVIDER) || cleanEnv(process.env.NEWS_PROVIDER);
  const providerEnv = explicitProviderEnv || 'newsapi';
  const provider = normalizeCentralBankNewsProvider(providerEnv);
  const apiKey = centralBankNewsApiKey || newsApiKey;

  return {
    configured: Boolean(provider && apiKey),
    provider,
    providerEnv,
    providerEnvConfigured: Boolean(explicitProviderEnv),
    apiKey,
    hasCentralBankNewsApiKey: Boolean(centralBankNewsApiKey),
    hasNewsApiKey: Boolean(newsApiKey),
  };
}

export function getMarketSentimentProviderConfig() {
  const marketSentimentApiKey = cleanEnv(process.env.MARKET_SENTIMENT_API_KEY);
  const finnhubApiKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const alphaVantageApiKey = cleanEnv(process.env.ALPHA_VANTAGE_API_KEY);
  const providerEnv = cleanEnv(process.env.MARKET_SENTIMENT_PROVIDER);
  const explicitProvider = normalizeMarketSentimentProvider(providerEnv);
  const inferredProvider: MarketSentimentProvider | null = explicitProvider
    ?? (finnhubApiKey ? 'finnhub' : null)
    ?? (alphaVantageApiKey ? 'alphavantage' : null)
    ?? (marketSentimentApiKey ? 'finnhub' : null);
  const apiKey = inferredProvider === 'alphavantage'
    ? (marketSentimentApiKey || alphaVantageApiKey)
    : inferredProvider === 'finnhub'
      ? (marketSentimentApiKey || finnhubApiKey)
      : (marketSentimentApiKey || finnhubApiKey || alphaVantageApiKey);

  return {
    configured: Boolean(inferredProvider && apiKey),
    provider: inferredProvider,
    providerEnv,
    providerEnvConfigured: Boolean(providerEnv),
    apiKey,
    hasMarketSentimentApiKey: Boolean(marketSentimentApiKey),
    hasFinnhubApiKey: Boolean(finnhubApiKey),
    hasAlphaVantageApiKey: Boolean(alphaVantageApiKey),
  };
}
