import type { ScannerFilters, StockAnalysisResult } from '@/lib/trader/types';
import {
  buildReviewRequiredShariaClassification,
  getEffectiveShariaStatus,
  normalizeShariaStatus,
  type ShariaStatus,
} from '@/lib/trader/sharia';

export function parseScannerFilters(searchParams: URLSearchParams): ScannerFilters {
  const signalType = searchParams.get('signalType') || searchParams.get('signal') || 'all';
  const riskLevel = searchParams.get('riskLevel') || searchParams.get('risk') || 'all';
  const timeHorizon = searchParams.get('timeHorizon') || searchParams.get('timeframe') || 'all';
  const shariaStatus = searchParams.get('sharia_status') || searchParams.get('shariaStatus') || searchParams.get('sharia') || 'all';
  const confidenceValue = Number(searchParams.get('minimumConfidence') || searchParams.get('confidence') || 0);
  const symbols = (searchParams.get('symbols') || '')
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  return {
    market: 'US',
    signalType: signalType === 'buy' || signalType === 'sell' || signalType === 'hold' ? signalType : 'all',
    riskLevel: riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'unknown' ? riskLevel : 'all',
    timeHorizon: timeHorizon === 'intraday' || timeHorizon === 'days' || timeHorizon === 'weeks' || timeHorizon === 'months'
      ? timeHorizon
      : 'all',
    shariaStatus: ['compliant', 'non_compliant', 'review_required', 'unsupported'].includes(shariaStatus)
      ? shariaStatus as ShariaStatus
      : 'all',
    minimumConfidence: Number.isFinite(confidenceValue) && confidenceValue > 0 ? Math.min(95, Math.max(0, confidenceValue)) : undefined,
    symbols: symbols.length ? symbols : undefined,
  };
}

function expectedMovePct(result: StockAnalysisResult) {
  if (!result.targetPrice || result.currentPrice === 0) return 0;
  return ((result.targetPrice - result.currentPrice) / result.currentPrice) * 100;
}

export function toTraderRecommendation(result: StockAnalysisResult) {
  const sharia = buildReviewRequiredShariaClassification('not_yet_reviewed', {
    source: null,
    standard: null,
  });

  return {
    id: result.id,
    symbol: result.symbol,
    providerSymbol: result.providerSymbol,
    name: result.name,
    market: result.market,
    exchange: result.exchange,
    sector: result.sector,
    currency: result.currency,
    sharia,
    shariaStatus: getEffectiveShariaStatus(sharia),
    shariaSource: sharia.source,
    shariaReasonCode: sharia.reason_code,
    shariaReasonAr: sharia.reason_ar,
    shariaStandard: sharia.standard,
    shariaCheckedAt: sharia.reviewed_at,
    currentPrice: result.currentPrice,
    price: result.currentPrice,
    expectedPrice: result.targetPrice,
    target1: result.targetPrice,
    targetPrice: result.targetPrice,
    stopLoss: result.stopLoss,
    confidence: result.confidence,
    signal: result.signal,
    action: result.signal,
    risk: { level: result.riskLevel, label: result.riskLevel },
    riskLevel: result.riskLevel,
    duration: result.expectedTimeframeLabel || 'monitor',
    timeframe: result.expectedTimeframeLabel,
    expectedMovePct: expectedMovePct(result),
    finalScore: result.score,
    score: result.score,
    generatedAt: result.generatedAt,
    dataTimestamp: result.dataTimestamp,
    provider: result.provider,
    delayed: result.delayed,
    reasons: result.reasons,
    reasonsAr: result.reasonsAr,
    warnings: result.warnings,
    scoreBreakdown: result.scoreBreakdown,
    technicals: result.technicals,
    analysisMethod: result.analysisMethod,
  };
}

export type TraderRecommendation = ReturnType<typeof toTraderRecommendation>;

export function filterTraderRecommendationsBySharia(
  recommendations: TraderRecommendation[],
  shariaStatus: ScannerFilters['shariaStatus'],
) {
  if (!shariaStatus || shariaStatus === 'all') return recommendations;
  return recommendations.filter((item) => {
    const effectiveStatus = item.sharia
      ? getEffectiveShariaStatus(item.sharia)
      : normalizeShariaStatus(item.shariaStatus);
    return effectiveStatus === shariaStatus;
  });
}

export function traderRecommendationSummary(recommendations: TraderRecommendation[]) {
  const buy = recommendations.filter((item) => item.signal === 'buy').length;
  const sell = recommendations.filter((item) => item.signal === 'sell').length;
  const hold = recommendations.filter((item) => item.signal === 'hold').length;
  const confidenceValues = recommendations.map((item) => item.confidence).filter(Number.isFinite);
  const averageConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : null;

  return {
    total: recommendations.length,
    buy,
    sell,
    hold,
    averageConfidence,
    topSignal: recommendations[0]?.symbol || null,
  };
}

export function scannerSummary(results: StockAnalysisResult[]) {
  const buy = results.filter((item) => item.signal === 'buy').length;
  const sell = results.filter((item) => item.signal === 'sell').length;
  const hold = results.filter((item) => item.signal === 'hold').length;
  const confidenceValues = results.map((item) => item.confidence).filter(Number.isFinite);
  const averageConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : null;

  return {
    total: results.length,
    buy,
    sell,
    hold,
    averageConfidence,
    topSignal: results[0]?.symbol || null,
  };
}
