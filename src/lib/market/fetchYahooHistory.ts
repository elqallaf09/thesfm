import type { MarketAssetType, MarketHistoryPoint } from '@/lib/market/marketService';

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

export type YahooHistoryResult =
  | {
      success: true;
      source: 'Yahoo Finance';
      provider: 'yahoo';
      symbol: string;
      providerSymbol: string;
      assetType: MarketAssetType;
      period: string;
      interval?: string;
      history: MarketHistoryPoint[];
      currency: string | null;
      delayed: true;
      fetchedAt: string;
      cached?: boolean;
      cacheAgeSeconds?: number;
    }
  | {
      success: false;
      source: 'Yahoo Finance';
      provider: 'yahoo';
      symbol: string;
      providerSymbol: string;
      assetType: MarketAssetType;
      period: string;
      interval?: string;
      history: [];
      delayed: true;
      code: string;
      error: string;
      unavailableReason: string;
    };

const YAHOO_HISTORY_CACHE_MS = 10 * 60 * 1000;
const yahooHistoryCache = new Map<string, { expiresAt: number; createdAt: number; data: YahooHistoryResult }>();

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateFromUnix(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? new Date(parsed * 1000).toISOString() : null;
}

function unavailable(input: {
  symbol: string;
  providerSymbol: string;
  assetType: MarketAssetType;
  period: string;
  interval?: string;
  reason: string;
  message?: string;
}): YahooHistoryResult {
  return {
    success: false,
    source: 'Yahoo Finance',
    provider: 'yahoo',
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
    period: input.period,
    interval: input.interval || undefined,
    history: [],
    delayed: true,
    code: 'provider_no_data',
    error: input.message || 'Yahoo Finance did not return usable historical prices.',
    unavailableReason: input.reason,
  };
}

export function normalizeYahooChartHistory(payload: YahooChartPayload | null, input: {
  symbol: string;
  providerSymbol: string;
  assetType: MarketAssetType;
  period: string;
  interval?: string;
}): YahooHistoryResult {
  const chartError = payload?.chart?.error;
  if (chartError) {
    return unavailable({
      ...input,
      reason: chartError.code || 'provider_chart_error',
      message: chartError.description || 'Yahoo Finance returned a chart error.',
    });
  }

  const result = payload?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0];
  if (!result || !quote || timestamps.length === 0) {
    return unavailable({ ...input, reason: 'provider_returned_empty_history' });
  }

  const history = timestamps
    .map((timestamp, index) => {
      const date = dateFromUnix(timestamp);
      const close = numberOrNull(quote.close?.[index]);
      if (!date || close === null || close <= 0) return null;

      const open = numberOrNull(quote.open?.[index]);
      const high = numberOrNull(quote.high?.[index]);
      const low = numberOrNull(quote.low?.[index]);
      const volume = numberOrNull(quote.volume?.[index]);
      const point: MarketHistoryPoint = { date, close };
      if (open !== null && open > 0) point.open = open;
      if (high !== null && high > 0) point.high = high;
      if (low !== null && low > 0) point.low = low;
      point.volume = volume !== null && volume >= 0 ? volume : null;
      return point;
    })
    .filter((point): point is MarketHistoryPoint => point !== null);

  if (history.length === 0) {
    return unavailable({ ...input, reason: 'provider_returned_empty_history' });
  }

  return {
    success: true,
    source: 'Yahoo Finance',
    provider: 'yahoo',
    symbol: input.symbol,
    providerSymbol: result.meta?.symbol || input.providerSymbol,
    assetType: input.assetType,
    period: input.period,
    interval: input.interval || undefined,
    history,
    currency: result.meta?.currency ?? null,
    delayed: true,
    fetchedAt: dateFromUnix(result.meta?.regularMarketTime) || new Date().toISOString(),
  };
}

export async function fetchYahooHistory(
  providerSymbol: string,
  assetType: MarketAssetType,
  period: string,
  interval?: string,
): Promise<YahooHistoryResult> {
  const symbol = providerSymbol.trim().toUpperCase();
  if (!symbol) {
    return unavailable({
      symbol: '',
      providerSymbol: '',
      assetType,
      period,
      interval,
      reason: 'invalid_symbol',
      message: 'Invalid market symbol.',
    });
  }

  const cacheKey = `${symbol}:${assetType}:${period}:${interval || ''}`;
  const now = Date.now();
  const cached = yahooHistoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.data,
      cached: true,
      cacheAgeSeconds: Math.max(0, Math.round((now - cached.createdAt) / 1000)),
    } as YahooHistoryResult;
  }

  const params = new URLSearchParams({ range: period });
  if (interval) params.set('interval', interval);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: Math.round(YAHOO_HISTORY_CACHE_MS / 1000) },
      signal: AbortSignal.timeout(9000),
      headers: {
        accept: 'application/json',
        'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      },
    });

    const payload = await response.json().catch(() => null) as YahooChartPayload | null;
    const parsed = response.ok
      ? normalizeYahooChartHistory(payload, { symbol, providerSymbol: symbol, assetType, period, interval })
      : unavailable({
          symbol,
          providerSymbol: symbol,
          assetType,
          period,
          interval,
          reason: `provider_http_${response.status}`,
          message: 'Yahoo Finance history request failed.',
        });

    yahooHistoryCache.set(cacheKey, {
      data: parsed,
      createdAt: now,
      expiresAt: now + YAHOO_HISTORY_CACHE_MS,
    });
    return parsed;
  } catch (error) {
    return unavailable({
      symbol,
      providerSymbol: symbol,
      assetType,
      period,
      interval,
      reason: 'provider_request_failed',
      message: error instanceof Error ? error.message : 'Yahoo Finance history request failed.',
    });
  }
}
