export const INTELLIGENCE_ASSET_TYPES = [
  'STOCK',
  'CRYPTO',
  'FOREX',
  'INDEX',
  'COMMODITY',
  'FUND',
] as const;

export type IntelligenceAssetType = (typeof INTELLIGENCE_ASSET_TYPES)[number];

export const INTELLIGENCE_HORIZONS = [
  'INTRADAY',
  'SHORT_TERM',
  'SWING',
  'POSITION',
  'LONG_TERM',
] as const;

export type IntelligenceHorizon = (typeof INTELLIGENCE_HORIZONS)[number];

export const INTELLIGENCE_FACTOR_KEYS = [
  'TECHNICAL',
  'FUNDAMENTAL',
  'SENTIMENT',
  'NEWS',
  'MACRO',
  'MOMENTUM',
  'LIQUIDITY',
  'VOLATILITY',
  'RISK',
  'SHARIA',
] as const;

export type IntelligenceFactorKey = (typeof INTELLIGENCE_FACTOR_KEYS)[number];
export type IntelligenceLocale = 'ar' | 'en' | 'fr';
export type IntelligenceRequestSource = 'SMART_MARKET_ANALYSIS' | 'PUBLIC_API' | 'INTERNAL';
export type IntelligenceRecommendation = 'BUY' | 'SELL' | 'WAIT' | 'INSUFFICIENT_DATA';
export type IntelligenceRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'UNAVAILABLE';
export type ConfidenceQuality =
  | 'STRONG_EVIDENCE'
  | 'MODERATE_EVIDENCE'
  | 'LIMITED_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE';
export type FactorAvailability = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
export type DirectionalBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED' | 'UNAVAILABLE';
export type FreshnessState = 'FRESH' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';
export type ConflictStatus = 'NONE' | 'MODERATE' | 'STRONG';
export type AnalysisStatus = 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT_DATA' | 'FAILED';

export type CanonicalAssetIdentity = {
  canonicalSymbol: string;
  providerSymbol: string;
  displaySymbol: string;
  name: string;
  assetType: IntelligenceAssetType;
  exchange: string | null;
  market: string | null;
  quoteCurrency: string | null;
  country: string | null;
  logoUrl: string | null;
};

export type AnalysisRequest = {
  userId: string | null;
  asset: {
    symbol: string;
    assetType: IntelligenceAssetType;
    exchange?: string | null;
    market?: string | null;
    quoteCurrency?: string | null;
  };
  horizon: IntelligenceHorizon;
  locale: IntelligenceLocale;
  requestedModules: IntelligenceFactorKey[];
  providerPreferences: null;
  source: IntelligenceRequestSource;
  correlationId: string;
  forceRefresh: boolean;
};

export type FactorFreshness = {
  state: FreshnessState;
  observedAt: string | null;
  ageSeconds: number | null;
  thresholdSeconds: number;
};

export type EvidenceValue = string | number | boolean | null;

export type IntelligenceEvidence = {
  id: string;
  factor: IntelligenceFactorKey;
  kind: 'OBSERVATION' | 'CALCULATION' | 'STATUS';
  labelKey: string;
  value: EvidenceValue;
  unit: string | null;
  observedAt: string | null;
  source: string;
  provider: string;
  direction: DirectionalBias;
  significance: number;
};

export type IntelligenceWarning = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  factor: IntelligenceFactorKey | null;
  detailKey: string;
};

export type FactorResult = {
  factor: IntelligenceFactorKey;
  availability: FactorAvailability;
  normalizedScore: number | null;
  directionalBias: DirectionalBias;
  strength: number;
  required: boolean;
  freshness: FactorFreshness;
  evidence: IntelligenceEvidence[];
  source: string;
  provider: string;
  operationalReliability: number;
  warnings: IntelligenceWarning[];
  failureReason: string | null;
};

export type ProviderAttempt = {
  provider: string;
  capability: 'ANALYSIS_SNAPSHOT';
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  code: string | null;
  latencyMs: number;
  fallbackUsed: boolean;
  dataAsOf: string | null;
};

export type ProviderProvenance = {
  selectedProvider: string | null;
  attempts: ProviderAttempt[];
  fallbackUsed: boolean;
  dataKinds: string[];
};

export type DataCompleteness = {
  requestedFactors: number;
  availableFactors: number;
  partialFactors: number;
  unavailableFactors: number;
  requiredFactors: IntelligenceFactorKey[];
  missingRequiredFactors: IntelligenceFactorKey[];
  weightedCoverage: number;
  percentage: number;
};

export type ConfidenceCalculation = {
  methodologyVersion: string;
  weightingVersion: string;
  appliedWeights: Partial<Record<IntelligenceFactorKey, number>>;
  components: {
    coverage: number;
    freshness: number;
    consistency: number;
    operationalReliability: number;
    signalClarity: number;
  };
  penalties: Array<{ code: string; points: number }>;
  minimumEvidenceMet: boolean;
  availableDirectionalFactors: number;
};

export type RecommendationDecision = {
  policyVersion: string;
  compositeScore: number;
  buyThreshold: number;
  sellThreshold: number;
  minimumDirectionalConfidence: number;
  reasonCode: string;
  materialFactorKeys: IntelligenceFactorKey[];
};

export type InvalidationCondition = {
  code: 'FACTOR_REVERSAL' | 'DATA_STALENESS' | 'RISK_ESCALATION' | 'PROVIDER_DEGRADATION';
  factor: IntelligenceFactorKey | null;
  detailKey: string;
};

export type StructuredExplanation = {
  supportingFactors: IntelligenceFactorKey[];
  opposingFactors: IntelligenceFactorKey[];
  limitationCodes: string[];
  riskCodes: string[];
  recommendationReasonCode: string;
  confidenceReasonCodes: string[];
  invalidationConditions: InvalidationCondition[];
};

export type PreviousAnalysisSummary = {
  analysisId: string;
  recommendation: IntelligenceRecommendation;
  confidence: number;
  generatedAt: string;
  changeReasonCode: string;
};

export type UnavailablePriceContext = {
  available: false;
  value: null;
  currency: string | null;
  method: null;
  reasonCode: 'CALCULATION_NOT_SUPPORTED';
};

export type VerifiedMarketPriceContext = {
  available: true;
  value: number;
  currency: string | null;
  observedAt: string | null;
  source: string;
  dataStatus: 'LIVE' | 'DELAYED' | 'CACHED';
};

export type MarketPriceContext = VerifiedMarketPriceContext | UnavailablePriceContext;

export type SourceDerivedTargetRange = {
  available: true;
  lower: number;
  upper: number;
  currency: string | null;
  source: string;
  dataAsOf: string;
  method: 'RECENT_OHLC_RANGE';
};

export type UnavailableTargetRange = {
  available: false;
  lower: null;
  upper: null;
  currency: string | null;
  source: null;
  dataAsOf: null;
  method: null;
  reasonCode: 'CALCULATION_NOT_SUPPORTED' | 'INSUFFICIENT_MARKET_DATA' | 'STALE_DATA';
};

export type AnalysisTargetRange = SourceDerivedTargetRange | UnavailableTargetRange;
export type AnalysisPersistenceStatus = 'PERSISTED' | 'FAILED' | 'NOT_ATTEMPTED';

export type AnalysisResult = {
  analysisId: string;
  correlationId: string;
  status: AnalysisStatus;
  scope: 'SHARED' | 'PRIVATE';
  requestSource: IntelligenceRequestSource;
  asset: CanonicalAssetIdentity;
  generatedAt: string;
  dataAsOf: string | null;
  expiresAt: string;
  freshness: FactorFreshness;
  recommendation: IntelligenceRecommendation;
  confidence: number;
  confidenceQuality: ConfidenceQuality;
  confidenceCalculation: ConfidenceCalculation;
  risk: IntelligenceRisk;
  horizon: IntelligenceHorizon;
  /** Current quote carried directly from a verified market-data snapshot. */
  marketPrice: MarketPriceContext;
  entryContext: UnavailablePriceContext;
  /** Deterministic range derived from verified OHLC, never a fabricated target. */
  targets: AnalysisTargetRange;
  stopLossContext: UnavailablePriceContext;
  factors: FactorResult[];
  evidence: IntelligenceEvidence[];
  warnings: IntelligenceWarning[];
  limitations: string[];
  providerProvenance: ProviderProvenance;
  engineVersion: string;
  rulesVersion: string;
  weightingVersion: string;
  dataCompleteness: DataCompleteness;
  staleData: boolean;
  conflictStatus: ConflictStatus;
  explanation: StructuredExplanation;
  recommendationDecision: RecommendationDecision;
  previousAnalysis: PreviousAnalysisSummary | null;
  persistenceStatus: AnalysisPersistenceStatus;
};

export type NormalizedIntelligenceCandle = {
  at: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
};

export type VerifiedIntelligenceSnapshot = {
  asset: CanonicalAssetIdentity;
  provider: string;
  receivedAt: string;
  dataAsOf: string | null;
  dataStatus: 'LIVE' | 'DELAYED' | 'CACHED' | 'UNAVAILABLE';
  fallbackUsed: boolean;
  operationalReliability: number;
  reportedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  quote: {
    price: number;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
  };
  levels: {
    support: number | null;
    resistance: number | null;
  };
  candles: NormalizedIntelligenceCandle[];
  fundamentals: Record<string, unknown> | null;
  fundamentalsSource: string | null;
  sharia: {
    status: 'compliant' | 'non_compliant' | 'needs_review' | 'unclassified' | null;
    reason: string | null;
    source: string | null;
    reviewedAt: string | null;
  };
  warnings: string[];
  providerAttempts: ProviderAttempt[];
};

export type IntelligenceProvider = {
  id: string;
  supports(asset: CanonicalAssetIdentity): boolean;
  getSnapshot(request: AnalysisRequest, asset: CanonicalAssetIdentity): Promise<VerifiedIntelligenceSnapshot>;
};
