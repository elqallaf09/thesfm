import {
  classifyShariahCompliance,
  shariahClassificationFields,
  type ShariahClassification,
} from '@/lib/market/shariah-screening';
import { isValidPrice } from '@/lib/market/quoteNormalization';
import { buildResearchEvidence, cleanResearchHistory, type ResearchEvidence } from './researchEvidence';
import { isCurrentSfmQuote, referenceQuote } from '@/lib/trader/quoteEvidence';
import { getSfmMarketHistory } from '@/lib/sfm-market/history';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import {
  SFM_MARKET_ENGINE_NAME,
  SFM_MARKET_ENGINE_VERSION,
  SFM_MARKET_SCHEMA_VERSION,
  type SfmMarketQuote,
} from '@/lib/sfm-market/types';
import type {
  TraderAssetType,
  TraderCatalogSymbol,
  TraderQuoteProvider,
} from '@/lib/trader/marketCatalog';
import { normalizeTraderSymbolMetadata } from '@/lib/trader/marketMetadata';
import type {
  TraderQuote,
  TraderQuoteLoadOptions,
  TraderQuoteLoadResult,
} from './marketQuotes';
import {
  buildMultiFactorRecommendation,
  UNAVAILABLE_NEWS_SENTIMENT,
  type RecommendationDataQuality,
  type RecommendationPricePoint,
} from '@/lib/trader/recommendationEngine';

export type SfmTraderQuote = TraderQuote & {
  analyticalSource: typeof SFM_MARKET_ENGINE_NAME;
  engineVersion: typeof SFM_MARKET_ENGINE_VERSION;
  schemaVersion: typeof SFM_MARKET_SCHEMA_VERSION;
  upstreamSource: string | null;
  lastKnownPrice?: number | null;
  priceReference?: ReturnType<typeof referenceQuote>;
  technicalAsOf?: string | null;
  research?: ResearchEvidence;
  sfmQuality: SfmMarketQuote['quality'];
  sfmProvenance: SfmMarketQuote['provenance'];
};

const CONCURRENCY = 6;

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function traderAssetType(value: string | null | undefined): TraderAssetType {
  if (value === 'etf') return 'fund';
  if (value === 'crypto' || value === 'forex' || value === 'commodity' || value === 'index') return value;
  if (value === 'gold') return 'commodity';
  return 'stock';
}

function sfmAssetType(value: TraderAssetType | undefined) {
  return value === 'fund' ? 'etf' : value;
}

function traderProvider(value: string | null): TraderQuoteProvider | null {
  if (value === 'finnhub' || value === 'twelve_data' || value === 'eodhd' || value === 'marketstack' || value === 'fmp' || value === 'gold_api') return value;
  return null;
}

function providerDisplayName(value: string | null) {
  if (value === 'gold_api') return 'Gold API';
  if (value === 'fmp') return 'Financial Modeling Prep';
  if (value === 'finnhub') return 'Finnhub';
  if (value === 'twelve_data') return 'Twelve Data';
  if (value === 'eodhd') return 'EODHD';
  if (value === 'marketstack' || value === 'fmp') return 'Marketstack';
  return null;
}

function recommendationDataQuality(quote: SfmMarketQuote): RecommendationDataQuality {
  if (quote.quality.state === 'unavailable') return 'unavailable';
  if (quote.quality.state === 'stale') return quote.provenance.cached ? 'cached' : 'partial';
  if (quote.provenance.cached) return 'cached';
  if (quote.quality.state === 'partial') return 'partial';
  if (quote.provenance.delayType && quote.provenance.delayType !== 'realtime') return 'delayed';
  return quote.quality.state === 'complete' ? 'complete' : 'delayed';
}

function historyPoints(candles: Awaited<ReturnType<typeof getSfmMarketHistory>>['candles']): RecommendationPricePoint[] {
  return candles
    .map(point => ({
      date: point.date ?? point.timestamp ?? null,
      open: Number.isFinite(point.open) ? Number(point.open) : null,
      high: Number.isFinite(point.high) ? Number(point.high) : null,
      low: Number.isFinite(point.low) ? Number(point.low) : null,
      close: Number(point.close),
      volume: Number.isFinite(point.volume) ? Number(point.volume) : null,
    }))
    .filter(point => Number.isFinite(point.close) && point.close > 0);
}

function shariahFor(meta: TraderCatalogSymbol | undefined, quote: SfmMarketQuote | null): ShariahClassification {
  if (meta) {
    return {
      shariahStatus: meta.shariahStatus,
      shariahReason: meta.shariahReason,
      shariahSource: meta.shariahSource,
      shariahLastReviewedAt: meta.shariahLastReviewedAt,
      shariahManualOverride: meta.shariahManualOverride,
      shariahReviewedBy: meta.shariahReviewedBy,
      shariahScreeningData: meta.shariahScreeningData,
      shariahMethod: meta.shariahMethod,
    };
  }
  return classifyShariahCompliance({
    symbol: quote?.symbol,
    name: quote?.name,
    assetType: quote?.assetType,
    exchange: quote?.exchange,
    country: quote?.country,
  });
}

function unavailableQuote(symbol: string, meta: TraderCatalogSymbol | undefined, reason: string): SfmTraderQuote {
  const assetType = meta?.assetType ?? 'stock';
  const shariah = shariahFor(meta, null);
  const metadata = meta?.metadataDiagnostics ?? normalizeTraderSymbolMetadata({
    symbol,
    displaySymbol: meta?.displaySymbol ?? symbol,
    providerSymbol: meta?.providerSymbol ?? symbol,
    assetType,
    catalog: meta as unknown as Record<string, unknown> | undefined,
  }).diagnostics;
  const now = new Date().toISOString();
  const quality = {
    state: 'unavailable' as const,
    score: 0,
    completenessPercent: 0,
    freshnessSeconds: null,
    missingFields: ['price', 'previousClose', 'volume', 'open', 'high', 'low'],
    reasons: [reason],
  };
  const provenance = {
    sourceClass: 'derived' as const,
    upstreamProvider: null,
    upstreamProviderName: null,
    providerSymbol: meta?.providerSymbol ?? null,
    observedAt: null,
    receivedAt: now,
    delayType: null,
    cached: false,
    cacheAgeSeconds: null,
    attemptCount: 0,
    derivedFields: [] as string[],
  };

  return {
    symbol: meta?.symbol ?? symbol,
    requestedSymbol: symbol,
    canonicalSymbol: meta?.symbol ?? symbol,
    displaySymbol: meta?.displaySymbol ?? symbol,
    providerSymbol: meta?.providerSymbol ?? null,
    providerSymbolUsed: null,
    provider: null,
    fallbackUsed: false,
    name: meta?.name ?? symbol,
    assetType,
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    marketCap: null,
    volume: null,
    currency: meta?.currency ?? null,
    exchange: meta?.exchange ?? null,
    exchangeCode: meta?.exchangeCode ?? null,
    market: meta?.market ?? meta?.marketIds[0] ?? null,
    country: meta?.country ?? null,
    metadataDiagnostics: metadata,
    signal: 'watch',
    signalAvailable: false,
    confidence: null,
    riskLevel: null as unknown as TraderQuote['riskLevel'],
    rsi: null,
    sma20: null,
    sma50: null,
    ema20: null,
    ema50: null,
    ema200: null,
    macd: null,
    macdSignal: null,
    priceMomentum20: null,
    support: null,
    resistance: null,
    volumeRatio: null,
    atr: null,
    targetPrice: null,
    target1: null,
    stopLoss: null,
    expectedMovePct: null,
    finalRecommendation: 'Insufficient data',
    finalRecommendationAr: 'بيانات غير كافية',
    finalRecommendationFr: 'Données insuffisantes',
    finalScore: null,
    aiConfidence: null,
    strategyCount: 0,
    technicalAvailable: false,
    samples: 0,
    sparkline: [],
    history: [],
    chartAvailable: false,
    dataQuality: 'unavailable',
    providerStatus: {
      requestedSymbol: symbol,
      providerSymbolUsed: null,
      fallbackUsed: false,
      lastUpdated: null,
      dataQuality: 'unavailable',
      provider: null,
      source: SFM_MARKET_ENGINE_NAME as unknown as TraderQuote['providerStatus']['source'],
    },
    source: SFM_MARKET_ENGINE_NAME as unknown as TraderQuote['source'],
    delayed: false,
    available: false,
    unavailableReason: reason,
    lastUpdated: null,
    updatedAt: null,
    ...shariahClassificationFields(shariah),
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    upstreamSource: null,
    sfmQuality: quality,
    sfmProvenance: provenance,
  };
}

async function loadOne(symbol: string, meta: TraderCatalogSymbol | undefined, options: TraderQuoteLoadOptions): Promise<SfmTraderQuote> {
  const request = {
    market: meta?.market ?? meta?.marketIds[0] ?? null,
    assetType: sfmAssetType(meta?.assetType),
    forceFresh: options.forceFresh,
  };
  const [quote, historyResult] = await Promise.all([
    getSfmMarketQuote(meta?.symbol ?? symbol, request).catch(() => null),
    options.includeHistory === false
      ? Promise.resolve({ ok: false as const, candles: [], reason: 'history_not_requested' })
      : getSfmMarketHistory(meta?.symbol ?? symbol, request).catch(() => ({
        ok: false as const, candles: [], reason: 'history_unavailable',
      })),
  ]);

  const history = cleanResearchHistory(historyPoints(historyResult.candles));
  const historyProvider = 'provider' in historyResult ? historyResult.provider : null;
  const research = buildResearchEvidence(history, historyProvider ?? null, traderAssetType(quote?.assetType ?? meta?.assetType));
  if (!quote || !isValidPrice(quote.price)) {
    const empty = unavailableQuote(symbol, meta, historyResult.ok ? 'sfm_quote_unavailable' : historyResult.reason ?? 'sfm_market_data_unavailable');
    const indicators = research.technicalSummary.indicators;
    return { ...empty, research, history, upstreamSource: providerDisplayName(historyProvider ?? null), samples: history.length, chartAvailable: history.length >= 2,
      technicalAvailable: research.available, technicalAsOf: research.asOf, technicalSummary: research.technicalSummary,
      strategies: research.strategies, strategyAgreement: research.strategyAgreement, strategyCount: research.strategyCount,
      dataSufficiency: research.dataSufficiency, dataQualityStatus: research.dataQualityStatus,
      rsi: indicators.rsi14, ema20: indicators.ema20, ema50: indicators.ema50, ema200: indicators.ema200,
      macd: indicators.macd, macdSignal: indicators.macdSignal, atr: indicators.atr,
      support: indicators.support, resistance: indicators.resistance, volumeRatio: indicators.volumeRatio,
      sparkline: history.slice(-30).map(point => point.close), lastKnownPrice: research.referenceClose,
      priceReference: research.referenceClose === null ? null : { kind: 'daily', price: research.referenceClose,
        change: null, changePercent: null, volume: history.at(-1)?.volume ?? null, previousClose: history.at(-2)?.close ?? null,
        observedAt: research.asOf, precision: 'date', quality: 'partial' },
    };
  }
  const quality = recommendationDataQuality(quote);
  const delayed = quote.provenance.cached || Boolean(quote.provenance.delayType && quote.provenance.delayType !== 'realtime');
  const recommendation = buildMultiFactorRecommendation({
    price: quote.price,
    changePercent: quote.changePercent,
    history,
    dataQuality: quality,
    delayed,
    assetType: traderAssetType(quote.assetType),
    newsSentiment: UNAVAILABLE_NEWS_SENTIMENT,
  });
  const quoteAvailable = isCurrentSfmQuote(quote);
  const sufficient = recommendation.dataSufficiency.sufficient && research.freshness === 'recent' && quoteAvailable && recommendation.finalRecommendation !== 'Insufficient data';
  const indicators = recommendation.technicalSummary.indicators;
  const provider = traderProvider(quote.provenance.upstreamProvider);
  const upstreamName = quote.provenance.upstreamProviderName ?? providerDisplayName(quote.provenance.upstreamProvider);
  const assetType = traderAssetType(quote.assetType);
  const shariah = shariahFor(meta, quote);
  const metadataResult = normalizeTraderSymbolMetadata({
    symbol: quote.symbol,
    displaySymbol: meta?.displaySymbol ?? quote.symbol,
    provider: quote.provenance.upstreamProvider,
    providerSymbol: quote.provenance.providerSymbol,
    assetType,
    quote: {
      ...quote,
      source: upstreamName,
      provider: quote.provenance.upstreamProvider,
    },
    catalog: meta as unknown as Record<string, unknown> | undefined,
  });
  const runtimeQuality = quality as unknown as TraderQuote['dataQuality'];

  return {
    symbol: meta?.symbol ?? quote.symbol,
    requestedSymbol: symbol,
    canonicalSymbol: meta?.symbol ?? quote.symbol,
    displaySymbol: meta?.displaySymbol ?? quote.symbol,
    providerSymbol: meta?.providerSymbol ?? quote.provenance.providerSymbol,
    providerSymbolUsed: quote.provenance.providerSymbol,
    provider,
    fallbackUsed: quote.provenance.attemptCount > 1,
    name: quote.name ?? meta?.name ?? quote.symbol,
    assetType,
    price: quoteAvailable ? quote.price : null,
    lastKnownPrice: quoteAvailable ? null : quote.price,
    priceReference: referenceQuote(quote), technicalAsOf: history.at(-1)?.date ?? null, research,
    change: quoteAvailable ? quote.change : null,
    changePercent: quoteAvailable ? quote.changePercent : null,
    previousClose: quoteAvailable ? quote.previousClose : null,
    marketCap: quote.marketCap ?? null,
    volume: quoteAvailable ? quote.volume : null,
    currency: quote.currency ?? meta?.currency ?? null,
    exchange: quote.exchange ?? meta?.exchange ?? metadataResult.exchange,
    exchangeCode: meta?.exchangeCode ?? metadataResult.exchangeCode,
    market: quote.market ?? meta?.market ?? metadataResult.market,
    country: quote.country ?? meta?.country ?? metadataResult.country,
    metadataDiagnostics: meta?.metadataDiagnostics ?? metadataResult.diagnostics,
    signal: recommendation.signal,
    signalAvailable: sufficient,
    confidence: sufficient ? recommendation.confidence : null,
    riskLevel: (sufficient ? recommendation.riskLevel : null) as unknown as TraderQuote['riskLevel'],
    rsi: indicators.rsi14,
    sma20: history.length >= 20 ? history.slice(-20).reduce((sum, point) => sum + point.close, 0) / 20 : null,
    sma50: history.length >= 50 ? history.slice(-50).reduce((sum, point) => sum + point.close, 0) / 50 : null,
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
    targetPrice: sufficient ? recommendation.targetPrice : null,
    target1: sufficient ? recommendation.targetPrice : null,
    stopLoss: sufficient ? recommendation.stopLoss : null,
    expectedMovePct: sufficient ? recommendation.expectedMovePct : null,
    finalRecommendation: sufficient ? recommendation.finalRecommendation : 'Insufficient data',
    finalRecommendationAr: sufficient ? recommendation.finalRecommendationAr : 'بيانات غير كافية',
    finalRecommendationFr: sufficient ? recommendation.finalRecommendationFr : 'Données insuffisantes',
    dataSufficiency: recommendation.dataSufficiency,
    finalScore: sufficient ? recommendation.finalScore : null,
    aiConfidence: sufficient ? recommendation.confidence : null,
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
    sparkline: history.slice(-30).map(point => point.close),
    history,
    chartAvailable: history.length >= 2,
    dataQuality: runtimeQuality,
    providerStatus: {
      requestedSymbol: symbol,
      providerSymbolUsed: quote.provenance.providerSymbol,
      fallbackUsed: quote.provenance.attemptCount > 1,
      lastUpdated: quote.provenance.observedAt,
      dataQuality: runtimeQuality,
      provider,
      source: SFM_MARKET_ENGINE_NAME as unknown as TraderQuote['providerStatus']['source'],
    },
    source: SFM_MARKET_ENGINE_NAME as unknown as TraderQuote['source'],
    delayed,
    available: quoteAvailable,
    unavailableReason: quoteAvailable ? undefined : `sfm_quote_${referenceQuote(quote)?.kind ?? quote.quality.state}`,
    lastUpdated: quote.provenance.observedAt,
    updatedAt: quote.provenance.observedAt,
    ...shariahClassificationFields(shariah),
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    upstreamSource: upstreamName,
    sfmQuality: quote.quality,
    sfmProvenance: quote.provenance,
  };
}

function metaMap(symbolMeta: TraderCatalogSymbol[] | undefined) {
  const map = new Map<string, TraderCatalogSymbol>();
  for (const meta of symbolMeta ?? []) {
    [meta.symbol, meta.displaySymbol, meta.providerSymbol, ...meta.aliases].forEach(value => {
      const key = upper(value);
      if (key) map.set(key, meta);
    });
  }
  return map;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return output;
}

export async function fetchSfmTraderQuotesDetailed(
  symbols: string[],
  options: TraderQuoteLoadOptions = {},
): Promise<TraderQuoteLoadResult> {
  const requested = Array.from(new Set(symbols.map(upper).filter(Boolean)));
  const metaBySymbol = metaMap(options.symbolMeta);
  if (!requested.length) {
    return {
      quotes: [],
      loaded: [],
      failed: [],
      skipped: [],
      provider: null,
      reason: null,
      providerLatencyMs: {},
      cacheStatus: 'not_configured',
      summary: { loadedSymbols: 0, failedSymbols: 0, cachedSymbols: 0, skippedDueToRateLimit: 0 },
      generatedAt: new Date().toISOString(),
    };
  }

  const startedAt = Date.now();
  const quotes = await mapWithConcurrency(requested, options.concurrency ?? CONCURRENCY, async symbol => {
    const meta = metaBySymbol.get(symbol);
    try {
      return await loadOne(symbol, meta, options);
    } catch {
      return unavailableQuote(symbol, meta, 'sfm_market_engine_error');
    }
  });

  const loaded: TraderQuoteLoadResult['loaded'] = [];
  const failed: TraderQuoteLoadResult['failed'] = [];
  let selectedProvider: TraderQuoteProvider | null = null;
  let cachedSymbols = 0;
  let skippedDueToRateLimit = 0;

  for (const quote of quotes) {
    const provider = traderProvider(quote.sfmProvenance.upstreamProvider ?? quote.research?.provider ?? null);
    if (provider && isValidPrice(quote.price ?? quote.lastKnownPrice)) selectedProvider ??= provider;
    if (quote.sfmProvenance.cached) cachedSymbols += 1;
    if (provider && quote.available && isValidPrice(quote.price)) {
      selectedProvider ??= provider;
      loaded.push({
        symbol: quote.symbol,
        provider,
        providerSymbol: quote.sfmProvenance.providerSymbol,
      });
      continue;
    }
    const attemptedProvider = provider;
    if (attemptedProvider) {
      failed.push({
        symbol: quote.symbol,
        provider: attemptedProvider,
        reason: quote.unavailableReason ?? 'sfm_market_data_unavailable',
      });
    }
    if (/rate|limit|429/i.test(quote.unavailableReason ?? '')) skippedDueToRateLimit += 1;
  }

  const availableCount = quotes.filter(quote => quote.available && isValidPrice(quote.price)).length;
  return {
    quotes: quotes as TraderQuote[],
    loaded,
    failed,
    skipped: [],
    provider: selectedProvider,
    reason: availableCount ? null : 'sfm_market_data_unavailable',
    providerLatencyMs: selectedProvider ? { [selectedProvider]: Date.now() - startedAt } : {},
    cacheStatus: cachedSymbols ? 'provider-cache' : availableCount ? 'live' : selectedProvider ? 'partial' : 'not_configured',
    summary: {
      loadedSymbols: availableCount,
      failedSymbols: requested.length - availableCount,
      cachedSymbols,
      skippedDueToRateLimit,
    },
    generatedAt: new Date().toISOString(),
  };
}
