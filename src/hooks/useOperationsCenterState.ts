'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { OperationsCenterState } from '@/lib/admin/opsCenter/types';
import { getOrCreateFetchStore } from '@/lib/market-state/sharedFetchStore';

const OPS_CENTER_URL = '/api/admin/ops-center';
const POLL_INTERVAL_MS = 60_000;
const MIN_REFETCH_INTERVAL_MS = 5_000;

async function fetchOperationsCenterState(signal: AbortSignal): Promise<OperationsCenterState> {
  const response = await fetch(OPS_CENTER_URL, { signal });
  const payload = (await response.json()) as { ok: boolean; state: OperationsCenterState };
  return payload.state;
}

const store = getOrCreateFetchStore(OPS_CENTER_URL, fetchOperationsCenterState, { minRefetchIntervalMs: MIN_REFETCH_INTERVAL_MS });

/**
 * Mirrors useMarketSystemState.ts's shape exactly: one shared fetch store (mounting this in
 * multiple tabs still issues one request), 60s polling paused while the tab is hidden, immediate
 * refetch on becoming visible again.
 */
export function useOperationsCenterState() {
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

  return {
    ops: state.data,
    isLoading,
    error: state.error,
    retry,
    lastFetchedAt: state.lastFetchedAt,
  };
}
