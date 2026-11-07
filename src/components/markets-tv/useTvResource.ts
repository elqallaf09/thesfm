'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isPublicTvSnapshot, requestTvResource, retainTvResource, tvResourceCache, TvResourceError, tvRetryDelay, tvSnapshotRetryDelay } from './tvResourceCache';

export function useTvResource<T>(path: string | null, interval: number, token = '', revision = 0, privateDisplay = false) {
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
    let privacyTimer: ReturnType<typeof setTimeout> | undefined;
    let visibilityEpoch = 0, pageActive = true;
    let controller: AbortController | null = null;
    let force = previousRevision.current !== revision;
    previousRevision.current = revision;
    setState(previous => {
      const data = !privateDisplay && previous.key === key ? previous.data : tvResourceCache.peek<T>(path, token);
      return { key, data, error: null, errorStatus: null, loading: data === null };
    });
    const active = () => !stopped && (!privateDisplay || pageActive) && !document.hidden && navigator.onLine !== false;
    // Sensitive values are a short-lived display, not an offline account cache.
    // A hanging refresh must not keep a revoked portfolio on screen indefinitely.
    const hidePrivateData = () => {
      if (!privateDisplay || stopped) return;
      clearTimeout(privacyTimer);
      setState({ key, data: null, error: 'PRIVATE_DISPLAY_HIDDEN', errorStatus: null, loading: false });
    };
    const renewPrivateDisplay = () => {
      if (!privateDisplay) return;
      clearTimeout(privacyTimer);
      privacyTimer = setTimeout(hidePrivateData, 30_000);
    };
    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (active()) timer = setTimeout(() => { void load(); }, delay);
    };
    async function load() {
      if (!active() || running) return;
      if (retryAt > Date.now()) { schedule(retryAt - Date.now()); return; }
      running = true;
      const requestController = new AbortController();
      const requestEpoch = visibilityEpoch;
      controller = requestController;
      let nextDelay = interval;
      try {
        const body = await requestTvResource<T>(path!, { signal: requestController.signal, token, ttlMs: interval, force });
        force = false; failures = 0; retryAt = 0;
        // Private resources keep their normal authorization checks even while
        // the server is waiting for a quote provider's rate limit to recover.
        if (!token && isPublicTvSnapshot(path!)) {
          nextDelay = Math.max(interval, tvSnapshotRetryDelay(body));
          retryAt = Date.now() + nextDelay;
        }
        if (!stopped && !requestController.signal.aborted && (!privateDisplay || active() && requestEpoch === visibilityEpoch)) {
          renewPrivateDisplay();
          setState(previous => ({ key,
            data: retainTvResource(previous.key === key ? previous.data : null, body), error: null, errorStatus: null, loading: false }));
        }
      } catch (error) {
        if (!stopped && !requestController.signal.aborted) {
          force = false;
          nextDelay = tvRetryDelay(++failures, interval, error); retryAt = Date.now() + nextDelay;
          const unauthorized = error instanceof TvResourceError && [401, 403].includes(error.status);
          if (privateDisplay) clearTimeout(privacyTimer);
          setState(previous => ({ key, data: !privateDisplay && !unauthorized && previous.key === key ? previous.data : null, loading: false,
            error: error instanceof Error ? error.message : 'UNAVAILABLE', errorStatus: error instanceof TvResourceError ? error.status || null : null }));
        }
      } finally {
        running = false;
        if (controller === requestController) controller = null;
        // A rapid hide/show can occur before the aborted request has unwound.
        schedule(requestController.signal.aborted ? 0 : nextDelay);
      }
    }
    function suspendPrivateDisplay() {
      if (!privateDisplay) return;
      pageActive = false;
      visibilityEpoch++;
      clearTimeout(timer);
      controller?.abort();
      hidePrivateData();
    }
    function resumePage() { pageActive = true; visibility(); }
    function visibility() {
      clearTimeout(timer);
      if (!active()) {
        visibilityEpoch++;
        controller?.abort();
        hidePrivateData();
      }
      else void load();
    }
    if (!active()) hidePrivateData();
    void load();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', visibility); window.addEventListener('offline', visibility);
    window.addEventListener('pagehide', suspendPrivateDisplay); window.addEventListener('pageshow', resumePage);
    return () => {
      stopped = true; clearTimeout(timer); clearTimeout(privacyTimer); controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', visibility); window.removeEventListener('offline', visibility);
      window.removeEventListener('pagehide', suspendPrivateDisplay); window.removeEventListener('pageshow', resumePage);
    };
  }, [path, interval, token, key, revision, privateDisplay]);
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
