/**
 * Shared in-memory rate limiter for public API routes.
 * Uses IP address (via x-forwarded-for / x-real-ip) as the key.
 * Limits are intentionally generous — this is a DoS/abuse guard, not auth.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
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
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
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
    JSON.stringify({ ok: false, code: 'RATE_LIMITED', message: 'Too many requests' }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': '60',
      },
    },
  );
}
