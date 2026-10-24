import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { ACCOUNT_SYNC_INTERVAL_MS, resumedToForeground } from './accountSyncPolicy';

/**
 * Refreshes an authenticated screen only while it is mounted. The callback is
 * intentionally supplied by the screen so all requests continue through the
 * session client (and its token refresh, owner-scoped API, and RLS boundary).
 */
export function useAccountSync(refresh: () => void, intervalMs = ACCOUNT_SYNC_INTERVAL_MS) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    let state = AppState.currentState;
    const subscription = AppState.addEventListener('change', next => {
      if (resumedToForeground(state, next)) callback.current();
      state = next;
    });
    const timer = setInterval(() => {
      if (state === 'active') callback.current();
    }, intervalMs);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [intervalMs]);
}
