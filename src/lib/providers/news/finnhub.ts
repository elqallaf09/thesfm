import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  normalizeTitle,
  ProviderError,
  safeExternalUrl,
  shortText,
  stableId,
} from '../shared';
import type { MarketNewsArticle, MarketNewsProvider, MarketNewsQuery } from './types';

const FINNHUB_TIMEOUT_MS = 8000;

type FinnhubArticle = {
  id?: number | string | null;
  headline?: string | null;
  summary?: string | null;
  source?: string | null;
  url?: string | null;
  image?: string | null;
  datetime?: number | null;
  category?: string | null;
  related?: string | null;
};

function normalizeSymbol(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9._:-]/g, '').slice(0, 32);
}

function normalizeRelatedSymbols(article: FinnhubArticle, query: MarketNewsQuery) {
  const related = String(article.related ?? '')
    .split(/[,;\s]+/)
    .map(normalizeSymbol)
    .filter(Boolean);
  const querySymbol = normalizeSymbol(query.symbol);
  return [...new Set([querySymbol, ...related].filter(Boolean))].slice(0, 10);
}

export function normalizeFinnhubNewsArticle(article: FinnhubArticle, index: number, query: MarketNewsQuery): MarketNewsArticle | null {
  const headline = shortText(article.headline, 240);
  if (!headline) return null;
  const sourceUrl = safeExternalUrl(article.url);
  if (!sourceUrl) return null;
  const publishedAt = typeof article.datetime === 'number' && article.datetime > 0
    ? new Date(article.datetime * 1000).toISOString()
    : '';
  const providerId = article.id === null || article.id === undefined ? '' : shortText(String(article.id), 80);
  const source = shortText(article.source, 120) || 'Finnhub';
  const id = stableId(providerId || sourceUrl || `${source}-${headline}`, `finnhub-news-${index}`);

  return {
    id,
    headline,
    summary: shortText(article.summary, 360) || null,
    source,
    sourceUrl,
    imageUrl: safeExternalUrl(article.image) || null,
    publishedAt,
    category: shortText(article.category, 80) || null,
    relatedSymbols: normalizeRelatedSymbols(article, query),
    sentiment: null,
    sentimentSource: null,
    provider: 'finnhub',
  };
}

export function dedupeMarketNewsArticles(articles: MarketNewsArticle[]) {
  const seen = new Set<string>();
  const result: MarketNewsArticle[] = [];
  for (const article of articles) {
    const dedupeKey = article.sourceUrl
      || article.id
      || `${article.source.toLowerCase()}::${normalizeTitle(article.headline)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(article);
  }
  return result;
}

function providerFetchOptions(force?: boolean): RequestInit & { next?: { revalidate: number } } {
  return force
    ? { cache: 'no-store', signal: AbortSignal.timeout(FINNHUB_TIMEOUT_MS) }
    : { next: { revalidate: 120 }, signal: AbortSignal.timeout(FINNHUB_TIMEOUT_MS) };
}

async function fetchFinnhubJson(url: URL, force?: boolean) {
  const response = await fetch(url, providerFetchOptions(force));
  if (!response.ok) {
    const status = mapHttpProviderStatus(response.status);
    throw new ProviderError(status, messageCodeForStatus(status) ?? 'provider_temporarily_unavailable', response.status);
  }
  return response.json().catch(() => []);
}

export function createFinnhubNewsProvider(apiKey: string): MarketNewsProvider {
  return {
    provider: 'finnhub',
    async getArticles(query) {
      const requests: Promise<unknown>[] = [];

      const generalUrl = new URL('https://finnhub.io/api/v1/news');
      generalUrl.searchParams.set('category', 'general');
      generalUrl.searchParams.set('token', apiKey);
      requests.push(fetchFinnhubJson(generalUrl, query.force));

      const symbol = normalizeSymbol(query.symbol);
      if (symbol) {
        const companyUrl = new URL('https://finnhub.io/api/v1/company-news');
        companyUrl.searchParams.set('symbol', symbol);
        companyUrl.searchParams.set('from', query.from);
        companyUrl.searchParams.set('to', query.to);
        companyUrl.searchParams.set('token', apiKey);
        requests.push(fetchFinnhubJson(companyUrl, query.force));
      }

      const payloads = await Promise.all(requests);
      const rawArticles = payloads.flatMap(payload => Array.isArray(payload) ? payload as FinnhubArticle[] : []);
      return dedupeMarketNewsArticles(
        rawArticles
          .map((item, index) => normalizeFinnhubNewsArticle(item, index, query))
          .filter((item): item is MarketNewsArticle => Boolean(item)),
      )
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, query.limit);
    },
  };
}
