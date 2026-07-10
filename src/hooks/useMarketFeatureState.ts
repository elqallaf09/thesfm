'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { MarketFeatureEnvelope } from '@/lib/market-state/types';
import { getOrCreateFetchStore } from '@/lib/market-state/sharedFetchStore';
import {
  beginRetry,
  cancelRetry,
  completeRetryFailure,
  completeRetrySuccess,
  computeNextRetryState,
  INITIAL_RETRY_STATE,
  type RetryState,
} from '@/lib/market-state/retryCoordinator';

async function fetchEnvelope<T>(url: string, signal: AbortSignal): Promise<MarketFeatureEnvelope<T>> {
  const response = await fetch(url, { signal });
  return (await response.json()) as MarketFeatureEnvelope<T>;
}

/**
 * Generic per-feature version of useMarketSystemState: any market-data-consuming component (news,
 * earnings, dividends, IPOs, calendar, heatmap, ...) calls this instead of hand-rolling its own
 * loading/error/retry useState triplet. Wraps retryCoordinator.ts so the caller gets attempt
 * number, cooldown, and "can retry" state without reimplementing backoff logic.
 */
export function useMarketFeatureState<T>(feature: string, url: string, options: { pollMs?: number; enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const store = useMemo(() => getOrCreateFetchStore<MarketFeatureEnvelope<T>>(url, (signal) => fetchEnvelope<T>(url, signal)), [url]);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [retryState, setRetryState] = useState<RetryState>(INITIAL_RETRY_STATE);

  useEffect(() => {
    if (!enabled) return undefined;
    void store.fetch();

    if (!options.pollMs) return undefined;
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void store.fetch();
    }, options.pollMs);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url]);

  const retry = useCallback(async () => {
    const now = Date.now();
    const knownCooldownUntil = retryState.cooldownUntil;
    const next = computeNextRetryState(retryState, now, { knownCooldownUntil });
    if (!next.canRetry) return;

    setRetryState(beginRetry(retryState));
    try {
      await store.fetch({ force: true });
      const latest = store.getState();
      if (latest.status === 'error') {
        setRetryState(current => completeRetryFailure(current, latest.error ?? 'unknown_error'));
      } else {
        setRetryState(completeRetrySuccess());
      }
    } catch {
      setRetryState(current => completeRetryFailure(current, 'unknown_error'));
    }
  }, [retryState, store]);

  const cancel = useCallback(() => {
    setRetryState(current => cancelRetry(current));
  }, []);

  return {
    envelope: state.data,
    status: state.status,
    error: state.error,
    retry,
    cancel,
    retryState,
    feature,
  };
}
