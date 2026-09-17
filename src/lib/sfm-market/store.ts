import { createHash } from 'node:crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { sfmRedistributionPolicy, type SfmRedistributionPolicy } from '@/lib/sfm-market/storePolicy';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

export const SFM_MARKET_OBSERVATIONS_TABLE = 'sfm_market_observations' as const;

export type SfmMarketObservationRow = {
  schema_version: string;
  engine_version: string;
  symbol: string;
  asset_type: string;
  market: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  observed_at: string | null;
  received_at: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previous_close: number | null;
  volume: number | null;
  quality_state: SfmMarketQuote['quality']['state'];
  quality_score: number;
  completeness_percent: number;
  freshness_seconds: number | null;
  missing_fields: string[];
  quality_reasons: string[];
  source_class: SfmMarketQuote['provenance']['sourceClass'];
  upstream_provider: string | null;
  upstream_provider_name: string | null;
  provider_symbol: string | null;
  delay_type: string | null;
  cached: boolean;
  cache_age_seconds: number | null;
  attempt_count: number;
  derived_fields: string[];
  redistribution_policy: SfmRedistributionPolicy;
  evidence_hash: string;
  provenance: SfmMarketQuote['provenance'];
};

export function sfmMarketEvidenceHash(quote: SfmMarketQuote) {
  const evidence = {
    schemaVersion: quote.schemaVersion,
    engineVersion: quote.engineVersion,
    symbol: quote.symbol,
    observedAt: quote.provenance.observedAt,
    receivedAt: quote.provenance.receivedAt,
    sourceClass: quote.provenance.sourceClass,
    upstreamProvider: quote.provenance.upstreamProvider,
    providerSymbol: quote.provenance.providerSymbol,
    delayType: quote.provenance.delayType,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    volume: quote.volume,
  };
  return createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
}

export function buildSfmMarketObservation(quote: SfmMarketQuote): SfmMarketObservationRow {
  return {
    schema_version: quote.schemaVersion,
    engine_version: quote.engineVersion,
    symbol: quote.symbol,
    asset_type: quote.assetType,
    market: quote.market,
    exchange: quote.exchange,
    country: quote.country,
    currency: quote.currency,
    observed_at: quote.provenance.observedAt,
    received_at: quote.provenance.receivedAt,
    price: quote.price,
    change: quote.change,
    change_percent: quote.changePercent,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previous_close: quote.previousClose,
    volume: quote.volume,
    quality_state: quote.quality.state,
    quality_score: quote.quality.score,
    completeness_percent: quote.quality.completenessPercent,
    freshness_seconds: quote.quality.freshnessSeconds,
    missing_fields: [...quote.quality.missingFields],
    quality_reasons: [...quote.quality.reasons],
    source_class: quote.provenance.sourceClass,
    upstream_provider: quote.provenance.upstreamProvider,
    upstream_provider_name: quote.provenance.upstreamProviderName,
    provider_symbol: quote.provenance.providerSymbol,
    delay_type: quote.provenance.delayType,
    cached: quote.provenance.cached,
    cache_age_seconds: quote.provenance.cacheAgeSeconds,
    attempt_count: quote.provenance.attemptCount,
    derived_fields: [...quote.provenance.derivedFields],
    redistribution_policy: sfmRedistributionPolicy(quote.provenance.sourceClass),
    evidence_hash: sfmMarketEvidenceHash(quote),
    provenance: { ...quote.provenance, derivedFields: [...quote.provenance.derivedFields] },
  };
}

export type PersistSfmMarketObservationResult = {
  ok: boolean;
  inserted: boolean;
  duplicate: boolean;
  reason: string | null;
  evidenceHash: string;
};

export async function persistSfmMarketQuoteObservation(quote: SfmMarketQuote): Promise<PersistSfmMarketObservationResult> {
  const row = buildSfmMarketObservation(quote);
  const admin = createServerSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      inserted: false,
      duplicate: false,
      reason: 'store_not_configured',
      evidenceHash: row.evidence_hash,
    };
  }

  try {
    const { error } = await admin.from(SFM_MARKET_OBSERVATIONS_TABLE).insert(row);
    if (!error) {
      return { ok: true, inserted: true, duplicate: false, reason: null, evidenceHash: row.evidence_hash };
    }
    if (error.code === '23505') {
      return { ok: true, inserted: false, duplicate: true, reason: 'duplicate_observation', evidenceHash: row.evidence_hash };
    }
    console.warn('[sfm-market-store] observation persistence skipped', { code: error.code, symbol: quote.symbol });
    return { ok: false, inserted: false, duplicate: false, reason: error.code || 'storage_error', evidenceHash: row.evidence_hash };
  } catch (error) {
    console.warn('[sfm-market-store] observation persistence failed', {
      symbol: quote.symbol,
      name: error instanceof Error ? error.name : 'unknown_error',
    });
    return { ok: false, inserted: false, duplicate: false, reason: 'storage_exception', evidenceHash: row.evidence_hash };
  }
}
