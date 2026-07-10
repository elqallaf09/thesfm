export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export type FetchStoreState<T> = {
  data: T | null;
  status: FetchStatus;
  error: string | null;
  lastFetchedAt: number | null;
};

export type FetchStore<T> = {
  getState: () => FetchStoreState<T>;
  subscribe: (listener: () => void) => () => void;
  fetch: (options?: { force?: boolean }) => Promise<void>;
  dispose: () => void;
};

const DEFAULT_MIN_REFETCH_INTERVAL_MS = 2_000;

/**
 * Framework-agnostic request store: dedupes concurrent fetches (a fetch already in flight is
 * shared, never duplicated), keeps the last-good value visible while a refetch is in progress
 * (stale-while-revalidate), and refuses to refetch faster than `minRefetchIntervalMs` unless
 * `force` is passed — this is what prevents a rerender storm from firing duplicate requests.
 */
export function createFetchStore<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { minRefetchIntervalMs?: number } = {},
): FetchStore<T> {
  const minRefetchIntervalMs = options.minRefetchIntervalMs ?? DEFAULT_MIN_REFETCH_INTERVAL_MS;
  let state: FetchStoreState<T> = { data: null, status: 'idle', error: null, lastFetchedAt: null };
  const listeners = new Set<() => void>();
  let inFlight: Promise<void> | null = null;
  let controller: AbortController | null = null;

  function setState(patch: Partial<FetchStoreState<T>>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function fetchNow(fetchOptions: { force?: boolean } = {}): Promise<void> {
    if (inFlight) return inFlight;

    const now = Date.now();
    if (!fetchOptions.force && state.lastFetchedAt !== null && now - state.lastFetchedAt < minRefetchIntervalMs) {
      return Promise.resolve();
    }

    controller = new AbortController();
    setState({ status: 'loading', error: null });

    const promise = (async () => {
      try {
        const data = await fetcher(controller!.signal);
        setState({ data, status: 'success', lastFetchedAt: Date.now(), error: null });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({ status: 'error', error: error instanceof Error ? error.message : 'unknown_error' });
      } finally {
        inFlight = null;
        controller = null;
      }
    })();

    inFlight = promise;
    return promise;
  }

  function dispose() {
    controller?.abort();
    inFlight = null;
    listeners.clear();
  }

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    fetch: fetchNow,
    dispose,
  };
}

const registry = new Map<string, FetchStore<unknown>>();

/**
 * Shared across every component that requests the same `key` — N mounted consumers of the same
 * key resolve to the same store instance, so they share one in-flight request instead of each
 * firing its own.
 */
export function getOrCreateFetchStore<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options?: { minRefetchIntervalMs?: number },
): FetchStore<T> {
  const existing = registry.get(key);
  if (existing) return existing as FetchStore<T>;
  const store = createFetchStore(fetcher, options);
  registry.set(key, store);
  return store;
}

export function clearFetchStoreRegistry() {
  for (const store of registry.values()) store.dispose();
  registry.clear();
}
