'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { OperationsCenterState, OpsAction } from '@/lib/admin/opsCenter/types';
import { executeOperationsAction, fetchOperationsCenterState, OPS_CENTER_URL, type OpsActionState } from '@/lib/admin/opsCenter/client';
import { createOperationsAccessState } from '@/lib/admin/opsCenter/accessState';
import { getOrCreateFetchStore } from '@/lib/market-state/sharedFetchStore';

const POLL_INTERVAL_MS = 60_000;
const MIN_REFETCH_INTERVAL_MS = 5_000;

const access = createOperationsAccessState();
const ACCESS_DENIED = 'ops_center_request_access_denied';
let completedGet: { requestId: number; state: OperationsCenterState } | null = null;

const store = getOrCreateFetchStore(OPS_CENTER_URL, async signal => {
  const requestId = access.beginRequest();
  try {
    const state = await fetchOperationsCenterState(signal);
    completedGet = { requestId, state };
    return state;
  } catch (error) {
    if (error instanceof Error && error.message === ACCESS_DENIED) access.deny(requestId);
    throw error;
  }
}, { minRefetchIntervalMs: MIN_REFETCH_INTERVAL_MS });

// Subscribe for the lifetime of this shared store. Release the latch only after it has published
// the validated GET snapshot. Loading and abort-to-last-success transitions cannot release it.
store.subscribe(() => {
  const state = store.getState();
  if (state.status === 'success' && completedGet && state.data === completedGet.state) {
    access.allow(completedGet.requestId);
  }
});

/**
 * Mirrors useMarketSystemState.ts's shape exactly: one shared fetch store (mounting this in
 * multiple tabs still issues one request), 60s polling paused while the tab is hidden, immediate
 * refetch on becoming visible again. Before the snapshot enters the store, historical failures
 * and redundant-provider configuration are normalized out of the current-health summary.
 */
export function useOperationsCenterState() {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const accessDenied = useSyncExternalStore(access.subscribe, access.getSnapshot, access.getSnapshot);
  const [actionSnapshot, setActionSnapshot] = useState<{ state: OperationsCenterState; requestId: number } | null>(null);
  const [actionState, setActionState] = useState<OpsActionState>({ pendingActionId: null, result: null });
  const actionController = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    void store.fetch({ force: true });
  }, []);

  const runAction = useCallback(async (action: OpsAction) => {
    if (!action.available || actionController.current) return;
    const controller = new AbortController();
    const requestId = access.beginRequest();
    actionController.current = controller;
    setActionState({ pendingActionId: action.id, result: null });
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const result = await executeOperationsAction(action, controller.signal);
      if (actionController.current !== controller) return;
      setActionSnapshot({ state: result.state, requestId });
      setActionState({ pendingActionId: null, result: result.result });
    } catch (error) {
      if (actionController.current !== controller) return;
      const messageKey = controller.signal.aborted ? 'ops_center_request_timeout'
        : error instanceof Error && error.message.startsWith('ops_center_request_') ? error.message : 'ops_center_request_failed';
      if (messageKey === ACCESS_DENIED) {
        access.deny(requestId);
        setActionSnapshot(null);
      }
      setActionState({
        pendingActionId: null,
        result: { actionId: action.id, ok: false, messageKey, completedAt: new Date().toISOString() },
      });
    } finally {
      clearTimeout(timeout);
      if (actionController.current === controller) actionController.current = null;
    }
  }, []);

  // A positive POST receipt may restore access after the corresponding snapshot has reached
  // React state. This avoids briefly revealing the old snapshot between receipt and state update.
  useEffect(() => {
    if (actionSnapshot) access.allow(actionSnapshot.requestId);
  }, [actionSnapshot]);

  useEffect(() => () => {
    const controller = actionController.current;
    actionController.current = null;
    controller?.abort();
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

  // A poll that started before a manual check must not replace that check's newer snapshot.
  const latestActionState = actionSnapshot?.state;
  const ops = latestActionState && (!state.data || Date.parse(latestActionState.generatedAt) >= Date.parse(state.data.generatedAt))
    ? latestActionState : state.data;
  const visibleOps = accessDenied ? null : ops;

  return {
    ops: visibleOps,
    isLoading: state.status === 'loading' && visibleOps === null,
    // An older failed GET can arrive after a newer successful POST. Its denied message is not
    // the current authorization decision; the latch above already reconciles response order.
    error: accessDenied ? ACCESS_DENIED : state.error === ACCESS_DENIED ? null : state.error,
    retry,
    runAction,
    actionState,
    lastFetchedAt: state.lastFetchedAt,
  };
}
