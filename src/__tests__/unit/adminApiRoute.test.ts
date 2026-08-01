import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminApiAccess, requireSuperAdminApiAccess, rateLimitRequest } = vi.hoisted(() => ({
  requireAdminApiAccess: vi.fn(),
  requireSuperAdminApiAccess: vi.fn(),
  rateLimitRequest: vi.fn(),
}));

vi.mock('@/lib/server/adminAccess', () => ({ requireAdminApiAccess, requireSuperAdminApiAccess }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest }));

import { createAdminApiRoute } from '@/lib/server/adminApiRoute';

const request = (requestId?: string) => new Request('https://example.test/api/admin/test', {
  headers: requestId ? { 'x-request-id': requestId } : undefined,
});

describe('admin API route policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitRequest.mockReturnValue(null);
    requireSuperAdminApiAccess.mockResolvedValue({ ok: false, code: 'FORBIDDEN', status: 403 });
  });

  it('preserves auth status and applies private response policy', async () => {
    requireAdminApiAccess.mockResolvedValue({ ok: false, code: 'UNAUTHORIZED', status: 401 });
    const handler = vi.fn();
    const route = createAdminApiRoute({ permission: 'admin_dashboard' }, handler);

    const response = await route(request('trusted-request-123'));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, code: 'UNAUTHORIZED', requestId: 'trusted-request-123' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-request-id')).toBe('trusted-request-123');
    expect(rateLimitRequest).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({
      max: 90,
      prefix: 'admin-api:GET:/api/admin/test',
      windowMs: 60_000,
    }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('fails closed when the access service throws', async () => {
    requireAdminApiAccess.mockRejectedValue(new Error('secret provider detail'));
    const route = createAdminApiRoute({}, vi.fn());

    const response = await route(request());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ ok: false, code: 'SERVICE_NOT_CONFIGURED' });
    expect(JSON.stringify(payload)).not.toContain('secret provider detail');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rate limits before authentication and finalizes the limiter response', async () => {
    rateLimitRequest.mockReturnValue(new Response(JSON.stringify({ ok: false, code: 'RATE_LIMITED' }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    }));
    const route = createAdminApiRoute({ rateLimit: { max: 1, prefix: 'test' } }, vi.fn());

    const response = await route(request('limited-request-123'));

    expect(response.status).toBe(429);
    expect(requireAdminApiAccess).not.toHaveBeenCalled();
    expect(response.headers.get('x-request-id')).toBe('limited-request-123');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('passes verified auth to the handler and preserves its response body', async () => {
    const auth = { ok: true, user: { id: 'user-1' }, access: {}, admin: {} };
    requireAdminApiAccess.mockResolvedValue(auth);
    const route = createAdminApiRoute({}, async ({ auth: verified, json }) => {
      expect(verified).toBe(auth);
      return json({ ok: true, value: 42 }, { status: 201 });
    });

    const response = await route(request('success-request-123'));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, value: 42 });
    expect(response.headers.get('x-request-id')).toBe('success-request-123');
  });

  it('uses the elevated access check for a declared super-admin route', async () => {
    const auth = { ok: true, user: { id: 'super-1' }, access: { isSuperAdmin: true }, admin: {} };
    requireSuperAdminApiAccess.mockResolvedValue(auth);
    const handler = vi.fn(({ json }) => json({ ok: true }));
    const route = createAdminApiRoute({ access: 'super-admin' }, handler);

    const response = await route(request('super-request-123'));

    expect(response.status).toBe(200);
    expect(requireSuperAdminApiAccess).toHaveBeenCalledOnce();
    expect(requireAdminApiAccess).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not expose handler exceptions', async () => {
    requireAdminApiAccess.mockResolvedValue({ ok: true, user: {}, access: {}, admin: {} });
    const route = createAdminApiRoute({}, async () => {
      throw new Error('database credential leaked');
    });

    const response = await route(request('failure-request-123'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({ ok: false, code: 'INTERNAL_ERROR', requestId: 'failure-request-123' });
    expect(JSON.stringify(payload)).not.toContain('database credential leaked');
  });
});
