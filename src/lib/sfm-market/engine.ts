import { wilderRsi } from '@/lib/market/technicalIndicators';
import {
  getCandlesWithFallback,
  getQuoteWithFallback,
  type MarketDataProviderContext,
  type NormalizedMarketCandle,
  type NormalizedMarketQuote,
  type ProviderAttemptFailure,
} from '@/lib/market/marketDataProviders';
import { normalizeAssetType, normalizeMarketSymbolInput } from '@/lib/market/marketService';
import { getSecOfficialEvidence, secNotApplicable } from '@/lib/sfm-market/officialEvidence';
import { assessSfmQuoteQuality, marketSourceClassForProvider } from '@/lib/sfm-market/quality';
import {
  SFM_MARKET_ENGINE_NAME,
  SFM_MARKET_ENGINE_VERSION,
  SFM_MARKET_SCHEMA_VERSION,
  type SfmMarketAnalysis,
  type SfmMarketQuote,
  type SfmRegulatorEvidence,
  type SfmTechnicalSnapshot,
} from '@/lib/sfm-market/types';

export const SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS = ['yahoo'] as const;

export type SfmMarketRequest = {
  market?: string | null;
  assetType?: string | null;
  forceFresh?: boolean;
};

function providerContext(
  symbol: string,
  market: string | null,
  assetType: string | null | undefined,
  forceFresh: boolean | undefined,
): MarketDataProviderContext {
  return {
    symbol,
    market,
    assetType,
    forceFresh,
    // Product decision: the SFM-owned market contract must never silently
    // fall back to Yahoo. If our other lawful feeds cannot supply evidence,
    // the engine returns unavailable/partial rather than changing source.
    excludeProviders: [...SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS],
  };
}

function round(value: number | null, digits = 4) {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values: number[], period: number) {
  if (values.length < period) return null;
  return round(average(values.slice(-period)));
}


function annualizedVolatility(values: number[]) {
  if (values.length < 21) return null;
  const closes = values.slice(-21);
  const returns: number[] = [];
  for (let index = 1; index < closes.length; index += 1) {
    const previous = closes[index - 1];
    const current = closes[index];
    if (previous > 0 && current > 0) returns.push((current - previous) / previous);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / returns.length;
  return round(Math.sqrt(variance) * Math.sqrt(252) * 100, 2);
}

function averageVolume(candles: NormalizedMarketCandle[], period = 20) {
  const values = candles
    .slice(-period)
    .map(candle => candle.volume)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  if (values.length < period) return null;
  return round(average(values), 0);
}

export function buildSfmTechnicalSnapshot(
  candles: NormalizedMarketCandle[],
  historyProvider: string | null = null,
  latestPrice: number | null = null,
): SfmTechnicalSnapshot {
  const valid = candles.filter(candle => Number.isFinite(candle.close) && candle.close > 0);
  const closes = valid.map(candle => candle.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi14 = round(wilderRsi(closes, 14), 2);
  const volatility = annualizedVolatility(closes);
  const comparisonPrice = Number.isFinite(latestPrice) && Number(latestPrice) > 0
    ? Number(latestPrice)
    : closes.at(-1) ?? null;

  let trend: SfmTechnicalSnapshot['trend'] = null;
  if (comparisonPrice !== null && sma20 !== null && sma50 !== null) {
    if (comparisonPrice > sma20 && sma20 > sma50) trend = 'bullish';
    else if (comparisonPrice < sma20 && sma20 < sma50) trend = 'bearish';
    else trend = 'neutral';
  }

  return {
    historyPoints: valid.length,
    sma20,
    sma50,
    rsi14,
    annualizedVolatilityPercent: volatility,
    averageVolume20: averageVolume(valid),
    trend,
    historyProvider,
    observedThrough: valid.at(-1)?.date ?? valid.at(-1)?.timestamp ?? null,
  };
}

function buildSfmQuote(quote: NormalizedMarketQuote, attempts: ProviderAttemptFailure[], receivedAt: string): SfmMarketQuote {
  const quality = assessSfmQuoteQuality(quote, new Date(receivedAt));
  const derivedFields: string[] = [];
  if (quote.previousClose !== null && quote.change !== null) derivedFields.push('change');
  if (quote.previousClose !== null && quote.changePercent !== null) derivedFields.push('changePercent');

  return {
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    engine: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    symbol: quote.symbol,
    name: quote.name,
    assetType: normalizeAssetType(quote.assetType),
    market: quote.market,
    exchange: quote.exchange,
    country: quote.country,
    currency: quote.currency,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    volume: quote.volume,
    marketCap: quote.marketCap ?? null,
    quality,
    provenance: {
      sourceClass: marketSourceClassForProvider(quote.provider),
      upstreamProvider: quote.provider,
      upstreamProviderName: quote.providerName,
      providerSymbol: quote.providerSymbol,
      observedAt: quote.lastUpdated,
      observation: quote.observation,
      receivedAt,
      delayType: quote.delayType,
      cached: Boolean(quote.cached),
      cacheAgeSeconds: Number.isFinite(quote.cacheAgeSeconds) ? Number(quote.cacheAgeSeconds) : null,
      attemptCount: attempts.length + 1,
      derivedFields,
    },
  };
}

function emptyTechnical(): SfmTechnicalSnapshot {
  return {
    historyPoints: 0,
    sma20: null,
    sma50: null,
    rsi14: null,
    annualizedVolatilityPercent: null,
    averageVolume20: null,
    trend: null,
    historyProvider: null,
    observedThrough: null,
  };
}

function buildSummary(
  symbol: string,
  quote: SfmMarketQuote | null,
  technical: SfmTechnicalSnapshot,
  secEvidence: SfmRegulatorEvidence,
  status: SfmMarketAnalysis['status'],
) {
  const filing = secEvidence.latestPeriodicFiling;
  const filingAr = filing ? ` آخر إفصاح دوري رسمي لدى SEC هو ${filing.form} بتاريخ ${filing.filingDate}.` : '';
  const filingEn = filing ? ` Latest official SEC periodic filing: ${filing.form}, filed ${filing.filingDate}.` : '';

  if (!quote) {
    return {
      ar: `${symbol}: لا توجد حالياً بيانات سعر سوق موثوقة كافية، لذلك لم يتم اختراع سعر أو توصية بديلة.${filingAr}`,
      en: `${symbol}: there is not enough trustworthy market-price evidence, so no replacement price or recommendation was fabricated.${filingEn}`,
    };
  }

  const priceText = `${quote.price ?? '—'} ${quote.currency ?? ''}`.trim();
  const trendAr = technical.trend === 'bullish' ? 'صاعد' : technical.trend === 'bearish' ? 'هابط' : technical.trend === 'neutral' ? 'محايد' : 'غير محسوم';
  const trendEn = technical.trend ?? 'undetermined';
  const rsiText = technical.rsi14 === null ? '—' : technical.rsi14.toFixed(2);
  const quality = quote.quality.state;

  return {
    ar: `${symbol}: السعر ${priceText}. الاتجاه الفني ${trendAr}، RSI-14 ${rsiText}. جودة بيانات السوق ${quality}.${filingAr} ${status === 'partial' ? 'الخلاصة جزئية لأن بعض الأدلة غير متاحة.' : 'الخلاصة مبنية فقط على الأدلة المتاحة.'}`,
    en: `${symbol}: price ${priceText}. Technical trend ${trendEn}, RSI-14 ${rsiText}. Market-data quality ${quality}.${filingEn} ${status === 'partial' ? 'The summary is partial because some evidence is unavailable.' : 'The summary uses only available evidence.'}`,
  };
}

export async function getSfmMarketQuote(symbolInput: string, request: SfmMarketRequest = {}): Promise<SfmMarketQuote | null> {
  const normalized = normalizeMarketSymbolInput(symbolInput, request.assetType);
  if (!normalized.valid) return null;
  const context = providerContext(
    normalized.symbol,
    request.market ?? null,
    normalized.assetType,
    request.forceFresh,
  );
  const result = await getQuoteWithFallback(normalized.symbol, request.market ?? null, context);
  if (!result.ok) return null;
  return buildSfmQuote(result.data, result.attempts, new Date().toISOString());
}

export async function analyzeSfmMarketSymbol(symbolInput: string, request: SfmMarketRequest = {}): Promise<SfmMarketAnalysis> {
  const generatedAt = new Date().toISOString();
  const normalized = normalizeMarketSymbolInput(symbolInput, request.assetType);
  if (!normalized.valid) {
    const symbol = String(symbolInput ?? '').trim().toUpperCase();
    const secEvidence = secNotApplicable(symbol, 'The requested symbol could not be normalized.');
    return {
      schemaVersion: SFM_MARKET_SCHEMA_VERSION,
      engine: SFM_MARKET_ENGINE_NAME,
      engineVersion: SFM_MARKET_ENGINE_VERSION,
      analyst: 'SFM Market Analyst',
      generatedAt,
      status: 'blocked',
      code: normalized.code ?? 'INVALID_SYMBOL',
      quote: null,
      technical: emptyTechnical(),
      officialEvidence: { sec: secEvidence },
      evidence: {
        quoteAvailable: false,
        historyAvailable: false,
        historyPoints: 0,
        officialRegulatorEvidenceAvailable: false,
        missing: ['quote', 'history'],
        upstreamAttempts: 0,
      },
      summary: buildSummary(symbol || 'UNKNOWN', null, emptyTechnical(), secEvidence, 'blocked'),
      guardrails: {
        fabricatedMarketValues: false,
        recommendationGeneratedWithoutEvidence: false,
        upstreamProvenanceVisible: true,
      },
    };
  }

  const context = providerContext(
    normalized.symbol,
    request.market ?? null,
    normalized.assetType,
    request.forceFresh,
  );
  const supportsSecEvidence = normalized.assetType === 'stock' || normalized.assetType === 'etf';
  const secPromise = supportsSecEvidence
    ? getSecOfficialEvidence(normalized.symbol)
    : Promise.resolve(secNotApplicable(normalized.symbol));

  const [quoteResult, historyResult, secEvidence] = await Promise.all([
    getQuoteWithFallback(normalized.symbol, request.market ?? null, context),
    getCandlesWithFallback(normalized.symbol, request.market ?? null, '1d', context),
    secPromise,
  ]);

  const quote = quoteResult.ok ? buildSfmQuote(quoteResult.data, quoteResult.attempts, generatedAt) : null;
  const candles = historyResult.ok ? historyResult.data : [];
  const technical = buildSfmTechnicalSnapshot(
    candles,
    historyResult.ok ? historyResult.provider : null,
    quote?.price ?? null,
  );

  const missing = [
    ...(quote?.quality.missingFields ?? ['quote']),
    ...(technical.historyPoints < 20 ? ['history>=20'] : []),
    ...(supportsSecEvidence && secEvidence.status !== 'ready' ? ['official:sec'] : []),
  ];
  const quoteUsable = Boolean(quote && quote.quality.state !== 'unavailable' && quote.quality.state !== 'stale');
  const historyUsable = technical.historyPoints >= 20;
  const status: SfmMarketAnalysis['status'] = !quoteUsable
    ? 'blocked'
    : historyUsable && (quote?.quality.state === 'complete' || quote?.quality.state === 'usable')
      ? 'ready'
      : 'partial';
  const code = status === 'blocked'
    ? 'MARKET_DATA_UNAVAILABLE'
    : status === 'partial'
      ? 'PARTIAL_EVIDENCE'
      : null;
  const attempts = (quoteResult.ok ? quoteResult.attempts.length + 1 : quoteResult.attempts.length)
    + (historyResult.ok ? historyResult.attempts.length + 1 : historyResult.attempts.length);

  return {
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    engine: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    analyst: 'SFM Market Analyst',
    generatedAt,
    status,
    code,
    quote,
    technical,
    officialEvidence: { sec: secEvidence },
    evidence: {
      quoteAvailable: Boolean(quote),
      historyAvailable: technical.historyPoints > 0,
      historyPoints: technical.historyPoints,
      officialRegulatorEvidenceAvailable: secEvidence.status === 'ready',
      missing,
      upstreamAttempts: attempts,
    },
    summary: buildSummary(normalized.symbol, quote, technical, secEvidence, status),
    guardrails: {
      fabricatedMarketValues: false,
      recommendationGeneratedWithoutEvidence: false,
      upstreamProvenanceVisible: true,
    },
  };
}
