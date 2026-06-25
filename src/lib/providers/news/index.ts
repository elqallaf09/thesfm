import { cleanEnv } from '@/lib/market/providerConfig';
import {
  messageCodeForStatus,
  ProviderError,
  type ProviderApiResponse,
} from '../shared';
import { createFinnhubNewsProvider } from './finnhub';
import type { MarketNewsArticle, MarketNewsQuery } from './types';

const NEWS_TTL_MS = 90 * 1000;

type CacheEntry = {
  data: MarketNewsArticle[];
  updatedAt: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ProviderApiResponse<MarketNewsArticle[]>>>();

function cacheKey(query: MarketNewsQuery) {
  return [
    'finnhub',
    query.scope,
    query.symbol ?? '',
    query.from,
    query.to,
    query.limit,
  ].join('|').toUpperCase();
}

function successResponse(data: MarketNewsArticle[], cached: boolean, stale = false, updatedAt = new Date().toISOString()): ProviderApiResponse<MarketNewsArticle[]> {
  return {
    status: 'success',
    provider: 'finnhub',
    data,
    cached,
    stale,
    lastSuccessfulUpdate: updatedAt,
    messageCode: data.length === 0 ? 'news_no_results' : null,
  };
}

export function getMarketNewsProviderStatus() {
  return {
    configured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    provider: 'finnhub' as const,
    status: cleanEnv(process.env.FINNHUB_API_KEY) ? 'available' : 'not_configured',
  };
}

export async function getMarketNews(query: MarketNewsQuery): Promise<ProviderApiResponse<MarketNewsArticle[]>> {
  const apiKey = cleanEnv(process.env.FINNHUB_API_KEY);
  if (!apiKey) {
    return {
      status: 'not_configured',
      provider: 'finnhub',
      data: [],
      cached: false,
      stale: false,
      lastSuccessfulUpdate: null,
      messageCode: 'provider_not_configured',
    };
  }

  const key = cacheKey(query);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now && !query.force) {
    return successResponse(cached.data, true, false, cached.updatedAt);
  }

  const existing = inFlight.get(key);
  if (existing && !query.force) return existing;

  const request = (async () => {
    try {
      const provider = createFinnhubNewsProvider(apiKey);
      const data = await provider.getArticles(query);
      const updatedAt = new Date().toISOString();
      cache.set(key, { data, updatedAt, expiresAt: Date.now() + NEWS_TTL_MS });
      return successResponse(data, false, false, updatedAt);
    } catch (error) {
      const providerError = error instanceof ProviderError
        ? error
        : new ProviderError('provider_error', 'provider_temporarily_unavailable');
      if (cached) {
        return {
          status: providerError.status,
          provider: 'finnhub',
          data: cached.data,
          cached: true,
          stale: true,
          lastSuccessfulUpdate: cached.updatedAt,
          messageCode: providerError.messageCode,
        } satisfies ProviderApiResponse<MarketNewsArticle[]>;
      }
      return {
        status: providerError.status,
        provider: 'finnhub',
        data: [],
        cached: false,
        stale: false,
        lastSuccessfulUpdate: null,
        messageCode: providerError.messageCode || messageCodeForStatus(providerError.status),
      } satisfies ProviderApiResponse<MarketNewsArticle[]>;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
