import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClientIp, checkRateLimit, checkRateLimitWithMetadata, rateLimitRequest } from '@/lib/server/rateLimiter';

// ─── getClientIp ────────────────────────────────────────────────────────────

describe('getClientIp()', () => {
  const makeReq = (headers: Record<string, string>) =>
    new Request('https://example.com', { headers });

  it('extracts first IP from x-forwarded-for', () => {
    expect(getClientIp(makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('uses x-real-ip as fallback', () => {
    expect(getClientIp(makeReq({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('returns "unknown" when no IP headers present', () => {
    expect(getClientIp(makeReq({}))).toBe('unknown');
  });

  it('bounds untrusted forwarding header keys', () => {
    expect(getClientIp(makeReq({ 'x-forwarded-for': 'x'.repeat(500) }))).toHaveLength(128);
  });
});

// ─── checkRateLimit ─────────────────────────────────────────────────────────

describe('checkRateLimit()', () => {
  // Use unique IPs per test to avoid cross-test store state
  let ip: string;
  beforeEach(() => {
    ip = `test-${Math.random().toString(36).slice(2)}`;
  });

  it('allows first request', () => {
    expect(checkRateLimit(ip, { max: 3, windowMs: 60_000 })).toBe(true);
  });

  it('allows up to max requests', () => {
    const cfg = { max: 5, windowMs: 60_000, prefix: 'r' };
    for (let i = 0; i < 5; i++) expect(checkRateLimit(ip, cfg)).toBe(true);
  });

  it('blocks request exceeding max', () => {
    const cfg = { max: 2, windowMs: 60_000, prefix: 's' };
    checkRateLimit(ip, cfg);
    checkRateLimit(ip, cfg);
    expect(checkRateLimit(ip, cfg)).toBe(false);
  });

  it('returns a server-owned retry window when a request is blocked', () => {
    const cfg = { max: 1, windowMs: 30_000, prefix: 'metadata' };
    expect(checkRateLimitWithMetadata(ip, cfg).allowed).toBe(true);
    const limited = checkRateLimitWithMetadata(ip, cfg);
    expect(limited).toMatchObject({ allowed: false, retryAfterSeconds: 30 });
    expect(limited.resetAt).toBeGreaterThan(Date.now());
  });

  it('resets counter after window expires', () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const cfg = { max: 1, windowMs: 1_000, prefix: 't' };
    expect(checkRateLimit(ip, cfg)).toBe(true);
    expect(checkRateLimit(ip, cfg)).toBe(false);

    vi.setSystemTime(now + 1_001);
    expect(checkRateLimit(ip, cfg)).toBe(true); // window reset

    vi.useRealTimers();
  });

  it('namespaces by prefix (same IP, different prefixes are independent)', () => {
    const cfg1 = { max: 1, windowMs: 60_000, prefix: 'p1' };
    const cfg2 = { max: 1, windowMs: 60_000, prefix: 'p2' };
    expect(checkRateLimit(ip, cfg1)).toBe(true);
    expect(checkRateLimit(ip, cfg1)).toBe(false);
    expect(checkRateLimit(ip, cfg2)).toBe(true); // different namespace → fresh
  });

  it('evicts oldest entries when the in-memory store reaches its bound', () => {
    const prefix = `bounded-${Math.random()}`;
    const firstIp = `${prefix}-0`;
    const cfg = { max: 1, windowMs: 60_000, prefix };
    for (let index = 0; index <= 10_000; index += 1) {
      expect(checkRateLimit(`${prefix}-${index}`, cfg)).toBe(true);
    }
    expect(checkRateLimit(firstIp, cfg)).toBe(true);
  });
});

// ─── rateLimitRequest ────────────────────────────────────────────────────────

describe('rateLimitRequest()', () => {
  it('returns null when within limit', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': `${Math.random()}.0.0.1` },
    });
    expect(rateLimitRequest(req, { max: 10, prefix: 'z' })).toBeNull();
  });

  it('returns 429 Response when over limit', () => {
    const ip = `over-${Math.random()}`;
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': ip },
    });
    const cfg = { max: 1, prefix: 'over' };
    rateLimitRequest(req, cfg);             // first — allowed
    const res = rateLimitRequest(req, cfg); // second — blocked
    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
  });
});
