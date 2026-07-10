import { cleanEnv } from '@/lib/market/providerConfig';
import { getFmpRuntimeStatus } from '@/lib/trader/providers/fmpRuntime';
import { normalizeProviderConnectionStatus } from './normalizeStatus';
import type {
  MarketCapabilityKey,
  MarketProviderId,
  ProviderAttempt,
  ProviderConnectionStatus,
  ProviderPriorityContext,
  ProviderResolution,
} from './types';

/**
 * Declarative priority per (capability, context) — this is metadata surfaced in the envelope for
 * transparency/audit, NOT a dispatcher. The actual fetch order used by each underlying module is
 * untouched by this refactor. Two contexts exist because two real, conflicting, test-guaranteed
 * fetch orders already exist in the codebase for "quotes":
 *  - general mirrors marketDataProviders.ts's `marketDataProviders` array order (TwelveData first,
 *    Yahoo strictly last — enforced by marketDataProviders.test.ts).
 *  - trader_terminal mirrors marketQuotes.ts's `DEFAULT_QUOTE_PROVIDER_PRIORITY` (FMP first).
 */
export const PROVIDER_PRIORITY: Partial<Record<MarketCapabilityKey, Partial<Record<ProviderPriorityContext, MarketProviderId[]>>>> = {
  quotes: {
    general: ['twelvedata', 'finnhub', 'eodhd', 'marketstack', 'yahoo'],
    trader_terminal: ['fmp', 'yahoo', 'finnhub'],
  },
  historical_prices: {
    general: ['twelvedata', 'eodhd', 'yahoo'],
    trader_terminal: ['fmp', 'yahoo'],
  },
  profiles: {
    general: ['twelvedata', 'eodhd', 'yahoo'],
    trader_terminal: ['fmp'],
  },
  logos: {
    general: ['twelvedata', 'eodhd', 'yahoo'],
    trader_terminal: ['fmp'],
  },
  technical_data: { trader_terminal: ['fmp', 'yahoo'] },
  recommendations: { trader_terminal: ['fmp', 'yahoo'] },
  symbols: { general: ['fmp'] },
  earnings: { general: ['fmp', 'finnhub'] },
  dividends: { general: ['fmp', 'finnhub'] },
  ipos: { general: ['fmp'] },
  economic_calendar: { general: ['tradingeconomics', 'fmp', 'finnhub'] },
  news: { general: ['rss', 'finnhub', 'newsapi'] },
  forex: { general: ['twelvedata', 'eodhd', 'yahoo'] },
  crypto: { general: ['twelvedata', 'eodhd', 'yahoo'] },
  commodities: { general: ['eodhd', 'twelvedata', 'yahoo'] },
  gcc_markets: { general: ['twelvedata', 'eodhd', 'yahoo'] },
  shariah_financials: { general: ['fmp'] },
};

export function priorityListFor(capability: MarketCapabilityKey, context: ProviderPriorityContext): MarketProviderId[] {
  const byCapability = PROVIDER_PRIORITY[capability];
  return byCapability?.[context] ?? byCapability?.general ?? [];
}

/**
 * Maps marketDataProviders.ts's `MarketDataProviderName` ('twelve_data') onto our canonical
 * MarketProviderId ('twelvedata') — the two vocabularies differ only for Twelve Data.
 */
export function normalizeMarketDataProviderName(name: string): MarketProviderId | null {
  if (name === 'twelve_data') return 'twelvedata';
  if (MARKET_PROVIDER_ID_SET.has(name as MarketProviderId)) return name as MarketProviderId;
  return null;
}

const MARKET_PROVIDER_ID_SET = new Set<MarketProviderId>(['fmp', 'twelvedata', 'eodhd', 'finnhub', 'marketstack', 'yahoo', 'tradingeconomics', 'newsapi', 'rss']);

export type ProviderHealthLike = { provider: string; configured: boolean; status: string };

/**
 * Cheap, non-network status for a single provider. FMP and Trading Economics use their existing
 * lightweight in-memory trackers (no network call). The other quote/data providers default to a
 * configured-key check (cheap) unless live `healthResults` (from marketDataProviders.ts's
 * healthCheck(), which does issue real network probes) are explicitly supplied by the caller —
 * callers should only fetch those when a live probe was actually requested (forceFresh), to keep
 * this aggregation cheap on the hot path.
 */
export function getProviderCapabilityStatus(
  provider: MarketProviderId,
  options: { fmpCacheAvailable?: boolean; healthResults?: ProviderHealthLike[] } = {},
): ProviderConnectionStatus {
  if (provider === 'fmp') {
    const fmpConfigured = Boolean(cleanEnv(process.env.FMP_API_KEY));
    const status = getFmpRuntimeStatus(fmpConfigured, options.fmpCacheAvailable ?? false);
    return normalizeProviderConnectionStatus({
      configured: status.configured,
      healthy: status.healthy,
      rateLimited: status.rateLimited,
      status: status.status,
    });
  }

  if (provider === 'tradingeconomics') {
    return normalizeProviderConnectionStatus({ configured: Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)) });
  }

  const liveResult = options.healthResults?.find(result => normalizeMarketDataProviderName(result.provider) === provider);
  if (liveResult) {
    return normalizeProviderConnectionStatus({ configured: liveResult.configured, status: liveResult.status });
  }

  if (provider === 'yahoo') return 'connected'; // Yahoo requires no API key/configuration in this codebase
  if (provider === 'rss') return 'connected'; // RSS sources require no API key

  const envKeyByProvider: Partial<Record<MarketProviderId, string | undefined>> = {
    twelvedata: process.env.TWELVE_DATA_API_KEY,
    eodhd: process.env.EODHD_API_KEY,
    finnhub: process.env.FINNHUB_API_KEY,
    marketstack: process.env.MARKETSTACK_API_KEY,
    newsapi: process.env.NEWS_API_KEY,
  };
  const configured = Boolean(cleanEnv(envKeyByProvider[provider]));
  return normalizeProviderConnectionStatus({ configured, status: configured ? 'healthy' : 'not_configured' });
}

export function resolveProviderForCapability(
  capability: MarketCapabilityKey,
  context: ProviderPriorityContext,
  statusLookup: (provider: MarketProviderId) => ProviderConnectionStatus,
): ProviderResolution {
  const list = priorityListFor(capability, context);
  const attempted: ProviderAttempt[] = [];
  let selected: MarketProviderId | null = null;

  for (const provider of list) {
    const status = statusLookup(provider);
    if (status === 'connected' || status === 'degraded') {
      attempted.push({ provider, outcome: 'success', reason: null });
      selected = provider;
      break;
    }
    attempted.push({ provider, outcome: 'failed', reason: status });
  }

  return {
    selected,
    attempted,
    fallbackUsed: attempted.filter(item => item.outcome === 'failed').length > 0,
    reason: selected ? null : 'ALL_PROVIDERS_UNAVAILABLE',
    context,
    timestamp: new Date().toISOString(),
    cached: false,
    delayed: false,
  };
}
