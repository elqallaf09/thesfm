import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { TvRequestError } from './receiverApi';

/** Scope changes and backgrounding immediately hide private data; no disk/shared cache. */
export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>, interval: number, enabled = true, privateData = false) {
  const [state, setState] = useState<{ key: string; data: T | null; error: number | null; loading: boolean }>({ key, data: null, error: null, loading: enabled });
  useEffect(() => {
    let stopped = false, busy = false, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined;
    const active = () => !stopped && !['inactive', 'background'].includes(AppState.currentState);
    setState({ key, data: null, error: null, loading: enabled });
    async function refresh() {
      if (!enabled || !active() || busy) return;
      busy = true; const current = new AbortController(); controller = current;
      const timeout = setTimeout(() => current.abort(), 15_000);
      let delay = interval;
      try {
        const data = await load(current.signal); failures = 0;
        if (active() && !current.signal.aborted) setState({ key, data, error: null, loading: false });
      } catch (error) {
        const status = error instanceof TvRequestError ? error.status : 503;
        delay = Math.max(error instanceof TvRequestError ? error.retryAfterMs : 0, Math.min(300_000, interval * 2 ** Math.min(++failures, 4)));
        if (active()) setState(previous => ({ key, data: privateData || status === 401 ? null : previous.data, error: status, loading: false }));
      } finally {
        clearTimeout(timeout); busy = false;
        if (active()) timer = setTimeout(() => { void refresh(); }, delay);
      }
    }
    const subscription = AppState.addEventListener('change', next => {
      clearTimeout(timer);
      if (next !== 'active') { controller?.abort(); if (privateData) setState({ key, data: null, error: null, loading: true }); }
      else void refresh();
    });
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); subscription.remove(); };
  }, [key, load, interval, enabled, privateData]);
  return state.key === key ? state : { key, data: null, error: null, loading: enabled };
}
