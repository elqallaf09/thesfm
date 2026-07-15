import type { MarketSystemState } from '@/lib/market-state/types';

export type MarketCommandDataHealthState =
  | 'loading'
  | 'ready'
  | 'partial'
  | 'stale'
  | 'unavailable'
  | 'providerError'
  | 'configurationRequired';

type ResolveMarketCommandDataHealthInput = {
  isLoading: boolean;
  hasRequestError: boolean;
  isStale: boolean;
  system: MarketSystemState | null;
};

export function resolveMarketCommandDataHealth({
  isLoading,
  hasRequestError,
  isStale,
  system,
}: ResolveMarketCommandDataHealthInput): MarketCommandDataHealthState {
  if (isLoading) return 'loading';
  if (hasRequestError && !system) return 'providerError';
  if (!system) return 'unavailable';

  const configuredProviders = system.providerProfiles.filter(provider => provider.configured);
  if (system.overall === 'misconfigured' || configuredProviders.length === 0) {
    return 'configurationRequired';
  }

  if (system.overall === 'disconnected') return 'providerError';
  if (system.overall === 'disabled' || system.overall === 'unsupported' || system.overall === 'unknown') {
    return 'unavailable';
  }
  if (!system.lastSynchronizedAt || system.delivery?.source === 'unavailable') return 'unavailable';

  if (
    system.overall === 'degraded'
    || system.overall === 'rate_limited'
    || system.featuresDegraded.length > 0
    || system.featuresFailed.length > 0
    || system.delivery?.source === 'persistent_cache'
    || system.delivery?.delayed === true
  ) {
    return 'partial';
  }

  if (isStale) return 'stale';
  return 'ready';
}
