import { tvFetch } from '@/lib/markets-tv/client';
import { mergeStripSnapshot } from '@/lib/markets-tv/stripQuotes';
import type { TvSnapshot } from '@/lib/markets-tv/types';
import { queuedTvSnapshot } from './snapshotQueue';

const MAX_RETRY_MS = 300_000;
const aborted = () => new DOMException('Aborted', 'AbortError');

export class TvResourceError extends Error {
  constructor(message: string, readonly status = 0, readonly retryAfterMs = 0) { super(message); }
}

export function tvRetryDelay(attempt: number, interval: number, error?: unknown): number {
  const base = Math.max(5_000, Math.min(MAX_RETRY_MS, interval));
  const retryAfter = error instanceof TvResourceError ? error.retryAfterMs : 0;
  return Math.min(MAX_RETRY_MS, Math.max(base * 2 ** Math.min(5, Math.max(0, attempt - 1)), retryAfter));
}

function publicSnapshotKey(path: string, token: string): string | null {
  if (token || !path.startsWith('/api/tv/snapshot') || path.length > 4096) return null;
  const url = new URL(path, 'https://tv.invalid');
  if (url.pathname !== '/api/tv/snapshot' || url.origin !== 'https://tv.invalid') return null;
  const allowed = new Set(['group', 'scene', 'market', 'page', 'pageSize', 'symbols']);
  for (const [name, value] of url.searchParams) {
    if (!allowed.has(name) || ['group', 'scene', 'market'].includes(name) && value.toLowerCase() === 'watchlist') return null;
  }
  url.searchParams.sort();
  return `${url.pathname}?${url.searchParams}`;
}

export const isPublicTvSnapshot = (path: string) => publicSnapshotKey(path, '') !== null;

function isSnapshot(value: unknown): value is TvSnapshot {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<TvSnapshot>;
  return typeof item.group === 'string' && Array.isArray(item.quotes) && typeof item.generatedAt === 'string';
}

/** Retention never changes provider timestamps or invents observations. */
export function retainTvResource<T>(previous: T | null, next: T): T {
  return isSnapshot(next) && isSnapshot(previous) ? mergeStripSnapshot(previous, next) as T : next;
}

type CacheEntry = { data: unknown; fetchedAt: number; failures: number; retryAt: number; error?: unknown };
type Flight = { controller: AbortController; promise: Promise<unknown>; consumers: number; settled: boolean };
type RequestOptions = { signal: AbortSignal; token?: string; ttlMs: number; force?: boolean };

/** Only public snapshots are shared. Account/device/intelligence resources stay local to their hook. */
export class TvResourceCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly flights = new Map<string, Flight>();
  constructor(private readonly maxEntries = 32, private readonly clock = Date.now) {}

  peek<T>(path: string, token = ''): T | null {
    const key = publicSnapshotKey(path, token);
    return key ? this.entries.get(key)?.data as T ?? null : null;
  }

  private save(key: string, entry: CacheEntry) {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
  }

  request<T>(path: string, options: RequestOptions, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (options.signal.aborted) return Promise.reject(aborted());
    const key = publicSnapshotKey(path, options.token || '');
    // Never store tokens, private responses, or private requests in shared maps.
    if (!key) return load(options.signal);
    const cached = this.entries.get(key), now = this.clock();
    if (cached && cached.retryAt > now) {
      const error = cached.error;
      return Promise.reject(new TvResourceError(error instanceof Error ? error.message : 'UNAVAILABLE',
        error instanceof TvResourceError ? error.status : 0, cached.retryAt - now));
    }
    if (!options.force && cached?.data != null && now - cached.fetchedAt < options.ttlMs) {
      this.save(key, cached);
      return Promise.resolve(cached.data as T);
    }
    let flight = this.flights.get(key);
    if (!flight || flight.controller.signal.aborted) {
      const controller = new AbortController();
      flight = { controller, consumers: 0, settled: false, promise: Promise.resolve() };
      const current = flight;
      current.promise = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw aborted();
        return load(controller.signal);
      }).then(data => {
        if (controller.signal.aborted) throw aborted();
        // The shared map holds heterogeneous payloads; the merge validates both shapes.
        const retained = retainTvResource<unknown>(this.entries.get(key)?.data ?? null, data);
        this.save(key, { data: retained, fetchedAt: this.clock(), failures: 0, retryAt: 0 });
        return retained;
      }, error => {
        if (!controller.signal.aborted) {
          const old = this.entries.get(key), failures = (old?.failures || 0) + 1;
          this.save(key, { data: old?.data ?? null, fetchedAt: old?.fetchedAt ?? 0, failures, error,
            retryAt: this.clock() + tvRetryDelay(failures, options.ttlMs, error) });
        }
        throw error;
      }).finally(() => {
        current.settled = true;
        if (this.flights.get(key) === current) this.flights.delete(key);
      });
      this.flights.set(key, current);
    }
    return this.subscribe<T>(flight, options.signal);
  }

  private subscribe<T>(flight: Flight, signal: AbortSignal): Promise<T> {
    flight.consumers++;
    return new Promise<T>((resolve, reject) => {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        signal.removeEventListener('abort', cancel);
        flight.consumers--;
        if (!flight.consumers && !flight.settled) flight.controller.abort();
      };
      const cancel = () => { release(); reject(aborted()); };
      signal.addEventListener('abort', cancel, { once: true });
      flight.promise.then(value => { release(); resolve(value as T); }, error => { release(); reject(error); });
      if (signal.aborted) cancel();
    });
  }
}

export const tvResourceCache = new TvResourceCache();

function retryAfterMs(response: Response): number {
  const header = response.headers.get('retry-after');
  if (!header) return 0;
  const seconds = Number(header);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  return Number.isFinite(delay) ? Math.max(0, Math.min(MAX_RETRY_MS, delay)) : 0;
}

export function requestTvResource<T>(path: string, options: RequestOptions): Promise<T> {
  return tvResourceCache.request<T>(path, options, async signal => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = setTimeout(cancel, 55_000);
    const load = async () => {
      const response = await tvFetch(path, { cache: 'no-store', signal: controller.signal,
        headers: options.token ? { 'x-sfm-tv-token': options.token } : {} });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const code = body && typeof body === 'object' && 'code' in body ? body.code : null;
        throw new TvResourceError(typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code) ? code
          : response.status === 401 ? 'UNAUTHORIZED' : response.status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE', response.status, retryAfterMs(response));
      }
      if (body === null) throw new TvResourceError('INVALID_RESPONSE');
      return body as T;
    };
    try {
      return await (path.startsWith('/api/tv/snapshot?') ? queuedTvSnapshot(controller.signal, load) : load());
    } catch (error) {
      if (controller.signal.aborted && !signal.aborted) throw new TvResourceError('TIMEOUT');
      throw error;
    } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
  });
}
