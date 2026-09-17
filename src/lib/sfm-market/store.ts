import 'server-only';

import { createHash } from 'node:crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

export const SFM_MARKET_OBSERVATIONS_TABLE = 'sfm_market_observations' as const;

export type SfmMarketObservationRow = {
  observation_key: string;
  schema_version: string;
  engine_version: string;
  symbol: string;
  asset_type: string;
  market: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  price: number;
  change: number | null;
  change_percent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previous_close: number | null;
  volume: number | null;
  quality_state: Exclude<SfmMarketQuote['quality']['state'], 'unavailable'>;
  quality_score: number;
  completeness_percent: number;
  source_class: SfmMarketQuote['provenance']['sourceClass'];
  upstream_provider: string;
  upstream_provider_name: string | null;
  provider_symbol: string | null;
  observed_at: string;
  received_at: string;
  delay_type: string | null;
  cached: boolean;
  cache_age_seconds: number | null;
  provenance: SfmMarketQuote['provenance'];
};

export type SfmMarketObservationPersistResult =
  | { stored: true; observationKey: string }
  | { stored: false; reason: 'not_persistable' | 'not_configured' | 'database_error'; observationKey?: string; error?: string };

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validIso(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function canonicalObservationIdentity(quote: SfmMarketQuote) {
  return {
    schemaVersion: quote.schemaVersion,
    engineVersion: quote.engineVersion,
    symbol: quote.symbol,
    assetType: quote.assetType,
    market: quote.market,
    exchange: quote.exchange,
    country: quote.country,
    currency: quote.currency,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    volume: quote.volume,
    sourceClass: quote.provenance.sourceClass,
    upstreamProvider: quote.provenance.upstreamProvider,
    providerSymbol: quote.provenance.providerSymbol,
    observedAt: quote.provenance.observedAt,
    delayType: quote.provenance.delayType,
  };
}

/**
 * Stable identity for one upstream observation. `receivedAt`, cache age and
 * request-attempt counters are deliberately excluded so repeated requests for
 * the same observed market fact deduplicate instead of creating fake history.
 */
export function sfmMarketObservationKey(quote: SfmMarketQuote) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalObservationIdentity(quote)))
    .digest('hex');
}

/**
 * Converts only trustworthy observed market facts into a persistence row.
 * We never substitute the SFM receive time for a missing provider observation
 * timestamp, and we never persist an unavailable/non-positive quote.
 */
export function toSfmMarketObservationRow(quote: SfmMarketQuote): SfmMarketObservationRow | null {
  const price = finiteNumber(quote.price);
  const observedAt = validIso(quote.provenance.observedAt);
  const receivedAt = validIso(quote.provenance.receivedAt);
  const provider = String(quote.provenance.upstreamProvider ?? '').trim();
  if (price === null || price <= 0 || !observedAt || !receivedAt || !provider) return null;
  if (quote.quality.state === 'unavailable') return null;

  const volume = finiteNumber(quote.volume);
  if (volume !== null && volume < 0) return null;

  return {
    observation_key: sfmMarketObservationKey(quote),
    schema_version: quote.schemaVersion,
    engine_version: quote.engineVersion,
    symbol: quote.symbol,
    asset_type: quote.assetType,
    market: quote.market,
    exchange: quote.exchange,
    country: quote.country,
    currency: quote.currency,
    price,
    change: finiteNumber(quote.change),
    change_percent: finiteNumber(quote.changePercent),
    open: finiteNumber(quote.open),
    high: finiteNumber(quote.high),
    low: finiteNumber(quote.low),
    previous_close: finiteNumber(quote.previousClose),
    volume,
    quality_state: quote.quality.state,
    quality_score: Math.max(0, Math.min(100, Math.round(quote.quality.score))),
    completeness_percent: Math.max(0, Math.min(100, Math.round(quote.quality.completenessPercent))),
    source_class: quote.provenance.sourceClass,
    upstream_provider: provider,
    upstream_provider_name: quote.provenance.upstreamProviderName,
    provider_symbol: quote.provenance.providerSymbol,
    observed_at: observedAt,
    received_at: receivedAt,
    delay_type: quote.provenance.delayType,
    cached: quote.provenance.cached,
    cache_age_seconds: finiteNumber(quote.provenance.cacheAgeSeconds),
    provenance: quote.provenance,
  };
}

export async function persistSfmMarketObservation(quote: SfmMarketQuote): Promise<SfmMarketObservationPersistResult> {
  const row = toSfmMarketObservationRow(quote);
  if (!row) return { stored: false, reason: 'not_persistable' };

  const admin = createServerSupabaseAdmin();
  if (!admin) return { stored: false, reason: 'not_configured', observationKey: row.observation_key };

  try {
    const { error } = await admin
      .from(SFM_MARKET_OBSERVATIONS_TABLE)
      .upsert(row, { onConflict: 'observation_key', ignoreDuplicates: true });
    if (error) {
      console.warn('[sfm-market-store] observation persistence failed', {
        symbol: quote.symbol,
        provider: quote.provenance.upstreamProvider,
        code: error.code,
      });
      return { stored: false, reason: 'database_error', observationKey: row.observation_key, error: error.code || error.message };
    }
    return { stored: true, observationKey: row.observation_key };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.warn('[sfm-market-store] observation persistence exception', { symbol: quote.symbol, message });
    return { stored: false, reason: 'database_error', observationKey: row.observation_key, error: message };
  }
}
