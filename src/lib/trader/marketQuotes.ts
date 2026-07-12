import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { cryptoQuoteRejectionReason, resolveCanonicalCryptoSymbol } from '@/lib/market/canonicalSymbols';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';
import { normalizeMarketCurrencyCode, normalizeMarketPrice } from '@/lib/market/marketCurrency';
import { getQuoteWithFallback, type NormalizedMarketQuote } from '@/lib/market/marketDataProviders';
import {
  isValidChange,
  isValidPrice,
  normalizeQuote as normalizeSharedQuote,
  normalizeSymbol as normalizeQuoteSymbol,
} from '@/lib/market/quoteNormalization';
import { cleanEnv } from '@/lib/market/providerConfig';
import type { MarketAssetType } from '@/lib/market/marketService';
import { providerSymbolsForAlias, providerSymbolsForProviderAlias } from '@/lib/market/providerSymbolAliases';
import {
  classifyShariahCompliance,
  shariahClassificationFields,
  type ShariahScreeningData,
  type ShariahScreeningMethod,
  type ShariahStatus,
} from '@/lib/market/shariah-screening';
import { ProviderError } from '@/lib/providers/shared';
import {
  getStaticTraderMarket,
  providerCapabilityMatrix,
  resolveTraderMarketFromCatalog,
  TRADER_MARKET_SEEDS,
  type TraderAssetType,
  type TraderCatalogSymbol,
  type TraderMarketDef,
  type TraderQuoteProvider,
} from '@/lib/trader/marketCatalog';
import { normalizeTraderSymbolMetadata, type TraderSymbolMetadataDiagnostics } from '@/lib/trader/marketMetadata';
import {
  FmpRateLimitError,
  fmpQueuedFetch,
  getFmpRuntimeStatus,
  isFmpRateLimited,
  markFmpCacheAvailable,
  markFmpRateLimited,
} from '@/lib/trader/providers/fmpRuntime';
import {
  buildMultiFactorRecommendation,
  UNAVAILABLE_NEWS_SENTIMENT,
  type MultiFactorRecommendation,
  type RecommendationNewsSentiment,
  type RecommendationPricePoint,
} from '@/lib/trader/recommendationEngine';

export type TraderSignal = 'buy' | 'sell' | 'watch';
export type TraderDataQuality = 'delayed' | 'partial' | 'unavailable' | 'cached';
type TraderQuoteSource = 'Financial Modeling Prep' | 'Yahoo Finance' | 'Finnhub' | 'Twelve Data' | 'EODHD' | 'Marketstack';
type TraderHistoryPoint = RecommendationPricePoint;
type ActiveQuoteProvider = 'fmp' | 'yahoo' | 'finnhub';

type MarketDef = TraderMarketDef;
type QuoteIssue = {
  symbol: string;
  provider: TraderQuoteProvider;
  reason: string;
};

export type TraderQuoteLoadResult = {
  quotes: TraderQuote[];
  loaded: Array<{ symbol: string; provider: TraderQuoteProvider; providerSymbol: string | null }>;
  failed: QuoteIssue[];
  skipped: QuoteIssue[];
  provider: TraderQuoteProvider | null;
  reason: string | null;
  providerLatencyMs: Partial<Record<TraderQuoteProvider, number>>;
  cacheStatus: 'live' | 'provider-cache' | 'not_configured';
  summary: {
    loadedSymbols: number;
    failedSymbols: number;
    cachedSymbols: number;
    skippedDueToRateLimit: number;
  };
  generatedAt: string;
};

export type TraderQuoteLoadOptions = {
  forceFresh?: boolean;
  concurrency?: number;
  symbolMeta?: TraderCatalogSymbol[];
  includeHistory?: boolean;
  includeNews?: boolean;
};

type ProviderQuote = {
  provider: TraderQuoteProvider;
  providerName: TraderQuoteSource;
  providerSymbol: string;
  name?: string | null;
  price: number;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  currency: string | null;
  exchange?: string | null;
  exchangeCode?: string | null;
  market?: string | null;
  country?: string | null;
  assetType?: string | null;
  marketCap?: number | null;
  volume?: number | null;
  raw?: Record<string, unknown> | null;
  updatedAt: string | null;
};

type YahooChartResult = {
  symbol: string | null;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  exchange: string | null;
  exchangeCode: string | null;
  market: string | null;
  assetType: string | null;
  closes: number[];
  history: TraderHistoryPoint[];
  marketTime: string | null;
};

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const FMP_BATCH_SIZE = 80;
const QUOTE_CONCURRENCY = 6;
const QUOTE_CACHE_MS = 3 * 60 * 1000;
const QUOTE_STALE_MS = 30 * 60 * 1000;
const ENRICH_MAX_SYMBOLS = 24;
const ENRICH_CONCURRENCY = 6;
const ENRICH_TIME_BUDGET_MS = 4500;
const NEWS_ENRICH_MAX_SYMBOLS = 12;
const NEWS_CACHE_MS = 20 * 60 * 1000;
const DEFAULT_QUOTE_PROVIDER_PRIORITY: ActiveQuoteProvider[] = ['fmp', 'yahoo', 'finnhub'];
const newsSentimentCache = new Map<string, { expiresAt: number; value: RecommendationNewsSentiment }>();
const pendingQuoteLoads = new Map<string, Promise<TraderQuoteLoadResult>>();

function historyAssetType(assetType: TraderAssetType): 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'gold' | 'index' {
  if (assetType === 'crypto') return 'crypto';
  if (assetType === 'forex') return 'forex';
  if (assetType === 'commodity') return 'commodity';
  if (assetType === 'index') return 'index';
  if (assetType === 'fund') return 'etf';
  return 'stock';
}

// إغناء الاقتباس بسلسلة أسعار من كاش يـاهو: يوفّر الشارت المصغر ويحسب
// التغير اليومي عندما لا يرسله المزود الاحتياطي.
async function enrichQuoteWithHistory(quote: TraderQuote): Promise<TraderQuote> {
  if (!quote.available || !isValidPrice(quote.price)) return quote;
  const needsChart = !Array.isArray(quote.history) || quote.history.length < 2;
  const needsChange = quote.changePercent === null;
  const needsRecommendation = !quote.finalRecommendation || quote.technicalAvailable === false;
  if (!needsChart && !needsChange && !needsRecommendation) return quote;

  try {
    const cacheKey = `yhist:${upper(quote.symbol)}:1y:1d`;
    const cached = await getPersistentCache<unknown[]>(cacheKey);
    const cachedHistory = normalizeHistoryPoints(cached);
    if (cachedHistory.length >= 2) {
      return applyHistoryToQuote(quote, cachedHistory, needsChart, needsChange);
    }

    // جرّب ترجمات ياهو للرمز بالترتيب (GC=F للذهب، ^DJI لداو جونز...) بدل رمز المزود الاحتياطي فقط
    const candidates = unique([
      ...candidateSymbols(quote.symbol, 'yahoo'),
      quote.providerSymbolUsed,
      quote.providerSymbol,
      quote.symbol,
    ]).slice(0, 2);

    let history: TraderHistoryPoint[] = [];
    for (const candidate of candidates) {
      const historyResult = await fetchYahooHistory(candidate, historyAssetType(quote.assetType), '1y', '1d');
      if (!historyResult.success) continue;
      const extracted = normalizeHistoryPoints(historyResult.history);
      if (extracted.length >= 2) { history = extracted; break; }
    }
    if (history.length < 2) return quote;

    void setPersistentCache(cacheKey, history.slice(-260), 30 * 60 * 1000);
    return applyHistoryToQuote(quote, history, needsChart, needsChange);
  } catch {
    return quote;
  }
}

function normalizeHistoryPoints(value: unknown): TraderHistoryPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((point): TraderHistoryPoint | null => {
      if (typeof point === 'number') return point > 0 ? { close: point } : null;
      if (!point || typeof point !== 'object') return null;
      const row = point as Record<string, unknown>;
      const close = numberOrNull(row.close ?? row.c ?? row.price);
      if (close === null || close <= 0) return null;
      const open = numberOrNull(row.open ?? row.o);
      const high = numberOrNull(row.high ?? row.h);
      const low = numberOrNull(row.low ?? row.l);
      const volume = numberOrNull(row.volume ?? row.v);
      return {
        date: textOrNull(row.date ?? row.timestamp ?? row.time),
        open,
        high,
        low,
        close,
        volume,
      };
    })
    .filter((point): point is TraderHistoryPoint => point !== null);
}

function applyHistoryToQuote(quote: TraderQuote, history: TraderHistoryPoint[], needsChart: boolean, needsChange: boolean): TraderQuote {
  const enriched: TraderQuote = { ...quote };
  const closes = history.map(point => point.close).filter(value => value > 0);
  if (needsChart) {
    enriched.sparkline = closes.slice(-30);
    enriched.history = history.slice(-260).map(point => ({ ...point, close: round(point.close) ?? point.close }));
    enriched.chartAvailable = true;
  } else {
    enriched.history = history.slice(-260).map(point => ({ ...point, close: round(point.close) ?? point.close }));
  }
  if (needsChange) {
    // التغير يُحسب من نفس السلسلة فقط — خلط سعر المزود مع سلسلة رمز مختلف
    // المقياس (مؤشر مقابل CFD) ينتج نسباً وهمية مثل +21%
    const latest = closes[closes.length - 1];
    const previous = closes[closes.length - 2];
    const pct = previous > 0 ? ((latest - previous) / previous) * 100 : null;
    if (isValidChange(pct) && Math.abs(pct) <= 20) {
      enriched.changePercent = round(pct);
      if (isValidPrice(quote.price)) {
        enriched.previousClose = round(quote.price / (1 + pct / 100));
        enriched.change = round(quote.price - (quote.price / (1 + pct / 100)));
      }
    }
  }
  return applyRecommendationToQuote(enriched);
}

async function enrichQuotesWithHistory(quotes: TraderQuote[]): Promise<TraderQuote[]> {
  const targets = quotes
    .map((quote, index) => ({ quote, index }))
    .filter(({ quote }) => quote.available && isValidPrice(quote.price)
      && ((!Array.isArray(quote.history) || quote.history.length < 2) || quote.changePercent === null))
    .slice(0, ENRICH_MAX_SYMBOLS);
  if (!targets.length) return quotes;

  const output = quotes.slice();
  const startedAt = Date.now();
  for (let cursor = 0; cursor < targets.length; cursor += ENRICH_CONCURRENCY) {
    if (Date.now() - startedAt > ENRICH_TIME_BUDGET_MS) break; // لا نؤخر الاستجابة أبداً
    const batch = targets.slice(cursor, cursor + ENRICH_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(({ quote }) => enrichQuoteWithHistory(quote)));
    settled.forEach((result, position) => {
      if (result.status === 'fulfilled') {
        const batchItem = batch[position];
        if (!batchItem) return;
        const { index } = batchItem;
        output[index] = result.value;
        storeQuoteCache(result.value.symbol, result.value);
      }
    });
  }
  return output;
}

function newsCacheKey(symbol: string) {
  return upper(symbol);
}

function unavailableNewsSentiment(summaryEn = UNAVAILABLE_NEWS_SENTIMENT.summaryEn, summaryAr = UNAVAILABLE_NEWS_SENTIMENT.summaryAr): RecommendationNewsSentiment {
  return { ...UNAVAILABLE_NEWS_SENTIMENT, summaryEn, summaryAr };
}

async function fetchNewsSentimentForQuote(quote: TraderQuote): Promise<RecommendationNewsSentiment> {
  if (quote.assetType !== 'stock' && quote.assetType !== 'fund') {
    return unavailableNewsSentiment('News sentiment is not enabled for this asset type.', 'المعنويات الخبرية غير مفعلة لهذا النوع من الأصول.');
  }
  const cacheKey = newsCacheKey(quote.providerSymbolUsed ?? quote.providerSymbol ?? quote.symbol);
  const cached = newsSentimentCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const candidates = unique([quote.providerSymbolUsed, quote.providerSymbol, quote.symbol]).slice(0, 2);
  if (!candidates.length) return unavailableNewsSentiment();

  try {
    const result = await aggregateFinancialNews({
      symbols: candidates,
      companyNames: quote.name ? [quote.name] : [],
      strictEntityFilter: true,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      limit: 48,
    }, { page: 1, pageSize: 12, sort: 'importance' });
    const articles = result.stories;
    if (!articles.length) {
      return unavailableNewsSentiment('No recent consolidated stories were found for this security.', 'لم يتم العثور على قصص إخبارية موحدة حديثة لهذه الورقة المالية.');
    }

    const credible = articles.filter(article => (
      article.verificationStatus === 'official' || article.verificationStatus === 'confirmed'
    ));
    const positive = credible.filter(article => article.sentiment === 'positive').length;
    const negative = credible.filter(article => article.sentiment === 'negative').length;
    const measured = positive + negative;
    const score = measured > 0 ? Math.round(50 + ((positive - negative) / measured) * 40) : 50;
    const sentiment: RecommendationNewsSentiment['sentiment'] = measured === 0
      ? 'unknown'
      : score >= 58
        ? 'positive'
        : score <= 42
          ? 'negative'
          : 'neutral';
    const conflicting = articles.some(article => article.verificationStatus === 'conflicting');
    const official = articles.some(article => article.verificationStatus === 'official');
    const confirmed = articles.some(article => article.verificationStatus === 'confirmed');
    const verificationStatus: NonNullable<RecommendationNewsSentiment['verificationStatus']> = conflicting
      ? 'conflicting'
      : official
        ? 'official'
        : confirmed
          ? 'confirmed'
          : articles.some(article => article.verificationStatus === 'single_source')
            ? 'single_source'
            : 'unverified';
    const independentSourceCount = Math.max(...articles.map(article => article.independentSourceCount), 0);
    const value: RecommendationNewsSentiment = {
      status: 'available',
      sentiment,
      score,
      summaryEn: `${articles.length} consolidated stor${articles.length === 1 ? 'y' : 'ies'} reviewed; ${credible.length} had official or independent confirmation. News is context only and does not change the directional recommendation.`,
      summaryAr: `تمت مراجعة ${articles.length} قصة إخبارية موحدة؛ منها ${credible.length} بإفصاح رسمي أو تأكيد مستقل. الأخبار سياق فقط ولا تغيّر اتجاه التوصية.`,
      articleCount: articles.length,
      provider: 'Multi-source market news',
      updatedAt: result.lastUpdated ?? new Date().toISOString(),
      verificationStatus,
      independentSourceCount,
    };
    newsSentimentCache.set(cacheKey, { value, expiresAt: Date.now() + NEWS_CACHE_MS });
    return value;
  } catch {
    return unavailableNewsSentiment('Consolidated news context is temporarily unavailable.', 'سياق الأخبار الموحدة غير متاح مؤقتاً.');
  }
}

async function enrichQuotesWithNews(quotes: TraderQuote[]): Promise<TraderQuote[]> {
  const output = quotes.slice();
  const targets = quotes
    .map((quote, index) => ({ quote, index }))
    .filter(({ quote }) => quote.available && isValidPrice(quote.price) && (quote.assetType === 'stock' || quote.assetType === 'fund'))
    .slice(0, NEWS_ENRICH_MAX_SYMBOLS);
  for (let cursor = 0; cursor < targets.length; cursor += 2) {
    const batch = targets.slice(cursor, cursor + 2);
    const settled = await Promise.allSettled(batch.map(({ quote }) => fetchNewsSentimentForQuote(quote)));
    settled.forEach((result, position) => {
      const batchItem = batch[position];
      if (!batchItem) return;
      const { index } = batchItem;
      if (result.status === 'fulfilled') {
        const quote = output[index];
        if (!quote) return;
        output[index] = applyRecommendationToQuote(quote, result.value);
        storeQuoteCache(output[index].symbol, output[index]);
      }
    });
  }
  return output;
}

const quoteCache = new Map<string, { quote: TraderQuote; expiresAt: number; staleUntil: number }>();

export const TRADER_MARKETS: MarketDef[] = TRADER_MARKET_SEEDS.map(market => ({
  ...market,
  source: 'seed',
  totalSymbols: market.symbols.length,
}));

const YAHOO_SYMBOL: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X',
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
  SOLUSD: 'SOL-USD',
  BNBUSD: 'BNB-USD',
  XRPUSD: 'XRP-USD',
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  WTI: 'CL=F',
  BRENT: 'BZ=F',
  US30: '^DJI',
  NAS100: '^NDX',
  SPX500: '^GSPC',
  DAX: '^GDAXI',
  FTSE: '^FTSE',
  CAC40: '^FCHI',
  NIKKEI: '^N225',
  HSI: '^HSI',
  SPX: '^GSPC',
  NDX: '^NDX',
  DJI: '^DJI',
  DXY: 'DX-Y.NYB',
};

const YAHOO_FALLBACK_SYMBOLS: Record<string, string[]> = {
  XAUUSD: ['GC=F', 'XAUUSD=X'],
  XAGUSD: ['SI=F', 'XAGUSD=X'],
  USDJPY: ['USDJPY=X', 'JPY=X'],
  US30: ['^DJI', 'YM=F'],
  NAS100: ['^NDX', 'NQ=F'],
  SPX500: ['^GSPC', 'ES=F'],
  DAX: ['^GDAXI'],
  FTSE: ['^FTSE'],
  CAC40: ['^FCHI'],
  NIKKEI: ['^N225'],
  HSI: ['^HSI'],
};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function round(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(6));
}

function deriveChangePercentFromProvider(args: {
  explicitPercent: number | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
}) {
  if (isValidPrice(args.price) && isValidPrice(args.previousClose)) {
    return ((args.price - args.previousClose) / args.previousClose) * 100;
  }
  if (isValidPrice(args.price) && isValidChange(args.explicitPercent)) return args.explicitPercent;
  return null;
}

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function unique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = String(value ?? '').trim();
    const key = item.toUpperCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function configuredQuoteProviderPriority(): ActiveQuoteProvider[] {
  const configured = cleanEnv(process.env.TRADER_QUOTE_PROVIDER_PRIORITY)
    || cleanEnv(process.env.MARKET_QUOTE_PROVIDER_PRIORITY);
  const aliases: Record<string, ActiveQuoteProvider> = {
    fmp: 'fmp',
    financialmodelingprep: 'fmp',
    financial_modeling_prep: 'fmp',
    yahoo: 'yahoo',
    yahoofinance: 'yahoo',
    yahoo_finance: 'yahoo',
    finnhub: 'finnhub',
  };
  const parsed = configured
    .split(',')
    .map(item => item.trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .map(item => aliases[item])
    .filter((item): item is ActiveQuoteProvider => Boolean(item));
  return unique([...(parsed.length ? parsed : DEFAULT_QUOTE_PROVIDER_PRIORITY), ...DEFAULT_QUOTE_PROVIDER_PRIORITY]) as ActiveQuoteProvider[];
}

function quoteProviderLabel(provider: ActiveQuoteProvider) {
  if (provider === 'fmp') return 'FMP';
  if (provider === 'finnhub') return 'Finnhub';
  return 'Yahoo Finance';
}

function canonicalCryptoForQuote(symbol: string, meta?: TraderCatalogSymbol) {
  const assetClass = meta?.assetType;
  return resolveCanonicalCryptoSymbol(meta?.symbol ?? symbol, {
    assetClass,
    allowInferred: assetClass === 'crypto',
  }) ?? resolveCanonicalCryptoSymbol(meta?.providerSymbol, {
    assetClass,
    allowInferred: assetClass === 'crypto',
  }) ?? resolveCanonicalCryptoSymbol(symbol);
}

function normalizedRequestedSymbol(symbol: string, metaBySymbol?: Map<string, TraderCatalogSymbol>) {
  const raw = upper(symbol);
  if (!raw) return '';
  const meta = metaBySymbol?.get(raw);
  const canonical = meta?.assetType === 'crypto'
    ? canonicalCryptoForQuote(raw, meta)
    : resolveCanonicalCryptoSymbol(raw);
  return canonical?.displaySymbol ?? raw;
}

function classifyAssetType(symbol: string, meta?: TraderCatalogSymbol): TraderAssetType {
  if (meta?.assetType) return meta.assetType;
  const s = symbol.toUpperCase();
  const base = s.replace(/[.\-=].*$/, '');
  if (resolveCanonicalCryptoSymbol(symbol)) return 'crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(s)) return 'commodity';
  if (/^(US30|NAS100|SPX500|DAX|FTSE|CAC40|NIKKEI|HSI|SPX|NDX|DJI|DXY|\^)/.test(s)) return 'index';
  if (/^(SPY|QQQ|GLD|IWM|VOO|DIA)$/.test(s) || meta?.assetType === 'fund') return 'fund';
  if (/^[A-Z]{6}$/.test(base) && !s.includes('.')) return 'forex';
  return 'stock';
}

function defaultCurrency(symbol: string): string | null {
  const s = symbol.toUpperCase();
  if (/\.KW$/.test(s)) return 'KWD';
  if (/\.SR$|\.SA$/.test(s)) return 'SAR';
  if (/\.AE$|\.DU$|\.AD$/.test(s)) return 'AED';
  if (/\.QA$/.test(s)) return 'QAR';
  if (/\.OM$/.test(s)) return 'OMR';
  if (/\.BH$/.test(s)) return 'BHD';
  if (/\.T$|^NIKKEI$/.test(s)) return 'JPY';
  if (/\.HK$|^HSI$/.test(s)) return 'HKD';
  if (/\.DE$|\.AS$|\.PA$|^DAX$|^CAC40$/.test(s)) return 'EUR';
  if (/\.SW$/.test(s)) return 'CHF';
  if (/\.KS$/.test(s)) return 'KRW';
  if (/^[A-Z]{6}$/.test(s)) return s.slice(3);
  return 'USD';
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function annualizedVolatility(closes: number[]): number | null {
  if (closes.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function deriveSignal(price: number | null, sma20: number | null, sma50: number | null, rsiValue: number | null, changePercent?: number | null): { signal: TraderSignal; confidence: number | null } {
  if (price === null) return { signal: 'watch', confidence: null };
  let score = 0;
  let weight = 0;
  if (sma20 !== null) { score += price > sma20 ? 1 : -1; weight += 1; }
  if (sma50 !== null) { score += price > sma50 ? 1 : -1; weight += 1; }
  if (sma20 !== null && sma50 !== null) { score += sma20 > sma50 ? 1 : -1; weight += 1; }
  if (rsiValue !== null) {
    weight += 1;
    if (rsiValue >= 70) score -= 1;
    else if (rsiValue <= 30) score += 1;
    else if (rsiValue >= 55) score += 0.5;
    else if (rsiValue <= 45) score -= 0.5;
  }
  if (weight === 0 && changePercent !== null && changePercent !== undefined) {
    if (changePercent > 0.35) return { signal: 'buy', confidence: 56 };
    if (changePercent < -0.35) return { signal: 'sell', confidence: 56 };
  }
  if (weight === 0) return { signal: 'watch', confidence: null };

  let signal: TraderSignal = 'watch';
  if (score >= 2) signal = 'buy';
  else if (score <= -2) signal = 'sell';

  const strength = Math.min(1, Math.abs(score) / weight);
  const confidence = Math.round(45 + strength * 45);
  return { signal, confidence: Math.max(40, Math.min(92, confidence)) };
}

function riskFromVolatility(volatility: number | null, assetType: TraderAssetType): 'low' | 'medium' | 'high' {
  if (volatility === null) return assetType === 'crypto' ? 'high' : 'medium';
  if (volatility >= 45) return 'high';
  if (volatility >= 22) return 'medium';
  return 'low';
}

export type TraderQuote = {
  symbol: string;
  requestedSymbol: string;
  canonicalSymbol: string;
  displaySymbol: string;
  providerSymbol: string | null;
  providerSymbolUsed: string | null;
  provider: TraderQuoteProvider | null;
  fallbackUsed: boolean;
  name: string;
  assetType: TraderAssetType;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  marketCap?: number | null;
  volume?: number | null;
  currency: string | null;
  exchange: string | null;
  exchangeCode: string | null;
  market: string | null;
  country: string | null;
  metadataDiagnostics: TraderSymbolMetadataDiagnostics;
  signal: TraderSignal;
  signalAvailable: boolean;
  confidence: number | null;
  riskLevel: 'low' | 'medium' | 'high';
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  ema20?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  priceMomentum20?: number | null;
  support?: number | null;
  resistance?: number | null;
  volumeRatio?: number | null;
  atr?: number | null;
  targetPrice?: number | null;
  target1?: number | null;
  stopLoss?: number | null;
  expectedMovePct?: number | null;
  finalRecommendation?: MultiFactorRecommendation['finalRecommendation'];
  finalRecommendationAr?: string;
  finalRecommendationFr?: string;
  dataSufficiency?: MultiFactorRecommendation['dataSufficiency'];
  finalScore?: number | null;
  aiConfidence?: number | null;
  strategyCount?: number;
  strategyAgreement?: MultiFactorRecommendation['strategyAgreement'];
  strategyConsensus?: MultiFactorRecommendation['strategyAgreement'];
  technicalAvailable?: boolean;
  samples?: number;
  technicalSummary?: MultiFactorRecommendation['technicalSummary'];
  newsSentimentSummary?: RecommendationNewsSentiment;
  dataQualityStatus?: MultiFactorRecommendation['dataQualityStatus'];
  explanationEn?: string;
  explanationAr?: string;
  explanation?: { en: string; ar: string };
  disclaimer?: { en: string; ar: string };
  scoreBreakdown?: MultiFactorRecommendation['scoreBreakdown'];
  strategies?: MultiFactorRecommendation['strategies'];
  sparkline: number[];
  history: TraderHistoryPoint[];
  chartAvailable: boolean;
  dataQuality: TraderDataQuality;
  providerStatus: {
    requestedSymbol: string;
    providerSymbolUsed: string | null;
    fallbackUsed: boolean;
    lastUpdated: string | null;
    dataQuality: TraderDataQuality;
    provider: TraderQuoteProvider | null;
    source: TraderQuoteSource;
  };
  source: TraderQuoteSource;
  delayed: boolean;
  available: boolean;
  unavailableReason?: string;
  lastUpdated: string | null;
  updatedAt: string | null;
  shariahStatus: ShariahStatus;
  shariahReason: string | null;
  shariahSource: string | null;
  shariahLastReviewedAt: string | null;
  shariahManualOverride: boolean;
  shariahReviewedBy: string | null;
  shariahScreeningData: ShariahScreeningData;
  shariahMethod: ShariahScreeningMethod;
};

function applyRecommendationToQuote(quote: TraderQuote, newsSentiment?: RecommendationNewsSentiment | null): TraderQuote {
  const recommendation = buildMultiFactorRecommendation({
    price: quote.price,
    changePercent: quote.changePercent,
    history: quote.history,
    dataQuality: quote.dataQuality,
    delayed: quote.delayed,
    assetType: quote.assetType,
    newsSentiment: newsSentiment ?? quote.newsSentimentSummary ?? UNAVAILABLE_NEWS_SENTIMENT,
  });
  const indicators = recommendation.technicalSummary.indicators;
  return {
    ...quote,
    signal: recommendation.signal,
    signalAvailable: recommendation.finalRecommendation !== 'Insufficient data',
    confidence: recommendation.confidence,
    riskLevel: recommendation.riskLevel,
    rsi: indicators.rsi14,
    ema20: indicators.ema20,
    ema50: indicators.ema50,
    ema200: indicators.ema200,
    macd: indicators.macd,
    macdSignal: indicators.macdSignal,
    priceMomentum20: indicators.priceMomentum20,
    support: indicators.support,
    resistance: indicators.resistance,
    volumeRatio: indicators.volumeRatio,
    atr: indicators.atr,
    targetPrice: recommendation.targetPrice,
    target1: recommendation.targetPrice,
    stopLoss: recommendation.stopLoss,
    expectedMovePct: recommendation.expectedMovePct,
    finalRecommendation: recommendation.finalRecommendation,
    finalRecommendationAr: recommendation.finalRecommendationAr,
    finalRecommendationFr: recommendation.finalRecommendationFr,
    dataSufficiency: recommendation.dataSufficiency,
    finalScore: recommendation.finalScore,
    aiConfidence: recommendation.confidence,
    strategyCount: recommendation.strategyCount,
    strategyAgreement: recommendation.strategyAgreement,
    strategyConsensus: recommendation.strategyAgreement,
    technicalAvailable: recommendation.technicalAvailable,
    samples: recommendation.samples,
    technicalSummary: recommendation.technicalSummary,
    newsSentimentSummary: recommendation.newsSentimentSummary,
    dataQualityStatus: recommendation.dataQualityStatus,
    explanationEn: recommendation.explanationEn,
    explanationAr: recommendation.explanationAr,
    explanation: { en: recommendation.explanationEn, ar: recommendation.explanationAr },
    disclaimer: { en: recommendation.disclaimerEn, ar: recommendation.disclaimerAr },
    scoreBreakdown: recommendation.scoreBreakdown,
    strategies: recommendation.strategies,
  };
}

function quoteStatus(args: {
  display: string;
  providerSymbol: string | null;
  fallbackUsed: boolean;
  updatedAt: string | null;
  dataQuality: TraderDataQuality;
  provider: TraderQuoteProvider | null;
  source: TraderQuoteSource;
}): TraderQuote['providerStatus'] {
  return {
    requestedSymbol: args.display,
    providerSymbolUsed: args.providerSymbol,
    fallbackUsed: args.fallbackUsed,
    lastUpdated: args.updatedAt,
    dataQuality: args.dataQuality,
    provider: args.provider,
    source: args.source,
  };
}

function quoteIdentity(display: string, meta?: TraderCatalogSymbol) {
  const assetType = classifyAssetType(display, meta);
  const canonical = assetType === 'crypto'
    ? canonicalCryptoForQuote(display, meta)
    : null;
  const normalized = normalizeQuoteSymbol(meta?.symbol ?? display, assetType);
  const symbol = canonical?.canonicalSymbol ?? normalized.canonicalSymbol ?? display;
  return {
    symbol,
    requestedSymbol: display,
    canonicalSymbol: canonical?.canonicalSymbol ?? normalized.canonicalSymbol ?? symbol,
    displaySymbol: canonical?.displaySymbol ?? normalized.displaySymbol ?? display,
  };
}

function metadataCatalogRecord(meta?: TraderCatalogSymbol): Record<string, unknown> | null {
  if (!meta) return null;
  return {
    symbol: meta.symbol,
    displaySymbol: meta.symbol,
    providerSymbol: meta.providerSymbol,
    name: meta.name,
    assetType: meta.assetType,
    exchange: meta.exchange,
    exchangeCode: meta.exchangeCode,
    market: meta.market,
    country: meta.country,
    currency: meta.currency,
    source: meta.source,
  };
}

function quoteMetadata(
  display: string,
  quote: Partial<ProviderQuote | YahooChartResult> | Record<string, unknown> | null,
  meta?: TraderCatalogSymbol,
) {
  const quoteRecord = quote as Record<string, unknown> | null;
  return normalizeTraderSymbolMetadata({
    symbol: display,
    displaySymbol: meta?.symbol ?? display,
    provider: quoteRecord?.provider ?? quoteRecord?.providerName,
    providerSymbol: quoteRecord?.providerSymbol,
    assetType: meta?.assetType ?? quoteRecord?.assetType,
    quote: quoteRecord,
    catalog: metadataCatalogRecord(meta),
  });
}

function metadataQuoteFields(metadata: ReturnType<typeof quoteMetadata>): Pick<TraderQuote, 'exchange' | 'exchangeCode' | 'market' | 'country' | 'metadataDiagnostics'> {
  return {
    exchange: metadata.exchange ?? null,
    exchangeCode: metadata.exchangeCode ?? null,
    market: metadata.market ?? null,
    country: metadata.country ?? null,
    metadataDiagnostics: metadata.diagnostics,
  };
}

function quoteShariahFields(display: string, assetType: TraderAssetType, meta?: TraderCatalogSymbol, name?: string | null) {
  const shariah = classifyShariahCompliance({
    symbol: meta?.symbol ?? display,
    name: name || meta?.name || display,
    assetType,
    exchange: meta?.exchange,
    country: meta?.country,
    shariahStatus: meta?.shariahStatus,
    shariahReason: meta?.shariahReason,
    shariahSource: meta?.shariahSource,
    shariahLastReviewedAt: meta?.shariahLastReviewedAt,
    shariahManualOverride: meta?.shariahManualOverride,
    shariahReviewedBy: meta?.shariahReviewedBy,
    shariahScreeningData: meta?.shariahScreeningData,
  });
  return shariahClassificationFields(shariah);
}

function unavailableQuote(display: string, reason: string, meta?: TraderCatalogSymbol): TraderQuote {
  const source: TraderQuoteSource = 'Financial Modeling Prep';
  const dataQuality: TraderDataQuality = 'unavailable';
  const assetType = classifyAssetType(display, meta);
  const metadata = quoteMetadata(display, null, meta);
  return {
    ...quoteIdentity(display, meta),
    providerSymbol: null,
    providerSymbolUsed: null,
    provider: null,
    fallbackUsed: false,
    name: meta?.name ?? display,
    assetType,
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    currency: metadata.currency ?? meta?.currency ?? defaultCurrency(display),
    ...metadataQuoteFields(metadata),
    signal: 'watch',
    signalAvailable: false,
    confidence: null,
    riskLevel: 'medium',
    rsi: null,
    sma20: null,
    sma50: null,
    sparkline: [],
    history: [],
    chartAvailable: false,
    dataQuality,
    providerStatus: quoteStatus({ display, providerSymbol: null, fallbackUsed: false, updatedAt: null, dataQuality, provider: null, source }),
    source,
    delayed: false,
    available: false,
    unavailableReason: reason,
    lastUpdated: null,
    updatedAt: null,
    ...quoteShariahFields(display, assetType, meta),
  };
}

function candidateSymbols(display: string, provider: TraderQuoteProvider, meta?: TraderCatalogSymbol) {
  const assetType = classifyAssetType(display, meta);
  if (assetType === 'crypto') {
    const canonical = canonicalCryptoForQuote(display, meta);
    if (canonical) {
      if (provider === 'yahoo') return unique([canonical.providerSymbols.yahoo]);
      if (provider === 'fmp') return unique([canonical.providerSymbols.fmp]);
      if (provider === 'finnhub') return unique([canonical.providerSymbols.finnhub, canonical.providerSymbols.binance]);
      if (provider === 'twelve_data') return unique([canonical.providerSymbols.twelveData]);
      if (provider === 'eodhd') return unique([canonical.providerSymbols.eodhd]);
      if (provider === 'openbb') return unique([canonical.providerSymbols.fmp, canonical.displaySymbol]);
      return [];
    }
  }
  const aliasAssetType = (meta?.assetType === 'fund'
    ? 'etf'
    : meta?.assetType === 'commodity'
      ? 'commodity'
      : meta?.assetType) as MarketAssetType | undefined;
  const aliases = provider === 'fmp' || provider === 'finnhub' || provider === 'yahoo'
    ? providerSymbolsForProviderAlias(display, provider, aliasAssetType)
    : [];
  const metaSymbols = meta?.providerSymbols[provider] ?? [];
  if (provider === 'yahoo') {
    return unique([
      ...(YAHOO_FALLBACK_SYMBOLS[upper(display)] ?? []),
      ...aliases,
      ...providerSymbolsForAlias(display),
      ...metaSymbols,
      YAHOO_SYMBOL[upper(display)] ?? null,
      meta?.providerSymbol,
      display,
    ]);
  }
  if (provider === 'fmp') {
    return unique([...aliases, ...metaSymbols, meta?.providerSymbol, display]);
  }
  return unique([...aliases, ...metaSymbols, meta?.providerSymbol, display]);
}

function metaMap(symbolMeta?: TraderCatalogSymbol[]) {
  const map = new Map<string, TraderCatalogSymbol>();
  for (const item of symbolMeta ?? []) {
    map.set(upper(item.symbol), item);
    map.set(upper(item.displaySymbol), item);
    map.set(upper(item.providerSymbol), item);
    for (const alias of item.aliases ?? []) map.set(upper(alias), item);
    for (const provider of Object.keys(item.providerSymbols) as TraderQuoteProvider[]) {
      for (const symbol of item.providerSymbols[provider] ?? []) map.set(upper(symbol), item);
    }
  }
  return map;
}

function normalizeProviderQuote(display: string, quote: ProviderQuote, meta?: TraderCatalogSymbol): TraderQuote {
  const assetType = classifyAssetType(display, meta);
  const canonical = assetType === 'crypto' ? canonicalCryptoForQuote(display, meta) : null;
  const collisionReason = canonical ? cryptoQuoteRejectionReason({
    requestedSymbol: display,
    canonicalSymbol: canonical.canonicalSymbol,
    assetClass: 'crypto',
    provider: quote.provider,
    providerSymbol: quote.providerSymbol,
    responseSymbol: quote.providerSymbol,
    responseName: quote.name ?? meta?.name,
    responseAssetType: quote.assetType,
    responsePrice: quote.price,
  }) : null;
  if (collisionReason) {
    console.warn('[trader-quotes] rejected quote collision', {
      canonicalSymbol: canonical?.canonicalSymbol,
      assetClass: assetType,
      provider: quote.provider,
      providerSymbol: quote.providerSymbol,
      responseName: quote.name ?? meta?.name ?? null,
      responsePrice: quote.price,
      rejectionReason: collisionReason,
    });
    return unavailableQuote(display, collisionReason, meta);
  }
  const normalized = normalizeMarketPrice({
    price: quote.price,
    currency: quote.currency ?? meta?.currency,
    providerCurrency: quote.currency,
    symbol: display,
    providerSymbol: quote.providerSymbol,
    assetType,
  });
  const price = isValidPrice(normalized.price) ? round(normalized.price) : null;
  const previousClose = round(
    quote.previousClose !== null
      ? normalizeMarketPrice({
          price: quote.previousClose,
          currency: quote.currency ?? meta?.currency,
          providerCurrency: quote.currency,
          symbol: display,
          providerSymbol: quote.providerSymbol,
          assetType,
          priceUnit: normalized.priceUnit,
        }).price
      : null,
  );
  const normalizedQuote = normalizeSharedQuote({
    symbol: display,
    assetType,
    provider: quote.providerName,
    providerSymbol: quote.providerSymbol,
    providerSymbolUsed: quote.providerSymbol,
    price,
    previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    available: isValidPrice(price),
  });
  const updatedAt = quote.updatedAt;
  const dataQuality: TraderDataQuality = isValidPrice(normalizedQuote.price) ? 'partial' : 'unavailable';
  const fallbackUsed = quote.provider !== 'fmp';
  const metadata = quoteMetadata(display, quote, meta);
  const raw = quote.raw ?? {};
  return applyRecommendationToQuote({
    ...quoteIdentity(display, meta),
    providerSymbol: quote.providerSymbol,
    providerSymbolUsed: quote.providerSymbol,
    provider: quote.provider,
    fallbackUsed,
    name: (canonical?.name ?? quote.name) || meta?.name || display,
    assetType,
    price: normalizedQuote.price,
    change: normalizedQuote.change,
    changePercent: normalizedQuote.changePercent,
    previousClose: normalizedQuote.previousClose,
    marketCap: quote.marketCap ?? numberOrNull(raw.marketCap ?? raw.marketCapitalization ?? raw.market_cap),
    volume: quote.volume ?? numberOrNull(raw.volume ?? raw.regularMarketVolume ?? raw.averageVolume),
    currency: metadata.currency ?? normalized.currency ?? normalizeMarketCurrencyCode(quote.currency) ?? meta?.currency ?? defaultCurrency(display),
    ...metadataQuoteFields(metadata),
    signal: 'watch',
    signalAvailable: isValidPrice(normalizedQuote.price),
    confidence: null,
    riskLevel: riskFromVolatility(null, assetType),
    rsi: null,
    sma20: null,
    sma50: null,
    sparkline: [],
    history: [],
    chartAvailable: false,
    dataQuality,
    providerStatus: quoteStatus({ display, providerSymbol: quote.providerSymbol, fallbackUsed, updatedAt, dataQuality, provider: quote.provider, source: quote.providerName }),
    source: quote.providerName,
    delayed: fallbackUsed,
    available: isValidPrice(normalizedQuote.price),
    unavailableReason: isValidPrice(normalizedQuote.price) ? undefined : 'invalid_provider_quote',
    lastUpdated: updatedAt,
    updatedAt,
    ...quoteShariahFields(display, assetType, meta, quote.name),
  });
}

function quoteCacheKey(symbol: string) {
  return upper(symbol);
}

function cachedQuote(symbol: string, options: { allowStale?: boolean; forceFresh?: boolean } = {}) {
  const entry = quoteCache.get(quoteCacheKey(symbol));
  if (!entry) return null;
  const now = Date.now();
  if (!options.forceFresh && entry.expiresAt > now) return withCachedQuality(entry.quote);
  if (options.allowStale && entry.staleUntil > now) return withCachedQuality(entry.quote);
  if (entry.staleUntil <= now) quoteCache.delete(quoteCacheKey(symbol));
  return null;
}

function storeQuoteCache(symbol: string, quote: TraderQuote) {
  if (!quote.available || !isValidPrice(quote.price)) return;
  const now = Date.now();
  quoteCache.set(quoteCacheKey(symbol), {
    quote,
    expiresAt: now + QUOTE_CACHE_MS,
    staleUntil: now + QUOTE_STALE_MS,
  });
  markFmpCacheAvailable(`quote:${quoteCacheKey(symbol)}`);
}

function withCachedQuality(quote: TraderQuote): TraderQuote {
  const cached = applyRecommendationToQuote({
    ...quote,
    dataQuality: 'cached',
    delayed: true,
  });
  return {
    ...cached,
    dataQuality: 'cached',
    delayed: true,
    providerStatus: {
      ...cached.providerStatus,
      dataQuality: 'cached',
    },
  };
}

function providerErrorReason(error: unknown, fallback: string) {
  if (error instanceof ProviderError) return error.messageCode;
  if (error instanceof FmpRateLimitError) return 'provider_rate_limited';
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/rate_limited|http_429|429/.test(message)) return 'provider_rate_limited';
  if (/timeout|aborted|network/i.test(message)) return 'provider_temporarily_unavailable';
  return fallback;
}

function isRateLimitReason(reason: string) {
  return reason === 'provider_rate_limited' || /rate_limited|429/.test(reason);
}

function providerMessageFromFmpPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const record = payload as Record<string, unknown>;
  return String(
    record.error
      ?? record.message
      ?? record.Message
      ?? record['Error Message']
      ?? record.status
      ?? '',
  ).replace(/\s+/g, ' ').trim().slice(0, 240);
}

function isFmpRateLimitMessage(message: string) {
  return /rate\s*limit|too many requests|quota|usage limit|limit reached|provider_rate_limited/i.test(message);
}

function throwIfFmpPayloadRateLimited(payload: unknown, responseStatus: number) {
  const message = providerMessageFromFmpPayload(payload);
  if (!message || !isFmpRateLimitMessage(message)) return;
  if (responseStatus !== 429) markFmpRateLimited(null, message);
  throw new FmpRateLimitError(message);
}

function fmpQuoteFromRecord(record: Record<string, unknown>): ProviderQuote | null {
  const symbol = textOrNull(record.symbol);
  const price = numberOrNull(record.price ?? record.regularMarketPrice);
  if (!symbol || price === null || price <= 0) return null;
  const timestamp = numberOrNull(record.timestamp);
  const change = numberOrNull(record.change ?? record.changes);
  const previousClose = numberOrNull(record.previousClose ?? record.previous_close ?? record.prevClose);
  const explicitPercent = numberOrNull(
    record.changesPercentage
      ?? record.changePercentage
      ?? record.percentChange
      ?? record.changePercent
      ?? record.change_percentage
      ?? record.percent_change
      ?? record.change_percent,
  );
  return {
    provider: 'fmp',
    providerName: 'Financial Modeling Prep',
    providerSymbol: symbol,
    name: textOrNull(record.name),
    price,
    change,
    changePercent: deriveChangePercentFromProvider({
      explicitPercent,
      price,
      previousClose,
      change,
    }),
    previousClose,
    marketCap: numberOrNull(record.marketCap ?? record.marketCapitalization ?? record.market_cap),
    volume: numberOrNull(record.volume ?? record.regularMarketVolume ?? record.averageVolume),
    currency: textOrNull(record.currency),
    exchange: textOrNull(record.exchange ?? record.exchangeName ?? record.stockExchange ?? record.exchangeShortName),
    exchangeCode: textOrNull(record.exchangeShortName ?? record.mic ?? record.exchangeCode ?? record.exchange_code),
    market: textOrNull(record.market ?? record.exchangeName ?? record.stockExchange),
    country: textOrNull(record.country),
    assetType: textOrNull(record.assetType ?? record.asset_type ?? record.type),
    raw: record,
    updatedAt: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
  };
}

async function fetchFmpBatch(symbols: string[], apiKey: string, forceFresh?: boolean) {
  const url = new URL(`${FMP_BASE_URL}/batch-quote`);
  url.searchParams.set('symbols', symbols.join(','));
  url.searchParams.set('apikey', apiKey);
  const response = await fmpQueuedFetch(url, {
    cache: forceFresh ? 'no-store' : undefined,
    next: forceFresh ? undefined : { revalidate: 60 },
    signal: AbortSignal.timeout(10_000),
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as unknown;
  throwIfFmpPayloadRateLimited(payload, response.status);
  if (!response.ok) {
    if (response.status === 429) throw new FmpRateLimitError();
    throw new ProviderError('provider_error', 'provider_temporarily_unavailable', response.status, `provider_http_${response.status}`);
  }
  return Array.isArray(payload)
    ? payload.map(item => item && typeof item === 'object' ? fmpQuoteFromRecord(item as Record<string, unknown>) : null).filter((item): item is ProviderQuote => Boolean(item))
    : [];
}

async function fetchFmpQuoteCollection(endpoint: string, apiKey: string, forceFresh?: boolean) {
  const url = new URL(`${FMP_BASE_URL}/${endpoint}`);
  url.searchParams.set('apikey', apiKey);
  const response = await fmpQueuedFetch(url, {
    cache: forceFresh ? 'no-store' : undefined,
    next: forceFresh ? undefined : { revalidate: 60 },
    signal: AbortSignal.timeout(10_000),
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as unknown;
  throwIfFmpPayloadRateLimited(payload, response.status);
  if (!response.ok) {
    if (response.status === 429) throw new FmpRateLimitError();
    throw new ProviderError('provider_error', 'provider_temporarily_unavailable', response.status, `provider_http_${response.status}`);
  }
  return Array.isArray(payload)
    ? payload.map(item => item && typeof item === 'object' ? fmpQuoteFromRecord(item as Record<string, unknown>) : null).filter((item): item is ProviderQuote => Boolean(item))
    : [];
}

async function fetchFmpSingle(symbol: string, apiKey: string, forceFresh?: boolean) {
  const url = new URL(`${FMP_BASE_URL}/quote`);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', apiKey);
  const response = await fmpQueuedFetch(url, {
    cache: forceFresh ? 'no-store' : undefined,
    next: forceFresh ? undefined : { revalidate: 60 },
    signal: AbortSignal.timeout(8_000),
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as unknown;
  throwIfFmpPayloadRateLimited(payload, response.status);
  if (!response.ok) {
    if (response.status === 429) throw new FmpRateLimitError();
    throw new ProviderError('provider_error', 'provider_temporarily_unavailable', response.status, `provider_http_${response.status}`);
  }
  const records = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : [];
  for (const record of records) {
    const quote = fmpQuoteFromRecord(record as Record<string, unknown>);
    if (quote) return quote;
  }
  return null;
}

async function fetchFmpQuotes(symbols: string[], metaBySymbol: Map<string, TraderCatalogSymbol>, forceFresh?: boolean) {
  const apiKey = cleanEnv(process.env.FMP_API_KEY);
  const quotes = new Map<string, TraderQuote>();
  const loaded: TraderQuoteLoadResult['loaded'] = [];
  const failed: QuoteIssue[] = [];
  const skipped: QuoteIssue[] = [];
  const latencyStart = Date.now();
  let rateLimited = false;
  if (!apiKey) {
    symbols.forEach(symbol => skipped.push({ symbol, provider: 'fmp', reason: 'fmp_not_configured' }));
    return { quotes, loaded, failed, skipped, latencyMs: 0, rateLimited: false };
  }
  if (isFmpRateLimited()) {
    symbols.forEach(symbol => skipped.push({ symbol, provider: 'fmp', reason: 'provider_rate_limited' }));
    return { quotes, loaded, failed, skipped, latencyMs: 0, rateLimited: true };
  }

  const candidateBySymbol = new Map<string, string[]>();
  const primaryToDisplay = new Map<string, string[]>();
  const collectionDisplays = new Map<string, string[]>();
  for (const symbol of symbols) {
    const meta = metaBySymbol.get(upper(symbol));
    const candidates = candidateSymbols(symbol, 'fmp', meta);
    candidateBySymbol.set(symbol, candidates);
    const primary = candidates[0];
    if (!primary) {
      skipped.push({ symbol, provider: 'fmp', reason: 'no_fmp_provider_symbol' });
      continue;
    }
    const assetType = classifyAssetType(symbol, meta);
    const collectionEndpoint = assetType === 'forex'
      ? 'batch-forex-quotes'
      : assetType === 'crypto'
        ? 'batch-crypto-quotes'
        : assetType === 'commodity'
          ? 'batch-commodity-quotes'
          : assetType === 'index'
            ? 'batch-index-quotes'
            : null;
    if (collectionEndpoint) {
      collectionDisplays.set(collectionEndpoint, [...(collectionDisplays.get(collectionEndpoint) ?? []), symbol]);
      continue;
    }
    const key = upper(primary);
    primaryToDisplay.set(key, [...(primaryToDisplay.get(key) ?? []), symbol]);
  }

  for (const [endpoint, displays] of collectionDisplays) {
    try {
      const records = await fetchFmpQuoteCollection(endpoint, apiKey, forceFresh);
      const byProviderSymbol = new Map(records.map(record => [upper(record.providerSymbol), record]));
      for (const display of displays) {
        const meta = metaBySymbol.get(upper(display));
        const match = (candidateBySymbol.get(display) ?? [])
          .map(candidate => byProviderSymbol.get(upper(candidate)))
          .find(Boolean);
        if (!match) continue;
        const quote = normalizeProviderQuote(display, match, meta);
        if (quote.available) {
          quotes.set(display, quote);
          loaded.push({ symbol: display, provider: 'fmp', providerSymbol: quote.providerSymbol });
        }
      }
    } catch (error) {
      const reason = providerErrorReason(error, `fmp_${endpoint}_failed`);
      displays.forEach(symbol => failed.push({
        symbol,
        provider: 'fmp',
        reason,
      }));
      if (isRateLimitReason(reason)) {
        rateLimited = true;
        break;
      }
    }
  }

  const primaries = Array.from(primaryToDisplay.keys());
  for (let start = 0; !rateLimited && start < primaries.length; start += FMP_BATCH_SIZE) {
    const chunk = primaries.slice(start, start + FMP_BATCH_SIZE);
    try {
      const records = await fetchFmpBatch(chunk, apiKey, forceFresh);
      for (const providerQuote of records) {
        const displays = primaryToDisplay.get(upper(providerQuote.providerSymbol)) ?? [];
        for (const display of displays) {
          const meta = metaBySymbol.get(upper(display));
          const quote = normalizeProviderQuote(display, providerQuote, meta);
          if (quote.available) {
            quotes.set(display, quote);
            loaded.push({ symbol: display, provider: 'fmp', providerSymbol: quote.providerSymbol });
          }
        }
      }
    } catch (error) {
      const reason = providerErrorReason(error, 'fmp_batch_quote_failed');
      for (const providerSymbol of chunk) {
        for (const display of primaryToDisplay.get(providerSymbol) ?? []) {
          failed.push({ symbol: display, provider: 'fmp', reason });
        }
      }
      if (isRateLimitReason(reason)) rateLimited = true;
    }
  }

  const missing = symbols.filter(symbol => !quotes.has(symbol));
  if (rateLimited || isFmpRateLimited()) {
    missing.forEach(symbol => skipped.push({ symbol, provider: 'fmp', reason: 'provider_rate_limited' }));
    return { quotes, loaded, failed, skipped, latencyMs: Date.now() - latencyStart, rateLimited: true };
  }

  await runConcurrent(missing, QUOTE_CONCURRENCY, async (symbol) => {
    const candidates = candidateBySymbol.get(symbol) ?? [];
    if (candidates.length === 0) return;
    for (const candidate of candidates) {
      try {
        const providerQuote = await fetchFmpSingle(candidate, apiKey, forceFresh);
        if (!providerQuote) continue;
        const meta = metaBySymbol.get(upper(symbol));
        const quote = normalizeProviderQuote(symbol, providerQuote, meta);
        if (quote.available) {
          quotes.set(symbol, quote);
          loaded.push({ symbol, provider: 'fmp', providerSymbol: quote.providerSymbol });
          return;
        }
      } catch (error) {
        const reason = providerErrorReason(error, 'fmp_quote_failed');
        failed.push({ symbol, provider: 'fmp', reason });
        if (isRateLimitReason(reason)) {
          rateLimited = true;
          return;
        }
      }
    }
  });

  return { quotes, loaded, failed, skipped, latencyMs: Date.now() - latencyStart, rateLimited };
}

async function fetchChart(yahooSymbol: string, forceFresh?: boolean): Promise<YahooChartResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...(forceFresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json', 'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)' },
    });
  } catch {
    return null;
  }
  // تحصين: بيئات الاختبار أو أغلفة fetch قد تعيد قيمة غير معرفة بدل رمي استثناء
  if (!response?.ok) return null;

  const body = await response.json().catch(() => null) as { chart?: { result?: Array<Record<string, any>> } } | null;
  const result = body?.chart?.result?.[0];
  if (!result) return null;

  const meta = (result.meta ?? {}) as Record<string, any>;
  const quote = result.indicators?.quote?.[0] ?? {};
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const closesRaw = quote.close;
  const closes = Array.isArray(closesRaw)
    ? closesRaw.map(numberOrNull).filter((value): value is number => value !== null && value > 0)
    : [];
  const history = timestamps
    .map((timestamp: unknown, index: number): TraderHistoryPoint | null => {
      const close = numberOrNull(quote.close?.[index]);
      if (close === null || close <= 0) return null;
      const marketTime = numberOrNull(timestamp);
      return {
        date: marketTime ? new Date(marketTime * 1000).toISOString() : null,
        open: numberOrNull(quote.open?.[index]),
        high: numberOrNull(quote.high?.[index]),
        low: numberOrNull(quote.low?.[index]),
        close,
        volume: numberOrNull(quote.volume?.[index]),
      };
    })
    .filter((point): point is TraderHistoryPoint => point !== null);
  const price = numberOrNull(meta.regularMarketPrice) ?? (closes.length ? closes[closes.length - 1] : null);
  const previousClose = numberOrNull(meta.chartPreviousClose)
    ?? numberOrNull(meta.previousClose)
    ?? (closes.length >= 2 ? closes[closes.length - 2] : null);
  const marketTime = numberOrNull(meta.regularMarketTime);

  return {
    symbol: textOrNull(meta.symbol),
    name: textOrNull(meta.longName ?? meta.shortName),
    price,
    previousClose,
    currency: typeof meta.currency === 'string' ? meta.currency : null,
    exchange: textOrNull(meta.fullExchangeName ?? meta.exchangeName ?? meta.exchange ?? meta.quoteSourceName),
    exchangeCode: textOrNull(meta.exchange),
    market: textOrNull(meta.market),
    assetType: textOrNull(meta.quoteType ?? meta.instrumentType),
    closes,
    history,
    marketTime: marketTime ? new Date(marketTime * 1000).toISOString() : null,
  };
}

async function fetchYahooQuote(display: string, meta?: TraderCatalogSymbol, forceFresh?: boolean): Promise<TraderQuote> {
  const assetType = classifyAssetType(display, meta);
  const canonical = assetType === 'crypto' ? canonicalCryptoForQuote(display, meta) : null;
  const symbols = candidateSymbols(display, 'yahoo', meta);
  const primaryYahoo = symbols[0] ?? display;

  let chart: YahooChartResult | null = null;
  let yahoo = primaryYahoo;
  for (const candidate of symbols) {
    const attempt = await fetchChart(candidate, forceFresh);
    if (attempt && isValidPrice(attempt.price)) {
      const rejectionReason = canonical ? cryptoQuoteRejectionReason({
        requestedSymbol: display,
        canonicalSymbol: canonical.canonicalSymbol,
        assetClass: 'crypto',
        provider: 'yahoo',
        providerSymbol: candidate,
        responseSymbol: attempt.symbol ?? candidate,
        responseName: attempt.name ?? canonical.name,
        responseAssetType: attempt.assetType,
        responsePrice: attempt.price,
      }) : null;
      if (rejectionReason) {
        console.warn('[trader-quotes] rejected Yahoo chart collision', {
          canonicalSymbol: canonical?.canonicalSymbol,
          assetClass: assetType,
          provider: 'yahoo',
          providerSymbol: candidate,
          responseName: attempt.name,
          responsePrice: attempt.price,
          rejectionReason,
        });
        continue;
      }
      chart = attempt;
      yahoo = candidate;
      break;
    }
    chart ??= attempt;
  }

  if (!chart || chart.price === null) {
    const normalized = await fetchYahooNormalizedQuote({
      requestedSymbol: display,
      symbols,
      name: canonical?.name ?? meta?.name ?? display,
      forceFresh,
      canonicalSymbol: canonical?.canonicalSymbol,
      assetClass: canonical ? 'crypto' : assetType,
      expectedName: canonical?.name ?? meta?.name,
      debugContext: { route: 'trader/marketQuotes', mode: 'quote_fallback' },
    }).catch(() => null);

    if (!normalized || !normalized.available || normalized.price === null) {
      return unavailableQuote(display, normalized?.unavailableReason ?? 'provider_returned_empty_quote', meta);
    }
    const norm = normalizeMarketPrice({ price: normalized.price, currency: normalized.currency, providerCurrency: normalized.currency, symbol: display, market: display, assetType });
    const divisor = norm.priceUnit === 'fils' ? 1000 : norm.priceUnit === 'pence' ? 100 : 1;
    const price = isValidPrice(norm.price) ? round(norm.price) : null;
    const rawChange = numberOrNull(normalized.change);
    const change = round(rawChange !== null ? rawChange / divisor : null);
    const previousClose = price !== null && change !== null ? round(price - change) : null;
    const normalizedQuote = normalizeSharedQuote({
      symbol: display,
      assetType,
      provider: 'Yahoo Finance',
      providerSymbol: normalized.symbolUsed ?? yahoo,
      providerSymbolUsed: normalized.symbolUsed ?? yahoo,
      price,
      previousClose,
      change,
      changePercent: normalized.changePercent,
      available: isValidPrice(price),
    });
    const updatedAt = normalized.marketTime;
    const dataQuality: TraderDataQuality = isValidPrice(normalizedQuote.price) ? 'partial' : 'unavailable';
    const metadata = quoteMetadata(display, {
      provider: 'yahoo',
      providerName: 'Yahoo Finance',
      providerSymbol: normalizedQuote.providerSymbolUsed ?? normalized.symbolUsed ?? yahoo,
      name: normalized.name,
      currency: normalized.currency,
      exchange: normalized.exchange,
      exchangeCode: normalized.exchangeCode,
      market: normalized.market,
      assetType: normalized.assetType,
    }, meta);
    return applyRecommendationToQuote({
      ...quoteIdentity(display, meta),
      providerSymbol: normalizedQuote.providerSymbol,
      providerSymbolUsed: normalizedQuote.providerSymbolUsed,
      provider: 'yahoo',
      fallbackUsed: true,
      name: (canonical?.name ?? normalized.name) || meta?.name || display,
      assetType,
      price: normalizedQuote.price,
      change: normalizedQuote.change,
      changePercent: normalizedQuote.changePercent,
      previousClose: normalizedQuote.previousClose,
      currency: metadata.currency ?? norm.currency ?? normalizeMarketCurrencyCode(normalized.currency) ?? meta?.currency ?? defaultCurrency(display),
      ...metadataQuoteFields(metadata),
      signal: 'watch',
      signalAvailable: isValidPrice(normalizedQuote.price),
      confidence: null,
      riskLevel: riskFromVolatility(null, assetType),
      rsi: null,
      sma20: null,
      sma50: null,
      sparkline: [],
      history: [],
      chartAvailable: false,
      dataQuality,
      providerStatus: quoteStatus({ display, providerSymbol: normalized.symbolUsed ?? yahoo, fallbackUsed: true, updatedAt, dataQuality, provider: 'yahoo', source: 'Yahoo Finance' }),
      source: 'Yahoo Finance',
      delayed: true,
      available: isValidPrice(normalizedQuote.price),
      unavailableReason: isValidPrice(normalizedQuote.price) ? undefined : 'invalid_provider_quote',
      lastUpdated: updatedAt,
      updatedAt,
      ...quoteShariahFields(display, assetType, meta, canonical?.name ?? normalized.name),
    });
  }

  const norm = normalizeMarketPrice({ price: chart.price, currency: chart.currency, providerCurrency: chart.currency, symbol: display, market: display, assetType });
  const divisor = norm.priceUnit === 'fils' ? 1000 : norm.priceUnit === 'pence' ? 100 : 1;
  const price = isValidPrice(norm.price) ? norm.price : null;
  const closes = chart.closes.map(value => value / divisor);
  const previousClose = chart.previousClose !== null && isValidPrice(chart.previousClose / divisor) ? chart.previousClose / divisor : null;
  const normalizedQuote = normalizeSharedQuote({
    symbol: display,
    assetType,
    provider: 'Yahoo Finance',
    providerSymbol: yahoo,
    providerSymbolUsed: yahoo,
    price: round(price),
    previousClose: round(previousClose),
    available: isValidPrice(price),
  });
  const metadata = quoteMetadata(display, {
    provider: 'yahoo',
    providerName: 'Yahoo Finance',
    providerSymbol: normalizedQuote.providerSymbolUsed ?? yahoo,
    currency: chart.currency,
    exchange: chart.exchange,
    exchangeCode: chart.exchangeCode,
    market: chart.market,
    assetType: chart.assetType,
  }, meta);
  const currency = metadata.currency ?? norm.currency ?? normalizeMarketCurrencyCode(chart.currency) ?? meta?.currency ?? defaultCurrency(display);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsiValue = rsi(closes, 14);
  const sparkline = closes.slice(-40).map(value => round(value)).filter((value): value is number => value !== null);
  const history = chart.history.slice(-260).map(point => ({
    ...point,
    close: round(point.close / divisor) ?? point.close / divisor,
    open: point.open !== null && point.open !== undefined ? round(point.open / divisor) : point.open,
    high: point.high !== null && point.high !== undefined ? round(point.high / divisor) : point.high,
    low: point.low !== null && point.low !== undefined ? round(point.low / divisor) : point.low,
  }));
  const chartAvailable = closes.length >= 2;
  const dataQuality: TraderDataQuality = chartAvailable ? 'delayed' : 'partial';
  const updatedAt = chart.marketTime;

  return applyRecommendationToQuote({
    ...quoteIdentity(display, meta),
    providerSymbol: normalizedQuote.providerSymbol,
    providerSymbolUsed: normalizedQuote.providerSymbolUsed,
    provider: 'yahoo',
    fallbackUsed: true,
    name: canonical?.name ?? meta?.name ?? display,
    assetType,
    price: normalizedQuote.price,
    change: normalizedQuote.change,
    changePercent: normalizedQuote.changePercent,
    previousClose: normalizedQuote.previousClose,
    currency,
    ...metadataQuoteFields(metadata),
    signal: 'watch',
    signalAvailable: isValidPrice(normalizedQuote.price),
    confidence: null,
    riskLevel: riskFromVolatility(annualizedVolatility(closes), assetType),
    rsi: rsiValue !== null ? Number(rsiValue.toFixed(1)) : null,
    sma20: sma20 !== null ? Number(sma20.toFixed(4)) : null,
    sma50: sma50 !== null ? Number(sma50.toFixed(4)) : null,
    sparkline,
    history,
    chartAvailable,
    dataQuality,
    providerStatus: quoteStatus({ display, providerSymbol: yahoo, fallbackUsed: true, updatedAt, dataQuality, provider: 'yahoo', source: 'Yahoo Finance' }),
    source: 'Yahoo Finance',
    delayed: true,
    available: isValidPrice(normalizedQuote.price),
    unavailableReason: isValidPrice(normalizedQuote.price) ? undefined : 'invalid_provider_quote',
    lastUpdated: updatedAt,
    updatedAt,
    ...quoteShariahFields(display, assetType, meta, canonical?.name),
  });
}

async function fetchFinnhubQuote(display: string, meta?: TraderCatalogSymbol): Promise<TraderQuote> {
  const apiKey = cleanEnv(process.env.FINNHUB_API_KEY);
  if (!apiKey) return unavailableQuote(display, 'finnhub_not_configured', meta);
  const candidates = candidateSymbols(display, 'finnhub', meta);
  for (const candidate of candidates) {
    const url = new URL('https://finnhub.io/api/v1/quote');
    url.searchParams.set('symbol', candidate);
    url.searchParams.set('token', apiKey);
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json' },
    }).catch(() => null);
    if (!response?.ok) continue;
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    const price = numberOrNull(payload?.c);
    if (price === null || price <= 0) continue;
    return normalizeProviderQuote(display, {
      provider: 'finnhub',
      providerName: 'Finnhub',
      providerSymbol: candidate,
      name: meta?.name ?? display,
      price,
      change: numberOrNull(payload?.d),
      changePercent: numberOrNull(payload?.dp),
      previousClose: numberOrNull(payload?.pc),
      currency: meta?.currency ?? defaultCurrency(display),
      exchange: textOrNull(payload?.exchange ?? meta?.exchange),
      exchangeCode: textOrNull(payload?.mic ?? meta?.exchangeCode),
      market: textOrNull(payload?.market ?? meta?.market),
      country: textOrNull(payload?.country ?? meta?.country),
      assetType: textOrNull(payload?.type ?? meta?.assetType),
      raw: payload,
      updatedAt: numberOrNull(payload?.t) ? new Date(Number(payload?.t) * 1000).toISOString() : new Date().toISOString(),
    }, meta);
  }
  return unavailableQuote(display, 'finnhub_returned_empty_quote', meta);
}

async function runConcurrent<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => run()));
}

async function fetchFallbackProvider(
  provider: Exclude<TraderQuoteProvider, 'fmp'>,
  symbols: string[],
  metaBySymbol: Map<string, TraderCatalogSymbol>,
  forceFresh?: boolean,
) {
  const quotes = new Map<string, TraderQuote>();
  const loaded: TraderQuoteLoadResult['loaded'] = [];
  const failed: QuoteIssue[] = [];
  const skipped: QuoteIssue[] = [];
  const startedAt = Date.now();

  await runConcurrent(symbols, QUOTE_CONCURRENCY, async (symbol) => {
    const meta = metaBySymbol.get(upper(symbol));
    const quote = provider === 'yahoo'
      ? await fetchYahooQuote(symbol, meta, forceFresh)
      : await fetchFinnhubQuote(symbol, meta);
    if (quote.available) {
      quotes.set(symbol, quote);
      loaded.push({ symbol, provider, providerSymbol: quote.providerSymbol });
    } else if (quote.unavailableReason?.endsWith('_not_configured')) {
      skipped.push({ symbol, provider, reason: quote.unavailableReason });
    } else {
      failed.push({ symbol, provider, reason: quote.unavailableReason ?? 'provider_returned_empty_quote' });
    }
  });

  return { quotes, loaded, failed, skipped, latencyMs: Date.now() - startedAt };
}

async function fetchTraderQuotesDetailedUncoalesced(
  symbols: string[],
  options?: TraderQuoteLoadOptions,
): Promise<TraderQuoteLoadResult> {
  const byMeta = metaMap(options?.symbolMeta);
  const uniqueSymbols = Array.from(new Set(symbols.map(s => normalizedRequestedSymbol(s, byMeta)).filter(Boolean)));
  const quotes = new Map<string, TraderQuote>();
  const loaded: TraderQuoteLoadResult['loaded'] = [];
  const failed: QuoteIssue[] = [];
  const skipped: QuoteIssue[] = [];
  const providerLatencyMs: Partial<Record<TraderQuoteProvider, number>> = {};
  let cachedSymbols = 0;

  for (const symbol of uniqueSymbols) {
    const cached = cachedQuote(symbol, { forceFresh: options?.forceFresh });
    if (!cached) continue;
    quotes.set(symbol, cached);
    cachedSymbols += 1;
    loaded.push({ symbol, provider: cached.provider ?? 'yahoo', providerSymbol: cached.providerSymbol });
  }

  for (const provider of configuredQuoteProviderPriority()) {
    const remaining = uniqueSymbols.filter(symbol => !quotes.has(symbol));
    if (remaining.length === 0) break;

    if (provider === 'fmp') {
      const fmp = await fetchFmpQuotes(remaining, byMeta, options?.forceFresh);
      providerLatencyMs.fmp = fmp.latencyMs;
      fmp.quotes.forEach((quote, symbol) => {
        quotes.set(symbol, quote);
        storeQuoteCache(symbol, quote);
      });
      loaded.push(...fmp.loaded);
      failed.push(...fmp.failed);
      skipped.push(...fmp.skipped);

      if (fmp.rateLimited) {
        for (const symbol of uniqueSymbols.filter(symbol => !quotes.has(symbol))) {
          const cached = cachedQuote(symbol, { allowStale: true });
          if (!cached) continue;
          quotes.set(symbol, cached);
          cachedSymbols += 1;
          loaded.push({ symbol, provider: cached.provider ?? 'yahoo', providerSymbol: cached.providerSymbol });
        }
      }
      continue;
    }

    const result = await fetchFallbackProvider(provider, remaining, byMeta, options?.forceFresh);
    providerLatencyMs[provider] = result.latencyMs;
    result.quotes.forEach((quote, symbol) => {
      quotes.set(symbol, quote);
      storeQuoteCache(symbol, quote);
    });
    loaded.push(...result.loaded);
    failed.push(...result.failed);
    skipped.push(...result.skipped);
  }

  const assembledQuotes = uniqueSymbols.map(symbol => quotes.get(symbol) ?? unavailableQuote(symbol, 'all_providers_returned_no_quote', byMeta.get(upper(symbol))));
  const historyEnriched = options?.includeHistory === false
    ? assembledQuotes
    : await enrichQuotesWithHistory(assembledQuotes);
  const orderedQuotes = options?.includeNews
    ? await enrichQuotesWithNews(historyEnriched)
    : historyEnriched;
  const firstLoadedProvider = loaded[0]?.provider ?? null;
  return {
    quotes: orderedQuotes,
    loaded,
    failed,
    skipped,
    provider: firstLoadedProvider,
    reason: firstLoadedProvider ? null : 'all_providers_returned_no_quote',
    providerLatencyMs,
    cacheStatus: cachedSymbols > 0 ? 'provider-cache' : firstLoadedProvider ? 'live' : 'not_configured',
    summary: {
      loadedSymbols: loaded.length,
      failedSymbols: failed.length,
      cachedSymbols,
      skippedDueToRateLimit: getFmpRuntimeStatus(Boolean(cleanEnv(process.env.FMP_API_KEY)), cachedSymbols > 0).skippedDueToRateLimit,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Coalesce identical concurrent route loads so one render cannot multiply provider work. */
export async function fetchTraderQuotesDetailed(
  symbols: string[],
  options?: TraderQuoteLoadOptions,
): Promise<TraderQuoteLoadResult> {
  const metaKey = (options?.symbolMeta ?? []).map(item => [
    item.symbol,
    item.providerSymbol,
    item.currency,
    item.exchange,
    item.assetType,
  ].join(':')).sort().join('|');
  const key = JSON.stringify({
    symbols: Array.from(new Set(symbols.map(upper))).sort(),
    forceFresh: Boolean(options?.forceFresh),
    includeHistory: options?.includeHistory !== false,
    includeNews: Boolean(options?.includeNews),
    metaKey,
  });
  const existing = pendingQuoteLoads.get(key);
  if (existing) return existing;

  const pending = fetchTraderQuotesDetailedUncoalesced(symbols, options)
    .finally(() => pendingQuoteLoads.delete(key));
  pendingQuoteLoads.set(key, pending);
  return pending;
}

export async function fetchTraderQuotes(
  symbols: string[],
  options?: TraderQuoteLoadOptions,
): Promise<TraderQuote[]> {
  return (await fetchTraderQuotesDetailed(symbols, options)).quotes;
}

export function resolveTraderMarket(marketId: string | null | undefined): MarketDef {
  return getStaticTraderMarket(marketId);
}

export async function resolveTraderMarketDynamic(marketId: string | null | undefined, options?: { forceFresh?: boolean; includeFmpDiscovery?: boolean }) {
  return resolveTraderMarketFromCatalog(marketId, options);
}

export function getConnectedProvider() {
  const capabilities = providerCapabilityMatrix();
  // ترتيب مزودات الأسعار الفعلي في مسار fetchTraderQuotesDetailed:
  // FMP (إن كان مهيأً) ثم Yahoo الداخلي ثم Finnhub. Twelve Data/EODHD
  // مهيأان للأساسيات؛ عند ربط مسار أسعارهما يُقدَّمان هنا.
  const fallbackOrder = configuredQuoteProviderPriority();
  const active = fallbackOrder.find((provider) => {
    if (provider === 'yahoo') return true;
    const capability = capabilities[provider];
    return Boolean(capability?.configured && capability.status !== 'rate_limited');
  }) ?? 'yahoo';
  const label = quoteProviderLabel(active);
  const activeCapability = capabilities[active];
  const status = activeCapability?.status === 'healthy'
    ? 'connected' as const
    : activeCapability?.status ?? 'degraded' as const;
  return {
    active: label,
    requested: quoteProviderLabel(fallbackOrder[0] ?? 'fmp'),
    provider: label,
    configured: active === 'yahoo' ? true : Boolean(activeCapability?.configured),
    status,
    healthMeasured: Boolean(activeCapability?.lastSuccessfulFetch),
    lastSuccessAt: activeCapability?.lastSuccessfulFetch ?? null,
    lastFailureReason: activeCapability?.lastError ?? activeCapability?.reason ?? null,
    fallbackOrder: fallbackOrder.map(quoteProviderLabel),
    capabilityMatrix: capabilities,
  };
}

export const CONNECTED_PROVIDER = getConnectedProvider();

export function clearTraderQuoteCache() {
  quoteCache.clear();
}

export function __resetTraderQuoteCacheForTests() {
  clearTraderQuoteCache();
}
