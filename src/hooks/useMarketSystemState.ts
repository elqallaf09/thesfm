'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { MarketFeatureEnvelope, MarketSystemState } from '@/lib/market-state/types';
import { getOrCreateFetchStore } from '@/lib/market-state/sharedFetchStore';
import { normalizeFeatureDataStatus } from '@/lib/market-state/normalizeStatus';

const SYSTEM_STATE_URL = '/api/market-state/system';
const POLL_INTERVAL_MS = 60_000;
const MIN_REFETCH_INTERVAL_MS = 5_000;

async function fetchSystemState(signal: AbortSignal): Promise<MarketSystemState> {
  const response = await fetch(SYSTEM_STATE_URL, { signal });
  const envelope = (await response.json()) as MarketFeatureEnvelope<MarketSystemState>;
  return envelope.data;
}

const store = getOrCreateFetchStore(SYSTEM_STATE_URL, fetchSystemState, { minRefetchIntervalMs: MIN_REFETCH_INTERVAL_MS });

/**
 * Single system-wide market-state hook. Every component that calls this shares one underlying
 * fetch store (see sharedFetchStore.ts) — mounting it in ten places still issues one request, not
 * ten. Polling pauses while the tab is hidden and refetches immediately on becoming visible again
 * if the cached value has gone stale, per the task's "no aggressive polling while tab is hidden"
 * requirement.
 */
export function useMarketSystemState() {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const retry = useCallback(() => {
    void store.fetch({ force: true });
  }, []);

  useEffect(() => {
    void store.fetch();

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void store.fetch();
      }, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void store.fetch();
    };

    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const isLoading = state.status === 'loading' && state.data === null;
  const status = normalizeFeatureDataStatus({
    isLoading,
    hasError: state.status === 'error',
    providerStatus: state.data?.overall ?? 'unknown',
  });

  return {
    system: state.data,
    status,
    isLoading,
    error: state.error,
    retry,
    lastFetchedAt: state.lastFetchedAt,
  };
}
