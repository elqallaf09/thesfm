import { buildMultiFactorRecommendation, UNAVAILABLE_NEWS_SENTIMENT, type RecommendationPricePoint } from './recommendationEngine';

/** Daily research is independent of whether a current, executable quote exists. */
export function cleanResearchHistory(points: RecommendationPricePoint[], now = Date.now()) {
  const dated = new Map<string, RecommendationPricePoint>();
  for (const point of points) {
    const date = typeof point.date === 'string' ? point.date : '';
    const time = Date.parse(date);
    if (!date || !Number.isFinite(time) || time > now + 60_000 || !Number.isFinite(point.close) || point.close <= 0) continue;
    dated.set(date.slice(0, 10), point);
  }
  return [...dated.values()].sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));
}

export function buildResearchEvidence(history: RecommendationPricePoint[], provider: string | null, assetType: string, now = Date.now()) {
  const latest = history.at(-1);
  const asOf = latest?.date ?? null;
  const ageDays = asOf ? Math.max(0, (now - Date.parse(asOf)) / 86_400_000) : null;
  const freshness = ageDays === null ? 'unknown' : ageDays > (assetType === 'crypto' ? 2 : 7) ? 'stale' : 'recent';
  const analysis = buildMultiFactorRecommendation({
    price: latest?.close ?? null, history, changePercent: null, assetType,
    dataQuality: !history.length ? 'unavailable' : freshness === 'recent' ? 'delayed' : 'partial',
    delayed: true, newsSentiment: UNAVAILABLE_NEWS_SENTIMENT,
  });
  const closes = history.slice(-21).map(point => point.close);
  const returns = closes.slice(1).map((close, index) => close / closes[index] - 1);
  const mean = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const annualizationDays = assetType === 'crypto' ? 365 : 252;
  const annualizedVolatilityPercent = returns.length === 20
    ? Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)) * Math.sqrt(annualizationDays) * 100 : null;
  let peak = 0, drawdown = 0;
  for (const point of history.slice(-120)) {
    peak = Math.max(peak, point.close);
    drawdown = Math.max(drawdown, (peak - point.close) / peak * 100);
  }
  const atr = analysis.technicalSummary.indicators.atr;
  const atrPercent = atr !== null && latest ? atr / latest.close * 100 : null;
  const confidence = analysis.dataSufficiency.sufficient && freshness === 'recent' ? analysis.confidence : null;
  const round = (value: number | null) => value === null ? null : Number(value.toFixed(2));
  return {
    available: analysis.technicalAvailable, basis: 'daily_history' as const, asOf,
    provider, referenceClose: latest?.close ?? null, freshness, ageDays: round(ageDays),
    samples: history.length, confidence, confidenceKind: 'rule_based_evidence_score' as const,
    assessment: analysis.finalRecommendation, finalScore: analysis.finalScore,
    technicalAvailable: analysis.technicalAvailable, technicalSummary: analysis.technicalSummary,
    strategies: analysis.strategies, strategyAgreement: analysis.strategyAgreement,
    strategyCount: analysis.strategyCount, marketRegime: analysis.marketRegime,
    dataSufficiency: analysis.dataSufficiency, dataQualityStatus: analysis.dataQualityStatus,
    scoreBreakdown: analysis.scoreBreakdown,
    risk: {
      level: annualizedVolatilityPercent === null && atrPercent === null ? null
        : (annualizedVolatilityPercent ?? 0) >= 45 || (atrPercent ?? 0) >= 6 ? 'high'
          : (annualizedVolatilityPercent ?? 0) >= 22 || (atrPercent ?? 0) >= 3 ? 'medium' : 'low',
      atrPercent: round(atrPercent), annualizedVolatilityPercent: round(annualizedVolatilityPercent),
      annualizationDays, returnSamples: returns.length, maximumDrawdownPercent: history.length >= 20 ? round(drawdown) : null,
      drawdownSamples: Math.min(history.length, 120),
    },
  };
}

export type ResearchEvidence = ReturnType<typeof buildResearchEvidence>;
