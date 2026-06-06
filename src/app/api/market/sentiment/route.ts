import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv, getMarketSentimentProviderConfig } from '@/lib/market/providerConfig';
import {
  getMyfxbookSentiment,
  isMyfxbookSupportedMetalSymbol,
  resolveMyfxbookForexSymbol,
  resolveMyfxbookSymbol,
} from '@/lib/market/providers/myfxbook';
import { normalizeAssetType, type MarketAssetType } from '@/lib/market/marketService';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};
const REQUEST_TIMEOUT_MS = 8000;

type FinnhubSentimentEntry = {
  atTime?: string;
  mention?: number;
  positiveMention?: number;
  negativeMention?: number;
  positiveScore?: number;
  negativeScore?: number;
  score?: number;
};

type AlphaVantageTickerSentiment = {
  ticker?: string;
  ticker_sentiment_score?: string;
  ticker_sentiment_label?: string;
};

type AlphaVantageArticle = {
  ticker_sentiment?: AlphaVantageTickerSentiment[];
  time_published?: string;
  Information?: string;
  Note?: string;
  'Error Message'?: string;
};

type SentimentProvider = 'finnhub' | 'alphavantage';
type UnifiedSentimentProvider = 'news' | 'myfxbook' | 'none';
type SentimentAssetType = 'forex' | 'metals' | 'crypto' | 'stock' | 'etf' | 'unsupported';
type SentimentLabel = 'bullish' | 'bearish' | 'neutral' | 'unavailable';
type UnifiedSentimentCode =
  | 'UNSUPPORTED_ASSET_TYPE'
  | 'NO_SENTIMENT_DATA'
  | 'PROVIDER_DOWN'
  | 'TIMEOUT'
  | 'MISSING_CREDENTIALS'
  | 'LOGIN_REJECTED'
  | 'NO_SESSION'
  | 'INVALID_FOREX_PAIR'
  | 'MISSING_PROVIDER'
  | 'SYMBOL_REQUIRED';

type NormalizedSentimentRequest = {
  symbol: string;
  displaySymbol: string;
  providerSymbol: string;
  assetType: SentimentAssetType;
  requestedAssetType: MarketAssetType | null;
};

const COMMON_CURRENCY_CODES = new Set([
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'CHF',
  'CAD',
  'AUD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'CNH',
  'HKD',
  'SGD',
  'MXN',
  'ZAR',
  'TRY',
  'PLN',
]);

const COMMON_CRYPTO_CODES = new Set([
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'ADA',
  'DOGE',
  'BNB',
  'LTC',
  'BCH',
  'DOT',
  'AVAX',
  'LINK',
  'MATIC',
]);

const COMMON_ETFS = new Set([
  'SPY',
  'QQQ',
  'DIA',
  'IWM',
  'VOO',
  'VTI',
  'IVV',
  'VEA',
  'VWO',
  'GLD',
  'SLV',
  'TLT',
  'HYG',
  'EFA',
  'EEM',
  'ARKK',
  'XLK',
  'XLF',
  'XLE',
  'XLV',
  'XLY',
  'XLP',
  'XLI',
  'XLB',
  'XLU',
  'VNQ',
]);

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function compactSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/=X$/, '')
    .replace(/^(FX|FOREX|OANDA|TVC|NASDAQ|NYSE|AMEX|COINBASE):?/i, '')
    .replace(/[\s/_-]+/g, '')
    .replace(/[^A-Z0-9.]/g, '');
}

function compactPairSymbol(value: unknown) {
  return compactSymbol(value).replace(/\./g, '');
}

function rawSymbolFromRequest(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return params.get('symbol')
    || params.get('providerSymbol')
    || params.get('symbols')?.split(',')[0]
    || '';
}

function rawProviderSymbolFromRequest(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return params.get('providerSymbol')
    || params.get('symbol')
    || params.get('symbols')?.split(',')[0]
    || '';
}

function isForexPair(value: unknown) {
  const compact = compactPairSymbol(value);
  if (!/^[A-Z]{6}$/.test(compact)) return false;
  if (isMetalSymbol(value) || isCryptoPair(value)) return false;
  return COMMON_CURRENCY_CODES.has(compact.slice(0, 3)) && COMMON_CURRENCY_CODES.has(compact.slice(3, 6));
}

function isCryptoPair(value: unknown) {
  const compact = compactPairSymbol(value);
  if (!compact.endsWith('USD')) return false;
  return COMMON_CRYPTO_CODES.has(compact.slice(0, -3));
}

function isMetalSymbol(value: unknown) {
  const raw = String(value ?? '').trim().toUpperCase();
  const compact = compactPairSymbol(value);
  return ['GC=F', 'SI=F', 'XAU', 'XAG', 'GOLD', 'SILVER', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'].includes(raw)
    || /^X(AU|AG|PT|PD)USD$/.test(compact);
}

function normalizeSentimentAssetType(assetTypeInput: unknown, symbolInput: unknown, providerSymbolInput: unknown): { assetType: SentimentAssetType; requestedAssetType: MarketAssetType | null } {
  const rawAssetType = String(assetTypeInput ?? '').trim();
  const requestedAssetType = rawAssetType && rawAssetType !== 'all' ? normalizeAssetType(rawAssetType) : null;
  const symbol = symbolInput || providerSymbolInput;

  if (requestedAssetType === 'forex') return { assetType: 'forex', requestedAssetType };
  if (requestedAssetType === 'crypto') return { assetType: 'crypto', requestedAssetType };
  if (requestedAssetType === 'gold' || requestedAssetType === 'commodity') return { assetType: 'metals', requestedAssetType };
  if (requestedAssetType === 'stock') return { assetType: 'stock', requestedAssetType };
  if (requestedAssetType === 'etf') return { assetType: 'etf', requestedAssetType };
  if (requestedAssetType === 'index') return { assetType: 'unsupported', requestedAssetType };

  if (isMetalSymbol(symbol)) return { assetType: 'metals', requestedAssetType };
  if (isCryptoPair(symbol)) return { assetType: 'crypto', requestedAssetType };
  if (isForexPair(symbol)) return { assetType: 'forex', requestedAssetType };
  if (COMMON_ETFS.has(compactPairSymbol(symbol))) return { assetType: 'etf', requestedAssetType };
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(compactSymbol(symbol))) return { assetType: 'stock', requestedAssetType };
  return { assetType: 'unsupported', requestedAssetType };
}

function normalizeRequest(request: NextRequest): NormalizedSentimentRequest {
  const rawSymbol = rawSymbolFromRequest(request);
  const rawProviderSymbol = rawProviderSymbolFromRequest(request);
  const { assetType, requestedAssetType } = normalizeSentimentAssetType(
    request.nextUrl.searchParams.get('assetType'),
    rawSymbol,
    rawProviderSymbol,
  );
  const symbolCompact = compactPairSymbol(rawSymbol);
  const providerCompact = compactPairSymbol(rawProviderSymbol);
  const fallbackSymbol = symbolCompact || providerCompact;
  const symbol = assetType === 'stock' || assetType === 'etf'
    ? (compactSymbol(rawSymbol).replace(/[^A-Z0-9.]/g, '') || compactSymbol(rawProviderSymbol).replace(/[^A-Z0-9.]/g, ''))
    : fallbackSymbol;

  return {
    symbol,
    displaySymbol: symbol || String(rawSymbol || rawProviderSymbol).trim().toUpperCase(),
    providerSymbol: rawProviderSymbol.trim() || rawSymbol.trim(),
    assetType,
    requestedAssetType,
  };
}

function normalizeProviderEnv(value: string) {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, '');
}

function getNewsSentimentProvider(): { provider: SentimentProvider; apiKey: string } | null {
  const explicitProvider = normalizeProviderEnv(cleanEnv(process.env.MARKET_SENTIMENT_PROVIDER));
  const marketSentimentApiKey = cleanEnv(process.env.MARKET_SENTIMENT_API_KEY);
  const finnhubApiKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const alphaVantageApiKey = cleanEnv(process.env.ALPHA_VANTAGE_API_KEY);

  if (explicitProvider === 'finnhub' && (marketSentimentApiKey || finnhubApiKey)) {
    return { provider: 'finnhub', apiKey: marketSentimentApiKey || finnhubApiKey };
  }

  if (explicitProvider === 'alphavantage' && (marketSentimentApiKey || alphaVantageApiKey)) {
    return { provider: 'alphavantage', apiKey: marketSentimentApiKey || alphaVantageApiKey };
  }

  if (finnhubApiKey) return { provider: 'finnhub', apiKey: finnhubApiKey };
  if (alphaVantageApiKey) return { provider: 'alphavantage', apiKey: alphaVantageApiKey };
  return null;
}

function sentimentLabel(buyPercent: number | null, sellPercent: number | null): SentimentLabel {
  if (buyPercent === null || sellPercent === null) return 'unavailable';
  if (Math.abs(buyPercent - sellPercent) < 5) return 'neutral';
  return buyPercent > sellPercent ? 'bullish' : 'bearish';
}

function sentimentMessage(assetType: SentimentAssetType, code: UnifiedSentimentCode) {
  if (code === 'SYMBOL_REQUIRED') return 'Select an asset before loading market sentiment.';
  if (code === 'MISSING_CREDENTIALS') return 'لم يتم إعداد بيانات Myfxbook في بيئة التشغيل.';
  if (code === 'LOGIN_REJECTED') return 'تم رفض تسجيل الدخول من Myfxbook. تحقق من البريد وكلمة المرور أو أعد حفظ بيانات البيئة ثم أعد النشر.';
  if (code === 'NO_SESSION') return 'لم يرجع Myfxbook جلسة صالحة.';
  if (code === 'INVALID_FOREX_PAIR') return 'زوج العملات غير معروف.';
  if (code === 'TIMEOUT') return 'استغرق الاتصال مع Myfxbook وقتاً أطول من المتوقع.';
  if (code === 'PROVIDER_DOWN') return 'The market sentiment provider is temporarily unavailable.';
  if (code === 'MISSING_PROVIDER') {
    if (assetType === 'forex') return 'Trader sentiment provider is not connected for this currency pair.';
    if (assetType === 'stock') return 'No trusted stock sentiment provider is connected right now.';
    if (assetType === 'etf') return 'No trusted ETF sentiment provider is connected right now.';
    if (assetType === 'crypto') return 'No trusted crypto sentiment provider is connected right now.';
    if (assetType === 'metals') return 'The sentiment provider is not connected for this metal right now.';
    return 'No trusted sentiment provider is connected for this asset type.';
  }
  if (assetType === 'forex') return 'No trader sentiment data is available for this pair right now.';
  if (assetType === 'stock') return 'Market sentiment for this stock is not currently available from a trusted provider.';
  if (assetType === 'etf') return 'Market sentiment for this ETF is not currently available from a trusted provider.';
  if (assetType === 'crypto') return 'Market sentiment for this crypto asset is not currently available from a trusted provider.';
  if (assetType === 'metals') return 'The sentiment provider did not return data for this metal right now.';
  return 'Market sentiment is not supported for this asset type.';
}

function extractPercent(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace('%', '').trim());
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
  }
  return null;
}

function primarySentimentValues(items: Array<Record<string, unknown>>) {
  const first = items[0] ?? {};
  const buyPercent = extractPercent(first, ['buyPercent', 'buyPercentage', 'buy', 'longPercentage']);
  const sellPercent = extractPercent(first, ['sellPercent', 'sellPercentage', 'sell', 'shortPercentage']);
  return { buyPercent, sellPercent };
}

function unavailableResponse(input: {
  code: UnifiedSentimentCode;
  symbol: string;
  assetType: SentimentAssetType;
  provider?: UnifiedSentimentProvider;
  legacyCode?: string;
  message?: string;
  suggestions?: string[];
}) {
  const provider = input.provider ?? 'none';
  return NextResponse.json({
    ok: false,
    success: false,
    code: input.code,
    legacyCode: input.legacyCode ?? null,
    symbol: input.symbol,
    assetType: input.assetType,
    provider,
    sentimentAvailable: false,
    buyPercent: null,
    sellPercent: null,
    sentimentLabel: 'unavailable' as SentimentLabel,
    message: input.message ?? sentimentMessage(input.assetType, input.code),
    suggestions: input.suggestions ?? [],
    items: [],
    updatedAt: null,
    updated_at: null,
  }, { status: 200, headers: cacheHeaders });
}

function availableResponse(input: {
  symbol: string;
  assetType: SentimentAssetType;
  provider: Exclude<UnifiedSentimentProvider, 'none'>;
  source: string;
  items: Array<Record<string, unknown>>;
  updatedAt: string | null;
}) {
  const { buyPercent, sellPercent } = primarySentimentValues(input.items);
  const label = sentimentLabel(buyPercent, sellPercent);
  const updatedAt = input.updatedAt ?? new Date().toISOString();

  return NextResponse.json({
    ok: true,
    success: true,
    code: null,
    symbol: input.symbol,
    assetType: input.assetType,
    provider: input.provider,
    source: input.source,
    sentimentAvailable: true,
    buyPercent,
    sellPercent,
    sentimentLabel: label,
    message: '',
    items: input.items,
    updatedAt,
    updated_at: updatedAt,
  }, { status: 200, headers: cacheHeaders });
}

class MarketSentimentProviderError extends Error {
  code: string;
  status?: number;
  statusText?: string;

  constructor(code: string, message: string, status?: number, statusText?: string) {
    super(message);
    this.name = 'MarketSentimentProviderError';
    this.code = code;
    this.status = status;
    this.statusText = statusText;
  }
}

function providerErrorCode(status: number) {
  if (status === 401) return 'MARKET_SENTIMENT_AUTH_FAILED';
  if (status === 403) return 'MARKET_SENTIMENT_PLAN_NOT_ALLOWED';
  if (status === 404) return 'NO_MARKET_SENTIMENT_DATA';
  if (status === 429) return 'MARKET_SENTIMENT_RATE_LIMITED';
  if (status >= 500) return 'MARKET_SENTIMENT_PROVIDER_FAILED';
  return 'MARKET_SENTIMENT_PROVIDER_FAILED';
}

function providerFailedError(message = 'Market sentiment provider failed') {
  const error = new Error(message);
  error.name = 'ProviderFailedError';
  return error;
}

function logProviderError(provider: string | null, assetType: SentimentAssetType, symbol: string, error: unknown) {
  const status = error instanceof MarketSentimentProviderError ? error.status : undefined;
  const statusText = error instanceof MarketSentimentProviderError ? error.statusText : undefined;
  const code = error instanceof MarketSentimentProviderError ? error.code : isTimeoutError(error) ? 'MARKET_SENTIMENT_TIMEOUT' : undefined;
  console.error('Market sentiment provider error:', {
    provider,
    assetType,
    symbol,
    status,
    statusText,
    message: error instanceof Error ? error.message : String(error),
    code,
  });
}

function maskProviderMessage(message: string | null | undefined) {
  if (!message) return null;
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

function safeNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeSentimentSymbol(symbol: string, provider: SentimentProvider) {
  const raw = symbol.trim().toUpperCase();
  const withoutYahooSuffix = raw.replace(/=X$/, '');
  const compact = withoutYahooSuffix.replace(/[\s/_-]+/g, '');

  if (!compact) return '';
  if (/^[A-Z]{6}$/.test(compact)) {
    if (provider === 'alphavantage' && compact.endsWith('USD') && compact.length === 6 && ['BTC', 'ETH'].includes(compact.slice(0, 3))) {
      return `CRYPTO:${compact.slice(0, 3)}`;
    }
    if (provider === 'alphavantage' && !compact.endsWith('USD')) {
      return compact;
    }
    return compact;
  }

  if (raw.includes('/') && /^[A-Z]{3}\/[A-Z]{3}$/.test(raw)) {
    const compactPair = raw.replace('/', '');
    if (provider === 'alphavantage' && ['BTC/USD', 'ETH/USD'].includes(raw)) {
      return `CRYPTO:${raw.slice(0, 3)}`;
    }
    return compactPair;
  }

  if (/^[A-Z0-9.^]{1,14}$/.test(compact)) return compact;
  return '';
}

function parseNewsSymbols(symbol: string, provider: SentimentProvider) {
  const normalized = normalizeSentimentSymbol(symbol, provider);
  if (!/^[A-Z0-9.^:]{1,18}$/.test(normalized)) return [];
  return [normalized];
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sentimentItem(symbol: string, buy: number, sell: number, provider: 'finnhub' | 'alphavantage', updatedAt: string | null) {
  const buyPercent = clampPercent(buy);
  const sellPercent = clampPercent(sell);
  return {
    symbol,
    ticker: symbol,
    name: symbol,
    buyPercent,
    sellPercent,
    buy: buyPercent,
    sell: sellPercent,
    sentimentLabel: sentimentLabel(buyPercent, sellPercent),
    provider,
    source: provider === 'finnhub' ? 'Finnhub' : 'Alpha Vantage',
    updatedAt,
    updated_at: updatedAt,
  };
}

function normalizeFinnhubSymbol(symbol: string, payload: { reddit?: FinnhubSentimentEntry[]; twitter?: FinnhubSentimentEntry[] }) {
  const entries = [
    ...(Array.isArray(payload.reddit) ? payload.reddit : []),
    ...(Array.isArray(payload.twitter) ? payload.twitter : []),
  ].slice(-30);

  let positive = 0;
  let negative = 0;
  let latestTime: string | null = null;

  for (const entry of entries) {
    const positiveMention = safeNumber(entry.positiveMention);
    const negativeMention = safeNumber(entry.negativeMention);
    if (positiveMention !== null || negativeMention !== null) {
      positive += positiveMention ?? 0;
      negative += negativeMention ?? 0;
    } else {
      const positiveScore = safeNumber(entry.positiveScore);
      const negativeScore = safeNumber(entry.negativeScore);
      const score = safeNumber(entry.score);
      if (positiveScore !== null || negativeScore !== null) {
        positive += Math.max(0, positiveScore ?? 0);
        negative += Math.max(0, Math.abs(negativeScore ?? 0));
      } else if (score !== null) {
        if (score >= 0) positive += score;
        else negative += Math.abs(score);
      }
    }

    if (entry.atTime) latestTime = entry.atTime;
  }

  const total = positive + negative;
  if (total <= 0) return null;

  return sentimentItem(symbol, (positive / total) * 100, (negative / total) * 100, 'finnhub', latestTime);
}

async function fetchFinnhubSentiment(symbols: string[], apiKey: string) {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date();

  const settled = await Promise.allSettled(symbols.map(async (symbol) => {
    const url = new URL('https://finnhub.io/api/v1/stock/social-sentiment');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('from', formatDate(from));
    url.searchParams.set('to', formatDate(to));
    url.searchParams.set('token', apiKey);

    const response = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (shouldDebug()) {
        console.warn('[market-sentiment] Finnhub symbol failed', { symbol, status: response.status });
      }
      throw new MarketSentimentProviderError(
        providerErrorCode(response.status),
        'Finnhub sentiment request failed',
        response.status,
        response.statusText,
      );
    }

    const payload = await response.json().catch(() => ({})) as { reddit?: FinnhubSentimentEntry[]; twitter?: FinnhubSentimentEntry[] };
    return normalizeFinnhubSymbol(symbol, payload);
  }));

  const allTimedOut = settled.length > 0 && settled.every(result => result.status === 'rejected' && isTimeoutError(result.reason));
  if (allTimedOut) {
    const timeout = new Error('Market sentiment provider timed out');
    timeout.name = 'TimeoutError';
    throw timeout;
  }

  const allProviderRequestsFailed = settled.length > 0 && settled.every(result => result.status === 'rejected');
  if (allProviderRequestsFailed) {
    const firstRejected = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (firstRejected?.reason instanceof MarketSentimentProviderError) throw firstRejected.reason;
    throw providerFailedError('Finnhub sentiment provider failed for all symbols');
  }

  return settled
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((item): item is NonNullable<ReturnType<typeof normalizeFinnhubSymbol>> => Boolean(item));
}

function normalizeAlphaVantageFeed(symbols: string[], feed: AlphaVantageArticle[]) {
  const allowed = new Set(symbols);
  const aggregate = new Map<string, { positive: number; negative: number; neutral: number; latestTime: string | null }>();

  for (const article of feed) {
    const sentimentEntries = Array.isArray(article.ticker_sentiment) ? article.ticker_sentiment : [];
    for (const entry of sentimentEntries) {
      const symbol = String(entry.ticker || '').trim().toUpperCase();
      if (!allowed.has(symbol)) continue;
      const score = safeNumber(entry.ticker_sentiment_score);
      if (score === null) continue;
      const current = aggregate.get(symbol) ?? { positive: 0, negative: 0, neutral: 0, latestTime: null };
      if (score > 0.05) current.positive += Math.abs(score);
      else if (score < -0.05) current.negative += Math.abs(score);
      else current.neutral += 1;
      if (article.time_published) current.latestTime = article.time_published;
      aggregate.set(symbol, current);
    }
  }

  return [...aggregate.entries()]
    .map(([symbol, values]) => {
      const positive = values.positive + values.neutral * 0.5;
      const negative = values.negative + values.neutral * 0.5;
      const total = positive + negative;
      if (total <= 0) return null;
      return sentimentItem(symbol, (positive / total) * 100, (negative / total) * 100, 'alphavantage', values.latestTime);
    })
    .filter((item): item is NonNullable<ReturnType<typeof sentimentItem>> => Boolean(item));
}

async function fetchAlphaVantageSentiment(symbols: string[], apiKey: string) {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'NEWS_SENTIMENT');
  url.searchParams.set('tickers', symbols.join(','));
  url.searchParams.set('limit', '50');
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    if (shouldDebug()) {
      console.warn('[market-sentiment] Alpha Vantage request failed', { status: response.status });
    }
    throw new MarketSentimentProviderError(
      providerErrorCode(response.status),
      'Alpha Vantage sentiment request failed',
      response.status,
      response.statusText,
    );
  }

  const payload = await response.json().catch(() => ({})) as { feed?: AlphaVantageArticle[]; Information?: string; Note?: string; 'Error Message'?: string };
  if (!Array.isArray(payload.feed)) {
    if (shouldDebug()) {
      console.warn('[market-sentiment] Alpha Vantage returned no feed', {
        hasInformation: Boolean(payload.Information),
        hasNote: Boolean(payload.Note),
      });
    }
    if (payload.Note) {
      throw new MarketSentimentProviderError('MARKET_SENTIMENT_RATE_LIMITED', 'Alpha Vantage sentiment provider rate limited');
    }
    if (payload['Error Message']) {
      throw new MarketSentimentProviderError('MARKET_SENTIMENT_AUTH_FAILED', 'Alpha Vantage sentiment provider rejected the request');
    }
    if (payload.Information) {
      throw new MarketSentimentProviderError('MARKET_SENTIMENT_PROVIDER_FAILED', 'Alpha Vantage sentiment provider returned a service notice');
    }
    return [];
  }

  return normalizeAlphaVantageFeed(symbols, payload.feed);
}

function mapProviderErrorCode(error: unknown): UnifiedSentimentCode {
  if (isTimeoutError(error)) return 'TIMEOUT';
  if (!(error instanceof MarketSentimentProviderError)) return 'PROVIDER_DOWN';
  if (error.code === 'NO_MARKET_SENTIMENT_DATA') return 'NO_SENTIMENT_DATA';
  if (error.code === 'MARKET_SENTIMENT_TIMEOUT') return 'TIMEOUT';
  return 'PROVIDER_DOWN';
}

function mapMyfxbookErrorCode(code: string): UnifiedSentimentCode {
  if (code === 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED') return 'MISSING_CREDENTIALS';
  if (code === 'MYFXBOOK_AUTH_FAILED') return 'LOGIN_REJECTED';
  if (code === 'MYFXBOOK_SESSION_MISSING') return 'NO_SESSION';
  if (code === 'MYFXBOOK_TIMEOUT') return 'TIMEOUT';
  if (code === 'INVALID_FOREX_PAIR') return 'INVALID_FOREX_PAIR';
  if (code === 'NO_MARKET_SENTIMENT_DATA') return 'NO_SENTIMENT_DATA';
  if (code === 'SYMBOL_REQUIRED') return 'SYMBOL_REQUIRED';
  return 'PROVIDER_DOWN';
}

function invalidForexPairMessage(suggestions: string[]) {
  return suggestions.length > 0
    ? `زوج العملات غير معروف. هل تقصد ${suggestions[0]}؟`
    : 'زوج العملات غير معروف. تحقق من الرمز أو اختر زوجاً مدعوماً.';
}

async function handleForexSentiment(requestMeta: NormalizedSentimentRequest) {
  if (!requestMeta.symbol) {
    return unavailableResponse({
      code: 'SYMBOL_REQUIRED',
      symbol: requestMeta.displaySymbol,
      assetType: 'forex',
    });
  }

  const resolvedForexSymbol = resolveMyfxbookForexSymbol(requestMeta.symbol);
  if (!isForexPair(requestMeta.symbol) || !resolvedForexSymbol.ok) {
    const suggestions = resolvedForexSymbol.ok ? [] : resolvedForexSymbol.suggestions;
    return unavailableResponse({
      code: 'INVALID_FOREX_PAIR',
      symbol: requestMeta.displaySymbol,
      assetType: 'forex',
      provider: 'none',
      message: invalidForexPairMessage(suggestions),
      suggestions,
    });
  }

  const config = getMarketSentimentProviderConfig();
  if (!config.hasMyfxbookCredentials) {
    return unavailableResponse({
      code: 'MISSING_CREDENTIALS',
      symbol: resolvedForexSymbol.symbol,
      assetType: 'forex',
      provider: 'none',
    });
  }

  const result = await getMyfxbookSentiment(resolvedForexSymbol.symbol);
  if (!result.ok) {
    const code = mapMyfxbookErrorCode(result.code);
    if (code === 'PROVIDER_DOWN') {
      console.error('Market sentiment provider error:', {
        provider: 'myfxbook',
        assetType: 'forex',
        symbol: resolvedForexSymbol.symbol,
        code: result.code,
        providerMessage: maskProviderMessage(result.providerMessage),
      });
    }
    return unavailableResponse({
      code,
      legacyCode: result.code,
      symbol: resolvedForexSymbol.symbol,
      assetType: 'forex',
      provider: code === 'MISSING_CREDENTIALS' || code === 'INVALID_FOREX_PAIR' ? 'none' : 'myfxbook',
      suggestions: result.suggestions ?? [],
    });
  }

  const matchingItems = result.items.filter(item => compactPairSymbol(item.symbol) === compactPairSymbol(resolvedForexSymbol.symbol));
  if (matchingItems.length === 0) {
    return unavailableResponse({
      code: 'NO_SENTIMENT_DATA',
      legacyCode: 'NO_MARKET_SENTIMENT_DATA',
      symbol: resolvedForexSymbol.symbol,
      assetType: 'forex',
      provider: 'myfxbook',
    });
  }

  return availableResponse({
    symbol: resolvedForexSymbol.symbol,
    assetType: 'forex',
    provider: 'myfxbook',
    source: 'Myfxbook',
    items: matchingItems,
    updatedAt: result.updated_at,
  });
}

async function handleMetalSentiment(requestMeta: NormalizedSentimentRequest) {
  if (!requestMeta.symbol) {
    return unavailableResponse({
      code: 'SYMBOL_REQUIRED',
      symbol: requestMeta.displaySymbol,
      assetType: 'metals',
    });
  }

  const resolvedMetalSymbol = resolveMyfxbookSymbol(requestMeta.symbol);
  if (!resolvedMetalSymbol.ok || !isMyfxbookSupportedMetalSymbol(resolvedMetalSymbol.symbol)) {
    return unavailableResponse({
      code: 'NO_SENTIMENT_DATA',
      symbol: requestMeta.displaySymbol,
      assetType: 'metals',
      provider: 'none',
    });
  }

  const config = getMarketSentimentProviderConfig();
  if (!config.hasMyfxbookCredentials) {
    return unavailableResponse({
      code: 'MISSING_CREDENTIALS',
      symbol: resolvedMetalSymbol.symbol,
      assetType: 'metals',
      provider: 'none',
    });
  }

  const result = await getMyfxbookSentiment(resolvedMetalSymbol.symbol);
  if (!result.ok) {
    const code = mapMyfxbookErrorCode(result.code);
    if (code === 'PROVIDER_DOWN') {
      console.error('Market sentiment provider error:', {
        provider: 'myfxbook',
        assetType: 'metals',
        symbol: resolvedMetalSymbol.symbol,
        code: result.code,
        providerMessage: maskProviderMessage(result.providerMessage),
      });
    }
    return unavailableResponse({
      code,
      legacyCode: result.code,
      symbol: resolvedMetalSymbol.symbol,
      assetType: 'metals',
      provider: code === 'MISSING_CREDENTIALS' ? 'none' : 'myfxbook',
      suggestions: result.suggestions ?? [],
    });
  }

  const matchingItems = result.items.filter(item => compactPairSymbol(item.symbol) === compactPairSymbol(resolvedMetalSymbol.symbol));
  if (matchingItems.length === 0) {
    return unavailableResponse({
      code: 'NO_SENTIMENT_DATA',
      legacyCode: 'NO_MARKET_SENTIMENT_DATA',
      symbol: resolvedMetalSymbol.symbol,
      assetType: 'metals',
      provider: 'myfxbook',
    });
  }

  return availableResponse({
    symbol: resolvedMetalSymbol.symbol,
    assetType: 'metals',
    provider: 'myfxbook',
    source: 'Myfxbook',
    items: matchingItems,
    updatedAt: result.updated_at,
  });
}

async function handleNewsSentiment(requestMeta: NormalizedSentimentRequest) {
  const newsProvider = getNewsSentimentProvider();
  if (!newsProvider) {
    return unavailableResponse({
      code: 'MISSING_PROVIDER',
      symbol: requestMeta.displaySymbol,
      assetType: requestMeta.assetType,
      provider: 'none',
    });
  }

  const symbols = parseNewsSymbols(requestMeta.symbol, newsProvider.provider);
  if (symbols.length === 0) {
    return unavailableResponse({
      code: 'SYMBOL_REQUIRED',
      symbol: requestMeta.displaySymbol,
      assetType: requestMeta.assetType,
    });
  }

  try {
    const items = newsProvider.provider === 'alphavantage'
      ? await fetchAlphaVantageSentiment(symbols, newsProvider.apiKey)
      : await fetchFinnhubSentiment(symbols, newsProvider.apiKey);

    if (shouldDebug()) {
      console.info('[market-sentiment] normalized provider response', {
        provider: newsProvider.provider,
        assetType: requestMeta.assetType,
        requestedSymbols: symbols.length,
        count: items.length,
      });
    }

    if (items.length === 0) {
      return unavailableResponse({
        code: 'NO_SENTIMENT_DATA',
        legacyCode: 'NO_MARKET_SENTIMENT_DATA',
        symbol: requestMeta.displaySymbol,
        assetType: requestMeta.assetType,
        provider: 'none',
      });
    }

    return availableResponse({
      symbol: requestMeta.displaySymbol,
      assetType: requestMeta.assetType,
      provider: 'news',
      source: newsProvider.provider === 'finnhub' ? 'Finnhub' : 'Alpha Vantage',
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logProviderError(newsProvider.provider, requestMeta.assetType, requestMeta.displaySymbol, error);
    return unavailableResponse({
      code: mapProviderErrorCode(error),
      legacyCode: error instanceof MarketSentimentProviderError ? error.code : undefined,
      symbol: requestMeta.displaySymbol,
      assetType: requestMeta.assetType,
      provider: 'none',
    });
  }
}

export async function GET(request: NextRequest) {
  const requestMeta = normalizeRequest(request);

  if (shouldDebug()) {
    console.info('[market-sentiment] request resolved', {
      symbol: requestMeta.displaySymbol,
      providerSymbol: requestMeta.providerSymbol,
      assetType: requestMeta.assetType,
      requestedAssetType: requestMeta.requestedAssetType,
      configuredProvider: cleanEnv(process.env.MARKET_SENTIMENT_PROVIDER) || null,
    });
  }

  if (!requestMeta.displaySymbol) {
    return unavailableResponse({
      code: 'SYMBOL_REQUIRED',
      symbol: '',
      assetType: 'unsupported',
    });
  }

  if (requestMeta.assetType === 'forex') {
    return handleForexSentiment(requestMeta);
  }

  if (requestMeta.assetType === 'metals') {
    return handleMetalSentiment(requestMeta);
  }

  if (requestMeta.assetType === 'stock' || requestMeta.assetType === 'etf') {
    return handleNewsSentiment(requestMeta);
  }

  if (requestMeta.assetType === 'crypto') {
    return handleNewsSentiment(requestMeta);
  }

  return unavailableResponse({
    code: 'UNSUPPORTED_ASSET_TYPE',
    symbol: requestMeta.displaySymbol,
    assetType: requestMeta.assetType,
    provider: 'none',
  });
}
