import type {
  AnalysisResult,
  CanonicalAssetIdentity,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
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

export class SupabaseIntelligenceAnalysisStore implements IntelligenceAnalysisStore {
  async getLatest(query: LatestAnalysisQuery): Promise<AnalysisResult | null> {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;

    let builder = admin
      .from('intelligence_analyses')
      .select('result_snapshot')
      .eq('canonical_symbol', query.asset.canonicalSymbol)
      .eq('asset_type', query.asset.assetType)
      .eq('horizon', query.horizon);

    builder = query.userId
      ? builder.or(`scope.eq.shared,and(scope.eq.private,user_id.eq.${query.userId})`)
      : builder.eq('scope', 'shared');

    const { data, error } = await builder
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      if (error && process.env.NODE_ENV !== 'production') {
        console.warn('[intelligence-store] latest lookup skipped', { code: error.code });
      }
      return null;
    }
    const snapshot = (data as { result_snapshot?: unknown }).result_snapshot;
    return isAnalysisResult(snapshot) ? snapshot : null;
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
    return this.rows
      .filter(row => row.result.asset.canonicalSymbol === query.asset.canonicalSymbol)
      .filter(row => row.result.asset.assetType === query.asset.assetType)
      .filter(row => row.result.horizon === query.horizon)
      .filter(row => row.result.scope === 'SHARED' || (
        row.result.scope === 'PRIVATE' && Boolean(query.userId && row.userId === query.userId)
      ))
      .sort((left, right) => Date.parse(right.result.generatedAt) - Date.parse(left.result.generatedAt))[0]?.result ?? null;
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
