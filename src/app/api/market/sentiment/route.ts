import { NextRequest, NextResponse } from 'next/server';
import { getMarketSentimentProviderConfig } from '@/lib/market/providerConfig';

export const revalidate = 300;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};
const REQUEST_TIMEOUT_MS = 8000;

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA'];

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
};

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

function providerFailedError(message = 'Market sentiment provider failed') {
  const error = new Error(message);
  error.name = 'ProviderFailedError';
  return error;
}

function safeNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function parseSymbols(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') || request.nextUrl.searchParams.get('symbol') || '';
  const symbols = raw
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(symbol => /^[A-Z0-9.^/-]{1,14}$/.test(symbol))
    .slice(0, 8);
  return symbols.length > 0 ? symbols : DEFAULT_SYMBOLS;
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
      throw providerFailedError('Finnhub sentiment request failed');
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
    throw providerFailedError('Alpha Vantage sentiment request failed');
  }

  const payload = await response.json().catch(() => ({})) as { feed?: AlphaVantageArticle[]; Information?: string; Note?: string };
  if (!Array.isArray(payload.feed)) {
    if (shouldDebug()) {
      console.warn('[market-sentiment] Alpha Vantage returned no feed', {
        hasInformation: Boolean(payload.Information),
        hasNote: Boolean(payload.Note),
      });
    }
    if (payload.Information || payload.Note) {
      throw providerFailedError('Alpha Vantage sentiment provider returned a service notice');
    }
    return [];
  }

  return normalizeAlphaVantageFeed(symbols, payload.feed);
}

export async function GET(request: NextRequest) {
  const config = getMarketSentimentProviderConfig();
  const symbols = parseSymbols(request);

  if (!config.apiKey) {
    return unavailableResponse('MARKET_SENTIMENT_SOURCE_NOT_CONFIGURED');
  }

  if (!config.provider) {
    return unavailableResponse('MARKET_SENTIMENT_PROVIDER_FAILED');
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
    if (shouldDebug()) {
      console.warn('[market-sentiment] provider error', error instanceof Error ? error.message : error);
    }
    return unavailableResponse('MARKET_SENTIMENT_PROVIDER_FAILED', config.provider);
  }
}
