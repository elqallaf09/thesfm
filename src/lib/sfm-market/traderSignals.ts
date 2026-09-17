import {
  generateMarketSignal,
  type MarketSignal,
  type MarketSignalDataQuality,
  type MarketSignalInputPoint,
} from '@/lib/market/signalEngine';
import { fetchSfmTraderQuotesDetailed, type SfmTraderQuote } from '@/lib/trader/sfmMarketQuotes';
import type { TraderQuoteLoadOptions } from '@/lib/trader/marketQuotes';

export type SfmTraderSignal = MarketSignal & {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  sfmMarket: {
    engine: 'THE SFM Market Data Engine';
    source: 'THE SFM';
    quality: SfmTraderQuote['sfmQuality'];
    provenance: SfmTraderQuote['sfmProvenance'];
    historyPoints: number;
    evidenceReady: boolean;
  };
};

function signalDataQuality(quote: SfmTraderQuote): MarketSignalDataQuality {
  if (!quote.available || quote.sfmQuality.state === 'unavailable') return 'unavailable';
  if (!quote.signalAvailable || quote.sfmQuality.state === 'partial') return 'partial';
  if (quote.delayed || quote.sfmQuality.state === 'stale') return 'delayed';
  return 'live';
}

function signalHistory(quote: SfmTraderQuote): MarketSignalInputPoint[] {
  return quote.history
    .filter(point => Number.isFinite(point.close) && point.close > 0)
    .map(point => ({
      ...(point.date ? { date: point.date } : {}),
      open: Number.isFinite(point.open) ? Number(point.open) : null,
      high: Number.isFinite(point.high) ? Number(point.high) : null,
      low: Number.isFinite(point.low) ? Number(point.low) : null,
      close: Number(point.close),
      volume: Number.isFinite(point.volume) ? Number(point.volume) : null,
    }));
}

function projectQuote(quote: SfmTraderQuote): SfmTraderSignal {
  const dataQuality = signalDataQuality(quote);
  const history = signalHistory(quote);
  const latestSession = history.at(-1) ?? null;
  const generated = generateMarketSignal({
    symbol: quote.symbol,
    assetName: quote.name,
    assetType: quote.assetType === 'fund' ? 'etf' : quote.assetType,
    market: quote.market,
    currency: quote.currency,
    currentPrice: quote.price,
    dailyChangePercent: quote.changePercent,
    history,
    provider: 'THE SFM',
    dataQuality,
    delayed: quote.delayed,
    lastUpdated: quote.lastUpdated,
  });

  const evidenceReady = quote.signalAvailable
    && quote.available
    && quote.sfmQuality.state !== 'partial'
    && quote.sfmQuality.state !== 'stale'
    && quote.sfmQuality.state !== 'unavailable';

  const signal: MarketSignal = evidenceReady ? generated : {
    ...generated,
    action: 'insufficient_data',
    actionLabelAr: 'بيانات غير كافية',
    actionLabelEn: 'Insufficient data',
    confidence: 0,
    confidenceComputed: false,
    currentPrice: quote.price,
    targetPrice: null,
    stopLoss: null,
    upsidePercent: null,
    downsidePercent: null,
    riskRewardRatio: null,
    signalExplanationAr: 'لا تتوفر لدى SFM أدلة سوق حديثة وكافية لنشر إشارة اتجاهية.',
    signalExplanationEn: 'SFM does not have enough fresh market evidence to publish a directional signal.',
    timeframe: 'بيانات غير كافية',
    provider: 'THE SFM',
    dataQuality: dataQuality === 'unavailable' ? 'unavailable' : 'partial',
  };

  return {
    ...signal,
    provider: 'THE SFM',
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    previousClose: quote.previousClose,
    volume: quote.volume ?? latestSession?.volume ?? null,
    open: latestSession?.open ?? null,
    high: latestSession?.high ?? null,
    low: latestSession?.low ?? null,
    sfmMarket: {
      engine: 'THE SFM Market Data Engine',
      source: 'THE SFM',
      quality: quote.sfmQuality,
      provenance: quote.sfmProvenance,
      historyPoints: history.length,
      evidenceReady,
    },
  };
}

export async function generateSfmTraderSignals(
  symbols: string[],
  options: TraderQuoteLoadOptions = {},
): Promise<SfmTraderSignal[]> {
  const quoteLoad = await fetchSfmTraderQuotesDetailed(symbols, options);
  return quoteLoad.quotes.map(quote => projectQuote(quote as SfmTraderQuote));
}
