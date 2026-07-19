import type {
  AnalysisResult,
  CanonicalAssetIdentity,
  ConfidenceQuality,
  IntelligenceAssetType,
  IntelligenceHorizon,
  IntelligenceRecommendation,
  IntelligenceRisk,
} from './contracts';

export const INTELLIGENCE_OUTCOME_EVALUATION_STATUSES = [
  'PENDING',
  'EVALUATED',
  'INSUFFICIENT_DATA',
  'INVALIDATED',
  'FAILED',
] as const;

export type IntelligenceOutcomeEvaluationStatus = (typeof INTELLIGENCE_OUTCOME_EVALUATION_STATUSES)[number];

export const INTELLIGENCE_DIRECTIONAL_OUTCOMES = [
  'CORRECT',
  'INCORRECT',
  'NEUTRAL',
  'NOT_APPLICABLE',
] as const;

export type IntelligenceDirectionalOutcome = (typeof INTELLIGENCE_DIRECTIONAL_OUTCOMES)[number];

export const INTELLIGENCE_CONFIDENCE_BUCKETS = [
  '0_39',
  '40_59',
  '60_79',
  '80_100',
] as const;

export type IntelligenceConfidenceBucket = (typeof INTELLIGENCE_CONFIDENCE_BUCKETS)[number];

export type IntelligenceEvaluationWindow = {
  methodologyVersion: string;
  horizon: IntelligenceHorizon;
  referenceAt: string;
  referenceSource: 'DATA_AS_OF' | 'GENERATED_AT';
  startAt: string;
  endAt: string;
  eligibleAt: string;
  entryToleranceSeconds: number;
  finalToleranceSeconds: number;
  interval: string;
};

export type IntelligenceHistoricalPricePoint = {
  at: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
};

export type IntelligenceHistoricalPriceAttempt = {
  provider: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  code: string | null;
  latencyMs: number;
  cached: boolean;
  dataAsOf: string | null;
};

export type IntelligenceHistoricalPriceHistory = {
  provider: string;
  providerSymbol: string;
  currency: string | null;
  receivedAt: string;
  dataAsOf: string | null;
  deliveryState: 'LIVE' | 'DELAYED' | 'CACHED' | 'UNAVAILABLE';
  /** Cache age from the verified history adapter. Null means the provider did not expose it. */
  cacheAgeSeconds: number | null;
  adjustedPrices: 'VERIFIED' | 'UNSUPPORTED' | 'UNKNOWN';
  points: IntelligenceHistoricalPricePoint[];
  attempts: IntelligenceHistoricalPriceAttempt[];
  warnings: string[];
};

export type IntelligenceOutcomeWarning = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
};

export type IntelligenceAnalysisOutcome = {
  id: string;
  analysisId: string;
  scope: 'SHARED' | 'PRIVATE';
  asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'providerSymbol' | 'displaySymbol' | 'assetType' | 'exchange' | 'market' | 'quoteCurrency'>;
  horizon: IntelligenceHorizon;
  originalRecommendation: IntelligenceRecommendation;
  originalConfidence: number;
  originalConfidenceQuality: ConfidenceQuality;
  originalEngineVersion: string;
  originalRulesVersion: string;
  originalWeightingVersion: string;
  confidenceBucket: IntelligenceConfidenceBucket;
  evaluationStatus: IntelligenceOutcomeEvaluationStatus;
  evaluationWindow: IntelligenceEvaluationWindow;
  entryReferencePrice: number | null;
  entryReferenceAt: string | null;
  entryCurrency: string | null;
  finalReferencePrice: number | null;
  finalReferenceAt: string | null;
  finalCurrency: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  directionalReturn: number | null;
  benchmarkReturn: number | null;
  outcome: IntelligenceDirectionalOutcome;
  evaluationDataSource: string | null;
  priceDataAsOf: string | null;
  priceDataReceivedAt: string | null;
  providerProvenance: {
    selectedProvider: string | null;
    attempts: IntelligenceHistoricalPriceAttempt[];
    adjustedPrices: IntelligenceHistoricalPriceHistory['adjustedPrices'];
  };
  warnings: IntelligenceOutcomeWarning[];
  methodologyVersion: string;
  methodologySnapshot: Record<string, unknown>;
  evaluatedAt: string | null;
  createdAt: string;
};

export type IntelligenceFactorDelta = {
  factor: AnalysisResult['factors'][number]['factor'];
  previousScore: number | null;
  currentScore: number | null;
  scoreDelta: number | null;
  previousAvailability: AnalysisResult['factors'][number]['availability'];
  currentAvailability: AnalysisResult['factors'][number]['availability'];
};

export const INTELLIGENCE_DRIFT_REASON_CODES = [
  'TECHNICAL_WEAKENED',
  'TECHNICAL_STRENGTHENED',
  'FUNDAMENTAL_WEAKENED',
  'FUNDAMENTAL_STRENGTHENED',
  'MOMENTUM_WEAKENED',
  'MOMENTUM_STRENGTHENED',
  'VOLATILITY_INCREASED',
  'VOLATILITY_DECREASED',
  'DATA_BECAME_STALE',
  'COVERAGE_DECREASED',
  'COVERAGE_INCREASED',
  'PROVIDER_DISAGREEMENT_INCREASED',
  'RISK_INCREASED',
  'RISK_DECREASED',
  'PROVIDER_CHANGED',
  'RECOMMENDATION_CHANGED',
  'METHODOLOGY_VERSION_CHANGED',
  'NO_MATERIAL_CHANGE',
  'NO_PREVIOUS_ANALYSIS',
] as const;

export type IntelligenceDriftReasonCode = (typeof INTELLIGENCE_DRIFT_REASON_CODES)[number];

export type IntelligenceAnalysisDrift = {
  methodologyVersion: string;
  previousAnalysisId: string | null;
  confidenceDelta: number | null;
  recommendationTransition: {
    from: IntelligenceRecommendation | null;
    to: IntelligenceRecommendation;
  };
  riskTransition: {
    from: IntelligenceRisk | null;
    to: IntelligenceRisk;
  };
  factorDeltas: IntelligenceFactorDelta[];
  coverageDelta: number | null;
  freshnessTransition: {
    from: AnalysisResult['freshness']['state'] | null;
    to: AnalysisResult['freshness']['state'];
  };
  conflictTransition: {
    from: AnalysisResult['conflictStatus'] | null;
    to: AnalysisResult['conflictStatus'];
  };
  providerChanged: boolean;
  methodologyChanged: boolean;
  reasonCodes: IntelligenceDriftReasonCode[];
  primaryReasonCode: IntelligenceDriftReasonCode;
};

export type IntelligenceOutcomeCalibrationGroup = {
  key: string;
  evaluatedCount: number;
  correctCount: number;
  incorrectCount: number;
  neutralCount: number;
  excludedCount: number;
  accuracy: number | null;
  meanConfidence: number | null;
  descriptiveCalibrationGap: number | null;
  sampleSufficient: boolean;
};

export type IntelligenceOutcomeCalibrationReport = {
  methodologyVersion: string;
  minimumDirectionalSample: number;
  evaluatedCount: number;
  pendingCount: number;
  insufficientDataCount: number;
  invalidatedCount: number;
  failedCount: number;
  directional: IntelligenceOutcomeCalibrationGroup;
  byConfidenceBucket: IntelligenceOutcomeCalibrationGroup[];
  byAssetType: IntelligenceOutcomeCalibrationGroup[];
  byHorizon: IntelligenceOutcomeCalibrationGroup[];
  byRecommendation: IntelligenceOutcomeCalibrationGroup[];
  mfe: { count: number; median: number | null; p25: number | null; p75: number | null };
  mae: { count: number; median: number | null; p25: number | null; p75: number | null };
  calibrationBoundary: 'DESCRIPTIVE_ONLY_NO_LIVE_WEIGHT_CHANGE';
};

export type IntelligenceTimelineItem = {
  analysisId: string;
  asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'displaySymbol' | 'assetType' | 'exchange' | 'market' | 'quoteCurrency'>;
  generatedAt: string;
  dataAsOf: string | null;
  recommendation: IntelligenceRecommendation;
  confidence: number;
  risk: IntelligenceRisk;
  freshness: AnalysisResult['freshness']['state'];
  warnings: AnalysisResult['warnings'];
  provider: AnalysisResult['providerProvenance'];
  versions: Pick<AnalysisResult, 'engineVersion' | 'rulesVersion' | 'weightingVersion'>;
  drift: IntelligenceAnalysisDrift;
  /** PENDING is explicit even when an older Phase 6.1 row has not yet received its outcome row. */
  outcomeStatus: IntelligenceOutcomeEvaluationStatus;
  outcome: IntelligenceAnalysisOutcome | null;
};

export type IntelligenceTimelineComparison = {
  left: IntelligenceTimelineItem;
  right: IntelligenceTimelineItem;
  drift: IntelligenceAnalysisDrift;
};
