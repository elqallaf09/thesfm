import { getCandlesWithFallback, type MarketDataProviderContext } from '@/lib/market/marketDataProviders';
import {
  generateMarketSignal,
  type MarketSignal,
  type MarketSignalDataQuality,
  type MarketSignalInputPoint,
} from '@/lib/market/signalEngine';
import { normalizeMarketSymbolInput } from '@/lib/market/marketService';
import {
  getSfmMarketQuote,
  SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS,
  type SfmMarketRequest,
} from '@/lib/sfm-market/engine';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

export type SfmTraderSignal = MarketSignal & {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  history: MarketSignalInputPoint[];
  sparkline: number[];
  chartAvailable: boolean;
  source: 'THE SFM';
  delayed: boolean;
  available: boolean;
  sfmMarket: {
    engine: 'THE SFM Market Data Engine';
    source: 'THE SFM';
    quality: SfmMarketQuote['quality'] | null;
    provenance: SfmMarketQuote['provenance'] | null;
    historyProvider: string | null;
    historyPoints: number;
  };
};

function signalDataQuality(quote: SfmMarketQuote | null): MarketSignalDataQuality {
  if (!quote || quote.quality.state === 'unavailable') return 'unavailable';
  if (quote.quality.state === 'partial') return 'partial';
  if (quote.quality.state === 'stale') return 'delayed';
  if (quote.provenance.delayType && quote.provenance.delayType !== 'realtime') return 'delayed';
  return 'live';
}

function unavailableSignal(symbol: string, assetType: string, market: string, reason: string): SfmTraderSignal {
  const signal = generateMarketSignal({
    symbol,
    assetName: symbol,
    assetType,
    market,
    currentPrice: null,
    history: [],
    provider: 'THE SFM',
    dataQuality: 'unavailable',
    lastUpdated: new Date().toISOString(),
  });
  return {
    ...signal,
    action: 'insufficient_data',
    actionLabelAr: 'بيانات غير كافية',
    actionLabelEn: 'Insufficient data',
    confidence: 0,
    confidenceComputed: false,
    currentPrice: null,
    targetPrice: null,
    stopLoss: null,
    upsidePercent: null,
    downsidePercent: null,
    riskRewardRatio: null,
    provider: 'THE SFM',
    dataQuality: 'unavailable',
    warnings: Array.from(new Set([reason, ...signal.warnings])),
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    volume: null,
    open: null,
    high: null,
    low: null,
    history: [],
    sparkline: [],
    chartAvailable: false,
    source: 'THE SFM',
    delayed: false,
    available: false,
    sfmMarket: {
      engine: 'THE SFM Market Data Engine',
      source: 'THE SFM',
      quality: null,
      provenance: null,
      historyProvider: null,
      historyPoints: 0,
    },
  };
}

export async function generateSfmTraderSignal(
  symbolInput: string,
  request: SfmMarketRequest = {},
): Promise<SfmTraderSignal> {
  const normalized = normalizeMarketSymbolInput(symbolInput, request.assetType);
  const fallbackSymbol = String(symbolInput ?? '').trim().toUpperCase();
  if (!normalized.valid) {
    return unavailableSignal(fallbackSymbol || 'UNKNOWN', String(request.assetType || 'stock'), request.market || '', 'SFM symbol normalization failed.');
  }

  const context: MarketDataProviderContext = {
    symbol: normalized.symbol,
    market: request.market ?? null,
    assetType: normalized.assetType,
    forceFresh: request.forceFresh,
    excludeProviders: [...SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS],
  };

  const [quote, historyResult] = await Promise.all([
    getSfmMarketQuote(normalized.symbol, request),
    getCandlesWithFallback(normalized.providerSymbol, request.market ?? null, '1d', context),
  ]);
  const history: MarketSignalInputPoint[] = historyResult.ok
    ? historyResult.data
        .filter(point => Number.isFinite(point.close) && point.close > 0)
        .map(point => ({
          date: point.date ?? point.timestamp,
          open: point.open ?? null,
          high: point.high ?? null,
          low: point.low ?? null,
          close: point.close,
          volume: point.volume ?? null,
        }))
    : [];
  const dataQuality = signalDataQuality(quote);
  const lastUpdated = quote?.provenance.observedAt ?? quote?.provenance.receivedAt ?? new Date().toISOString();

  if (!quote) {
    return unavailableSignal(normalized.symbol, normalized.assetType, request.market || '', 'SFM quote evidence is unavailable.');
  }

  const generated = generateMarketSignal({
    symbol: normalized.symbol,
    assetName: quote.name ?? normalized.symbol,
    assetType: normalized.assetType,
    market: quote.market ?? request.market ?? '',
    currency: quote.currency,
    currentPrice: quote.price,
    dailyChangePercent: quote.changePercent,
    history,
    provider: 'THE SFM',
    dataQuality,
    delayed: dataQuality === 'delayed',
    lastUpdated,
  });

  const evidenceReady = dataQuality !== 'unavailable'
    && dataQuality !== 'partial'
    && quote.quality.state !== 'stale'
    && history.length >= 20;
  const signal = evidenceReady ? generated : {
    ...generated,
    action: 'insufficient_data' as const,
    actionLabelAr: 'بيانات غير كافية' as const,
    actionLabelEn: 'Insufficient data' as const,
    confidence: 0,
    confidenceComputed: false,
    targetPrice: null,
    stopLoss: null,
    upsidePercent: null,
    downsidePercent: null,
    riskRewardRatio: null,
    signalExplanationAr: 'لا تتوفر أدلة سوق حديثة وكافية لدى SFM لنشر إشارة اتجاهية.',
    signalExplanationEn: 'SFM does not have enough fresh market evidence to publish a directional signal.',
  };

  return {
    ...signal,
    provider: 'THE SFM',
    currentPrice: quote.price,
    lastUpdated,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    previousClose: quote.previousClose,
    volume: quote.volume,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    history,
    sparkline: history.slice(-30).map(point => point.close),
    chartAvailable: history.length >= 2,
    source: 'THE SFM',
    delayed: dataQuality === 'delayed',
    available: quote.price !== null && dataQuality !== 'unavailable',
    sfmMarket: {
      engine: 'THE SFM Market Data Engine',
      source: 'THE SFM',
      quality: quote.quality,
      provenance: quote.provenance,
      historyProvider: historyResult.ok ? historyResult.provider : null,
      historyPoints: history.length,
    },
  };
}

export async function generateSfmTraderSignals(
  symbols: string[],
  request: SfmMarketRequest = {},
  concurrency = 4,
): Promise<SfmTraderSignal[]> {
  const unique = Array.from(new Set(symbols.map(symbol => String(symbol ?? '').trim().toUpperCase()).filter(Boolean)));
  const output: SfmTraderSignal[] = [];
  for (let cursor = 0; cursor < unique.length; cursor += Math.max(1, concurrency)) {
    const batch = unique.slice(cursor, cursor + Math.max(1, concurrency));
    const settled = await Promise.allSettled(batch.map(symbol => generateSfmTraderSignal(symbol, request)));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') output.push(result.value);
      else output.push(unavailableSignal(batch[index] || 'UNKNOWN', String(request.assetType || 'stock'), request.market || '', 'SFM market analysis failed for this symbol.'));
    });
  }
  return output;
}
