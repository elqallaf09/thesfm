import 'server-only';

import type {
  IntelligenceAnalysisOutcome,
  IntelligenceHistoricalPriceHistory,
  IntelligenceHistoricalPriceUnavailable,
  IntelligenceOutcomeWarning,
} from '@/domain/intelligence/outcomes';
import {
  calculateDirectionalReturn,
  calculateExcursions,
  classifyDirectionalOutcome,
  isEvaluationEligible,
  referencePointAfter,
  resolvePersistedOutcomePolicy,
} from '@/lib/intelligence/outcomePolicy';
import type { IntelligenceHistoricalPriceProvider } from '@/providers/intelligence/historicalPriceProvider';
import {
  isHistoricalPriceUnavailable,
  YahooIntelligenceHistoricalPriceProvider,
} from '@/providers/intelligence/historicalPriceProvider';
import type {
  IntelligenceOutcomeStore,
  StoredIntelligenceAnalysis,
  TerminalOutcomeUpdate,
} from './outcomeStore';
import { SupabaseIntelligenceOutcomeStore } from './outcomeStore';
import type { IntelligenceTelemetry } from './telemetry';

const HISTORY_PROVIDER_TIMEOUT_MS = 12_000;
const MAX_HISTORY_CACHE_AGE_SECONDS = 900;

export type OutcomeEvaluationRun = {
  scanned: number;
  eligible: number;
  evaluated: number;
  insufficientData: number;
  invalidated: number;
  failed: number;
  pending: number;
  duplicatesPrevented: number;
};

export type OutcomeEvaluationItemResult =
  | 'NOT_DUE'
  | 'EVALUATED'
  | 'INSUFFICIENT_DATA'
  | 'INVALIDATED'
  | 'FAILED'
  | 'PENDING_RETRY'
  | 'DUPLICATE_PREVENTED';

type OutcomeEvaluatorDependencies = {
  store: IntelligenceOutcomeStore;
  providers: IntelligenceHistoricalPriceProvider[];
  now: () => number;
  providerTimeoutMs: number;
};

const defaultDependencies: OutcomeEvaluatorDependencies = {
  store: new SupabaseIntelligenceOutcomeStore(),
  providers: [new YahooIntelligenceHistoricalPriceProvider()],
  now: Date.now,
  providerTimeoutMs: HISTORY_PROVIDER_TIMEOUT_MS,
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('HISTORY_PROVIDER_TIMEOUT')), timeoutMs);
    timeout.unref?.();
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function isoAt(milliseconds: number) {
  return new Date(milliseconds).toISOString();
}

function safeIso(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function normalizedCurrency(value: string | null | undefined) {
  const currency = value?.trim().toUpperCase() ?? null;
  return currency && /^[A-Z0-9]{3,8}$/.test(currency) ? currency : null;
}

function warning(code: string, severity: IntelligenceOutcomeWarning['severity'] = 'WARNING'): IntelligenceOutcomeWarning {
  return { code, severity };
}

function terminalUpdate(input: {
  status: Exclude<IntelligenceAnalysisOutcome['evaluationStatus'], 'PENDING'>;
  outcome?: IntelligenceAnalysisOutcome['outcome'];
  evaluatedAt: string;
  warnings: IntelligenceOutcomeWarning[];
  provider?: IntelligenceAnalysisOutcome['providerProvenance'];
  source?: string | null;
  priceDataAsOf?: string | null;
  priceDataReceivedAt?: string | null;
  entry?: { price: number; at: string; currency: string } | null;
  final?: { price: number; at: string; currency: string } | null;
  maximumFavorableExcursion?: number | null;
  maximumAdverseExcursion?: number | null;
  directionalReturn?: number | null;
}): TerminalOutcomeUpdate {
  return {
    evaluationStatus: input.status,
    entryReferencePrice: input.entry?.price ?? null,
    entryReferenceAt: input.entry?.at ?? null,
    entryCurrency: input.entry?.currency ?? null,
    finalReferencePrice: input.final?.price ?? null,
    finalReferenceAt: input.final?.at ?? null,
    finalCurrency: input.final?.currency ?? null,
    maximumFavorableExcursion: input.maximumFavorableExcursion ?? null,
    maximumAdverseExcursion: input.maximumAdverseExcursion ?? null,
    directionalReturn: input.directionalReturn ?? null,
    benchmarkReturn: null,
    outcome: input.outcome ?? 'NOT_APPLICABLE',
    evaluationDataSource: input.source ?? null,
    priceDataAsOf: input.priceDataAsOf ?? null,
    priceDataReceivedAt: input.priceDataReceivedAt ?? null,
    providerProvenance: input.provider ?? { selectedProvider: null, attempts: [], adjustedPrices: 'UNKNOWN' },
    warnings: input.warnings,
    evaluatedAt: input.evaluatedAt,
  };
}

function recordTerminalTelemetry(telemetry: IntelligenceTelemetry, outcome: IntelligenceAnalysisOutcome | null) {
  if (!outcome) {
    telemetry.record({ name: 'intelligence_outcome_duplicate_prevented' });
    return;
  }
  telemetry.record({ name: 'intelligence_outcome_persisted' });
  if (outcome.evaluationStatus === 'EVALUATED') telemetry.record({ name: 'intelligence_outcome_evaluation_succeeded' });
  if (outcome.evaluationStatus === 'INSUFFICIENT_DATA') telemetry.record({ name: 'intelligence_outcome_evaluation_unavailable' });
}

function outcomeProviderProvenance(
  history: IntelligenceHistoricalPriceHistory,
  priorUnavailable: IntelligenceHistoricalPriceUnavailable[] = [],
): IntelligenceAnalysisOutcome['providerProvenance'] {
  return {
    selectedProvider: history.provider,
    attempts: [...priorUnavailable.flatMap(item => item.attempts), ...history.attempts],
    adjustedPrices: history.adjustedPrices,
  };
}

function unavailableProviderProvenance(unavailable: IntelligenceHistoricalPriceUnavailable[]) {
  return {
    selectedProvider: unavailable.at(-1)?.provider ?? null,
    attempts: unavailable.flatMap(item => item.attempts),
    adjustedPrices: 'UNKNOWN' as const,
  };
}

function unavailableWarnings(unavailable: IntelligenceHistoricalPriceUnavailable[]) {
  const codes = new Set<string>();
  for (const item of unavailable) {
    codes.add(item.code);
    for (const code of item.warnings) codes.add(code);
  }
  return [...codes].map(code => warning(code, 'INFO'));
}

export class IntelligenceOutcomeEvaluator {
  constructor(private readonly dependencies: OutcomeEvaluatorDependencies = defaultDependencies) {}

  async evaluateEligible(input: { limit: number; telemetry: IntelligenceTelemetry }): Promise<OutcomeEvaluationRun> {
    const startedAt = this.dependencies.now();
    const candidates = await this.dependencies.store.listEligibleAnalyses(isoAt(startedAt), input.limit);
    const result: OutcomeEvaluationRun = {
      scanned: candidates.length,
      eligible: 0,
      evaluated: 0,
      insufficientData: 0,
      invalidated: 0,
      failed: 0,
      pending: 0,
      duplicatesPrevented: 0,
    };
    for (const analysis of candidates) {
      let item: OutcomeEvaluationItemResult;
      try {
        item = await this.evaluateOne(analysis, input.telemetry);
      } catch {
        // A malformed legacy snapshot or an unexpected adapter bug must not
        // prevent the cron batch from evaluating other eligible analyses.
        input.telemetry.record({
          name: 'intelligence_outcome_evaluation_unavailable',
          failureClass: 'outcome_evaluation_item_failed',
        });
        result.failed += 1;
        continue;
      }
      if (item === 'NOT_DUE') continue;
      result.eligible += 1;
      if (item === 'EVALUATED') result.evaluated += 1;
      if (item === 'INSUFFICIENT_DATA') result.insufficientData += 1;
      if (item === 'INVALIDATED') result.invalidated += 1;
      if (item === 'FAILED') result.failed += 1;
      if (item === 'PENDING_RETRY') result.pending += 1;
      if (item === 'DUPLICATE_PREVENTED') result.duplicatesPrevented += 1;
    }
    input.telemetry.record({ name: 'intelligence_outcome_evaluation_latency', value: this.dependencies.now() - startedAt });
    return result;
  }

  async evaluateOne(analysis: StoredIntelligenceAnalysis, telemetry: IntelligenceTelemetry): Promise<OutcomeEvaluationItemResult> {
    // Persist/load the immutable PENDING row before interpreting any policy
    // value. This locks the evaluation window and all policy inputs to the
    // analysis-time snapshot rather than today's configuration.
    let pending: IntelligenceAnalysisOutcome | null;
    try {
      pending = await this.dependencies.store.ensurePending(analysis);
    } catch {
      telemetry.record({ name: 'intelligence_outcome_evaluation_unavailable', failureClass: 'pending_outcome_creation_failed' });
      return 'PENDING_RETRY';
    }
    if (!pending) {
      telemetry.record({ name: 'intelligence_outcome_evaluation_unavailable', failureClass: 'outcome_persistence_unavailable' });
      return 'PENDING_RETRY';
    }
    if (pending.evaluationStatus !== 'PENDING') {
      telemetry.record({ name: 'intelligence_outcome_duplicate_prevented' });
      return 'DUPLICATE_PREVENTED';
    }

    const replay = resolvePersistedOutcomePolicy({
      horizon: pending.horizon,
      evaluationWindow: pending.evaluationWindow,
      methodologySnapshot: pending.methodologySnapshot,
    });
    if (!replay) {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'FAILED',
        evaluatedAt: isoAt(this.dependencies.now()),
        warnings: [warning('PERSISTED_OUTCOME_POLICY_SNAPSHOT_INVALID', 'CRITICAL')],
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'FAILED' : 'DUPLICATE_PREVENTED';
    }
    const { policy, window } = replay;
    if (!isEvaluationEligible(window, this.dependencies.now())) return 'NOT_DUE';
    telemetry.record({ name: 'intelligence_outcome_eligible_analysis_found' });

    const evaluatedAt = isoAt(this.dependencies.now());
    if (analysis.result.recommendation === 'INSUFFICIENT_DATA' || analysis.result.status === 'FAILED') {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INVALIDATED',
        evaluatedAt,
        warnings: [warning('ORIGINAL_ANALYSIS_HAD_INSUFFICIENT_EVIDENCE')],
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INVALIDATED' : 'DUPLICATE_PREVENTED';
    }

    const finalBoundary = Date.parse(window.endAt) + window.finalToleranceSeconds * 1000;
    const historyRequest = {
      asset: analysis.result.asset,
      horizon: analysis.result.horizon,
      from: window.startAt,
      to: isoAt(finalBoundary),
      policy,
    };
    const providers = this.dependencies.providers.filter(provider => provider.supports(analysis.result.asset));
    if (!providers.length) {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [warning('HISTORICAL_PRICE_PROVIDER_UNSUPPORTED')],
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }

    let history: IntelligenceHistoricalPriceHistory | null = null;
    const permanentUnavailable: IntelligenceHistoricalPriceUnavailable[] = [];
    let retryableProviderFailure = false;
    for (const provider of providers) {
      telemetry.record({ name: 'intelligence_outcome_provider_history_requested', provider: provider.id });
      try {
        const response = await withTimeout(provider.getHistory(historyRequest), this.dependencies.providerTimeoutMs);
        if (!response) {
          retryableProviderFailure = true;
          telemetry.record({ name: 'intelligence_provider_failed', provider: provider.id, failureClass: 'history_response_missing' });
          continue;
        }
        if (isHistoricalPriceUnavailable(response)) {
          telemetry.record({
            name: 'intelligence_provider_failed',
            provider: response.provider,
            failureClass: response.availability === 'PERMANENT' ? 'history_permanently_unavailable' : 'history_retryable_unavailable',
          });
          if (response.availability === 'PERMANENT') permanentUnavailable.push(response);
          else retryableProviderFailure = true;
          continue;
        }
        history = response;
        break;
      } catch (error) {
        retryableProviderFailure = true;
        telemetry.record({
          name: 'intelligence_provider_failed',
          provider: provider.id,
          failureClass: error instanceof Error && error.message === 'HISTORY_PROVIDER_TIMEOUT' ? 'timeout' : 'history_request_failed',
        });
      }
    }
    if (!history) {
      // A transport outage is retried from PENDING; permanent absence is only
      // terminal when every supported provider was definitive and none was
      // retryable. Continue through fallbacks before making that distinction.
      if (retryableProviderFailure || !permanentUnavailable.length) {
        telemetry.record({ name: 'intelligence_outcome_evaluation_unavailable', failureClass: 'history_provider_unavailable' });
        return 'PENDING_RETRY';
      }
      const provenance = unavailableProviderProvenance(permanentUnavailable);
      telemetry.record({ name: 'intelligence_outcome_evaluation_unavailable', failureClass: 'history_provider_unavailable' });
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [
          ...unavailableWarnings(permanentUnavailable),
          warning('HISTORICAL_PRICE_HISTORY_PERMANENTLY_UNAVAILABLE'),
        ],
        provider: provenance,
        source: provenance.selectedProvider,
        priceDataReceivedAt: safeIso(permanentUnavailable.at(-1)?.receivedAt),
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }

    const provider = outcomeProviderProvenance(history, permanentUnavailable);
    if (history.deliveryState === 'UNAVAILABLE' || history.points.length === 0) {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [...history.warnings.map(code => warning(code, 'INFO')), warning('HISTORICAL_PRICE_HISTORY_NOT_COVERED')],
        provider,
        source: history.provider,
        priceDataAsOf: safeIso(history.dataAsOf),
        priceDataReceivedAt: safeIso(history.receivedAt),
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }
    if (history.deliveryState === 'CACHED'
      && (history.cacheAgeSeconds === null || history.cacheAgeSeconds > MAX_HISTORY_CACHE_AGE_SECONDS)) {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [...history.warnings.map(code => warning(code, 'INFO')), warning('HISTORICAL_PRICE_CACHE_TOO_STALE')],
        provider,
        source: history.provider,
        priceDataAsOf: safeIso(history.dataAsOf),
        priceDataReceivedAt: safeIso(history.receivedAt),
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }

    const historyCurrency = normalizedCurrency(history.currency);
    const analysisCurrency = normalizedCurrency(analysis.result.asset.quoteCurrency);
    if (!historyCurrency || (analysisCurrency && historyCurrency !== analysisCurrency)) {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [
          ...history.warnings.map(code => warning(code, 'INFO')),
          warning(historyCurrency ? 'HISTORICAL_PRICE_CURRENCY_MISMATCH' : 'HISTORICAL_PRICE_CURRENCY_UNAVAILABLE'),
        ],
        provider,
        source: history.provider,
        priceDataAsOf: safeIso(history.dataAsOf),
        priceDataReceivedAt: safeIso(history.receivedAt),
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }

    if ((analysis.result.asset.assetType === 'STOCK' || analysis.result.asset.assetType === 'FUND')
      && window.interval === '1d' && history.adjustedPrices !== 'VERIFIED') {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [...history.warnings.map(code => warning(code, 'INFO')), warning('ADJUSTED_HISTORY_REQUIRED_FOR_CORPORATE_ACTION_INTEGRITY')],
        provider,
        source: history.provider,
        priceDataAsOf: safeIso(history.dataAsOf),
        priceDataReceivedAt: safeIso(history.receivedAt),
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }

    const entry = referencePointAfter(history.points, window.startAt, window.entryToleranceSeconds);
    const final = referencePointAfter(history.points, window.endAt, window.finalToleranceSeconds);
    if (!entry || !final) {
      const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
        status: 'INSUFFICIENT_DATA',
        evaluatedAt,
        warnings: [
          ...history.warnings.map(code => warning(code, 'INFO')),
          warning(!entry ? 'ENTRY_REFERENCE_PRICE_UNAVAILABLE' : 'FINAL_REFERENCE_PRICE_UNAVAILABLE'),
        ],
        provider,
        source: history.provider,
        priceDataAsOf: safeIso(history.dataAsOf),
        priceDataReceivedAt: safeIso(history.receivedAt),
      }));
      recordTerminalTelemetry(telemetry, persisted);
      return persisted ? 'INSUFFICIENT_DATA' : 'DUPLICATE_PREVENTED';
    }

    const directionalReturn = calculateDirectionalReturn(analysis.result.recommendation, entry.close, final.close);
    const outcome = classifyDirectionalOutcome({
      recommendation: analysis.result.recommendation,
      assetType: analysis.result.asset.assetType,
      directionalReturn,
      neutralBandPercent: policy.neutralBandPercent,
    });
    const intervalPoints = history.points.filter(point => {
      const at = Date.parse(point.at);
      return at >= Date.parse(entry.at) && at <= Date.parse(final.at);
    });
    const excursions = calculateExcursions({
      recommendation: analysis.result.recommendation,
      entryPrice: entry.close,
      points: intervalPoints,
    });
    const warnings = [
      ...history.warnings.map(code => warning(code, 'INFO')),
      ...(analysis.result.recommendation === 'WAIT' ? [warning('WAIT_EXCLUDED_FROM_DIRECTIONAL_ACCURACY', 'INFO')] : []),
      ...(!excursions.complete ? [warning('MFE_MAE_UNAVAILABLE_FOR_PRICE_SERIES', 'INFO')] : []),
      ...(history.deliveryState !== 'LIVE' ? [warning(`HISTORICAL_PRICE_${history.deliveryState}`, 'INFO')] : []),
    ];
    const persisted = await this.dependencies.store.transitionPending(analysis.result.analysisId, terminalUpdate({
      status: 'EVALUATED',
      evaluatedAt,
      warnings,
      provider,
      source: history.provider,
      priceDataAsOf: safeIso(history.dataAsOf),
      priceDataReceivedAt: safeIso(history.receivedAt),
      entry: { price: entry.close, at: entry.at, currency: historyCurrency },
      final: { price: final.close, at: final.at, currency: historyCurrency },
      maximumFavorableExcursion: excursions.maximumFavorableExcursion,
      maximumAdverseExcursion: excursions.maximumAdverseExcursion,
      directionalReturn,
      outcome,
    }));
    recordTerminalTelemetry(telemetry, persisted);
    return persisted ? 'EVALUATED' : 'DUPLICATE_PREVENTED';
  }
}

export function createIntelligenceOutcomeEvaluator(
  dependencies: Partial<OutcomeEvaluatorDependencies> = {},
) {
  return new IntelligenceOutcomeEvaluator({ ...defaultDependencies, ...dependencies });
}

export const intelligenceOutcomeEvaluator = createIntelligenceOutcomeEvaluator();
