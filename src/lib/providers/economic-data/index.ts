import 'server-only';

import {
  cleanEnv,
  ECONOMIC_INDICATOR_IDS,
  newestIsoDate,
  safeProviderLog,
  toCycleIndicator,
} from './common';
import { fredProvider } from './fred';
import { tradingEconomicsProvider } from './trading-economics';
import type {
  EconomicCalendarQuery,
  EconomicCycleIndicatorsResponse,
  EconomicDataCalendarEvent,
  EconomicDataProvider,
  EconomicDataProviderName,
  EconomicDataProviderStatus,
  MacroIndicator,
  MacroIndicatorId,
} from './types';

const MACRO_CACHE_TTL_MS = 30 * 60 * 1000;
const CALENDAR_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

let lastFetchStatus: string | null = null;
let lastFetchTime: string | null = null;

function cacheKey(scope: string, payload: unknown) {
  return `${scope}:${JSON.stringify(payload)}`;
}

async function cached<T>(key: string, ttlMs: number, force: boolean | undefined, loader: () => Promise<T>): Promise<T> {
  if (!force) {
    const cachedValue = cache.get(key) as CacheEntry<T> | undefined;
    if (cachedValue && cachedValue.expiresAt > Date.now()) return cachedValue.data;

    const pending = inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const promise = loader()
    .then(data => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

function selectProvider(): EconomicDataProvider | null {
  const tradingEconomicsKey = cleanEnv(process.env.TRADING_ECONOMICS_API_KEY);
  const fredKey = cleanEnv(process.env.FRED_API_KEY);

  if (tradingEconomicsKey) return tradingEconomicsProvider;
  if (fredKey) return fredProvider;
  return null;
}

function providerLabel(provider: EconomicDataProviderName | null) {
  if (provider === 'tradingeconomics') return 'Trading Economics';
  if (provider === 'fred') return 'FRED';
  return null;
}

function developmentHint(message: string) {
  return process.env.NODE_ENV === 'production' ? undefined : message;
}

export async function getMacroIndicator(
  country: string,
  indicator: MacroIndicatorId,
  options: { force?: boolean } = {},
): Promise<MacroIndicator | null> {
  const provider = selectProvider();
  if (!provider) return null;

  const key = cacheKey('macro-indicator', {
    provider: provider.name,
    country,
    indicator,
  });

  return cached(key, MACRO_CACHE_TTL_MS, options.force, () =>
    provider.getMacroIndicator({ country, indicator, force: options.force }),
  );
}

export async function getEconomicCalendar(
  query: EconomicCalendarQuery,
): Promise<{ provider: EconomicDataProviderName | null; data: EconomicDataCalendarEvent[] }> {
  const provider = selectProvider();
  if (!provider) return { provider: null, data: [] };

  const key = cacheKey('economic-calendar', {
    provider: provider.name,
    from: query.from,
    to: query.to,
    country: query.country ?? '',
    currency: query.currency ?? '',
    impact: query.impact ?? '',
  });

  try {
    const data = await cached(key, CALENDAR_CACHE_TTL_MS, query.force, () => provider.getEconomicCalendar(query));
    lastFetchStatus = 'success';
    lastFetchTime = new Date().toISOString();
    return { provider: provider.name, data };
  } catch (error) {
    lastFetchStatus = error instanceof Error ? error.message : 'unknown_error';
    lastFetchTime = new Date().toISOString();
    safeProviderLog('[economic-data] economic calendar fetch failed', {
      provider: provider.name,
      status: lastFetchStatus,
    });
    return { provider: provider.name, data: [] };
  }
}

export async function getEconomicCycleIndicators(options: {
  country?: string;
  force?: boolean;
} = {}): Promise<EconomicCycleIndicatorsResponse> {
  const provider = selectProvider();

  if (!provider) {
    return {
      ok: true,
      status: 'empty',
      source: null,
      updated_at: null,
      indicators: [],
      devHint: developmentHint('Configure TRADING_ECONOMICS_API_KEY or FRED_API_KEY to enable macroeconomic indicators.'),
    };
  }

  const country = options.country?.trim() || 'United States';
  const key = cacheKey('economic-cycle', {
    provider: provider.name,
    country,
  });

  try {
    const indicators = await cached(key, MACRO_CACHE_TTL_MS, options.force, async () => {
      const results = await Promise.allSettled(
        ECONOMIC_INDICATOR_IDS.map(indicator =>
          provider.getMacroIndicator({ country, indicator, force: options.force }),
        ),
      );

      return results
        .map((result, index) => {
          if (result.status === 'fulfilled') return result.value;
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[economic-data] macro indicator failed', {
              provider: provider.name,
              country,
              indicator: ECONOMIC_INDICATOR_IDS[index],
              error: result.reason instanceof Error ? result.reason.message : 'unknown',
            });
          }
          return null;
        })
        .filter((indicator): indicator is MacroIndicator => Boolean(indicator))
        .map(toCycleIndicator);
    });

    lastFetchStatus = indicators.length ? 'success' : 'empty';
    lastFetchTime = new Date().toISOString();

    if (indicators.length === 0) {
      return {
        ok: true,
        status: 'empty',
        source: providerLabel(provider.name),
        updated_at: null,
        indicators: [],
        devHint: developmentHint('The configured economic data provider returned no usable cycle indicators.'),
      };
    }

    return {
      ok: true,
      status: 'available',
      source: providerLabel(provider.name),
      updated_at: newestIsoDate(indicators.map(indicator => indicator.date)),
      indicators,
    };
  } catch (error) {
    lastFetchStatus = error instanceof Error ? error.message : 'unknown_error';
    lastFetchTime = new Date().toISOString();
    safeProviderLog('[economic-data] macro indicator fetch failed', {
      provider: provider.name,
      country,
      status: lastFetchStatus,
    });
    return {
      ok: false,
      status: 'error',
      source: providerLabel(provider.name),
      updated_at: null,
      indicators: [],
      devHint: developmentHint('Economic-cycle indicator request failed. Check provider credentials and server logs.'),
    };
  }
}

export function getEconomicDataProviderStatus(): EconomicDataProviderStatus {
  const provider = selectProvider();
  return {
    provider: provider?.name ?? null,
    configured: Boolean(provider),
    status: provider ? 'available' : 'not_configured',
    lastFetchStatus,
    lastFetchTime,
  };
}

export type {
  EconomicCalendarQuery,
  EconomicCycleIndicatorsResponse,
  EconomicDataCalendarEvent,
  EconomicDataProviderName,
  EconomicDataProviderStatus,
  EconomicIndicatorChange,
  EconomicIndicatorStatus,
  MacroIndicator,
  MacroIndicatorId,
} from './types';
