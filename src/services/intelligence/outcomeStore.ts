import 'server-only';

import { randomUUID } from 'node:crypto';
import type {
  AnalysisResult,
  CanonicalAssetIdentity,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';
import type {
  IntelligenceAnalysisOutcome,
  IntelligenceOutcomeEvaluationStatus,
  IntelligenceOutcomeWarning,
} from '@/domain/intelligence/outcomes';
import {
  confidenceBucket,
  createEvaluationWindow,
  createOutcomePolicySnapshot,
  INTELLIGENCE_CALIBRATION_METHODOLOGY_VERSION,
} from '@/lib/intelligence/outcomePolicy';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { IntelligenceError } from './errors';

export type StoredIntelligenceAnalysis = {
  result: AnalysisResult;
  userId: string | null;
  createdAt: string;
};

export type IntelligenceTimelineStoreQuery = {
  asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'assetType'>;
  horizon: IntelligenceHorizon;
  userId: string | null;
  from: string | null;
  to: string | null;
  cursor: string | null;
  limit: number;
};

export type IntelligenceTimelineStoreResult = {
  analyses: StoredIntelligenceAnalysis[];
  outcomes: Map<string, IntelligenceAnalysisOutcome>;
  nextCursor: string | null;
};

export type TerminalOutcomeUpdate = Pick<
  IntelligenceAnalysisOutcome,
  | 'evaluationStatus'
  | 'entryReferencePrice'
  | 'entryReferenceAt'
  | 'entryCurrency'
  | 'finalReferencePrice'
  | 'finalReferenceAt'
  | 'finalCurrency'
  | 'maximumFavorableExcursion'
  | 'maximumAdverseExcursion'
  | 'directionalReturn'
  | 'benchmarkReturn'
  | 'outcome'
  | 'evaluationDataSource'
  | 'priceDataAsOf'
  | 'priceDataReceivedAt'
  | 'providerProvenance'
  | 'warnings'
  | 'evaluatedAt'
>;

export interface IntelligenceOutcomeStore {
  ensurePending(analysis: StoredIntelligenceAnalysis): Promise<IntelligenceAnalysisOutcome | null>;
  getOutcome(analysisId: string): Promise<IntelligenceAnalysisOutcome | null>;
  transitionPending(analysisId: string, update: TerminalOutcomeUpdate): Promise<IntelligenceAnalysisOutcome | null>;
  listEligibleAnalyses(now: string, limit: number): Promise<StoredIntelligenceAnalysis[]>;
  getAccessibleAnalysis(analysisId: string, userId: string | null): Promise<StoredIntelligenceAnalysis | null>;
  listTimeline(query: IntelligenceTimelineStoreQuery): Promise<IntelligenceTimelineStoreResult>;
  listSharedOutcomesForReporting(limit: number): Promise<{ outcomes: IntelligenceAnalysisOutcome[]; truncated: boolean }>;
}

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordLike : null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray<T>(value: unknown, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapper).filter((item): item is T => item !== null);
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  const result = asRecord(value);
  return Boolean(
    result
    && typeof result.analysisId === 'string'
    && typeof result.generatedAt === 'string'
    && asRecord(result.asset)
    && Array.isArray(result.factors)
    && ['BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA'].includes(String(result.recommendation)),
  );
}

function outcomeStatus(value: unknown): IntelligenceOutcomeEvaluationStatus | null {
  const normalized = String(value ?? '').toUpperCase();
  return ['PENDING', 'EVALUATED', 'INSUFFICIENT_DATA', 'INVALIDATED', 'FAILED'].includes(normalized)
    ? normalized as IntelligenceOutcomeEvaluationStatus
    : null;
}

function mapWarning(value: unknown): IntelligenceOutcomeWarning | null {
  const warning = asRecord(value);
  const code = asString(warning?.code);
  const severity = asString(warning?.severity);
  if (!code || !['INFO', 'WARNING', 'CRITICAL'].includes(String(severity))) return null;
  return { code, severity: severity as IntelligenceOutcomeWarning['severity'] };
}

function mapOutcome(row: unknown): IntelligenceAnalysisOutcome | null {
  const value = asRecord(row);
  if (!value) return null;
  const status = outcomeStatus(value?.evaluation_status);
  const id = asString(value?.id);
  const analysisId = asString(value?.analysis_id);
  const canonicalSymbol = asString(value?.canonical_symbol);
  const providerSymbol = asString(value?.provider_symbol);
  const displaySymbol = asString(value?.display_symbol);
  const assetType = asString(value?.asset_type);
  const horizon = asString(value?.horizon);
  const recommendation = asString(value?.original_recommendation);
  const quality = asString(value?.original_confidence_quality);
  const engineVersion = asString(value?.original_engine_version);
  const rulesVersion = asString(value?.original_rules_version);
  const weightingVersion = asString(value?.original_weighting_version);
  const confidenceBucketValue = asString(value?.confidence_bucket);
  const windowStart = asString(value?.evaluation_window_start);
  const windowEnd = asString(value?.evaluation_window_end);
  const referenceAt = asString(value?.evaluation_reference_at);
  const methodologyVersion = asString(value?.methodology_version);
  const createdAt = asString(value?.created_at);
  const confidence = asNumber(value?.original_confidence);
  const outcome = asString(value?.outcome_classification);
  const provenance = asRecord(value?.provider_provenance) ?? {};
  const snapshot = asRecord(value?.methodology_snapshot) ?? {};
  const evaluationPolicy = asRecord(snapshot.evaluationPolicy) ?? {};
  const providerAttempts = asArray(provenance.attempts, attempt => {
    const item = asRecord(attempt);
    const provider = asString(item?.provider);
    const statusValue = asString(item?.status);
    const latencyMs = asNumber(item?.latencyMs);
    if (!provider || !['SUCCESS', 'FAILED', 'SKIPPED'].includes(String(statusValue)) || latencyMs === null) return null;
    return {
      provider,
      status: statusValue as IntelligenceAnalysisOutcome['providerProvenance']['attempts'][number]['status'],
      code: asString(item?.code),
      latencyMs,
      cached: item?.cached === true,
      dataAsOf: asString(item?.dataAsOf),
    };
  });

  if (!status || !id || !analysisId || !canonicalSymbol || !providerSymbol || !displaySymbol
    || !assetType || !horizon || !recommendation || !quality || !engineVersion || !rulesVersion
    || !weightingVersion || !confidenceBucketValue || !windowStart || !windowEnd || !referenceAt
    || !methodologyVersion || !createdAt || confidence === null
    || !['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND'].includes(assetType)
    || !['INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM'].includes(horizon)
    || !['BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA'].includes(recommendation)
    || !['STRONG_EVIDENCE', 'MODERATE_EVIDENCE', 'LIMITED_EVIDENCE', 'INSUFFICIENT_EVIDENCE'].includes(quality)
    || !['0_39', '40_59', '60_79', '80_100'].includes(confidenceBucketValue)
    || !['CORRECT', 'INCORRECT', 'NEUTRAL', 'NOT_APPLICABLE'].includes(String(outcome))) return null;

  return {
    id,
    analysisId,
    scope: String(value.scope).toUpperCase() === 'PRIVATE' ? 'PRIVATE' : 'SHARED',
    asset: {
      canonicalSymbol,
      providerSymbol,
      displaySymbol,
      assetType: assetType as IntelligenceAnalysisOutcome['asset']['assetType'],
      exchange: asString(value.exchange),
      market: asString(value.market),
      quoteCurrency: asString(value.quote_currency),
    },
    horizon: horizon as IntelligenceAnalysisOutcome['horizon'],
    originalRecommendation: recommendation as IntelligenceAnalysisOutcome['originalRecommendation'],
    originalConfidence: confidence,
    originalConfidenceQuality: quality as IntelligenceAnalysisOutcome['originalConfidenceQuality'],
    originalEngineVersion: engineVersion,
    originalRulesVersion: rulesVersion,
    originalWeightingVersion: weightingVersion,
    confidenceBucket: confidenceBucketValue as IntelligenceAnalysisOutcome['confidenceBucket'],
    evaluationStatus: status,
    evaluationWindow: {
      methodologyVersion,
      horizon: horizon as IntelligenceAnalysisOutcome['horizon'],
      referenceAt,
      referenceSource: snapshot.referenceSource === 'DATA_AS_OF' ? 'DATA_AS_OF' : 'GENERATED_AT',
      startAt: windowStart,
      endAt: windowEnd,
      eligibleAt: windowEnd,
      entryToleranceSeconds: asNumber(evaluationPolicy.entryToleranceSeconds) ?? asNumber(snapshot.entryToleranceSeconds) ?? 0,
      finalToleranceSeconds: asNumber(evaluationPolicy.finalToleranceSeconds) ?? asNumber(snapshot.finalToleranceSeconds) ?? 0,
      interval: asString(evaluationPolicy.interval) ?? asString(snapshot.interval) ?? 'unknown',
    },
    entryReferencePrice: asNumber(value.entry_reference_price),
    entryReferenceAt: asString(value.entry_reference_at),
    entryCurrency: asString(value.entry_currency),
    finalReferencePrice: asNumber(value.final_reference_price),
    finalReferenceAt: asString(value.final_reference_at),
    finalCurrency: asString(value.final_currency),
    maximumFavorableExcursion: asNumber(value.maximum_favorable_excursion),
    maximumAdverseExcursion: asNumber(value.maximum_adverse_excursion),
    directionalReturn: asNumber(value.directional_return),
    benchmarkReturn: asNumber(value.benchmark_return),
    outcome: outcome as IntelligenceAnalysisOutcome['outcome'],
    evaluationDataSource: asString(value.evaluation_data_source),
    priceDataAsOf: asString(value.price_data_as_of),
    priceDataReceivedAt: asString(value.price_data_received_at),
    providerProvenance: {
      selectedProvider: asString(provenance.selectedProvider),
      attempts: providerAttempts,
      adjustedPrices: provenance.adjustedPrices === 'VERIFIED'
        ? 'VERIFIED'
        : provenance.adjustedPrices === 'UNSUPPORTED'
          ? 'UNSUPPORTED'
          : 'UNKNOWN',
    },
    warnings: asArray(value.warnings, mapWarning),
    methodologyVersion,
    methodologySnapshot: snapshot,
    evaluatedAt: asString(value.evaluated_at),
    createdAt,
  };
}

function mapStoredAnalysis(row: unknown): StoredIntelligenceAnalysis | null {
  const value = asRecord(row);
  if (!value) return null;
  const result = value?.result_snapshot;
  if (!isAnalysisResult(result)) return null;
  return {
    result,
    userId: asString(value.user_id),
    createdAt: asString(value.created_at) ?? result.generatedAt,
  };
}

function normalizedCurrency(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase() ?? null;
  return trimmed && /^[A-Z0-9]{3,8}$/.test(trimmed) ? trimmed : null;
}

function validTimestamp(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function pendingOutcome(analysis: StoredIntelligenceAnalysis): IntelligenceAnalysisOutcome {
  const { result } = analysis;
  const evaluationPolicy = createOutcomePolicySnapshot({
    horizon: result.horizon,
    assetType: result.asset.assetType,
  });
  let invalidParentWindow = false;
  let window;
  try {
    window = createEvaluationWindow(result, evaluationPolicy);
  } catch {
    // A legacy/corrupt snapshot must not block later backfill rows. This anchor
    // exists only to persist a FAILED audit record; the evaluator sees the
    // explicit marker below and never requests or classifies market prices.
    const auditAnchor = validTimestamp(analysis.createdAt);
    if (!auditAnchor) throw new Error('INVALID_OUTCOME_AUDIT_ANCHOR');
    invalidParentWindow = true;
    window = {
      methodologyVersion: evaluationPolicy.methodologyVersion,
      horizon: result.horizon,
      referenceAt: auditAnchor,
      referenceSource: 'GENERATED_AT' as const,
      startAt: auditAnchor,
      endAt: auditAnchor,
      eligibleAt: auditAnchor,
      entryToleranceSeconds: 0,
      finalToleranceSeconds: 0,
      interval: 'unavailable',
    };
  }
  return {
    id: randomUUID(),
    analysisId: result.analysisId,
    scope: result.scope,
    asset: {
      canonicalSymbol: result.asset.canonicalSymbol,
      providerSymbol: result.asset.providerSymbol,
      displaySymbol: result.asset.displaySymbol,
      assetType: result.asset.assetType,
      exchange: result.asset.exchange,
      market: result.asset.market,
      quoteCurrency: normalizedCurrency(result.asset.quoteCurrency),
    },
    horizon: result.horizon,
    originalRecommendation: result.recommendation,
    originalConfidence: result.confidence,
    originalConfidenceQuality: result.confidenceQuality,
    originalEngineVersion: result.engineVersion,
    originalRulesVersion: result.rulesVersion,
    originalWeightingVersion: result.weightingVersion,
    confidenceBucket: confidenceBucket(result.confidence),
    evaluationStatus: 'PENDING',
    evaluationWindow: window,
    entryReferencePrice: null,
    entryReferenceAt: null,
    entryCurrency: null,
    finalReferencePrice: null,
    finalReferenceAt: null,
    finalCurrency: null,
    maximumFavorableExcursion: null,
    maximumAdverseExcursion: null,
    directionalReturn: null,
    benchmarkReturn: null,
    outcome: 'NOT_APPLICABLE',
    evaluationDataSource: null,
    priceDataAsOf: null,
    priceDataReceivedAt: null,
    providerProvenance: { selectedProvider: null, attempts: [], adjustedPrices: 'UNKNOWN' },
    warnings: [],
    methodologyVersion: evaluationPolicy.methodologyVersion,
    methodologySnapshot: {
      evaluationPolicy,
      invalidParentWindow,
      referenceSource: window.referenceSource,
      entryToleranceSeconds: window.entryToleranceSeconds,
      finalToleranceSeconds: window.finalToleranceSeconds,
      interval: window.interval,
      calibrationMethodologyVersion: INTELLIGENCE_CALIBRATION_METHODOLOGY_VERSION,
      currencyConversion: 'NOT_PERFORMED',
      benchmarkMethodology: 'UNSUPPORTED_IN_PHASE_6_2A',
    },
    evaluatedAt: null,
    createdAt: analysis.createdAt,
  };
}

export function pendingOutcomeInsertRow(analysis: StoredIntelligenceAnalysis) {
  const outcome = pendingOutcome(analysis);
  return {
    analysis_id: outcome.analysisId,
    user_id: analysis.result.scope === 'PRIVATE' ? analysis.userId : null,
    scope: outcome.scope.toLowerCase(),
    canonical_symbol: outcome.asset.canonicalSymbol,
    provider_symbol: outcome.asset.providerSymbol,
    display_symbol: outcome.asset.displaySymbol,
    asset_type: outcome.asset.assetType,
    exchange: outcome.asset.exchange,
    market: outcome.asset.market,
    quote_currency: outcome.asset.quoteCurrency,
    horizon: outcome.horizon,
    original_recommendation: outcome.originalRecommendation,
    original_confidence: outcome.originalConfidence,
    original_confidence_quality: outcome.originalConfidenceQuality,
    original_engine_version: outcome.originalEngineVersion,
    original_rules_version: outcome.originalRulesVersion,
    original_weighting_version: outcome.originalWeightingVersion,
    confidence_bucket: outcome.confidenceBucket,
    evaluation_status: 'pending',
    evaluation_window_start: outcome.evaluationWindow.startAt,
    evaluation_window_end: outcome.evaluationWindow.endAt,
    evaluation_reference_at: outcome.evaluationWindow.referenceAt,
    outcome_classification: outcome.outcome,
    methodology_version: outcome.methodologyVersion,
    methodology_snapshot: outcome.methodologySnapshot,
  };
}

function terminalUpdateRow(update: TerminalOutcomeUpdate) {
  return {
    evaluation_status: update.evaluationStatus.toLowerCase(),
    entry_reference_price: update.entryReferencePrice,
    entry_reference_at: update.entryReferenceAt,
    entry_currency: normalizedCurrency(update.entryCurrency),
    final_reference_price: update.finalReferencePrice,
    final_reference_at: update.finalReferenceAt,
    final_currency: normalizedCurrency(update.finalCurrency),
    maximum_favorable_excursion: update.maximumFavorableExcursion,
    maximum_adverse_excursion: update.maximumAdverseExcursion,
    directional_return: update.directionalReturn,
    benchmark_return: update.benchmarkReturn,
    outcome_classification: update.outcome,
    evaluation_data_source: update.evaluationDataSource,
    price_data_as_of: update.priceDataAsOf,
    price_data_received_at: update.priceDataReceivedAt,
    provider_provenance: update.providerProvenance,
    warnings: update.warnings,
    evaluated_at: update.evaluatedAt,
  };
}

const OUTCOME_SELECT = [
  'id', 'analysis_id', 'user_id', 'scope', 'canonical_symbol', 'provider_symbol', 'display_symbol', 'asset_type',
  'exchange', 'market', 'quote_currency', 'horizon', 'original_recommendation', 'original_confidence',
  'original_confidence_quality', 'original_engine_version', 'original_rules_version', 'original_weighting_version',
  'confidence_bucket', 'evaluation_status', 'evaluation_window_start', 'evaluation_window_end', 'evaluation_reference_at',
  'entry_reference_price', 'entry_reference_at', 'entry_currency', 'final_reference_price', 'final_reference_at',
  'final_currency', 'maximum_favorable_excursion', 'maximum_adverse_excursion', 'directional_return', 'benchmark_return',
  'outcome_classification', 'evaluation_data_source', 'price_data_as_of', 'price_data_received_at', 'provider_provenance',
  'warnings', 'methodology_version', 'methodology_snapshot', 'evaluated_at', 'created_at',
].join(',');

const ANALYSIS_SELECT = 'id,user_id,scope,canonical_symbol,asset_type,horizon,generated_at,created_at,result_snapshot';

function ownedPrivateScopeFilter<T extends { eq: (column: string, value: unknown) => T }>(
  builder: T,
  userId: string | null,
) {
  if (!userId) throw new IntelligenceError('UNAUTHENTICATED', false);
  return builder.eq('scope', 'private').eq('user_id', userId);
}

export class SupabaseIntelligenceOutcomeStore implements IntelligenceOutcomeStore {
  async ensurePending(analysis: StoredIntelligenceAnalysis) {
    const admin = createServerSupabaseAdmin();
    if (!admin || (analysis.result.scope === 'PRIVATE' && !analysis.userId)) return null;
    const { data, error } = await admin
      .from('intelligence_analysis_outcomes')
      .insert(pendingOutcomeInsertRow(analysis))
      .select(OUTCOME_SELECT)
      .maybeSingle();
    if (!error) return mapOutcome(data);
    if (error.code === '23505') return this.getOutcome(analysis.result.analysisId);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[intelligence-outcome-store] pending record skipped', { code: error.code });
    }
    return null;
  }

  async getOutcome(analysisId: string) {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from('intelligence_analysis_outcomes')
      .select(OUTCOME_SELECT)
      .eq('analysis_id', analysisId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116' && process.env.NODE_ENV !== 'production') {
      console.warn('[intelligence-outcome-store] outcome lookup skipped', { code: error.code });
    }
    return mapOutcome(data);
  }

  async transitionPending(analysisId: string, update: TerminalOutcomeUpdate) {
    if (update.evaluationStatus === 'PENDING' || !update.evaluatedAt) return null;
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from('intelligence_analysis_outcomes')
      .update(terminalUpdateRow(update))
      .eq('analysis_id', analysisId)
      .eq('evaluation_status', 'pending')
      .select(OUTCOME_SELECT)
      .maybeSingle();
    if (!error) return mapOutcome(data);
    if (error.code !== 'PGRST116' && process.env.NODE_ENV !== 'production') {
      console.warn('[intelligence-outcome-store] terminal transition skipped', { code: error.code });
    }
    return null;
  }

  async listEligibleAnalyses(now: string, limit: number) {
    const admin = createServerSupabaseAdmin();
    if (!admin) return [];
    const boundedLimit = Math.max(1, Math.min(limit, 100));
    const { data: pendingRows, error: pendingError } = await admin
      .from('intelligence_analysis_outcomes')
      .select('analysis_id')
      .eq('evaluation_status', 'pending')
      .lte('evaluation_window_end', now)
      .order('evaluation_window_end', { ascending: true })
      .limit(boundedLimit);
    if (pendingError && process.env.NODE_ENV !== 'production') {
      console.warn('[intelligence-outcome-store] due outcome lookup skipped', { code: pendingError.code });
    }
    const pendingIds = (pendingRows ?? [])
      .map(row => asString((row as RecordLike).analysis_id))
      .filter((id): id is string => Boolean(id));
    const selected = new Map<string, StoredIntelligenceAnalysis>();
    if (pendingIds.length) {
      const { data } = await admin
        .from('intelligence_analyses')
        .select(ANALYSIS_SELECT)
        .in('id', pendingIds);
      for (const row of data ?? []) {
        const analysis = mapStoredAnalysis(row);
        if (analysis) selected.set(analysis.result.analysisId, analysis);
      }
    }

    // Phase 6.1 rows predate pending outcomes. Use a database anti-join instead of
    // repeatedly inspecting the newest parent rows: once those rows have outcomes,
    // a newest-first scan would permanently starve older legacy analyses. The unique
    // analysis_id constraint still protects this query from a concurrent evaluator.
    if (selected.size < boundedLimit) {
      const remaining = boundedLimit - selected.size;
      const { data, error } = await admin
        .from('intelligence_analyses')
        .select(`${ANALYSIS_SELECT},intelligence_analysis_outcomes!left(analysis_id)`)
        .lte('generated_at', now)
        .is('intelligence_analysis_outcomes.analysis_id', null)
        .order('generated_at', { ascending: true })
        .limit(remaining);
      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[intelligence-outcome-store] legacy outcome backfill lookup skipped', { code: error.code });
        }
      } else {
        const nowMs = Date.parse(now);
        for (const candidate of (data ?? []).map(mapStoredAnalysis)) {
          if (!candidate || selected.size >= boundedLimit) continue;
          // The parent table did not retain a window end before Phase 6.2A; derive
          // the versioned window locally and avoid handing an immature legacy row to
          // the evaluator just because it has no outcome row.
          try {
            if (Date.parse(createEvaluationWindow(candidate.result).eligibleAt) <= nowMs) {
              selected.set(candidate.result.analysisId, candidate);
            }
          } catch {
            // Leave the malformed snapshot to the evaluator, which records a
            // terminal FAILED outcome rather than letting one corrupt legacy row
            // abort the complete scheduled evaluation run.
            selected.set(candidate.result.analysisId, candidate);
          }
        }
      }
    }
    return [...selected.values()];
  }

  async getAccessibleAnalysis(analysisId: string, userId: string | null) {
    const admin = createServerSupabaseAdmin();
    if (!admin) throw new IntelligenceError('DATABASE_ERROR', true);
    let builder = admin
      .from('intelligence_analyses')
      .select(ANALYSIS_SELECT)
      .eq('id', analysisId);
    builder = ownedPrivateScopeFilter(builder, userId);
    const { data, error } = await builder.maybeSingle();
    if (error && error.code !== 'PGRST116') throw new IntelligenceError('DATABASE_ERROR', true);
    return mapStoredAnalysis(data);
  }

  async listTimeline(query: IntelligenceTimelineStoreQuery): Promise<IntelligenceTimelineStoreResult> {
    const admin = createServerSupabaseAdmin();
    if (!admin) throw new IntelligenceError('DATABASE_ERROR', true);
    const limit = Math.max(1, Math.min(query.limit, 50));
    let builder = admin
      .from('intelligence_analyses')
      .select(ANALYSIS_SELECT)
      .eq('canonical_symbol', query.asset.canonicalSymbol)
      .eq('asset_type', query.asset.assetType)
      .eq('horizon', query.horizon);
    builder = ownedPrivateScopeFilter(builder, query.userId);
    if (query.from) builder = builder.gte('generated_at', query.from);
    if (query.to) builder = builder.lte('generated_at', query.to);
    if (query.cursor) builder = builder.lt('generated_at', query.cursor);
    const { data, error } = await builder
      .order('generated_at', { ascending: false })
      .limit(limit + 1);
    if (error) throw new IntelligenceError('DATABASE_ERROR', true);
    const rows = (data ?? []).map(mapStoredAnalysis).filter((row): row is StoredIntelligenceAnalysis => row !== null);
    const hasMore = rows.length > limit;
    const analyses = rows.slice(0, limit);
    const ids = analyses.map(analysis => analysis.result.analysisId);
    const outcomes = new Map<string, IntelligenceAnalysisOutcome>();
    if (ids.length) {
      const { data: outcomeRows, error: outcomesError } = await admin
        .from('intelligence_analysis_outcomes')
        .select(OUTCOME_SELECT)
        .in('analysis_id', ids);
      if (outcomesError) throw new IntelligenceError('DATABASE_ERROR', true);
      for (const row of outcomeRows ?? []) {
        const outcome = mapOutcome(row);
        if (outcome) outcomes.set(outcome.analysisId, outcome);
      }
    }
    return {
      analyses,
      outcomes,
      nextCursor: hasMore ? analyses.at(-1)?.result.generatedAt ?? null : null,
    };
  }

  async listSharedOutcomesForReporting(limit: number) {
    const admin = createServerSupabaseAdmin();
    if (!admin) return { outcomes: [], truncated: false };
    const boundedLimit = Math.max(1, Math.min(limit, 2_000));
    const { data, error } = await admin
      .from('intelligence_analysis_outcomes')
      .select(OUTCOME_SELECT)
      .eq('scope', 'shared')
      .order('created_at', { ascending: false })
      .limit(boundedLimit + 1);
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[intelligence-outcome-store] reporting lookup skipped', { code: error.code });
      }
      return { outcomes: [], truncated: false };
    }
    const rows = (data ?? []).map(mapOutcome).filter((outcome): outcome is IntelligenceAnalysisOutcome => outcome !== null);
    return { outcomes: rows.slice(0, boundedLimit), truncated: rows.length > boundedLimit };
  }
}

export class MemoryIntelligenceOutcomeStore implements IntelligenceOutcomeStore {
  private readonly analyses = new Map<string, StoredIntelligenceAnalysis>();
  private readonly outcomes = new Map<string, IntelligenceAnalysisOutcome>();

  constructor(analyses: StoredIntelligenceAnalysis[] = []) {
    for (const analysis of analyses) this.analyses.set(analysis.result.analysisId, structuredClone(analysis));
  }

  addAnalysis(analysis: StoredIntelligenceAnalysis) {
    this.analyses.set(analysis.result.analysisId, structuredClone(analysis));
  }

  async ensurePending(analysis: StoredIntelligenceAnalysis) {
    this.addAnalysis(analysis);
    const existing = this.outcomes.get(analysis.result.analysisId);
    if (existing) return structuredClone(existing);
    const outcome = pendingOutcome(analysis);
    this.outcomes.set(outcome.analysisId, outcome);
    return structuredClone(outcome);
  }

  async getOutcome(analysisId: string) {
    const outcome = this.outcomes.get(analysisId);
    return outcome ? structuredClone(outcome) : null;
  }

  async transitionPending(analysisId: string, update: TerminalOutcomeUpdate) {
    const current = this.outcomes.get(analysisId);
    if (!current || current.evaluationStatus !== 'PENDING' || update.evaluationStatus === 'PENDING' || !update.evaluatedAt) return null;
    const next: IntelligenceAnalysisOutcome = {
      ...current,
      ...structuredClone(update),
    };
    this.outcomes.set(analysisId, next);
    return structuredClone(next);
  }

  async listEligibleAnalyses(now: string, limit: number) {
    const nowMs = Date.parse(now);
    return [...this.analyses.values()]
      .filter(analysis => {
        const outcome = this.outcomes.get(analysis.result.analysisId);
        return !outcome || (outcome.evaluationStatus === 'PENDING' && Date.parse(outcome.evaluationWindow.endAt) <= nowMs);
      })
      .sort((left, right) => Date.parse(left.result.generatedAt) - Date.parse(right.result.generatedAt))
      .slice(0, Math.max(1, Math.min(limit, 100)))
      .map(analysis => structuredClone(analysis));
  }

  async getAccessibleAnalysis(analysisId: string, userId: string | null) {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) return null;
    if (!userId || analysis.result.scope !== 'PRIVATE' || analysis.userId !== userId) return null;
    return structuredClone(analysis);
  }

  async listTimeline(query: IntelligenceTimelineStoreQuery): Promise<IntelligenceTimelineStoreResult> {
    const from = query.from ? Date.parse(query.from) : Number.NEGATIVE_INFINITY;
    const to = query.to ? Date.parse(query.to) : Number.POSITIVE_INFINITY;
    const cursor = query.cursor ? Date.parse(query.cursor) : Number.POSITIVE_INFINITY;
    const rows = [...this.analyses.values()]
      .filter(analysis => analysis.result.asset.canonicalSymbol === query.asset.canonicalSymbol)
      .filter(analysis => analysis.result.asset.assetType === query.asset.assetType)
      .filter(analysis => analysis.result.horizon === query.horizon)
      .filter(analysis => Boolean(query.userId) && analysis.result.scope === 'PRIVATE' && analysis.userId === query.userId)
      .filter(analysis => {
        const at = Date.parse(analysis.result.generatedAt);
        return at >= from && at <= to && at < cursor;
      })
      .sort((left, right) => Date.parse(right.result.generatedAt) - Date.parse(left.result.generatedAt));
    const limit = Math.max(1, Math.min(query.limit, 50));
    const analyses = rows.slice(0, limit).map(analysis => structuredClone(analysis));
    const outcomes = new Map(analyses
      .map(analysis => [analysis.result.analysisId, this.outcomes.get(analysis.result.analysisId)] as const)
      .filter((entry): entry is [string, IntelligenceAnalysisOutcome] => Boolean(entry[1]))
      .map(([id, outcome]) => [id, structuredClone(outcome)]));
    return {
      analyses,
      outcomes,
      nextCursor: rows.length > limit ? analyses.at(-1)?.result.generatedAt ?? null : null,
    };
  }

  async listSharedOutcomesForReporting(limit: number) {
    const rows = [...this.outcomes.values()]
      .filter(outcome => outcome.scope === 'SHARED')
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    const boundedLimit = Math.max(1, Math.min(limit, 2_000));
    return {
      outcomes: rows.slice(0, boundedLimit).map(outcome => structuredClone(outcome)),
      truncated: rows.length > boundedLimit,
    };
  }

  allOutcomes() {
    return [...this.outcomes.values()].map(outcome => structuredClone(outcome));
  }
}
