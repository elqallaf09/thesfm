export const INVESTMENT_INTELLIGENCE_METHODOLOGY_VERSION = '2.1.0' as const;

export type EvidenceAuthority =
  | 'GOVERNMENT'
  | 'REGULATOR'
  | 'EXCHANGE'
  | 'OFFICIAL_STATISTICS'
  | 'ESTABLISHED_DATA_PROVIDER'
  | 'BROKER'
  | 'LISTING_PLATFORM'
  | 'USER'
  | 'OTHER';

export type InvestmentEvidenceType =
  | 'OFFICIAL_TRANSACTION'
  | 'OFFICIAL_REGISTRY'
  | 'OFFICIAL_STATISTIC'
  | 'OFFICIAL_REPORT'
  | 'MARKET_TRANSACTION'
  | 'BROKER_RESEARCH'
  | 'LISTING_ASK'
  | 'MODEL_INPUT'
  | 'USER_ENTERED'
  | 'OTHER';

export type MatchQuality = 'EXACT' | 'STRONG' | 'PARTIAL' | 'WEAK' | 'UNKNOWN';
export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface ValuationEvidence {
  id: string;
  type: InvestmentEvidenceType;
  authority: EvidenceAuthority;
  sourceName: string;
  sourceUrl?: string;
  observedOn?: string;
  retrievedAt: string;
  assetMatch: MatchQuality;
  geographyMatch: MatchQuality;
  amount?: number;
  currency?: string;
  unitValue?: number;
  unitCode?: string;
  limitations?: string;
}

export interface EvidenceSufficiencyResult {
  sufficient: boolean;
  confidence: EvidenceConfidence;
  reasons: string[];
  usableEvidence: ValuationEvidence[];
}

const AUTHORITY_SCORE: Record<EvidenceAuthority, number> = {
  GOVERNMENT: 5,
  REGULATOR: 5,
  EXCHANGE: 5,
  OFFICIAL_STATISTICS: 5,
  ESTABLISHED_DATA_PROVIDER: 4,
  BROKER: 3,
  LISTING_PLATFORM: 2,
  USER: 1,
  OTHER: 1,
};

const MATCH_SCORE: Record<MatchQuality, number> = {
  EXACT: 4,
  STRONG: 3,
  PARTIAL: 2,
  WEAK: 1,
  UNKNOWN: 0,
};

/**
 * Deterministic evidence-quality classification. This is not a probability.
 * It deliberately refuses to claim a valuation when usable numeric evidence is absent.
 */
export function assessEvidenceSufficiency(evidence: ValuationEvidence[]): EvidenceSufficiencyResult {
  const usableEvidence = evidence.filter((item) =>
    Number.isFinite(item.amount ?? item.unitValue) &&
    Boolean(item.currency) &&
    item.assetMatch !== 'WEAK' &&
    item.geographyMatch !== 'WEAK',
  );

  if (usableEvidence.length === 0) {
    return {
      sufficient: false,
      confidence: 'INSUFFICIENT',
      reasons: ['No usable numeric evidence with currency and acceptable asset/geography match.'],
      usableEvidence,
    };
  }

  const official = usableEvidence.filter((item) =>
    ['GOVERNMENT', 'REGULATOR', 'EXCHANGE', 'OFFICIAL_STATISTICS'].includes(item.authority),
  );
  const independentSources = new Set(usableEvidence.map((item) => item.sourceName.trim().toLowerCase())).size;
  const quality = usableEvidence.reduce(
    (sum, item) => sum + AUTHORITY_SCORE[item.authority] + MATCH_SCORE[item.assetMatch] + MATCH_SCORE[item.geographyMatch],
    0,
  ) / usableEvidence.length;

  if (official.length >= 1 && independentSources >= 2 && quality >= 10) {
    return { sufficient: true, confidence: 'HIGH', reasons: ['Official evidence plus multiple independent, strongly matched sources.'], usableEvidence };
  }
  if ((official.length >= 1 || independentSources >= 2) && quality >= 7) {
    return { sufficient: true, confidence: 'MEDIUM', reasons: ['Evidence is usable but authority, independence, or match quality is not uniformly strong.'], usableEvidence };
  }
  if (quality >= 5) {
    return { sufficient: true, confidence: 'LOW', reasons: ['Evidence supports only a cautious estimate and limitations must remain visible.'], usableEvidence };
  }

  return {
    sufficient: false,
    confidence: 'INSUFFICIENT',
    reasons: ['Available evidence is too weak or poorly matched to support a current valuation.'],
    usableEvidence,
  };
}
