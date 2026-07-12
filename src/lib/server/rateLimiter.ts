/**
 * Shared in-memory rate limiter for public API routes.
 * Uses IP address (via x-forwarded-for / x-real-ip) as the key.
 * Limits are intentionally generous — this is a DoS/abuse guard, not auth.
 */

const store = new Map<string, { count: number; resetAt: number }>();
const MAX_STORE_ENTRIES = 10_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function pruneExpiredEntries(now = Date.now()) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function ensureStoreCapacity(now: number) {
  if (store.size < MAX_STORE_ENTRIES) return;
  pruneExpiredEntries(now);
  while (store.size >= MAX_STORE_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) return;
    store.delete(oldestKey);
  }
}

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  const runtime = globalThis as typeof globalThis & {
    __sfmRateLimitCleanupTimer?: ReturnType<typeof setInterval>;
  };
  if (!runtime.__sfmRateLimitCleanupTimer) {
    const cleanupTimer = setInterval(() => pruneExpiredEntries(), CLEANUP_INTERVAL_MS);
    (cleanupTimer as ReturnType<typeof setInterval> & { unref?: () => void }).unref?.();
    runtime.__sfmRateLimitCleanupTimer = cleanupTimer;
  }
}

export interface RateLimitConfig {
  /** Max requests per window (default: 60) */
  max?: number;
  /** Window duration in milliseconds (default: 60_000 = 1 min) */
  windowMs?: number;
  /** Key prefix to namespace different routes (default: '') */
  prefix?: string;
}

/**
 * Extracts the best-effort client IP from a Request.
 * Falls back to 'unknown' if no IP headers are present (e.g. local dev).
 */
export function getClientIp(request: Request): string {
  const headers = request.headers as Headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 128) || 'unknown';
  const real = headers.get('x-real-ip');
  if (real) return real.trim().slice(0, 128) || 'unknown';
  return 'unknown';
}

/**
 * Returns true if the request is within the rate limit, false if over limit.
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = {},
): boolean {
  const { max = 60, windowMs = 60_000, prefix = '' } = config;
  const key = prefix ? `${prefix}:${ip}` : ip;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    if (entry) store.delete(key);
    ensureStoreCapacity(now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/**
 * Convenience: check rate limit from a Request object, return 429 Response or null.
 * Usage:
 *   const limited = rateLimitRequest(request, { max: 30, prefix: 'news' });
 *   if (limited) return limited;
 */
export function rateLimitRequest(
  request: Request,
  config: RateLimitConfig = {},
): Response | null {
  const ip = getClientIp(request);
  const allowed = checkRateLimit(ip, config);
  if (allowed) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      success: false,
      status: 'rate_limited',
      code: 'RATE_LIMITED',
      message: 'تم بلوغ حد الطلبات مؤقتاً. يرجى المحاولة بعد دقيقة.',
      messageEn: 'The request limit was reached. Please try again in one minute.',
      messageFr: 'La limite de requêtes a été atteinte. Réessayez dans une minute.',
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': '60',
      },
    },
  );
}
