'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isPublicTvSnapshot, requestTvResource, retainTvResource, tvResourceCache, TvResourceError, tvRetryDelay } from './tvResourceCache';

export function useTvResource<T>(path: string | null, interval: number, token = '', revision = 0) {
  // The identity cannot expose a device token through returned state or a DOM key.
  const key = useMemo(() => Symbol(path ? token ? 'tv-private-resource' : 'tv-public-resource' : 'tv-idle'), [path, token]);
  const previousRevision = useRef(revision);
  const [state, setState] = useState<{ key: symbol; data: T | null; error: string | null; errorStatus: number | null; loading: boolean }>(() => {
    const data = path ? tvResourceCache.peek<T>(path, token) : null;
    return { key, data, error: null, errorStatus: null, loading: Boolean(path) && data === null };
  });
  useEffect(() => {
    if (!path) return;
    let stopped = false, running = false, failures = 0, retryAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let force = previousRevision.current !== revision;
    previousRevision.current = revision;
    setState(previous => {
      const data = previous.key === key ? previous.data : tvResourceCache.peek<T>(path, token);
      return { key, data, error: null, errorStatus: null, loading: data === null };
    });
    const active = () => !stopped && !document.hidden && navigator.onLine !== false;
    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (active()) timer = setTimeout(() => { void load(); }, delay);
    };
    async function load() {
      if (!active() || running) return;
      if (retryAt > Date.now()) { schedule(retryAt - Date.now()); return; }
      running = true;
      const requestController = new AbortController();
      controller = requestController;
      let nextDelay = interval;
      try {
        const body = await requestTvResource<T>(path!, { signal: requestController.signal, token, ttlMs: interval, force });
        force = false; failures = 0; retryAt = 0;
        if (!stopped && !requestController.signal.aborted) setState(previous => ({ key,
          data: retainTvResource(previous.key === key ? previous.data : null, body), error: null, errorStatus: null, loading: false }));
      } catch (error) {
        if (!stopped && !requestController.signal.aborted) {
          force = false;
          nextDelay = tvRetryDelay(++failures, interval, error); retryAt = Date.now() + nextDelay;
          const unauthorized = error instanceof TvResourceError && [401, 403].includes(error.status);
          setState(previous => ({ key, data: !unauthorized && previous.key === key ? previous.data : null, loading: false,
            error: error instanceof Error ? error.message : 'UNAVAILABLE', errorStatus: error instanceof TvResourceError ? error.status || null : null }));
        }
      } finally {
        running = false;
        if (controller === requestController) controller = null;
        // A rapid hide/show can occur before the aborted request has unwound.
        schedule(requestController.signal.aborted ? 0 : nextDelay);
      }
    }
    function visibility() {
      clearTimeout(timer);
      if (!active()) controller?.abort();
      else void load();
    }
    void load();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', visibility); window.addEventListener('offline', visibility);
    return () => {
      stopped = true; clearTimeout(timer); controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', visibility); window.removeEventListener('offline', visibility);
    };
  }, [path, interval, token, key, revision]);
  const cached = path ? tvResourceCache.peek<T>(path, token) : null;
  return state.key === key ? { data: state.data, error: state.error, errorStatus: state.errorStatus, loading: state.loading }
    : { data: cached, error: null, errorStatus: null, loading: Boolean(path) && cached === null };
}

/** One speculative scene, once. No timers, private tokens, or whole-directory fanout. */
export function useTvScenePrefetch(path: string | null, ttlMs = 30_000) {
  useEffect(() => {
    if (!path || !isPublicTvSnapshot(path)) return;
    let controller: AbortController | null = null;
    let completed = false;
    const load = () => {
      if (document.hidden || navigator.onLine === false) { controller?.abort(); return; }
      if (completed || controller && !controller.signal.aborted) return;
      const current = new AbortController(); controller = current;
      void requestTvResource(path, { signal: current.signal, ttlMs }).then(() => { completed = true; }, () => {
        // A failed prefetch is retried by the foreground resource, with its backoff.
        if (!current.signal.aborted) completed = true;
      });
    };
    load();
    document.addEventListener('visibilitychange', load);
    window.addEventListener('online', load); window.addEventListener('offline', load);
    return () => {
      controller?.abort(); document.removeEventListener('visibilitychange', load);
      window.removeEventListener('online', load); window.removeEventListener('offline', load);
    };
  }, [path, ttlMs]);
}
