import { NextRequest, NextResponse } from 'next/server';
import { getMarketSentimentProviderConfig } from '@/lib/market/providerConfig';
import { getMyfxbookSentiment } from '@/lib/market/providers/myfxbook';

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

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function unavailableResponse(code: string, provider: string | null = null) {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    provider,
    items: [],
    updated_at: null,
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

function logProviderError(provider: string | null, error: unknown) {
  const status = error instanceof MarketSentimentProviderError ? error.status : undefined;
  const statusText = error instanceof MarketSentimentProviderError ? error.statusText : undefined;
  const code = error instanceof MarketSentimentProviderError ? error.code : isTimeoutError(error) ? 'MARKET_SENTIMENT_TIMEOUT' : undefined;
  console.error('Market sentiment provider error:', {
    provider,
    status,
    statusText,
    message: error instanceof Error ? error.message : String(error),
    code,
  });
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

function parseSymbols(request: NextRequest, provider: SentimentProvider) {
  const params = request.nextUrl.searchParams;
  const raw = params.get('symbols')
    || [params.get('providerSymbol'), params.get('symbol')]
      .filter(Boolean)
      .join(',');
  const symbols = raw
    .split(',')
    .map(symbol => normalizeSentimentSymbol(symbol, provider))
    .filter(symbol => /^[A-Z0-9.^:]{1,18}$/.test(symbol));
  const uniqueSymbols = [...new Set(symbols)].slice(0, 4);
  return uniqueSymbols;
}

function parseMyfxbookSymbol(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const raw = params.get('providerSymbol')
    || params.get('symbol')
    || params.get('symbols')?.split(',')[0]
    || '';
  return raw.trim();
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
    provider,
    source: provider === 'finnhub' ? 'Finnhub' : 'Alpha Vantage',
    updatedAt,
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

export async function GET(request: NextRequest) {
  const config = getMarketSentimentProviderConfig();

  console.log('Market sentiment provider selected:', {
    provider: process.env.MARKET_SENTIMENT_PROVIDER,
  });

  if (config.provider !== 'myfxbook') {
    return unavailableResponse('MARKET_SENTIMENT_PROVIDER_NOT_MYFXBOOK', config.provider ?? config.providerEnv ?? null);
  }

  if (!config.provider) {
    return unavailableResponse('MARKET_SENTIMENT_PROVIDER_MISSING');
  }

  if (config.provider === 'myfxbook') {
    const symbol = parseMyfxbookSymbol(request);
    const result = await getMyfxbookSentiment(symbol);
    if (!result.ok) {
      return unavailableResponse(result.code, 'myfxbook');
    }

    return NextResponse.json({
      ok: true,
      success: true,
      provider: 'myfxbook',
      source: 'Myfxbook',
      items: result.items,
      updated_at: result.updated_at,
    }, { status: 200, headers: cacheHeaders });
  }

  if (!config.apiKey) {
    return unavailableResponse('MARKET_SENTIMENT_SOURCE_NOT_CONFIGURED');
  }

  const symbols = parseSymbols(request, config.provider);
  if (symbols.length === 0) {
    return unavailableResponse('SYMBOL_REQUIRED', config.provider);
  }

  try {
    const items = config.provider === 'alphavantage'
      ? await fetchAlphaVantageSentiment(symbols, config.apiKey)
      : await fetchFinnhubSentiment(symbols, config.apiKey);

    if (shouldDebug()) {
      console.info('[market-sentiment] normalized provider response', {
        provider: config.provider,
        requestedSymbols: symbols.length,
        count: items.length,
      });
    }

    if (items.length === 0) {
      return unavailableResponse('NO_MARKET_SENTIMENT_DATA', config.provider);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      provider: config.provider,
      source: config.provider === 'finnhub' ? 'Finnhub' : 'Alpha Vantage',
      items,
      updated_at: new Date().toISOString(),
    }, { status: 200, headers: cacheHeaders });
  } catch (error) {
    logProviderError(config.provider, error);
    const code = error instanceof MarketSentimentProviderError
      ? error.code
      : isTimeoutError(error)
        ? 'MARKET_SENTIMENT_TIMEOUT'
        : 'MARKET_SENTIMENT_PROVIDER_FAILED';
    return unavailableResponse(code, config.provider);
  }
}
