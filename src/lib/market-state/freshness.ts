import { formatDateTime } from '@/lib/locale';
import type { Freshness, MarketCapabilityKey } from './types';

type ThresholdPair = { fresh: number; stale: number };

/**
 * Seconds. earnings/dividends/ipos/economic_calendar are pulled directly from the existing
 * TTL_MS constants in src/lib/trader/providers/providerStatus.ts (earnings/dividends/ipos = 3h,
 * economic = 1h) so this table can't silently drift from the real cache TTLs — see
 * marketStateFreshness.test.ts for the cross-check.
 */
export const FRESHNESS_THRESHOLDS_SECONDS: Record<MarketCapabilityKey, ThresholdPair> = {
  quotes: { fresh: 15, stale: 60 },
  gcc_markets: { fresh: 900, stale: 3600 },
  forex: { fresh: 15, stale: 60 },
  crypto: { fresh: 15, stale: 60 },
  commodities: { fresh: 60, stale: 300 },
  historical_prices: { fresh: 3600, stale: 86400 },
  technical_data: { fresh: 900, stale: 3600 },
  recommendations: { fresh: 900, stale: 3600 },
  profiles: { fresh: 86400, stale: 604800 },
  logos: { fresh: 604800, stale: 2592000 },
  news: { fresh: 300, stale: 1800 },
  earnings: { fresh: 10800, stale: 43200 },
  dividends: { fresh: 10800, stale: 43200 },
  ipos: { fresh: 10800, stale: 43200 },
  economic_calendar: { fresh: 3600, stale: 7200 },
  symbols: { fresh: 86400, stale: 604800 },
  shariah_financials: { fresh: 604800, stale: 2592000 },
};

function parseOverrides(): Partial<Record<MarketCapabilityKey, Partial<ThresholdPair>>> {
  const raw = process.env.MARKET_STATE_FRESHNESS_OVERRIDES_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    console.warn('[market-state] Ignoring invalid MARKET_STATE_FRESHNESS_OVERRIDES_JSON');
    return {};
  }
}

let cachedThresholds: Record<MarketCapabilityKey, ThresholdPair> | null = null;

export function getFreshnessThresholds(): Record<MarketCapabilityKey, ThresholdPair> {
  if (cachedThresholds) return cachedThresholds;
  const overrides = parseOverrides();
  const merged = { ...FRESHNESS_THRESHOLDS_SECONDS };
  for (const key of Object.keys(overrides) as MarketCapabilityKey[]) {
    const override = overrides[key];
    if (!override) continue;
    merged[key] = {
      fresh: typeof override.fresh === 'number' ? override.fresh : merged[key].fresh,
      stale: typeof override.stale === 'number' ? override.stale : merged[key].stale,
    };
  }
  cachedThresholds = merged;
  return merged;
}

export function computeFreshness(
  asOf: string | null,
  capability: MarketCapabilityKey,
  now: number = Date.now(),
): Freshness {
  const thresholds = getFreshnessThresholds()[capability];
  if (!asOf) {
    return { asOf: null, ageSeconds: null, isStale: true, isDelayed: false, thresholdSeconds: thresholds.stale };
  }
  const asOfMs = new Date(asOf).getTime();
  if (Number.isNaN(asOfMs)) {
    return { asOf, ageSeconds: null, isStale: true, isDelayed: false, thresholdSeconds: thresholds.stale };
  }
  const ageSeconds = Math.max(0, Math.round((now - asOfMs) / 1000));
  return {
    asOf,
    ageSeconds,
    isStale: ageSeconds > thresholds.stale,
    isDelayed: ageSeconds > thresholds.fresh,
    thresholdSeconds: thresholds.stale,
  };
}

export function formatFreshnessLabel(freshness: Freshness, locale?: string | null): string {
  if (!freshness.asOf) return '';
  return formatDateTime(freshness.asOf, locale);
}
