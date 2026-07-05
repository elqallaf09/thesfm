import { NextRequest, NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { addUtcDays, clampNumber, formatIsoDate, normalizeTitle, validIsoDate, type ProviderApiResponse } from '@/lib/providers/shared';
import { getMarketNews } from '@/lib/providers/news';
import {
  buildMarketNewsRelevanceContext,
  filterMarketNewsByRelevance,
  parseNewsSymbols,
  type MarketNewsRelevanceContext,
  type MarketNewsRelevanceFilterResult,
} from '@/lib/providers/news/relevance';
import type { MarketNewsArticle, MarketNewsQuery, MarketNewsScope } from '@/lib/providers/news/types';

export const dynamic = 'force-dynamic';

const MAX_RANGE_DAYS = 31;
const SUCCESS_HEADERS = {
  'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=240',
};
const ERROR_HEADERS = {
  'Cache-Control': 'private, no-store',
};

function safeCode(messageCode: string | null, fallback: string) {
  return (messageCode || fallback).toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
}

function defaultNewsRange() {
  const to = new Date();
  const from = addUtcDays(to, -7);
  return { from: formatIsoDate(from), to: formatIsoDate(to) };
}

function parseDateRange(searchParams: URLSearchParams) {
  const defaults = defaultNewsRange();
  const from = searchParams.get('from')?.trim() || defaults.from;
  const to = searchParams.get('to')?.trim() || defaults.to;

  if (!validIsoDate(from) || !validIsoDate(to)) {
    return { error: 'provider_invalid_request' as const };
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  if (toDate.getTime() < fromDate.getTime()) return { error: 'provider_invalid_request' as const };

  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  if (rangeDays > MAX_RANGE_DAYS) return { error: 'provider_invalid_request' as const };

  return { from, to };
}

function safeScope(value: string | null): MarketNewsScope | 'invalid' {
  const text = String(value ?? 'general').trim().toLowerCase();
  if (text === 'general' || text === 'asset') return text;
  return 'invalid';
}

function safeSymbol(value: string | null) {
  const text = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9._:\-=^]{1,32}$/.test(text) ? text : '';
}

function toUiArticle(article: MarketNewsArticle & {
  relevanceScore?: number;
  relevanceReasons?: string[];
  relevanceBucket?: string;
}) {
  return {
    ...article,
    title: article.headline,
    headline: article.headline,
    description: article.summary,
    excerpt: article.summary,
    url: article.sourceUrl,
    link: article.sourceUrl,
    source_url: article.sourceUrl,
    image: article.imageUrl,
    published_at: article.publishedAt,
    published: article.publishedAt,
    symbols: article.relatedSymbols,
    providerArticleId: article.id,
    relevanceScore: article.relevanceScore ?? null,
    relevanceReasons: article.relevanceReasons ?? [],
    relevanceBucket: article.relevanceBucket ?? null,
  };
}

function buildRelevanceContext(searchParams: URLSearchParams, symbol: string | null): MarketNewsRelevanceContext {
  return buildMarketNewsRelevanceContext({
    market: searchParams.get('market') ?? searchParams.get('selectedMarket') ?? searchParams.get('marketId'),
    category: searchParams.get('category') ?? searchParams.get('assetType') ?? searchParams.get('selectedCategory'),
    symbol,
    symbols: [
      ...parseNewsSymbols(searchParams.get('symbols')),
      ...parseNewsSymbols(searchParams.get('selectedSymbols')),
      ...parseNewsSymbols(searchParams.get('watchSymbols')),
    ],
  });
}

function articleCategoryFilter(searchParams: URLSearchParams) {
  return String(searchParams.get('newsCategory') ?? searchParams.get('articleCategory') ?? searchParams.get('sourceCategory') ?? '').trim().toLowerCase();
}

function applyLocalFilters(
  articles: MarketNewsArticle[],
  searchParams: URLSearchParams,
  relevanceContext: MarketNewsRelevanceContext,
) {
  const source = String(searchParams.get('source') ?? '').trim().toLowerCase();
  const category = articleCategoryFilter(searchParams);
  const search = normalizeTitle(String(searchParams.get('search') ?? searchParams.get('q') ?? ''));
  const sort = String(searchParams.get('sort') ?? 'latest').trim().toLowerCase();

  const filtered = articles.filter(article => {
    if (source && article.source.toLowerCase() !== source) return false;
    if (category && category !== 'general' && String(article.category ?? '').toLowerCase() !== category) return false;
    if (!search) return true;
    return normalizeTitle([
      article.headline,
      article.summary ?? '',
      article.source,
      article.relatedSymbols.join(' '),
    ].join(' ')).includes(search);
  });

  const relevance = filterMarketNewsByRelevance(filtered, relevanceContext);
  const sorted = relevance.articles.sort((a, b) => {
    if (sort === 'relevance' && (b.relevanceScore ?? 0) !== (a.relevanceScore ?? 0)) {
      return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    }
    const aTime = new Date(a.publishedAt).getTime();
    const bTime = new Date(b.publishedAt).getTime();
    if (sort === 'oldest') return aTime - bTime;
    if ((b.relevanceScore ?? 0) !== (a.relevanceScore ?? 0)) return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    return sort === 'oldest' ? aTime - bTime : bTime - aTime;
  });

  return {
    articles: sorted,
    relevance: relevance.diagnostics,
  };
}

function jsonResponse(
  result: ProviderApiResponse<MarketNewsArticle[]>,
  searchParams: URLSearchParams,
  relevanceContext: MarketNewsRelevanceContext,
  responseLimit: number,
  status = 200,
) {
  const filtered: {
    articles: Array<MarketNewsArticle & { relevanceScore?: number; relevanceReasons?: string[]; relevanceBucket?: string }>;
    relevance: MarketNewsRelevanceFilterResult['diagnostics'];
  } = result.status === 'success'
    ? applyLocalFilters(result.data, searchParams, relevanceContext)
    : {
      articles: result.data,
      relevance: filterMarketNewsByRelevance([], relevanceContext).diagnostics,
    };
  const limitedArticles = filtered.articles.slice(0, responseLimit);
  const items = limitedArticles.map(toUiArticle);
  const code = result.status === 'success'
    ? result.messageCode ? safeCode(result.messageCode, 'NEWS_NO_RESULTS') : null
    : safeCode(result.messageCode, result.status);
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'market_news',
    provider: result.provider === 'finnhub' ? 'Finnhub' : result.provider,
    providerStatus: result.status,
    data: items,
    lastUpdated: result.lastSuccessfulUpdate,
  });

  return NextResponse.json({
    ...diagnostic,
    cached: result.cached,
    stale: result.stale,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    updated_at: result.lastSuccessfulUpdate,
    messageCode: result.messageCode,
    code,
    items,
    relevance: {
      ...filtered.relevance,
      returned: items.length,
    },
    success: result.status === 'success',
    source: result.provider,
    total: diagnostic.count,
    legacyStatus: result.status,
  }, {
    status,
    headers: result.status === 'success' ? SUCCESS_HEADERS : ERROR_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scope = safeScope(searchParams.get('scope'));
  const symbol = safeSymbol(searchParams.get('symbol'));
  const range = parseDateRange(searchParams);

  if (scope === 'invalid' || 'error' in range || (scope === 'asset' && !symbol)) {
    return jsonResponse({
      status: 'invalid_request',
      provider: 'finnhub',
      data: [],
      cached: false,
      stale: false,
      lastSuccessfulUpdate: null,
      messageCode: 'provider_invalid_request',
    }, searchParams, buildRelevanceContext(searchParams, symbol || null), 0, 400);
  }

  const limit = clampNumber(searchParams.get('limit'), 20, 1, 50);
  const relevanceContext = buildRelevanceContext(searchParams, symbol || null);
  const providerLimit = Math.min(50, Math.max(limit, limit * 4));
  const query: MarketNewsQuery = {
    scope,
    symbol: symbol || null,
    from: range.from,
    to: range.to,
    limit: providerLimit,
    force: searchParams.has('refresh'),
  };

  const result = await getMarketNews(query);
  return jsonResponse(result, searchParams, relevanceContext, limit);
}
