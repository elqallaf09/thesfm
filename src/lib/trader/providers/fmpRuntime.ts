import { ProviderError, shortText } from '@/lib/providers/shared';

type QueueEntry<T> = {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export type FmpRuntimeStatus = {
  configured: boolean;
  healthy: boolean;
  rateLimited: boolean;
  /** A configured key is not evidence of reachability; it remains unknown until a request is observed. */
  status: 'healthy' | 'rate_limited' | 'not_configured' | 'degraded' | 'unknown';
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  rateLimitedUntil: string | null;
  nextRetryAt: string | null;
  cacheAvailable: boolean;
  supportedFeatures: string[];
  skippedDueToRateLimit: number;
  consecutiveRateLimitCount: number;
};

const FMP_MAX_CONCURRENT = 2;
const FMP_MIN_START_GAP_MS = process.env.NODE_ENV === 'test' ? 0 : 450;
const FMP_DEFAULT_BACKOFF_MS = 90_000;
const FMP_MAX_BACKOFF_MS = 15 * 60 * 1000;
const FMP_MANUAL_RETRY_BYPASS_MS = 5_000;

type FmpSharedCooldownAdapter = {
  synchronize: () => Promise<void>;
  publish: (untilMs: number) => void;
};

const queue: QueueEntry<unknown>[] = [];
const cacheKeys = new Set<string>();

let activeRequests = 0;
let lastStartAt = 0;
let rateLimitedUntilMs = 0;
let lastSuccessfulFetch: string | null = null;
let lastError: string | null = null;
let lastErrorAt: string | null = null;
let skippedDueToRateLimit = 0;
let consecutiveRateLimitCount = 0;
let sharedCooldownAdapter: FmpSharedCooldownAdapter | null = null;
let sharedCooldownBypassUntilMs = 0;

export class FmpRateLimitError extends ProviderError {
  constructor(message = 'provider_rate_limited') {
    super('rate_limited', 'provider_rate_limited', 429, message);
    this.name = 'FmpRateLimitError';
  }
}

function enqueue<T>(task: () => Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    queue.push({ task, resolve: resolve as (value: unknown) => void, reject });
    drainQueue();
  });
}

function drainQueue() {
  while (activeRequests < FMP_MAX_CONCURRENT && queue.length > 0) {
    const entry = queue.shift()!;
    const startAt = Math.max(Date.now(), lastStartAt + FMP_MIN_START_GAP_MS);
    lastStartAt = startAt;
    activeRequests += 1;

    setTimeout(async () => {
      try {
        entry.resolve(await entry.task());
      } catch (error) {
        entry.reject(error);
      } finally {
        activeRequests -= 1;
        drainQueue();
      }
    }, Math.max(0, startAt - Date.now()));
  }
}

function retryAfterMs(response: Response | null, attempt: number) {
  const header = response?.headers.get('retry-after');
  if (!header) {
    return Math.min(
      FMP_MAX_BACKOFF_MS,
      FMP_DEFAULT_BACKOFF_MS * (2 ** Math.max(0, attempt - 1)),
    );
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(FMP_MAX_BACKOFF_MS, Math.max(1000, seconds * 1000));
  }

  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.min(FMP_MAX_BACKOFF_MS, Math.max(1000, date - Date.now()));
  }

  return FMP_DEFAULT_BACKOFF_MS;
}

export function isFmpRateLimited(now = Date.now()) {
  return rateLimitedUntilMs > now;
}

export function getFmpRateLimitedUntil() {
  return isFmpRateLimited() ? new Date(rateLimitedUntilMs).toISOString() : null;
}

/** Installed only by fmpRuntime.server.ts; keeps this runtime safe for client-side diagnostics. */
export function setFmpSharedCooldownAdapter(adapter: FmpSharedCooldownAdapter | null) {
  sharedCooldownAdapter = adapter;
}

export function applySharedFmpCooldown(untilMs: number) {
  if (!Number.isFinite(untilMs) || untilMs <= Date.now()) return;
  rateLimitedUntilMs = Math.max(rateLimitedUntilMs, untilMs);
  lastError = 'provider_rate_limited';
  lastErrorAt = new Date().toISOString();
}

export function markFmpCacheAvailable(key: string) {
  cacheKeys.add(key);
}

export function markFmpSuccess() {
  lastSuccessfulFetch = new Date().toISOString();
  lastError = null;
  lastErrorAt = null;
  consecutiveRateLimitCount = 0;
  if (!isFmpRateLimited()) rateLimitedUntilMs = 0;
}

export function markFmpFailure(statusCode: number | null | undefined, message: unknown) {
  if (statusCode === 429) {
    markFmpRateLimited(null, message);
    return;
  }
  lastError = shortText(message, 180) || 'provider_temporarily_unavailable';
  lastErrorAt = new Date().toISOString();
}

export function markFmpRateLimited(response: Response | null, message: unknown = 'provider_rate_limited') {
  consecutiveRateLimitCount += 1;
  const backoffMs = retryAfterMs(response, consecutiveRateLimitCount);
  rateLimitedUntilMs = Math.max(rateLimitedUntilMs, Date.now() + backoffMs);
  lastError = shortText(message, 180) || 'provider_rate_limited';
  lastErrorAt = new Date().toISOString();
  sharedCooldownAdapter?.publish(rateLimitedUntilMs);
}

export function resetFmpRateLimitCooldown() {
  rateLimitedUntilMs = 0;
  // A deliberate admin retry should reach the provider once instead of being
  // immediately re-blocked by the shared cooldown. The persistent entry is
  // retained so other instances remain protected if the retry still fails.
  sharedCooldownBypassUntilMs = Date.now() + FMP_MANUAL_RETRY_BYPASS_MS;
}

export function clearFmpRuntimeCacheMarkers() {
  cacheKeys.clear();
}

export async function fmpQueuedFetch(input: RequestInfo | URL, init?: NextFetchInit) {
  if (Date.now() >= sharedCooldownBypassUntilMs) await sharedCooldownAdapter?.synchronize();
  if (isFmpRateLimited()) {
    skippedDueToRateLimit += 1;
    throw new FmpRateLimitError();
  }

  return enqueue(async () => {
    if (Date.now() >= sharedCooldownBypassUntilMs) await sharedCooldownAdapter?.synchronize();
    if (isFmpRateLimited()) {
      skippedDueToRateLimit += 1;
      throw new FmpRateLimitError();
    }
    const response = await fetch(input, init);
    if (response.status === 429) markFmpRateLimited(response);
    else if (response.ok) markFmpSuccess();
    else markFmpFailure(response.status, `provider_http_${response.status}`);
    return response;
  });
}

export function getFmpRuntimeStatus(configured: boolean, cacheAvailable = false): FmpRuntimeStatus {
  const rateLimited = isFmpRateLimited();
  const hasCache = cacheAvailable || cacheKeys.size > 0;
  const status = !configured
    ? 'not_configured'
    : rateLimited
      ? 'rate_limited'
      : lastError
        ? 'degraded'
        : lastSuccessfulFetch
          ? 'healthy'
          : 'unknown';

  return {
    configured,
    healthy: configured && status === 'healthy',
    rateLimited,
    status,
    lastSuccessfulFetch,
    lastError: rateLimited ? 'provider_rate_limited' : lastError,
    lastErrorAt,
    rateLimitedUntil: rateLimited ? new Date(rateLimitedUntilMs).toISOString() : null,
    nextRetryAt: rateLimited ? new Date(rateLimitedUntilMs).toISOString() : null,
    cacheAvailable: hasCache,
    supportedFeatures: ['quotes', 'technicalAnalysis', 'symbols', 'earnings', 'dividends', 'ipos', 'economicCalendar'],
    skippedDueToRateLimit,
    consecutiveRateLimitCount,
  };
}

export function __resetFmpRuntimeForTests() {
  queue.splice(0, queue.length);
  cacheKeys.clear();
  activeRequests = 0;
  lastStartAt = 0;
  rateLimitedUntilMs = 0;
  lastSuccessfulFetch = null;
  lastError = null;
  lastErrorAt = null;
  skippedDueToRateLimit = 0;
  consecutiveRateLimitCount = 0;
  sharedCooldownBypassUntilMs = 0;
}
