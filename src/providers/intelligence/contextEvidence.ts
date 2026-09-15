import type { AnalysisRequest, CanonicalAssetIdentity } from '@/domain/intelligence/contracts';
import { cleanEnv } from '@/lib/market/providerConfig';
import { getMyfxbookSentiment } from '@/lib/market/providers/myfxbook';
import { buildMarketNewsRelevanceContext, filterMarketNewsByRelevance } from '@/lib/providers/news/relevance';
import { getMarketNews } from '@/lib/providers/news';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

export type IntelligenceContextNewsArticle = {
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentSource: 'provider' | 'ai' | null;
};

export type IntelligenceContextSentiment = {
  provider: 'finnhub' | 'alphavantage' | 'myfxbook';
  positivePercent: number;
  negativePercent: number;
  sampleSize: number;
  observedAt: string | null;
};

export type IntelligenceContextMacroEvent = {
  title: string;
  country: string | null;
  currency: string | null;
  dateTimeUtc: string;
  impact: 'high' | 'medium' | 'low' | 'unknown';
  actual: string | number | null;
  forecast: string | number | null;
  previous: string | number | null;
  provider: string;
};

export type IntelligenceContextEvidence = {
  news: {
    provider: string | null;
    observedAt: string | null;
    stale: boolean;
    articles: IntelligenceContextNewsArticle[];
    failureCode: string | null;
  };
  sentiment: IntelligenceContextSentiment | null;
  macro: {
    provider: string | null;
    observedAt: string | null;
    stale: boolean;
    events: IntelligenceContextMacroEvent[];
    failureCode: string | null;
  };
  sharia: {
    status: 'compliant' | 'non_compliant' | 'needs_review' | 'unclassified';
    reason: string | null;
    source: string | null;
    reviewedAt: string | null;
  } | null;
};

const SENTIMENT_TIMEOUT_MS = 7_000;
const NEWS_LOOKBACK_DAYS = 7;
const MACRO_LOOKBACK_DAYS = 3;
const MACRO_LOOKAHEAD_DAYS = 7;

function dateOnly(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validIso(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compactAlphaVantage = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  const normalized = compactAlphaVantage
    ? `${compactAlphaVantage[1]}-${compactAlphaVantage[2]}-${compactAlphaVantage[3]}T${compactAlphaVantage[4]}:${compactAlphaVantage[5]}:${compactAlphaVantage[6]}Z`
    : raw;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function rootSymbol(asset: CanonicalAssetIdentity) {
  const symbol = String(asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbol).trim().toUpperCase();
  return symbol.replace(/\.(KW|SR|SA|AE|DU|AD|QA|BH|OM|US)$/i, '').replace(/:.+$/, '');
}

function cryptoSentimentSymbol(asset: CanonicalAssetIdentity) {
  const root = rootSymbol(asset).replace(/[-_/](USD|USDT)$/i, '').replace(/(USD|USDT)$/i, '');
  return root ? `CRYPTO:${root}` : '';
}

async function loadNews(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence['news']> {
  const now = Date.now();
  const queryBase = {
    from: dateOnly(now - NEWS_LOOKBACK_DAYS * 86_400_000),
    to: dateOnly(now),
    limit: 40,
    force: request.forceRefresh,
  };

  const assetResponse = await getMarketNews({
    ...queryBase,
    scope: 'asset',
    symbol: asset.providerSymbol,
  }).catch(() => null);

  let provider = assetResponse?.provider ?? null;
  let stale = Boolean(assetResponse?.stale);
  let failureCode = assetResponse && assetResponse.status !== 'success' ? assetResponse.messageCode ?? assetResponse.status : null;
  let articles = assetResponse?.data ?? [];

  if (articles.length === 0) {
    const generalResponse = await getMarketNews({ ...queryBase, scope: 'general', symbol: null }).catch(() => null);
    if (generalResponse) {
      provider = generalResponse.provider ?? provider;
      stale = stale || Boolean(generalResponse.stale);
      failureCode = generalResponse.status !== 'success' ? generalResponse.messageCode ?? generalResponse.status : failureCode;
      const context = buildMarketNewsRelevanceContext({
        market: asset.country === 'KW' ? 'kuwait' : asset.market,
        category: asset.assetType === 'CRYPTO' ? 'crypto' : asset.assetType === 'FOREX' ? 'forex' : asset.assetType === 'COMMODITY' ? 'commodity' : 'stock',
        symbols: [asset.displaySymbol, asset.providerSymbol, asset.canonicalSymbol],
      });
      articles = filterMarketNewsByRelevance(generalResponse.data ?? [], context).articles;
    }
  }

  const normalized = articles
    .filter(item => item.headline && Number.isFinite(Date.parse(item.publishedAt)))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, 12)
    .map(item => ({
      headline: item.headline,
      source: item.source,
      publishedAt: item.publishedAt,
      sentiment: item.sentiment,
      sentimentSource: item.sentimentSource,
    }));

  return {
    provider,
    observedAt: normalized[0]?.publishedAt ?? assetResponse?.lastSuccessfulUpdate ?? null,
    stale,
    articles: normalized,
    failureCode: normalized.length ? null : failureCode ?? 'NEWS_NO_RELEVANT_RESULTS',
  };
}

type FinnhubSentimentEntry = {
  atTime?: string;
  positiveMention?: number;
  negativeMention?: number;
  positiveScore?: number;
  negativeScore?: number;
  score?: number;
};

async function finnhubSentiment(asset: CanonicalAssetIdentity, apiKey: string): Promise<IntelligenceContextSentiment | null> {
  if (asset.assetType !== 'STOCK') return null;
  const symbol = rootSymbol(asset);
  if (!symbol) return null;
  const to = new Date();
  const from = new Date(Date.now() - 7 * 86_400_000);
  const url = new URL('https://finnhub.io/api/v1/stock/social-sentiment');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('from', dateOnly(from.getTime()));
  url.searchParams.set('to', dateOnly(to.getTime()));
  url.searchParams.set('token', apiKey);
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(SENTIMENT_TIMEOUT_MS) });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({})) as { reddit?: FinnhubSentimentEntry[]; twitter?: FinnhubSentimentEntry[] };
  const entries = [...(payload.reddit ?? []), ...(payload.twitter ?? [])].slice(-60);
  let positive = 0;
  let negative = 0;
  let sampleSize = 0;
  let observedAt: string | null = null;

  for (const entry of entries) {
    const positiveMention = finite(entry.positiveMention);
    const negativeMention = finite(entry.negativeMention);
    if (positiveMention !== null || negativeMention !== null) {
      positive += Math.max(0, positiveMention ?? 0);
      negative += Math.max(0, negativeMention ?? 0);
      sampleSize += Math.max(0, (positiveMention ?? 0) + (negativeMention ?? 0));
    } else {
      const positiveScore = finite(entry.positiveScore);
      const negativeScore = finite(entry.negativeScore);
      const score = finite(entry.score);
      if (positiveScore !== null || negativeScore !== null) {
        positive += Math.max(0, positiveScore ?? 0);
        negative += Math.max(0, Math.abs(negativeScore ?? 0));
        sampleSize += 1;
      } else if (score !== null) {
        if (score >= 0) positive += score;
        else negative += Math.abs(score);
        sampleSize += 1;
      }
    }
    observedAt = validIso(entry.atTime) ?? observedAt;
  }

  const total = positive + negative;
  if (total <= 0 || sampleSize <= 0) return null;
  return {
    provider: 'finnhub',
    positivePercent: clampPercent((positive / total) * 100),
    negativePercent: clampPercent((negative / total) * 100),
    sampleSize: Math.max(1, Math.round(sampleSize)),
    observedAt,
  };
}

type AlphaVantageSentimentEntry = {
  ticker?: string;
  ticker_sentiment_score?: string;
};

type AlphaVantageSentimentArticle = {
  time_published?: string;
  ticker_sentiment?: AlphaVantageSentimentEntry[];
};

async function alphaVantageSentiment(asset: CanonicalAssetIdentity, apiKey: string): Promise<IntelligenceContextSentiment | null> {
  if (asset.assetType !== 'STOCK' && asset.assetType !== 'CRYPTO') return null;
  const ticker = asset.assetType === 'CRYPTO' ? cryptoSentimentSymbol(asset) : rootSymbol(asset);
  if (!ticker) return null;
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'NEWS_SENTIMENT');
  url.searchParams.set('tickers', ticker);
  url.searchParams.set('limit', '50');
  url.searchParams.set('apikey', apiKey);
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(SENTIMENT_TIMEOUT_MS) });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({})) as { feed?: AlphaVantageSentimentArticle[] };
  if (!Array.isArray(payload.feed)) return null;
  let positive = 0;
  let negative = 0;
  let sampleSize = 0;
  let observedAt: string | null = null;
  const expectedTicker = ticker.replace(/^CRYPTO:/, '');

  for (const article of payload.feed) {
    for (const entry of article.ticker_sentiment ?? []) {
      const providerTicker = String(entry.ticker ?? '').trim().toUpperCase().replace(/^CRYPTO:/, '');
      if (providerTicker !== expectedTicker && providerTicker !== rootSymbol(asset)) continue;
      const score = finite(entry.ticker_sentiment_score);
      if (score === null) continue;
      if (score >= 0) positive += Math.abs(score);
      else negative += Math.abs(score);
      sampleSize += 1;
      observedAt = validIso(article.time_published) ?? observedAt;
    }
  }

  const total = positive + negative;
  if (total <= 0 || sampleSize === 0) return null;
  return {
    provider: 'alphavantage',
    positivePercent: clampPercent((positive / total) * 100),
    negativePercent: clampPercent((negative / total) * 100),
    sampleSize,
    observedAt,
  };
}

async function myfxbookSentiment(asset: CanonicalAssetIdentity, force: boolean): Promise<IntelligenceContextSentiment | null> {
  if (asset.assetType !== 'FOREX' && asset.assetType !== 'COMMODITY') return null;
  const result = await getMyfxbookSentiment(asset.providerSymbol || asset.displaySymbol, { force }).catch(() => null);
  if (!result?.ok || !result.items.length) return null;
  const item = result.items[0];
  const positive = finite(item.buyPercent ?? item.longPercentage);
  const negative = finite(item.sellPercent ?? item.shortPercentage);
  if (positive === null || negative === null || positive + negative <= 0) return null;
  return {
    provider: 'myfxbook',
    positivePercent: clampPercent(positive),
    negativePercent: clampPercent(negative),
    sampleSize: Math.max(1, Math.round(finite(item.totalPositions) ?? finite(item.positions) ?? 1)),
    observedAt: validIso(item.updatedAt ?? result.updated_at),
  };
}

async function loadSentiment(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<IntelligenceContextSentiment | null> {
  const explicit = cleanEnv(process.env.MARKET_SENTIMENT_PROVIDER).toLowerCase().replace(/[_\s-]+/g, '');
  const genericKey = cleanEnv(process.env.MARKET_SENTIMENT_API_KEY);
  const finnhubKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const alphaKey = cleanEnv(process.env.ALPHA_VANTAGE_API_KEY);

  if ((asset.assetType === 'FOREX' || asset.assetType === 'COMMODITY') && (explicit === 'myfxbook' || cleanEnv(process.env.MYFXBOOK_EMAIL))) {
    const result = await myfxbookSentiment(asset, request.forceRefresh);
    if (result) return result;
    if (explicit === 'myfxbook') return null;
  }

  const providers: Array<() => Promise<IntelligenceContextSentiment | null>> = [];
  if (explicit === 'alphavantage') {
    const key = genericKey || alphaKey;
    if (key) providers.push(() => alphaVantageSentiment(asset, key));
  } else if (explicit === 'finnhub') {
    const key = genericKey || finnhubKey;
    if (key) providers.push(() => finnhubSentiment(asset, key));
  } else {
    if (finnhubKey) providers.push(() => finnhubSentiment(asset, finnhubKey));
    if (alphaKey) providers.push(() => alphaVantageSentiment(asset, alphaKey));
  }

  for (const provider of providers) {
    const result = await provider().catch(() => null);
    if (result) return result;
  }
  return null;
}

async function loadMacro(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence['macro']> {
  const now = Date.now();
  const response = await getEconomicCalendar({
    from: dateOnly(now - MACRO_LOOKBACK_DAYS * 86_400_000),
    to: dateOnly(now + MACRO_LOOKAHEAD_DAYS * 86_400_000),
    currency: asset.quoteCurrency || undefined,
    force: request.forceRefresh,
  }).catch(() => null);

  const events = (response?.data ?? [])
    .filter(event => Number.isFinite(Date.parse(event.dateTimeUtc)))
    .sort((left, right) => Date.parse(left.dateTimeUtc) - Date.parse(right.dateTimeUtc))
    .slice(0, 24)
    .map(event => ({
      title: event.title,
      country: event.country,
      currency: event.currency,
      dateTimeUtc: event.dateTimeUtc,
      impact: event.impact,
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous,
      provider: event.provider,
    }));

  return {
    provider: response?.provider ?? null,
    observedAt: response?.lastSuccessfulUpdate ?? null,
    stale: Boolean(response?.stale),
    events,
    failureCode: events.length ? null : response?.messageCode ?? response?.status ?? 'MACRO_NO_RELEVANT_EVENTS',
  };
}

type StoredShariaRow = {
  shariah_status?: string | null;
  shariah_reason?: string | null;
  shariah_source?: string | null;
  shariah_last_reviewed_at?: string | null;
};

function trustedStoredSharia(row: StoredShariaRow | null | undefined): IntelligenceContextEvidence['sharia'] {
  if (!row) return null;
  const status = normalizeShariahStatus(row.shariah_status, null);
  const source = String(row.shariah_source ?? '').trim() || null;
  const reviewedAt = validIso(row.shariah_last_reviewed_at);
  if (!status || status === 'unclassified' || !source || !reviewedAt) return null;
  return {
    status,
    reason: String(row.shariah_reason ?? '').trim() || null,
    source,
    reviewedAt,
  };
}

async function loadSharia(asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence['sharia']> {
  const admin = createServerSupabaseAdmin();
  if (!admin || asset.assetType !== 'STOCK') return null;
  const root = rootSymbol(asset);
  const columns = 'shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at';

  try {
    const byProvider = await admin
      .from('market_symbols')
      .select(columns)
      .eq('provider_symbol', asset.providerSymbol)
      .limit(1)
      .maybeSingle()
      .abortSignal(AbortSignal.timeout(2500));
    const providerSharia = trustedStoredSharia(byProvider.data as StoredShariaRow | null);
    if (providerSharia) return providerSharia;

    const bySymbol = await admin
      .from('market_symbols')
      .select(columns)
      .eq('symbol', root)
      .limit(1)
      .maybeSingle()
      .abortSignal(AbortSignal.timeout(2500));
    const symbolSharia = trustedStoredSharia(bySymbol.data as StoredShariaRow | null);
    if (symbolSharia) return symbolSharia;

    const published = await admin
      .from('shariah_published_opinions')
      .select('source,symbol,opinion,original_wording,as_of,issued_at,publisher,review_after')
      .eq('symbol', root)
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle()
      .abortSignal(AbortSignal.timeout(2500));
    const opinion = normalizeShariahStatus(published.data?.opinion, null);
    const reviewedAt = validIso(published.data?.issued_at ?? published.data?.as_of);
    if (opinion && opinion !== 'unclassified' && reviewedAt) {
      return {
        status: opinion,
        reason: String(published.data?.original_wording ?? '').trim() || null,
        source: String(published.data?.publisher ?? published.data?.source ?? 'Published Shariah opinion').trim(),
        reviewedAt,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadIntelligenceContextEvidence(
  request: AnalysisRequest,
  asset: CanonicalAssetIdentity,
): Promise<IntelligenceContextEvidence> {
  const [news, sentiment, macro, sharia] = await Promise.all([
    loadNews(request, asset).catch(() => ({ provider: null, observedAt: null, stale: false, articles: [], failureCode: 'NEWS_PROVIDER_FAILED' })),
    loadSentiment(request, asset).catch(() => null),
    loadMacro(request, asset).catch(() => ({ provider: null, observedAt: null, stale: false, events: [], failureCode: 'MACRO_PROVIDER_FAILED' })),
    loadSharia(asset).catch(() => null),
  ]);
  return { news, sentiment, macro, sharia };
}
