import { NextResponse } from 'next/server';
import { getCentralBankNewsProviderConfig } from '@/lib/market/providerConfig';

export const revalidate = 600;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
};
const REQUEST_TIMEOUT_MS = 7000;

type NewsApiArticle = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null } | null;
};

const CENTRAL_BANK_QUERY = [
  '"Federal Reserve"',
  'Fed',
  'ECB',
  '"European Central Bank"',
  'BoE',
  '"Bank of England"',
  'BoJ',
  '"Bank of Japan"',
  '"central bank"',
  '"interest rates"',
].join(' OR ');

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function unavailableResponse(code: string) {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    provider: null,
    items: [],
    updated_at: null,
  }, { status: 200, headers: cacheHeaders });
}

function shortText(value: unknown, maxLength = 280) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function inferRelatedCentralBank(title: string, summary: string) {
  const text = `${title} ${summary}`.toLowerCase();
  if (/\bfed\b|federal reserve/.test(text)) return 'Fed / USD';
  if (/\becb\b|european central bank/.test(text)) return 'ECB / EUR';
  if (/\bboe\b|bank of england/.test(text)) return 'BoE / GBP';
  if (/\bboj\b|bank of japan/.test(text)) return 'BoJ / JPY';
  return 'Central banks';
}

function stableId(article: NewsApiArticle, index: number) {
  const base = article.url || article.title || `central-bank-news-${index}`;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `central-bank-news-${index}`;
}

function normalizeArticle(article: NewsApiArticle, index: number) {
  const title = shortText(article.title, 180);
  if (!title) return null;
  const summary = shortText(article.description);
  const url = shortText(article.url, 500);
  const source = shortText(article.source?.name, 90) || 'NewsAPI';
  const related = inferRelatedCentralBank(title, summary);

  return {
    id: stableId(article, index),
    title,
    headline: title,
    summary,
    description: summary,
    source,
    provider: 'newsapi',
    url,
    publishedAt: article.publishedAt || null,
    bank: related,
    currency: related,
  };
}

export async function GET() {
  const config = getCentralBankNewsProviderConfig();

  if (!config.apiKey) {
    return unavailableResponse('CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED');
  }

  if (!config.provider || config.provider !== 'newsapi') {
    return unavailableResponse('CENTRAL_BANK_NEWS_PROVIDER_UNAVAILABLE');
  }

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', CENTRAL_BANK_QUERY);
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', '18');
    url.searchParams.set('apiKey', config.apiKey);

    const response = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (shouldDebug()) {
        console.warn('[central-bank-news] NewsAPI request failed', { status: response.status, provider: config.provider });
      }
      return unavailableResponse('CENTRAL_BANK_NEWS_PROVIDER_ERROR');
    }

    const payload = await response.json().catch(() => ({})) as { articles?: NewsApiArticle[] };
    const items = (Array.isArray(payload.articles) ? payload.articles : [])
      .map(normalizeArticle)
      .filter((item): item is NonNullable<ReturnType<typeof normalizeArticle>> => Boolean(item));

    if (shouldDebug()) {
      console.info('[central-bank-news] NewsAPI normalized articles', { count: items.length, provider: config.provider });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      provider: 'newsapi',
      source: 'NewsAPI',
      items,
      updated_at: new Date().toISOString(),
    }, { status: 200, headers: cacheHeaders });
  } catch (error) {
    if (shouldDebug()) {
      console.warn('[central-bank-news] provider error', error instanceof Error ? error.message : error);
    }
    return unavailableResponse(isTimeoutError(error) ? 'MARKET_DATA_TIMEOUT' : 'CENTRAL_BANK_NEWS_PROVIDER_ERROR');
  }
}
