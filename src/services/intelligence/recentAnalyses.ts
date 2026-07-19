import 'server-only';

import type {
  AnalysisStatus,
  ConfidenceQuality,
  FreshnessState,
  IntelligenceAssetType,
  IntelligenceHorizon,
  IntelligenceRecommendation,
  IntelligenceRisk,
} from '@/domain/intelligence/contracts';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

type RecordLike = Record<string, unknown>;

const ASSET_TYPES = new Set<IntelligenceAssetType>(['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND']);
const HORIZONS = new Set<IntelligenceHorizon>(['INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM']);
const RECOMMENDATIONS = new Set<IntelligenceRecommendation>(['BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA']);
const CONFIDENCE_QUALITIES = new Set<ConfidenceQuality>(['STRONG_EVIDENCE', 'MODERATE_EVIDENCE', 'LIMITED_EVIDENCE', 'INSUFFICIENT_EVIDENCE']);
const RISKS = new Set<IntelligenceRisk>(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'UNAVAILABLE']);
const FRESHNESS = new Set<FreshnessState>(['FRESH', 'DELAYED', 'STALE', 'UNAVAILABLE']);
const STATUSES = new Set<AnalysisStatus>(['COMPLETE', 'PARTIAL', 'INSUFFICIENT_DATA', 'FAILED']);

export type RecentIntelligenceAnalysis = {
  analysisId: string;
  scope: 'SHARED' | 'PRIVATE';
  asset: {
    canonicalSymbol: string;
    displaySymbol: string;
    name: string;
    assetType: IntelligenceAssetType;
    exchange: string | null;
    quoteCurrency: string | null;
  };
  recommendation: IntelligenceRecommendation;
  confidence: number;
  confidenceQuality: ConfidenceQuality;
  risk: IntelligenceRisk;
  horizon: IntelligenceHorizon;
  generatedAt: string;
  freshness: FreshnessState;
  status: AnalysisStatus;
};

export type RecentAnalysesResult =
  | { available: true; items: RecentIntelligenceAnalysis[] }
  | { available: false; items: [] };

function asRecord(value: unknown): RecordLike | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordLike : null;
}

function string(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
  const normalized = string(value).toUpperCase();
  return allowed.has(normalized as T) ? normalized as T : null;
}

function rowToSummary(value: unknown): RecentIntelligenceAnalysis | null {
  const row = asRecord(value);
  if (!row) return null;
  const analysisId = string(row.id);
  const canonicalSymbol = string(row.canonical_symbol);
  const displaySymbol = string(row.display_symbol);
  const name = string(row.asset_name);
  const assetType = enumValue(row.asset_type, ASSET_TYPES);
  const recommendation = enumValue(row.recommendation, RECOMMENDATIONS);
  const confidenceQuality = enumValue(row.confidence_quality, CONFIDENCE_QUALITIES);
  const risk = enumValue(row.risk, RISKS);
  const horizon = enumValue(row.horizon, HORIZONS);
  const freshness = enumValue(row.freshness_state, FRESHNESS);
  const status = enumValue(row.status, STATUSES);
  const scopeValue = string(row.scope).toUpperCase();
  const confidence = Number(row.confidence);
  const generatedAt = string(row.generated_at);
  if (!analysisId || !canonicalSymbol || !displaySymbol || !name || !assetType || !recommendation || !confidenceQuality || !risk || !horizon || !freshness || !status || !Number.isFinite(confidence) || !generatedAt || (scopeValue !== 'SHARED' && scopeValue !== 'PRIVATE')) return null;
  const scope: 'SHARED' | 'PRIVATE' = scopeValue;
  return {
    analysisId,
    scope,
    asset: {
      canonicalSymbol,
      displaySymbol,
      name,
      assetType,
      exchange: string(row.exchange) || null,
      quoteCurrency: string(row.quote_currency) || null,
    },
    recommendation,
    confidence,
    confidenceQuality,
    risk,
    horizon,
    generatedAt,
    freshness,
    status,
  };
}

/**
 * Returns only a fixed safe projection. Private rows are selected solely with
 * the authenticated server identity; user IDs and result snapshots never leave
 * this service.
 */
export async function listRecentAllowedIntelligenceAnalyses(userId: string | null, limit = 8): Promise<RecentAnalysesResult> {
  const admin = createServerSupabaseAdmin();
  if (!admin) return { available: false, items: [] };
  const boundedLimit = Math.max(1, Math.min(Math.floor(limit), 12));
  let query = admin
    .from('intelligence_analyses')
    .select('id,scope,canonical_symbol,display_symbol,asset_name,asset_type,exchange,quote_currency,recommendation,confidence,confidence_quality,risk,horizon,generated_at,freshness_state,status')
    .order('generated_at', { ascending: false })
    .limit(boundedLimit);
  query = userId
    ? query.or(`scope.eq.shared,and(scope.eq.private,user_id.eq.${userId})`)
    : query.eq('scope', 'shared');
  const { data, error } = await query;
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[intelligence-recent] lookup skipped', { code: error.code });
    return { available: false, items: [] };
  }
  return { available: true, items: (data ?? []).map(rowToSummary).filter((item): item is RecentIntelligenceAnalysis => item !== null) };
}
