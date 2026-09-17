import 'server-only';

import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { SFM_MARKET_OBSERVATIONS_TABLE } from '@/lib/sfm-market/store';
import type { SfmMarketQualityState, SfmMarketSourceClass } from '@/lib/sfm-market/types';

export const SFM_OWNED_HISTORY_SOURCE = 'sfm_market_observations' as const;

export type SfmOwnedHistoryPoint = {
  observationKey: string;
  symbol: string;
  observedAt: string;
  receivedAt: string;
  price: number;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  currency: string | null;
  market: string | null;
  exchange: string | null;
  qualityState: Exclude<SfmMarketQualityState, 'unavailable'>;
  sourceClass: SfmMarketSourceClass;
  upstreamProvider: string;
  providerSymbol: string | null;
  delayType: string | null;
};

export type SfmOwnedHistoryResult = {
  configured: boolean;
  source: typeof SFM_OWNED_HISTORY_SOURCE;
  symbol: string;
  points: SfmOwnedHistoryPoint[];
  pointCount: number;
  externalFallbackUsed: false;
  generatedAt: string;
  error: string | null;
};

type StoredObservation = {
  observation_key?: unknown;
  symbol?: unknown;
  observed_at?: unknown;
  received_at?: unknown;
  price?: unknown;
  change?: unknown;
  change_percent?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  previous_close?: unknown;
  volume?: unknown;
  currency?: unknown;
  market?: unknown;
  exchange?: unknown;
  quality_state?: unknown;
  source_class?: unknown;
  upstream_provider?: unknown;
  provider_symbol?: unknown;
  delay_type?: unknown;
};

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function iso(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

const QUALITY_STATES = new Set(['complete', 'usable', 'partial', 'stale']);
const SOURCE_CLASSES = new Set(['primary_exchange', 'regulator', 'issuer', 'licensed_feed', 'aggregator', 'derived']);

export function normalizeSfmOwnedHistoryRows(rows: StoredObservation[]): SfmOwnedHistoryPoint[] {
  return rows.flatMap(row => {
    const observationKey = text(row.observation_key);
    const symbol = text(row.symbol)?.toUpperCase() ?? null;
    const observedAt = iso(row.observed_at);
    const receivedAt = iso(row.received_at);
    const price = finiteNumber(row.price);
    const upstreamProvider = text(row.upstream_provider);
    const qualityState = text(row.quality_state);
    const sourceClass = text(row.source_class);
    const volume = finiteNumber(row.volume);
    if (!observationKey || !symbol || !observedAt || !receivedAt || price === null || price <= 0 || !upstreamProvider) return [];
    if (!qualityState || !QUALITY_STATES.has(qualityState)) return [];
    if (!sourceClass || !SOURCE_CLASSES.has(sourceClass)) return [];
    if (volume !== null && volume < 0) return [];
    return [{
      observationKey,
      symbol,
      observedAt,
      receivedAt,
      price,
      change: finiteNumber(row.change),
      changePercent: finiteNumber(row.change_percent),
      open: finiteNumber(row.open),
      high: finiteNumber(row.high),
      low: finiteNumber(row.low),
      previousClose: finiteNumber(row.previous_close),
      volume,
      currency: text(row.currency),
      market: text(row.market),
      exchange: text(row.exchange),
      qualityState: qualityState as SfmOwnedHistoryPoint['qualityState'],
      sourceClass: sourceClass as SfmMarketSourceClass,
      upstreamProvider,
      providerSymbol: text(row.provider_symbol),
      delayType: text(row.delay_type),
    }];
  }).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

export async function readSfmOwnedHistory(
  symbolInput: string,
  options: { from?: string | null; to?: string | null; limit?: number } = {},
): Promise<SfmOwnedHistoryResult> {
  const symbol = String(symbolInput ?? '').trim().toUpperCase();
  const generatedAt = new Date().toISOString();
  const admin = createServerSupabaseAdmin();
  if (!admin) {
    return { configured: false, source: SFM_OWNED_HISTORY_SOURCE, symbol, points: [], pointCount: 0, externalFallbackUsed: false, generatedAt, error: 'history_store_not_configured' };
  }

  const limit = Math.max(1, Math.min(1000, Math.trunc(Number(options.limit) || 200)));
  try {
    let query = admin
      .from(SFM_MARKET_OBSERVATIONS_TABLE)
      .select('observation_key,symbol,observed_at,received_at,price,change,change_percent,open,high,low,previous_close,volume,currency,market,exchange,quality_state,source_class,upstream_provider,provider_symbol,delay_type')
      .eq('symbol', symbol)
      .order('observed_at', { ascending: false })
      .limit(limit);
    if (options.from) query = query.gte('observed_at', options.from);
    if (options.to) query = query.lte('observed_at', options.to);
    const { data, error } = await query;
    if (error) {
      console.warn('[sfm-owned-history] read failed', { symbol, code: error.code });
      return { configured: true, source: SFM_OWNED_HISTORY_SOURCE, symbol, points: [], pointCount: 0, externalFallbackUsed: false, generatedAt, error: error.code || 'database_error' };
    }
    const points = normalizeSfmOwnedHistoryRows((data ?? []) as StoredObservation[]);
    return { configured: true, source: SFM_OWNED_HISTORY_SOURCE, symbol, points, pointCount: points.length, externalFallbackUsed: false, generatedAt, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'database_error';
    console.warn('[sfm-owned-history] read exception', { symbol, message });
    return { configured: true, source: SFM_OWNED_HISTORY_SOURCE, symbol, points: [], pointCount: 0, externalFallbackUsed: false, generatedAt, error: message };
  }
}
