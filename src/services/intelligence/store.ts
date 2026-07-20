import type {
  AnalysisResult,
  CanonicalAssetIdentity,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { intelligenceCacheRecordKey, intelligenceCacheScopeKey } from '@/lib/intelligence/cache';
import { pendingOutcomeInsertRow } from './outcomeStore';

export type LatestAnalysisQuery = {
  asset: CanonicalAssetIdentity;
  horizon: IntelligenceHorizon;
  userId: string | null;
};

export interface IntelligenceAnalysisStore {
  getLatest(query: LatestAnalysisQuery): Promise<AnalysisResult | null>;
  save(result: AnalysisResult, userId: string | null): Promise<boolean>;
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Partial<AnalysisResult>;
  return typeof result.analysisId === 'string'
    && typeof result.generatedAt === 'string'
    && typeof result.asset?.canonicalSymbol === 'string'
    && Array.isArray(result.factors)
    && ['BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA'].includes(String(result.recommendation));
}

/**
 * Immutable rows from the first intelligence release predate the explicit
 * quote/target/persistence fields. Keep them readable without representing a
 * missing value as a current market value or target.
 */
function normalizeStoredAnalysis(value: unknown): AnalysisResult | null {
  if (!isAnalysisResult(value)) return null;
  const result = value as AnalysisResult & Partial<Pick<AnalysisResult, 'marketPrice' | 'targets' | 'persistenceStatus'>>;
  const currency = result.asset.quoteCurrency;
  const marketPrice = result.marketPrice && typeof result.marketPrice === 'object' && 'available' in result.marketPrice
    ? result.marketPrice
    : { available: false as const, value: null, currency, method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' as const };
  const targets = result.targets && typeof result.targets === 'object' && 'available' in result.targets && !Array.isArray(result.targets)
    ? result.targets
    : {
      available: false as const,
      lower: null,
      upper: null,
      currency,
      source: null,
      dataAsOf: null,
      method: null,
      reasonCode: 'CALCULATION_NOT_SUPPORTED' as const,
    };
  return {
    ...result,
    marketPrice,
    targets,
    persistenceStatus: result.persistenceStatus ?? 'PERSISTED',
  };
}

export class SupabaseIntelligenceAnalysisStore implements IntelligenceAnalysisStore {
  async getLatest(query: LatestAnalysisQuery): Promise<AnalysisResult | null> {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const scopes = query.userId
      ? [
        intelligenceCacheScopeKey({ asset: query.asset, horizon: query.horizon, scope: 'PRIVATE', userId: query.userId }),
        intelligenceCacheScopeKey({ asset: query.asset, horizon: query.horizon, scope: 'SHARED', userId: null }),
      ]
      : [intelligenceCacheScopeKey({ asset: query.asset, horizon: query.horizon, scope: 'SHARED', userId: null })];
    for (const cacheScopeKey of scopes) {
      const { data, error } = await admin
        .from('intelligence_analyses')
        .select('result_snapshot')
        .eq('cache_scope_key', cacheScopeKey)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[intelligence-store] latest lookup skipped', { code: error.code });
        return null;
      }
      const snapshot = (data as { result_snapshot?: unknown } | null)?.result_snapshot;
      const normalized = normalizeStoredAnalysis(snapshot);
      if (normalized) return normalized;
    }
    return null;
  }

  async save(result: AnalysisResult, userId: string | null): Promise<boolean> {
    const admin = createServerSupabaseAdmin();
    if (!admin) return false;
    const privateScope = result.scope === 'PRIVATE';
    if (privateScope && !userId) return false;

    const row = {
      id: result.analysisId,
      user_id: privateScope ? userId : null,
      scope: result.scope.toLowerCase(),
      canonical_symbol: result.asset.canonicalSymbol,
      provider_symbol: result.asset.providerSymbol,
      display_symbol: result.asset.displaySymbol,
      asset_name: result.asset.name,
      asset_type: result.asset.assetType,
      exchange: result.asset.exchange,
      market: result.asset.market,
      quote_currency: result.asset.quoteCurrency,
      recommendation: result.recommendation,
      confidence: result.confidence,
      confidence_quality: result.confidenceQuality,
      risk: result.risk,
      horizon: result.horizon,
      generated_at: result.generatedAt,
      data_as_of: result.dataAsOf,
      expires_at: result.expiresAt,
      freshness_state: result.freshness.state,
      factor_snapshot: result.factors,
      provider_provenance: result.providerProvenance,
      warnings: result.warnings,
      data_completeness: result.dataCompleteness,
      conflict_status: result.conflictStatus,
      engine_version: result.engineVersion,
      rules_version: result.rulesVersion,
      weighting_version: result.weightingVersion,
      previous_analysis_id: result.previousAnalysis?.analysisId ?? null,
      status: result.status.toLowerCase(),
      request_source: result.requestSource.toLowerCase(),
      result_snapshot: result,
      cache_scope_key: intelligenceCacheScopeKey({ asset: result.asset, horizon: result.horizon, scope: result.scope, userId: privateScope ? userId : null }),
      cache_key: intelligenceCacheRecordKey(result, privateScope ? userId : null),
    };
    const { error } = await admin.from('intelligence_analyses').insert(row);
    if (error) {
      console.warn('[intelligence-store] persistence skipped', { code: error.code });
      return false;
    }
    // Outcomes begin as an immutable PENDING record so the scheduled evaluator
    // can safely transition them exactly once. The analysis itself remains usable
    // if Preview has not yet applied the forward-only outcome migration.
    const { error: outcomeError } = await admin
      .from('intelligence_analysis_outcomes')
      .insert(pendingOutcomeInsertRow({
        result,
        userId: privateScope ? userId : null,
        createdAt: result.generatedAt,
      }));
    if (outcomeError && outcomeError.code !== '23505' && process.env.NODE_ENV !== 'production') {
      console.warn('[intelligence-store] pending outcome initialization skipped', { code: outcomeError.code });
    }
    return true;
  }
}

export class MemoryIntelligenceAnalysisStore implements IntelligenceAnalysisStore {
  private readonly rows: Array<{ result: AnalysisResult; userId: string | null }> = [];

  async getLatest(query: LatestAnalysisQuery) {
    const scopes = query.userId
      ? [
        intelligenceCacheScopeKey({ asset: query.asset, horizon: query.horizon, scope: 'PRIVATE', userId: query.userId }),
        intelligenceCacheScopeKey({ asset: query.asset, horizon: query.horizon, scope: 'SHARED', userId: null }),
      ]
      : [intelligenceCacheScopeKey({ asset: query.asset, horizon: query.horizon, scope: 'SHARED', userId: null })];
    for (const scope of scopes) {
      const row = this.rows
        .filter(candidate => intelligenceCacheScopeKey({
          asset: candidate.result.asset,
          horizon: candidate.result.horizon,
          scope: candidate.result.scope,
          userId: candidate.result.scope === 'PRIVATE' ? candidate.userId : null,
        }) === scope)
        .sort((left, right) => Date.parse(right.result.generatedAt) - Date.parse(left.result.generatedAt))[0];
      if (row) return structuredClone(row.result);
    }
    return null;
  }

  async save(result: AnalysisResult, userId: string | null) {
    if (result.scope === 'PRIVATE' && !userId) return false;
    this.rows.push({ result: structuredClone(result), userId: result.scope === 'PRIVATE' ? userId : null });
    return true;
  }

  all() {
    return structuredClone(this.rows.map(row => row.result));
  }
}
