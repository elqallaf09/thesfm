import { randomUUID } from 'node:crypto';
import type {
  AnalysisRequest,
  AnalysisResult,
  CanonicalAssetIdentity,
  FactorResult,
  IntelligenceFactorKey,
  IntelligenceProvider,
  IntelligenceWarning,
  ProviderAttempt,
  VerifiedIntelligenceSnapshot,
} from '@/domain/intelligence/contracts';
import { calculateDeterministicConfidence } from '@/lib/intelligence/confidence';
import {
  getIntelligenceMethodologyConfig,
  INTELLIGENCE_ENGINE_VERSION,
  INTELLIGENCE_RULES_VERSION,
  INTELLIGENCE_WEIGHTING_VERSION,
  modulesRequiredForSafeAnalysis,
} from '@/lib/intelligence/config';
import { buildStructuredExplanation } from '@/lib/intelligence/explainability';
import { runIntelligenceFactors } from '@/lib/intelligence/factors';
import { calculateFreshness, expirationFrom, freshnessThresholdSeconds } from '@/lib/intelligence/freshness';
import { determineRecommendation } from '@/lib/intelligence/recommendation';
import { ExistingMarketDataIntelligenceProvider } from '@/providers/intelligence/existingMarketDataProvider';
import { resolveCanonicalIntelligenceAsset } from './assetResolver';
import { asIntelligenceError, IntelligenceError } from './errors';
import {
  SupabaseIntelligenceAnalysisStore,
  type IntelligenceAnalysisStore,
} from './store';
import type { IntelligenceTelemetry } from './telemetry';

const PROVIDER_TIMEOUT_MS = 20_000;

type OrchestratorDependencies = {
  providers: IntelligenceProvider[];
  store: IntelligenceAnalysisStore;
  resolveAsset: typeof resolveCanonicalIntelligenceAsset;
  now: () => number;
  createId: () => string;
  providerTimeoutMs: number;
};

type CacheEntry = { result: AnalysisResult; expiresAt: number };

const defaultDependencies: OrchestratorDependencies = {
  providers: [new ExistingMarketDataIntelligenceProvider()],
  store: new SupabaseIntelligenceAnalysisStore(),
  resolveAsset: resolveCanonicalIntelligenceAsset,
  now: Date.now,
  createId: randomUUID,
  providerTimeoutMs: PROVIDER_TIMEOUT_MS,
};

function cacheKey(request: AnalysisRequest, asset: CanonicalAssetIdentity, modules: IntelligenceFactorKey[]) {
  return [
    asset.assetType,
    asset.canonicalSymbol,
    request.horizon,
    [...modules].sort().join(','),
    INTELLIGENCE_WEIGHTING_VERSION,
  ].join(':');
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new IntelligenceError('PROVIDER_TIMEOUT', true)), timeoutMs);
    timeout.unref?.();
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function unavailablePriceContext(currency: string | null): AnalysisResult['entryContext'] {
  return {
    available: false,
    value: null,
    currency,
    method: null,
    reasonCode: 'CALCULATION_NOT_SUPPORTED',
  };
}

function failureFactors(
  modules: IntelligenceFactorKey[],
  required: IntelligenceFactorKey[],
  thresholdSeconds: number,
): FactorResult[] {
  return modules.map(factor => ({
    factor,
    availability: 'UNAVAILABLE',
    normalizedScore: null,
    directionalBias: 'UNAVAILABLE',
    strength: 0,
    required: required.includes(factor),
    freshness: { state: 'UNAVAILABLE', observedAt: null, ageSeconds: null, thresholdSeconds },
    evidence: [],
    source: 'unavailable',
    provider: 'unavailable',
    operationalReliability: 0,
    warnings: [{
      code: 'PROVIDER_DATA_UNAVAILABLE',
      severity: 'WARNING',
      factor,
      detailKey: 'intelligence_warning_provider_unavailable',
    }],
    failureReason: 'PROVIDER_DATA_UNAVAILABLE',
  }));
}

function warningsFromFactors(factors: FactorResult[], extra: IntelligenceWarning[] = []) {
  const unique = new Map<string, IntelligenceWarning>();
  for (const warning of [...factors.flatMap(factor => factor.warnings), ...extra]) {
    unique.set(`${warning.code}:${warning.factor ?? ''}`, warning);
  }
  return [...unique.values()];
}

function previousSummary(previous: AnalysisResult | null, nextRecommendation: AnalysisResult['recommendation'], nextConfidence: number) {
  if (!previous) return null;
  const changeReasonCode = previous.recommendation !== nextRecommendation
    ? 'RECOMMENDATION_CHANGED'
    : Math.abs(previous.confidence - nextConfidence) >= 10
      ? 'CONFIDENCE_CHANGED'
      : 'NO_MATERIAL_CHANGE';
  return {
    analysisId: previous.analysisId,
    recommendation: previous.recommendation,
    confidence: previous.confidence,
    generatedAt: previous.generatedAt,
    changeReasonCode,
  };
}

export class IntelligenceOrchestrator {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<AnalysisResult>>();

  constructor(private readonly dependencies: OrchestratorDependencies = defaultDependencies) {}

  async latest(request: AnalysisRequest) {
    const asset = await this.dependencies.resolveAsset(request.asset);
    const key = `${asset.assetType}:${asset.canonicalSymbol}:${request.horizon}`;
    const memory = [...this.cache.values()]
      .map(entry => entry.result)
      .filter(result => `${result.asset.assetType}:${result.asset.canonicalSymbol}:${result.horizon}` === key)
      .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))[0];
    return memory ?? this.dependencies.store.getLatest({ asset, horizon: request.horizon, userId: request.userId });
  }

  async analyze(request: AnalysisRequest, telemetry: IntelligenceTelemetry): Promise<AnalysisResult> {
    const startedAt = this.dependencies.now();
    telemetry.record({ name: 'intelligence_analysis_requested' });
    const asset = await this.dependencies.resolveAsset(request.asset);
    const config = getIntelligenceMethodologyConfig(asset.assetType, request.horizon);
    const requested = request.requestedModules.length > 0 ? request.requestedModules : [
      'TECHNICAL', 'FUNDAMENTAL', 'SENTIMENT', 'NEWS', 'MACRO',
      'MOMENTUM', 'LIQUIDITY', 'VOLATILITY', 'RISK', 'SHARIA',
    ] satisfies IntelligenceFactorKey[];
    const modules = modulesRequiredForSafeAnalysis(requested, config);
    const key = cacheKey(request, asset, modules);
    const now = this.dependencies.now();

    if (!request.forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > now && !cached.result.staleData) {
        telemetry.record({ name: 'intelligence_cache_hit', cacheStatus: 'hit' });
        telemetry.record({ name: 'intelligence_end_to_end_latency', value: this.dependencies.now() - startedAt });
        await telemetry.flush();
        return { ...structuredClone(cached.result), correlationId: request.correlationId };
      }
      telemetry.record({ name: 'intelligence_cache_miss', cacheStatus: 'miss' });

      const stored = await this.dependencies.store.getLatest({ asset, horizon: request.horizon, userId: request.userId });
      if (stored && Date.parse(stored.expiresAt) > now && !stored.staleData) {
        this.cache.set(key, { result: stored, expiresAt: Date.parse(stored.expiresAt) });
        telemetry.record({ name: 'intelligence_cache_hit', cacheStatus: 'hit' });
        telemetry.record({ name: 'intelligence_end_to_end_latency', value: this.dependencies.now() - startedAt });
        await telemetry.flush();
        return { ...structuredClone(stored), correlationId: request.correlationId };
      }
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      telemetry.record({ name: 'intelligence_request_deduplicated', cacheStatus: 'hit' });
      const result = await existing;
      telemetry.record({ name: 'intelligence_end_to_end_latency', value: this.dependencies.now() - startedAt });
      await telemetry.flush();
      return { ...structuredClone(result), correlationId: request.correlationId };
    }

    const task = this.generate(request, asset, modules, telemetry);
    this.inFlight.set(key, task);
    try {
      const result = await task;
      this.cache.set(key, { result, expiresAt: Date.parse(result.expiresAt) });
      telemetry.record({ name: 'intelligence_end_to_end_latency', value: this.dependencies.now() - startedAt });
      await telemetry.flush();
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async generate(
    request: AnalysisRequest,
    asset: CanonicalAssetIdentity,
    modules: IntelligenceFactorKey[],
    telemetry: IntelligenceTelemetry,
  ): Promise<AnalysisResult> {
    const config = getIntelligenceMethodologyConfig(asset.assetType, request.horizon);
    const previous = await this.dependencies.store.getLatest({ asset, horizon: request.horizon, userId: request.userId });
    const attempts: ProviderAttempt[] = [];
    let snapshot: VerifiedIntelligenceSnapshot | null = null;

    const supportedProviders = this.dependencies.providers.filter(provider => provider.supports(asset));
    if (supportedProviders.length === 0) throw new IntelligenceError('UNSUPPORTED_ASSET', false);

    for (let index = 0; index < supportedProviders.length; index += 1) {
      const provider = supportedProviders[index];
      const providerStartedAt = this.dependencies.now();
      telemetry.record({ name: 'intelligence_provider_called', provider: provider.id });
      try {
        snapshot = await withTimeout(provider.getSnapshot(request, asset), this.dependencies.providerTimeoutMs);
        if (index > 0 && !snapshot.fallbackUsed) {
          snapshot = {
            ...snapshot,
            fallbackUsed: true,
            providerAttempts: snapshot.providerAttempts.map(attempt => ({ ...attempt, fallbackUsed: true })),
          };
        }
        attempts.push(...snapshot.providerAttempts);
        if (index > 0 || snapshot.fallbackUsed) {
          telemetry.record({ name: 'intelligence_provider_fallback_used', provider: snapshot.provider, fallbackUsed: true });
        }
        break;
      } catch (error) {
        const mapped = asIntelligenceError(error);
        attempts.push({
          provider: provider.id,
          capability: 'ANALYSIS_SNAPSHOT',
          status: 'FAILED',
          code: mapped.code,
          latencyMs: Math.max(0, this.dependencies.now() - providerStartedAt),
          fallbackUsed: index > 0,
          dataAsOf: null,
        });
        telemetry.record({
          name: 'intelligence_provider_failed',
          provider: provider.id,
          failureClass: mapped.code,
          fallbackUsed: index > 0,
        });
        if (!mapped.retryable) throw mapped;
      }
    }

    const generatedAt = new Date(this.dependencies.now()).toISOString();
    const thresholdSeconds = freshnessThresholdSeconds({ assetType: asset.assetType, horizon: request.horizon });
    let factors: FactorResult[];
    let dataAsOf: string | null;
    let selectedAsset = asset;
    let providerProvenance: AnalysisResult['providerProvenance'];
    const extraWarnings: IntelligenceWarning[] = [];

    if (snapshot) {
      selectedAsset = snapshot.asset;
      dataAsOf = snapshot.dataAsOf;
      factors = runIntelligenceFactors({ request, snapshot, config, now: this.dependencies.now() }, modules);
      providerProvenance = {
        selectedProvider: snapshot.provider,
        attempts,
        fallbackUsed: snapshot.fallbackUsed || attempts.some(attempt => attempt.fallbackUsed),
        dataKinds: ['QUOTE', 'HISTORICAL_PRICES', ...(snapshot.fundamentals ? ['FUNDAMENTALS'] : [])],
      };
    } else {
      dataAsOf = previous?.dataAsOf ?? null;
      if (previous) {
        factors = previous.factors.map(factor => ({
          ...structuredClone(factor),
          freshness: { ...factor.freshness, state: 'STALE' as const },
          warnings: [...factor.warnings, {
            code: 'STALE_REFRESH_FALLBACK',
            severity: 'WARNING' as const,
            factor: factor.factor,
            detailKey: 'intelligence_warning_stale_refresh_fallback',
          }],
        }));
        extraWarnings.push({
          code: 'LIVE_REFRESH_FAILED_STALE_RESULT',
          severity: 'CRITICAL',
          factor: null,
          detailKey: 'intelligence_warning_live_refresh_failed',
        });
        telemetry.record({ name: 'intelligence_cache_hit', cacheStatus: 'stale' });
      } else {
        factors = failureFactors(modules, config.requiredFactors, thresholdSeconds);
        extraWarnings.push({
          code: 'ALL_PROVIDERS_UNAVAILABLE',
          severity: 'CRITICAL',
          factor: null,
          detailKey: 'intelligence_warning_all_providers_unavailable',
        });
      }
      providerProvenance = {
        selectedProvider: null,
        attempts,
        fallbackUsed: Boolean(previous),
        dataKinds: previous ? previous.providerProvenance.dataKinds : [],
      };
    }

    for (const factor of factors.filter(item => item.availability === 'UNAVAILABLE')) {
      telemetry.record({ name: 'intelligence_factor_unavailable', failureClass: factor.failureReason, count: 1, supportState: 'unsupported' });
    }

    const confidence = calculateDeterministicConfidence(factors, config);
    telemetry.record({ name: 'intelligence_confidence_calculated', value: confidence.confidence });
    const recommendation = determineRecommendation({
      factors,
      config,
      confidence: confidence.confidence,
      confidenceQuality: confidence.quality,
      conflictStatus: confidence.conflictStatus,
      compositeScore: confidence.compositeScore,
      minimumEvidenceMet: confidence.calculation.minimumEvidenceMet,
    });
    telemetry.record({ name: 'intelligence_recommendation_generated', value: Math.abs(confidence.compositeScore) });
    if (recommendation.recommendation === 'INSUFFICIENT_DATA') {
      telemetry.record({ name: 'intelligence_insufficient_data_result' });
    }

    const explanation = buildStructuredExplanation({
      factors,
      config,
      recommendation: recommendation.recommendation,
      recommendationReasonCode: recommendation.decision.reasonCode,
      risk: recommendation.risk,
      confidencePenalties: confidence.calculation.penalties,
    });
    const calculatedOverallFreshness = calculateFreshness({
      observedAt: dataAsOf,
      thresholdSeconds,
      providerState: snapshot?.dataStatus ?? (previous ? 'CACHED' : 'UNAVAILABLE'),
      now: this.dependencies.now(),
    });
    const overallFreshness = !snapshot && previous
      ? { ...calculatedOverallFreshness, state: 'STALE' as const }
      : calculatedOverallFreshness;
    const status: AnalysisResult['status'] = recommendation.recommendation === 'INSUFFICIENT_DATA'
      ? 'INSUFFICIENT_DATA'
      : factors.some(factor => factor.availability !== 'AVAILABLE') || overallFreshness.state !== 'FRESH'
        ? 'PARTIAL'
        : 'COMPLETE';
    const warnings = warningsFromFactors(factors, extraWarnings);
    const result: AnalysisResult = {
      analysisId: this.dependencies.createId(),
      correlationId: request.correlationId,
      status,
      scope: 'SHARED',
      requestSource: request.source,
      asset: selectedAsset,
      generatedAt,
      dataAsOf,
      expiresAt: expirationFrom(generatedAt, snapshot ? thresholdSeconds : 0),
      freshness: overallFreshness,
      recommendation: recommendation.recommendation,
      confidence: confidence.confidence,
      confidenceQuality: confidence.quality,
      confidenceCalculation: confidence.calculation,
      risk: recommendation.risk,
      horizon: request.horizon,
      entryContext: unavailablePriceContext(selectedAsset.quoteCurrency),
      targets: [],
      stopLossContext: unavailablePriceContext(selectedAsset.quoteCurrency),
      factors,
      evidence: factors.flatMap(factor => factor.evidence),
      warnings,
      limitations: explanation.limitationCodes,
      providerProvenance,
      engineVersion: INTELLIGENCE_ENGINE_VERSION,
      rulesVersion: INTELLIGENCE_RULES_VERSION,
      weightingVersion: INTELLIGENCE_WEIGHTING_VERSION,
      dataCompleteness: confidence.completeness,
      staleData: overallFreshness.state === 'STALE' || Boolean(!snapshot && previous),
      conflictStatus: confidence.conflictStatus,
      explanation,
      recommendationDecision: recommendation.decision,
      previousAnalysis: previousSummary(previous, recommendation.recommendation, confidence.confidence),
    };

    const persisted = await this.dependencies.store.save(result, request.userId);
    if (persisted) telemetry.record({ name: 'intelligence_analysis_persisted' });
    return result;
  }
}

export function createIntelligenceOrchestrator(
  dependencies: Partial<OrchestratorDependencies> = {},
) {
  return new IntelligenceOrchestrator({ ...defaultDependencies, ...dependencies });
}

export const intelligenceOrchestrator = createIntelligenceOrchestrator();
