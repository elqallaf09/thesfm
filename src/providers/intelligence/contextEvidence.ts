import type { AnalysisRequest, CanonicalAssetIdentity, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import { cleanEnv } from '@/lib/market/providerConfig';
import { getMyfxbookSentiment, resolveMyfxbookSymbol } from '@/lib/market/providers/myfxbook';
import { getMarketNews } from '@/lib/providers/news';
import type { MarketNewsArticle } from '@/lib/providers/news/types';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { loadStoredIntelligenceSharia } from '@/lib/server/intelligenceShariaEvidence';
import { loadResearchIntelligenceSharia } from '@/lib/server/intelligenceResearchSharia';
import { loadOfficialMacroCalendar } from './officialMacroCalendar';
import { loadStoredNewsEvidence } from './storedNewsEvidence';

export type IntelligenceContextNewsArticle = {
  headline: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentSource: 'provider' | 'ai' | null;
};
export type IntelligenceContextSentiment = {
  provider: 'finnhub' | 'finnhub-news' | 'alphavantage' | 'myfxbook';
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
  news: { provider: string | null; observedAt: string | null; stale: boolean; articles: IntelligenceContextNewsArticle[]; failureCode: string | null };
  sentiment: IntelligenceContextSentiment | null;
  macro: { provider: string | null; observedAt: string | null; stale: boolean; events: IntelligenceContextMacroEvent[]; failureCode: string | null };
  sharia: VerifiedIntelligenceSnapshot['sharia'] | null;
};

const DAY = 86_400_000;
const CONTEXT_BUDGET_MS = 9000;
const SENTIMENT_AGE_MS = { INTRADAY: 6 * 3600_000, SHORT_TERM: 12 * 3600_000, SWING: 2 * DAY, POSITION: 5 * DAY, LONG_TERM: 7 * DAY };
const EMPTY_NEWS: IntelligenceContextEvidence['news'] = { provider: null, observedAt: null, stale: false, articles: [], failureCode: 'NEWS_NO_RELEVANT_RESULTS' };
const EMPTY_MACRO: IntelligenceContextEvidence['macro'] = { provider: null, observedAt: null, stale: false, events: [], failureCode: 'MACRO_NO_RELEVANT_EVENTS' };
const UNCLASSIFIED: VerifiedIntelligenceSnapshot['sharia'] = { status: 'unclassified', reason: null, source: null, reviewedAt: null };

export function contextNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function contextIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let raw = value.trim();
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (compact) raw = `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`;
  raw = raw.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) raw += 'Z';
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))?$/.test(raw)) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  const iso = new Date(parsed).toISOString();
  // Reject calendar rollovers such as February 30 rather than silently normalizing them.
  if (/Z$|^\d{4}-\d{2}-\d{2}$/.test(raw) && iso.slice(0, 10) !== raw.slice(0, 10)) return null;
  return iso;
}

function recent(value: unknown, now: number, maxAge: number): string | null {
  const iso = contextIso(value);
  return iso && Date.parse(iso) <= now && now - Date.parse(iso) <= maxAge ? iso : null;
}
function latest(left: string | null, right: string) { return !left || Date.parse(right) > Date.parse(left) ? right : left; }
function dateOnly(now: number) { return new Date(now).toISOString().slice(0, 10); }
function symbol(value: string) { return value.trim().toUpperCase(); }
function country(value: string | null) {
  const raw = String(value ?? '').trim().toUpperCase();
  const aliases: Record<string, string> = { KUWAIT: 'KW', USA: 'US', 'UNITED STATES': 'US', 'SAUDI ARABIA': 'SA', UAE: 'AE', 'UNITED ARAB EMIRATES': 'AE', QATAR: 'QA', BAHRAIN: 'BH', OMAN: 'OM', UK: 'GB', 'UNITED KINGDOM': 'GB' };
  return aliases[raw] ?? raw;
}
function usStock(asset: CanonicalAssetIdentity) {
  return asset.assetType === 'STOCK' && country(asset.country) === 'US'
    && /^[A-Z][A-Z0-9.-]{0,14}$/.test(asset.providerSymbol)
    && !/\.(KW|SR|SA|AE|DU|AD|QA|BH|OM|L|TO|DE|PA)$/i.test(asset.providerSymbol);
}
function publicUrl(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && url.hostname.includes('.') && !/^(localhost|127\.|10\.|192\.168\.)/.test(url.hostname); }
  catch { return false; }
}

export function contextArticleMatches(article: MarketNewsArticle, asset: CanonicalAssetIdentity) {
  const expected = symbol(asset.providerSymbol);
  const related = article.relatedSymbols.map(symbol);
  if (related.includes(expected)) return true;
  // Never strip a market suffix to query or match a different security.
  const name = asset.name.trim().toLocaleLowerCase();
  if (name.length < 5 || name === asset.displaySymbol.toLocaleLowerCase()) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u')
    .test(`${article.headline} ${article.summary ?? ''}`.toLocaleLowerCase());
}

async function loadNews(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence['news']> {
  const now = Date.now();
  const query = { from: dateOnly(now - 7 * DAY), to: dateOnly(now), limit: 40, force: request.forceRefresh };
  const select = (items: MarketNewsArticle[]) => {
    const seen = new Set<string>();
    return items.filter(article => {
      if (!article.headline || !article.source || !publicUrl(article.sourceUrl) || !recent(article.publishedAt, now, 7 * DAY) || !contextArticleMatches(article, asset)) return false;
      const key = article.headline.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 12);
  };
  const stored = loadStoredNewsEvidence(asset).catch(() => null);
  let response = await getMarketNews({ ...query, scope: 'asset', symbol: asset.providerSymbol }).catch(() => null);
  let articles = response && !response.stale && response.status === 'success' ? select(response.data) : [];
  if (!articles.length) {
    const indexed = await stored;
    if (indexed) return indexed;
    const fallback = await getMarketNews({ ...query, scope: 'general', symbol: null }).catch(() => null);
    if (fallback && !fallback.stale && fallback.status === 'success') { response = fallback; articles = select(fallback.data); }
  }
  return {
    provider: response?.provider ?? null,
    observedAt: articles[0]?.publishedAt ?? null,
    stale: Boolean(response?.stale),
    articles: articles.map(article => ({ headline: article.headline, source: article.source, sourceUrl: article.sourceUrl, publishedAt: article.publishedAt, sentiment: article.sentiment, sentimentSource: article.sentimentSource })),
    failureCode: articles.length ? null : response?.messageCode ?? 'NEWS_NO_RELEVANT_RESULTS',
  };
}

async function finnhubNewsSentiment(asset: CanonicalAssetIdentity, key: string, deadline: number): Promise<IntelligenceContextSentiment | null> {
  if (!usStock(asset) || Date.now() >= deadline) return null;
  const url = new URL('https://finnhub.io/api/v1/news-sentiment');
  url.searchParams.set('symbol', asset.providerSymbol); url.searchParams.set('token', key);
  const response = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(Math.max(1, Math.min(3000, deadline - Date.now()))) });
  if (!response.ok) return null;
  const payload = await response.json();
  if (symbol(payload.symbol ?? '') !== asset.providerSymbol) return null;
  const positive = contextNumber(payload.sentiment?.bullishPercent), negative = contextNumber(payload.sentiment?.bearishPercent);
  const size = contextNumber(payload.buzz?.articlesInLastWeek);
  if (positive === null || negative === null || positive < 0 || negative < 0 || positive > 1 || negative > 1 || Math.abs(positive + negative - 1) > 0.01 || size === null || !Number.isInteger(size) || size <= 0) return null;
  // This endpoint is a current rolling-week aggregate, observed at retrieval, not article publication.
  return { provider: 'finnhub-news', positivePercent: positive * 100, negativePercent: negative * 100, sampleSize: size, observedAt: new Date().toISOString() };
}

type SocialEntry = { atTime?: string; positiveMention?: number; negativeMention?: number; positiveScore?: number; negativeScore?: number; score?: number };
async function finnhubSentiment(asset: CanonicalAssetIdentity, key: string, maxAge: number, deadline: number): Promise<IntelligenceContextSentiment | null> {
  if (!usStock(asset) || Date.now() >= deadline) return null;
  const now = Date.now();
  const url = new URL('https://finnhub.io/api/v1/stock/social-sentiment');
  url.searchParams.set('symbol', asset.providerSymbol);
  url.searchParams.set('from', dateOnly(now - 7 * DAY));
  url.searchParams.set('to', dateOnly(now));
  url.searchParams.set('token', key);
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.min(7000, deadline - now))) });
  if (!response.ok) return null;
  const payload = await response.json() as { reddit?: SocialEntry[]; twitter?: SocialEntry[] };
  const entries = [...(Array.isArray(payload.reddit) ? payload.reddit : []), ...(Array.isArray(payload.twitter) ? payload.twitter : [])];
  let positive = 0, negative = 0, observedAt: string | null = null;
  for (const entry of entries) {
    const stamp = recent(entry.atTime, now, maxAge);
    const up = contextNumber(entry.positiveMention), down = contextNumber(entry.negativeMention);
    // Count observations, not arbitrary score magnitudes; absent sample counts remain unavailable.
    if (!stamp || up === null || down === null || up < 0 || down < 0 || !Number.isInteger(up) || !Number.isInteger(down) || up + down === 0) continue;
    positive += up; negative += down; observedAt = latest(observedAt, stamp);
  }
  const total = positive + negative;
  if (!Number.isSafeInteger(total) || total <= 0 || !observedAt) return null;
  return { provider: 'finnhub', positivePercent: positive / total * 100, negativePercent: negative / total * 100, sampleSize: total, observedAt };
}

type NewsSentimentArticle = { url?: string; title?: string; time_published?: string; ticker_sentiment?: Array<{ ticker?: string; ticker_sentiment_score?: string }> };
async function alphaSentiment(asset: CanonicalAssetIdentity, key: string, maxAge: number, deadline: number): Promise<IntelligenceContextSentiment | null> {
  if (Date.now() >= deadline || (!usStock(asset) && asset.assetType !== 'CRYPTO')) return null;
  const ticker = asset.assetType === 'CRYPTO'
    ? `CRYPTO:${symbol(asset.providerSymbol).replace(/^CRYPTO:/, '').replace(/[-_/]?(USDT|USD)$/, '')}`
    : asset.providerSymbol;
  if (!/^(CRYPTO:)?[A-Z][A-Z0-9.-]{0,14}$/.test(ticker)) return null;
  const now = Date.now();
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'NEWS_SENTIMENT'); url.searchParams.set('tickers', ticker);
  url.searchParams.set('limit', '50'); url.searchParams.set('apikey', key);
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.min(7000, deadline - now))) });
  if (!response.ok) return null;
  const payload = await response.json() as { feed?: NewsSentimentArticle[] };
  if (!Array.isArray(payload.feed)) return null;
  let scoreSum = 0, sampleSize = 0, observedAt: string | null = null;
  const seen = new Set<string>();
  for (const article of payload.feed) {
    const stamp = recent(article.time_published, now, maxAge);
    const key = article.url || `${stamp}|${article.title ?? ''}`;
    if (!stamp || seen.has(key) || !Array.isArray(article.ticker_sentiment)) continue;
    const expected = ticker.replace(/^CRYPTO:/, '');
    const entry = article.ticker_sentiment.find(item => symbol(item.ticker ?? '').replace(/^CRYPTO:/, '') === expected);
    const score = contextNumber(entry?.ticker_sentiment_score);
    if (score === null || score < -1 || score > 1) continue;
    seen.add(key); scoreSum += score; sampleSize += 1; observedAt = latest(observedAt, stamp);
  }
  if (!sampleSize || !observedAt) return null;
  // Linear normalized sentiment index, not a probability of a winning trade.
  const positivePercent = (scoreSum / sampleSize + 1) * 50;
  return { provider: 'alphavantage', positivePercent, negativePercent: 100 - positivePercent, sampleSize, observedAt };
}

async function loadSentiment(request: AnalysisRequest, asset: CanonicalAssetIdentity, deadline: number): Promise<IntelligenceContextSentiment | null> {
  const maxAge = SENTIMENT_AGE_MS[request.horizon];
  if (asset.assetType === 'FOREX' || asset.assetType === 'COMMODITY') {
    const resolved = resolveMyfxbookSymbol(asset.providerSymbol || asset.displaySymbol);
    if (!resolved.ok) return null;
    const response = await getMyfxbookSentiment(resolved.symbol, { force: request.forceRefresh }).catch(() => null);
    if (!response?.ok || response.cacheStatus !== 'fresh') return null;
    const item = response.items.find(candidate => { const match = resolveMyfxbookSymbol(candidate.symbol); return match.ok && match.symbol === resolved.symbol; });
    if (!item) return null;
    const positive = contextNumber(item.buyPercent ?? item.longPercentage), negative = contextNumber(item.sellPercent ?? item.shortPercentage);
    const size = contextNumber(item.totalPositions ?? item.positions);
    const observedAt = recent(item.updatedAt ?? response.updated_at, Date.now(), maxAge);
    if (positive === null || negative === null || positive < 0 || positive > 100 || negative < 0 || negative > 100 || Math.abs(positive + negative - 100) > 1 || size === null || size <= 0 || !Number.isInteger(size) || !observedAt) return null;
    return { provider: 'myfxbook', positivePercent: positive, negativePercent: negative, sampleSize: size, observedAt };
  }
  const explicit = cleanEnv(process.env.MARKET_SENTIMENT_PROVIDER).toLowerCase().replace(/[_\s-]+/g, '');
  const generic = cleanEnv(process.env.MARKET_SENTIMENT_API_KEY);
  const finnhub = cleanEnv(process.env.FINNHUB_API_KEY), alpha = cleanEnv(process.env.ALPHA_VANTAGE_API_KEY);
  const providers: Array<() => Promise<IntelligenceContextSentiment | null>> = [];
  if (explicit === 'finnhub' && (generic || finnhub)) providers.push(() => finnhubSentiment(asset, generic || finnhub, maxAge, deadline));
  else if (explicit === 'alphavantage' && (generic || alpha)) providers.push(() => alphaSentiment(asset, generic || alpha, maxAge, deadline));
  else if (!explicit) {
    if (finnhub) providers.push(() => finnhubSentiment(asset, finnhub, maxAge, deadline));
    if (alpha) providers.push(() => alphaSentiment(asset, alpha, maxAge, deadline));
  }
  // An explicitly preferred provider must not disable configured fallbacks for other asset classes.
  if (finnhub) providers.push(() => finnhubNewsSentiment(asset, finnhub, deadline));
  if (alpha && explicit && explicit !== 'alphavantage') providers.push(() => alphaSentiment(asset, alpha, maxAge, deadline));
  for (const fetchProvider of providers) { const result = await fetchProvider().catch(() => null); if (result) return result; }
  return null;
}

async function loadMacro(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence['macro']> {
  const now = Date.now(), assetCountry = country(asset.country), currency = symbol(asset.quoteCurrency ?? '');
  const pair = symbol(asset.providerSymbol).replace(/=X$/, '').replace('/', '');
  const currencies = asset.assetType === 'FOREX' && /^[A-Z]{6}$/.test(pair) ? [pair.slice(0, 3), pair.slice(3)] : currency ? [currency] : [];
  if (!currencies.length || (['STOCK', 'FUND', 'INDEX'].includes(asset.assetType) && !assetCountry)) return EMPTY_MACRO;
  const official = currencies.includes('USD') && (!['STOCK', 'FUND', 'INDEX'].includes(asset.assetType) || assetCountry === 'US') ? loadOfficialMacroCalendar() : Promise.resolve(null);
  const response = await withinBudget(() => getEconomicCalendar({ from: dateOnly(now - 3 * DAY), to: dateOnly(now + 7 * DAY), currency: currencies.length === 1 ? currency : undefined, force: request.forceRefresh }), null, 5000);
  if (!response || response.stale || response.status !== 'success') return await official ?? { ...EMPTY_MACRO, provider: response?.provider ?? null, stale: Boolean(response?.stale), failureCode: response?.messageCode ?? 'MACRO_PROVIDER_FAILED' };
  const events = response.data.filter(event => {
    const at = contextIso(event.dateTimeUtc);
    if (!at || Date.parse(at) < now - 3 * DAY || Date.parse(at) > now + 7 * DAY || !currencies.includes(symbol(event.currency ?? ''))) return false;
    return !['STOCK', 'FUND', 'INDEX'].includes(asset.assetType) || country(event.country) === assetCountry;
  }).sort((a, b) => Math.abs(Date.parse(a.dateTimeUtc) - now) - Math.abs(Date.parse(b.dateTimeUtc) - now))
    .slice(0, 24).sort((a, b) => Date.parse(a.dateTimeUtc) - Date.parse(b.dateTimeUtc));
  if (!events.length) { const fallback = await official; if (fallback) return fallback; }
  return { provider: response.provider, observedAt: recent(response.lastSuccessfulUpdate, Date.now(), DAY), stale: false, events, failureCode: events.length ? null : 'MACRO_NO_RELEVANT_EVENTS' };
}

async function withinBudget<T>(task: () => Promise<T>, fallback: T, budget = CONTEXT_BUDGET_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve().then(task).catch(() => fallback), new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), budget); })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function loadIntelligenceContextEvidence(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<IntelligenceContextEvidence> {
  const wanted = (key: 'NEWS' | 'SENTIMENT' | 'MACRO' | 'SHARIA') => request.requestedModules.length === 0 || request.requestedModules.includes(key);
  const deadline = Date.now() + CONTEXT_BUDGET_MS;
  const [news, sentiment, macro, sharia] = await Promise.all([
    wanted('NEWS') ? withinBudget(() => loadNews(request, asset), { ...EMPTY_NEWS, failureCode: 'NEWS_PROVIDER_FAILED_OR_TIMEOUT' }) : Promise.resolve(EMPTY_NEWS),
    wanted('SENTIMENT') ? withinBudget(() => loadSentiment(request, asset, deadline), null) : Promise.resolve(null),
    wanted('MACRO') ? withinBudget(() => loadMacro(request, asset), { ...EMPTY_MACRO, failureCode: 'MACRO_PROVIDER_FAILED_OR_TIMEOUT' }) : Promise.resolve(EMPTY_MACRO),
    wanted('SHARIA') ? withinBudget(async () => {
      const [catalog, research] = await Promise.all([loadStoredIntelligenceSharia(asset), loadResearchIntelligenceSharia(asset, request.userId)]);
      return research && (!catalog?.reviewedAt || Date.parse(research.reviewedAt ?? '') > Date.parse(catalog.reviewedAt)) ? research : catalog;
    }, null) : Promise.resolve(null),
  ]);
  // Explicit unknown prevents the market quote's unverified status from bypassing this trust boundary.
  return { news, sentiment, macro, sharia: sharia ?? UNCLASSIFIED };
}
