import 'server-only';

import { createHash } from 'node:crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

export const SFM_MARKET_OBSERVATIONS_TABLE = 'sfm_market_observations' as const;
export type SfmDistributionScope = 'internal_only' | 'external_allowed';

export type SfmMarketObservationRecord = {
  fingerprint: string;
  symbol: string;
  asset_type: SfmMarketQuote['assetType'];
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
  distribution_scope: SfmDistributionScope;
  source_url: string | null;
  schema_version: string;
  engine_version: string;
};

function nullableFinite(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedIso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function sfmMarketStoreEnabled() {
  return String(process.env.SFM_MARKET_STORE_ENABLED ?? '').trim().toLowerCase() === 'true';
}

export function sfmObservationFingerprint(quote: SfmMarketQuote) {
  const stable = {
    schemaVersion: quote.schemaVersion,
    symbol: quote.symbol,
    observedAt: normalizedIso(quote.provenance.observedAt),
    sourceClass: quote.provenance.sourceClass,
    upstreamProvider: quote.provenance.upstreamProvider,
    providerSymbol: quote.provenance.providerSymbol,
    price: nullableFinite(quote.price),
    previousClose: nullableFinite(quote.previousClose),
    volume: nullableFinite(quote.volume),
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export function toSfmMarketObservationRecord(
  quote: SfmMarketQuote,
  options: { distributionScope?: SfmDistributionScope; sourceUrl?: string | null } = {},
): SfmMarketObservationRecord {
  return {
    fingerprint: sfmObservationFingerprint(quote),
    symbol: quote.symbol,
    asset_type: quote.assetType,
    market: quote.market,
    exchange: quote.exchange,
    country: quote.country,
    currency: quote.currency,
    observed_at: normalizedIso(quote.provenance.observedAt),
    received_at: normalizedIso(quote.provenance.receivedAt) ?? new Date().toISOString(),
    price: nullableFinite(quote.price),
    change: nullableFinite(quote.change),
    change_percent: nullableFinite(quote.changePercent),
    open: nullableFinite(quote.open),
    high: nullableFinite(quote.high),
    low: nullableFinite(quote.low),
    previous_close: nullableFinite(quote.previousClose),
    volume: nullableFinite(quote.volume),
    quality_state: quote.quality.state,
    quality_score: Math.max(0, Math.min(100, Math.round(quote.quality.score))),
    completeness_percent: Math.max(0, Math.min(100, Math.round(quote.quality.completenessPercent))),
    freshness_seconds: nullableFinite(quote.quality.freshnessSeconds),
    missing_fields: [...quote.quality.missingFields],
    quality_reasons: [...quote.quality.reasons],
    source_class: quote.provenance.sourceClass,
    upstream_provider: quote.provenance.upstreamProvider,
    upstream_provider_name: quote.provenance.upstreamProviderName,
    provider_symbol: quote.provenance.providerSymbol,
    delay_type: quote.provenance.delayType,
    cached: quote.provenance.cached,
    cache_age_seconds: nullableFinite(quote.provenance.cacheAgeSeconds),
    attempt_count: Math.max(0, Math.trunc(quote.provenance.attemptCount)),
    derived_fields: [...quote.provenance.derivedFields],
    distribution_scope: options.distributionScope ?? 'internal_only',
    source_url: options.sourceUrl?.trim() || null,
    schema_version: quote.schemaVersion,
    engine_version: quote.engineVersion,
  };
}

export type PersistSfmMarketObservationResult =
  | { ok: true; stored: true; fingerprint: string }
  | { ok: true; stored: false; fingerprint: string; reason: 'disabled' | 'client_unavailable' }
  | { ok: false; stored: false; fingerprint: string; reason: 'database_error'; code: string | null };

export async function persistSfmMarketObservation(
  quote: SfmMarketQuote,
  options: {
    enabled?: boolean;
    distributionScope?: SfmDistributionScope;
    sourceUrl?: string | null;
    client?: ReturnType<typeof createServerSupabaseAdmin>;
  } = {},
): Promise<PersistSfmMarketObservationResult> {
  const record = toSfmMarketObservationRecord(quote, options);
  const enabled = options.enabled ?? sfmMarketStoreEnabled();
  if (!enabled) return { ok: true, stored: false, fingerprint: record.fingerprint, reason: 'disabled' };

  const client = options.client === undefined ? createServerSupabaseAdmin() : options.client;
  if (!client) return { ok: true, stored: false, fingerprint: record.fingerprint, reason: 'client_unavailable' };

  const { error } = await client
    .from(SFM_MARKET_OBSERVATIONS_TABLE)
    .upsert(record, { onConflict: 'fingerprint', ignoreDuplicates: true });

  if (error) {
    console.error('[sfm-market-store] observation persistence failed', {
      code: typeof error.code === 'string' ? error.code : null,
      sourceClass: record.source_class,
      provider: record.upstream_provider,
    });
    return {
      ok: false,
      stored: false,
      fingerprint: record.fingerprint,
      reason: 'database_error',
      code: typeof error.code === 'string' ? error.code : null,
    };
  }

  return { ok: true, stored: true, fingerprint: record.fingerprint };
}
