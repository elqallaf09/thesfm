import type { SfmMarketQuote } from '@/lib/sfm-market/types';

export function isCurrentSfmQuote(quote: SfmMarketQuote) {
  return quote.quality.state !== 'stale' && quote.quality.state !== 'unavailable'
    && quote.provenance.observation?.precision !== 'date'
    && quote.provenance.observation?.precision !== 'unknown'
    && quote.provenance.observation?.marketOpen !== false;
}

export function referenceQuote(quote: SfmMarketQuote) {
  if (isCurrentSfmQuote(quote) || !quote.price || quote.price <= 0) return null;
  const observation = quote.provenance.observation;
  const kind = !quote.provenance.observedAt ? 'time_unknown'
    : observation?.precision === 'date' ? 'daily'
      : observation?.marketOpen === false ? 'market_closed' : 'stale';
  return {
    kind, price: quote.price, change: quote.change, changePercent: quote.changePercent,
    volume: quote.volume, previousClose: quote.previousClose,
    observedAt: quote.provenance.observedAt, precision: observation?.precision ?? 'instant',
    quality: quote.quality.state,
  };
}

type EvidenceRow = {
  available?: boolean;
  price?: number | null;
  lastKnownPrice?: number | null;
  technicalAvailable?: boolean;
  chartAvailable?: boolean;
  signalAvailable?: boolean;
  dataSufficiency?: { sufficient?: boolean };
};

/** Count evidence separately from executable recommendations and directory placeholders. */
export function recommendationEvidence(rows: EvidenceRow[]) {
  const valid = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const current = (row: EvidenceRow) => row.available === true && valid(row.price);
  return {
    referencePriceCount: rows.filter(row => !current(row) && valid(row.lastKnownPrice)).length,
    historicalAnalysisCount: rows.filter(row => row.technicalAvailable === true).length,
    evidenceCount: rows.filter(row => current(row) || valid(row.lastKnownPrice) || row.chartAvailable === true || row.technicalAvailable === true).length,
    sufficientRecommendationCount: rows.filter(row => current(row) && row.signalAvailable === true && row.dataSufficiency?.sufficient === true).length,
  };
}
