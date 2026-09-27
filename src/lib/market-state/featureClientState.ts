import type { FetchStoreState } from './sharedFetchStore';
import type { FeatureDataStatus, MarketFeatureEnvelope } from './types';

/**
 * The browser-facing companion to a market feature envelope. It preserves the
 * last usable envelope during a refresh, but makes the refresh lifecycle explicit
 * so a screen never replaces good data with a full-page spinner or loses a failure.
 */
export type MarketFeatureClientState<T> = {
  envelope: MarketFeatureEnvelope<T> | null;
  status: FeatureDataStatus;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshError: string | null;
  isRetryable: boolean;
};

export function deriveMarketFeatureClientState<T>(
  state: FetchStoreState<MarketFeatureEnvelope<T>>,
): MarketFeatureClientState<T> {
  const envelope = state.data;
  const hasEnvelope = envelope !== null;
  const isLoading = state.status === 'loading' && !hasEnvelope;
  const isRefreshing = state.status === 'loading' && hasEnvelope;
  const refreshError = state.status === 'error' && hasEnvelope ? state.error : null;

  // A transport failure before an envelope exists is an error. Once a prior envelope exists,
  // retain its truthful data state (fresh/stale/partial/etc.) and expose the refresh failure
  // separately so the UI can keep the data visible and still offer a retry.
  const status: FeatureDataStatus = isLoading
    ? 'loading'
    : state.status === 'error' && !hasEnvelope
      ? 'error'
      : envelope?.status ?? 'idle';

  return {
    envelope,
    status,
    isLoading,
    isRefreshing,
    refreshError,
    isRetryable: status === 'error' || status === 'unavailable' || refreshError !== null,
  };
}
