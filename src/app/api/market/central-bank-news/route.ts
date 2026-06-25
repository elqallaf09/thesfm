import { NextResponse } from 'next/server';
import { cleanEnv } from '@/lib/market/providerConfig';

export const revalidate = 600;
export const dynamic = 'force-dynamic';

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
};
const unavailableHeaders = {
  'Cache-Control': 'no-store',
};
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ITEMS = 18;

type ProviderName = 'newsapi' | 'finnhub';
type CentralBankCode = 'Fed' | 'ECB' | 'BoE' | 'BoJ' | 'SNB' | 'BoC' | 'RBA';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD';

type ProviderCandidate = {
  provider: ProviderName;
  envName: 'CENTRAL_BANK_NEWS_API_KEY' | 'NEWS_API_KEY' | 'FINNHUB_API_KEY';
  apiKey: string;
  source: 'NewsAPI' | 'Finnhub';
};

type NewsApiArticle = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null } | null;
};

type FinnhubNewsArticle = {
  headline?: string | null;
  summary?: string | null;
  url?: string | null;
  datetime?: number | null;
  source?: string | null;
};

type NormalizedCentralBankNewsItem = {
  id: string;
  headline: string;
  source: string;
  published_at: string;
  url: string;
  related_bank: CentralBankCode | null;
  related_currency: CurrencyCode | null;
  summary: string | null;
};

const CENTRAL_BANK_QUERY = [
  '"Federal Reserve"',
  'Fed',
  'FOMC',
  '"Jerome Powell"',
  '"European Central Bank"',
  'ECB',
  '"Bank of England"',
  'BoE',
  '"Bank of Japan"',
  'BoJ',
  '"Swiss National Bank"',
  'SNB',
  '"Bank of Canada"',
  'BoC',
  '"Reserve Bank of Australia"',
  'RBA',
  '"interest rates"',
  'inflation',
  'CPI',
  'NFP',
].join(' OR ');

const CENTRAL_BANK_KEYWORDS = [
  'federal reserve',
  'fomc',
  'jerome powell',
  'european central bank',
  'bank of england',
  'bank of japan',
  'swiss national bank',
  'bank of canada',
  'reserve bank of australia',
  'central bank',
  'interest rate',
  'interest rates',
  'rate decision',
  'monetary policy',
  'inflation',
  'cpi',
  'nfp',
];

const BANK_PATTERNS: Array<{ bank: CentralBankCode; currency: CurrencyCode; patterns: RegExp[] }> = [
  { bank: 'Fed', currency: 'USD', patterns: [/\bfed\b/i, /federal reserve/i, /fomc/i, /jerome powell/i] },
  { bank: 'ECB', currency: 'EUR', patterns: [/\becb\b/i, /european central bank/i] },
  { bank: 'BoE', currency: 'GBP', patterns: [/\bboe\b/i, /bank of england/i] },
  { bank: 'BoJ', currency: 'JPY', patterns: [/\bboj\b/i, /bank of japan/i] },
  { bank: 'SNB', currency: 'CHF', patterns: [/\bsnb\b/i, /swiss national bank/i] },
  { bank: 'BoC', currency: 'CAD', patterns: [/\bboc\b/i, /bank of canada/i] },
  { bank: 'RBA', currency: 'AUD', patterns: [/\brba\b/i, /reserve bank of australia/i] },
];

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function shortText(value: unknown, maxLength = 280) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function stableId(value: string, fallback: string) {
  return (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || fallback;
}

function providerCandidates(): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [
    {
      provider: 'newsapi',
      envName: 'CENTRAL_BANK_NEWS_API_KEY',
      apiKey: cleanEnv(process.env.CENTRAL_BANK_NEWS_API_KEY),
      source: 'NewsAPI',
    },
    {
      provider: 'newsapi',
      envName: 'NEWS_API_KEY',
      apiKey: cleanEnv(process.env.NEWS_API_KEY),
      source: 'NewsAPI',
    },
    {
      provider: 'finnhub',
      envName: 'FINNHUB_API_KEY',
      apiKey: cleanEnv(process.env.FINNHUB_API_KEY),
      source: 'Finnhub',
    },
  ];
  const seen = new Set<string>();
  return candidates.filter(candidate => {
    if (!candidate.apiKey) return false;
    const key = `${candidate.provider}:${candidate.apiKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function providerFetchOptions(forceRefresh: boolean): RequestInit & { next?: { revalidate: number } } {
  const options: RequestInit & { next?: { revalidate: number } } = {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
  if (forceRefresh) {
    options.cache = 'no-store';
  } else {
    options.next = { revalidate };
  }
  return options;
}

function inferBankAndCurrency(headline: string, summary: string): { bank: CentralBankCode | null; currency: CurrencyCode | null } {
  const text = `${headline} ${summary}`;
  const match = BANK_PATTERNS.find(item => item.patterns.some(pattern => pattern.test(text)));
  return {
    bank: match?.bank ?? null,
    currency: match?.currency ?? null,
  };
}

function isRelevantCentralBankNews(headline: string, summary: string) {
  const text = `${headline} ${summary}`.toLowerCase();
  const hasBank = BANK_PATTERNS.some(item => item.patterns.some(pattern => pattern.test(text)));
  return hasBank || CENTRAL_BANK_KEYWORDS.some(keyword => text.includes(keyword));
}

function normalizeNewsApiArticle(article: NewsApiArticle, index: number): NormalizedCentralBankNewsItem | null {
  const headline = shortText(article.title, 180);
  if (!headline) return null;
  const summary = shortText(article.description) || null;
  if (!isRelevantCentralBankNews(headline, summary ?? '')) return null;
  const related = inferBankAndCurrency(headline, summary ?? '');
  const url = shortText(article.url, 500);

  return {
    id: stableId(url || headline, `newsapi-central-bank-${index}`),
    headline,
    source: shortText(article.source?.name, 90) || 'NewsAPI',
    published_at: article.publishedAt || '',
    url,
    related_bank: related.bank,
    related_currency: related.currency,
    summary,
  };
}

function normalizeFinnhubArticle(article: FinnhubNewsArticle, index: number): NormalizedCentralBankNewsItem | null {
  const headline = shortText(article.headline, 180);
  if (!headline) return null;
  const summary = shortText(article.summary) || null;
  if (!isRelevantCentralBankNews(headline, summary ?? '')) return null;
  const related = inferBankAndCurrency(headline, summary ?? '');
  const url = shortText(article.url, 500);
  const publishedAt = typeof article.datetime === 'number' && article.datetime > 0
    ? new Date(article.datetime * 1000).toISOString()
    : '';

  return {
    id: stableId(url || headline, `finnhub-central-bank-${index}`),
    headline,
    source: shortText(article.source, 90) || 'Finnhub',
    published_at: publishedAt,
    url,
    related_bank: related.bank,
    related_currency: related.currency,
    summary,
  };
}

async function fetchNewsApiItems(candidate: ProviderCandidate, forceRefresh: boolean) {
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', CENTRAL_BANK_QUERY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', String(MAX_ITEMS * 2));
  url.searchParams.set('apiKey', candidate.apiKey);

  const response = await fetch(url, providerFetchOptions(forceRefresh));

  if (!response.ok) {
    if (shouldDebug()) {
      console.warn('[central-bank-news] provider failed', { provider: candidate.provider, envName: candidate.envName, status: response.status });
    }
    return null;
  }

  const payload = await response.json().catch(() => ({})) as { articles?: NewsApiArticle[]; status?: string };
  if (payload.status === 'error') return null;
  return (Array.isArray(payload.articles) ? payload.articles : [])
    .map(normalizeNewsApiArticle)
    .filter((item): item is NormalizedCentralBankNewsItem => Boolean(item))
    .slice(0, MAX_ITEMS);
}

async function fetchFinnhubItems(candidate: ProviderCandidate, forceRefresh: boolean) {
  const url = new URL('https://finnhub.io/api/v1/news');
  url.searchParams.set('category', 'general');
  url.searchParams.set('token', candidate.apiKey);

  const response = await fetch(url, providerFetchOptions(forceRefresh));

  if (!response.ok) {
    if (shouldDebug()) {
      console.warn('[central-bank-news] provider failed', { provider: candidate.provider, envName: candidate.envName, status: response.status });
    }
    return null;
  }

  const payload = await response.json().catch(() => []) as FinnhubNewsArticle[];
  return (Array.isArray(payload) ? payload : [])
    .map(normalizeFinnhubArticle)
    .filter((item): item is NormalizedCentralBankNewsItem => Boolean(item))
    .slice(0, MAX_ITEMS);
}

async function fetchProviderItems(candidate: ProviderCandidate, forceRefresh: boolean) {
  return candidate.provider === 'finnhub'
    ? fetchFinnhubItems(candidate, forceRefresh)
    : fetchNewsApiItems(candidate, forceRefresh);
}

function unavailableResponse(code: 'CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED' | 'CENTRAL_BANK_NEWS_PROVIDER_FAILED') {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    source: null,
    items: [],
    updated_at: null,
  }, { status: 200, headers: unavailableHeaders });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const forceRefresh = requestUrl.searchParams.has('refresh');
  const candidates = providerCandidates();

  if (candidates.length === 0) {
    return unavailableResponse('CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED');
  }

  let hadSuccessfulProvider = false;
  const emptyProviders: string[] = [];

  for (const candidate of candidates) {
    try {
      const items = await fetchProviderItems(candidate, forceRefresh);
      if (!items) continue;
      hadSuccessfulProvider = true;

      if (items.length > 0) {
        if (shouldDebug()) {
          console.info('[central-bank-news] normalized provider response', {
            count: items.length,
            provider: candidate.provider,
            envName: candidate.envName,
          });
        }
        return NextResponse.json({
          ok: true,
          success: true,
          code: undefined,
          source: candidate.source,
          items,
          updated_at: new Date().toISOString(),
        }, { status: 200, headers: cacheHeaders });
      }

      emptyProviders.push(candidate.provider);
    } catch (error) {
      if (shouldDebug()) {
        console.warn('[central-bank-news] provider attempt failed', {
          provider: candidate.provider,
          envName: candidate.envName,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (hadSuccessfulProvider) {
    if (shouldDebug()) {
      console.info('[central-bank-news] no relevant central bank news returned', { emptyProviders });
    }
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'NO_CENTRAL_BANK_NEWS',
      source: emptyProviders.join(', ') || null,
      items: [],
      updated_at: new Date().toISOString(),
    }, { status: 200, headers: cacheHeaders });
  }

  return unavailableResponse('CENTRAL_BANK_NEWS_PROVIDER_FAILED');
}
