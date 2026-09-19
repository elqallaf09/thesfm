import type { EvidenceConfidence, ValuationEvidence } from './contracts';
import { INVESTMENT_INTELLIGENCE_METHODOLOGY_VERSION } from './contracts';
import type { RealEstateAssetInput } from './real-estate';
import { valuationArea, prepareRealEstateEvidence } from './real-estate';
import { qualifiedTransactionEvidence } from './transactionEvidence';

export interface FxQuote {
  from: string;
  to: string;
  rate: number;
  sourceName: string;
  sourceUrl?: string;
  observedAt: string;
  retrievedAt: string;
}

export interface ValuationRangeResult {
  status: 'VALUED' | 'INSUFFICIENT_EVIDENCE';
  currency?: string;
  lowValue?: number;
  midpointValue?: number;
  highValue?: number;
  lowPerM2?: number;
  midpointPerM2?: number;
  highPerM2?: number;
  confidence: EvidenceConfidence;
  reasons: string[];
  evidenceIds: string[];
  methodologyVersion: string;
  estimateKind?: 'PRELIMINARY' | 'COMPARABLE_RANGE';
  areaBasis?: 'LAND' | 'BUILT';
  sampleSize?: number;
}

const authorityWeight: Record<ValuationEvidence['authority'], number> = {
  GOVERNMENT: 1,
  REGULATOR: 1,
  EXCHANGE: 1,
  OFFICIAL_STATISTICS: 0.95,
  ESTABLISHED_DATA_PROVIDER: 0.85,
  BROKER: 0.7,
  LISTING_PLATFORM: 0.5,
  USER: 0.35,
  OTHER: 0.3,
};

const matchWeight = { EXACT: 1, STRONG: 0.85, PARTIAL: 0.6, WEAK: 0.2, UNKNOWN: 0.15 } as const;

function weightedQuantile(values: Array<{ value: number; weight: number }>, q: number): number {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  const target = total * q;
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= target) return item.value;
  }
  return sorted[sorted.length - 1]?.value ?? 0;
}

function fxRateFor(from: string, to: string, quotes: FxQuote[], now: Date): FxQuote | null {
  if (from === to) return { from, to, rate: 1, sourceName: 'identity', observedAt: new Date(0).toISOString(), retrievedAt: new Date(0).toISOString() };
  return quotes.find((quote) => {
    const observed = Date.parse(quote.observedAt), retrieved = Date.parse(quote.retrievedAt);
    return quote.from === from && quote.to === to && Number.isFinite(quote.rate) && quote.rate > 0 && Boolean(quote.sourceName.trim())
      && Number.isFinite(observed) && Number.isFinite(retrieved) && retrieved >= observed
      && observed <= now.getTime() && now.getTime() - observed <= 7 * 86_400_000 && retrieved <= now.getTime() + 300_000;
  }) ?? null;
}

export function buildRealEstateValuationRange(
  asset: RealEstateAssetInput,
  evidence: ValuationEvidence[],
  outputCurrency: string,
  fxQuotes: FxQuote[] = [],
  now = new Date(),
): ValuationRangeResult {
  const subjectArea = valuationArea(asset);
  const qualified = qualifiedTransactionEvidence(evidence, now).filter(item => (item.areaBasis ?? 'LAND') === subjectArea?.basis);
  const prepared = prepareRealEstateEvidence(qualified);
  if (qualified.length < evidence.length) prepared.reasons.push('Undated, stale, duplicate, poorly matched or non-transaction observations were excluded.');
  const area = subjectArea?.value;
  if (!area) {
    return { status: 'INSUFFICIENT_EVIDENCE', confidence: 'INSUFFICIENT', reasons: ['Enter land area for vacant land or building floor area for a dwelling, with its unit.'], evidenceIds: [], methodologyVersion: INVESTMENT_INTELLIGENCE_METHODOLOGY_VERSION };
  }

  const normalized = prepared.comparables.flatMap((item) => {
    const quote = fxRateFor(item.currency, outputCurrency, fxQuotes, now);
    if (!quote) return [];
    if (!Number.isFinite(item.valuePerM2 * quote.rate * area)) return [];
    const weight = authorityWeight[item.evidence.authority] * matchWeight[item.evidence.assetMatch] * matchWeight[item.evidence.geographyMatch];
    return [{ value: item.valuePerM2 * quote.rate, weight, evidenceId: item.evidenceId }];
  });

  if (!prepared.sufficient || normalized.length < 2) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      confidence: 'INSUFFICIENT',
      reasons: [...prepared.reasons, ...(normalized.length < 2 ? ['At least two currency-normalized comparable observations are required.'] : [])],
      evidenceIds: normalized.map((item) => item.evidenceId),
      methodologyVersion: INVESTMENT_INTELLIGENCE_METHODOLOGY_VERSION,
    };
  }

  const preliminary = normalized.length < 5;
  const lowPerM2 = weightedQuantile(normalized, preliminary ? 0 : 0.25);
  const midpointPerM2 = weightedQuantile(normalized, 0.5);
  const highPerM2 = weightedQuantile(normalized, preliminary ? 1 : 0.75);

  return {
    status: 'VALUED',
    currency: outputCurrency,
    lowValue: lowPerM2 * area,
    midpointValue: midpointPerM2 * area,
    highValue: highPerM2 * area,
    lowPerM2,
    midpointPerM2,
    highPerM2,
    confidence: preliminary ? 'LOW' : prepared.confidence,
    reasons: [...prepared.reasons, ...(preliminary ? ['Small sample: full observed range, low confidence; not a calibrated prediction interval.'] : []), 'Recorded-sale comparison; condition, title and arm’s-length status are not independently verified.'],
    estimateKind: preliminary ? 'PRELIMINARY' : 'COMPARABLE_RANGE',
    areaBasis: subjectArea.basis,
    sampleSize: normalized.length,
    evidenceIds: normalized.map((item) => item.evidenceId),
    methodologyVersion: INVESTMENT_INTELLIGENCE_METHODOLOGY_VERSION,
  };
}
