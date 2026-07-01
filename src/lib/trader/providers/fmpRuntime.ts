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
  status: 'healthy' | 'rate_limited' | 'not_configured' | 'degraded';
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  rateLimitedUntil: string | null;
  cacheAvailable: boolean;
  supportedFeatures: string[];
  skippedDueToRateLimit: number;
};

const FMP_MAX_CONCURRENT = 2;
const FMP_MIN_START_GAP_MS = process.env.NODE_ENV === 'test' ? 0 : 450;
const FMP_DEFAULT_BACKOFF_MS = 90_000;
const FMP_MAX_BACKOFF_MS = 5 * 60 * 1000;

const queue: QueueEntry<unknown>[] = [];
const cacheKeys = new Set<string>();

let activeRequests = 0;
let lastStartAt = 0;
let rateLimitedUntilMs = 0;
let lastSuccessfulFetch: string | null = null;
let lastError: string | null = null;
let lastErrorAt: string | null = null;
let skippedDueToRateLimit = 0;

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

function retryAfterMs(response: Response | null) {
  const header = response?.headers.get('retry-after');
  if (!header) return FMP_DEFAULT_BACKOFF_MS;

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

export function markFmpCacheAvailable(key: string) {
  cacheKeys.add(key);
}

export function markFmpSuccess() {
  lastSuccessfulFetch = new Date().toISOString();
  lastError = null;
  lastErrorAt = null;
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
  const backoffMs = retryAfterMs(response);
  rateLimitedUntilMs = Math.max(rateLimitedUntilMs, Date.now() + backoffMs);
  lastError = shortText(message, 180) || 'provider_rate_limited';
  lastErrorAt = new Date().toISOString();
}

export async function fmpQueuedFetch(input: RequestInfo | URL, init?: NextFetchInit) {
  if (isFmpRateLimited()) {
    skippedDueToRateLimit += 1;
    throw new FmpRateLimitError();
  }

  return enqueue(async () => {
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
        : 'healthy';

  return {
    configured,
    healthy: configured && status === 'healthy',
    rateLimited,
    status,
    lastSuccessfulFetch,
    lastError: rateLimited ? 'provider_rate_limited' : lastError,
    lastErrorAt,
    rateLimitedUntil: rateLimited ? new Date(rateLimitedUntilMs).toISOString() : null,
    cacheAvailable: hasCache,
    supportedFeatures: ['quotes', 'technicalAnalysis', 'symbols', 'earnings', 'dividends', 'ipos', 'economicCalendar'],
    skippedDueToRateLimit,
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
}
