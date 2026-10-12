import { beforeEach, describe, expect, it, vi } from 'vitest';
const { requireAdminApiAccess, rateLimitRequest, runDisclosureAudit } = vi.hoisted(() => ({ requireAdminApiAccess: vi.fn(), rateLimitRequest: vi.fn(), runDisclosureAudit: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ requireAdminApiAccess, requireSuperAdminApiAccess: vi.fn() }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest }));
vi.mock('@/lib/market-data/disclosureAudit.server', () => ({ runDisclosureAudit }));
import { GET } from '@/app/api/admin/market-data/registry/route';
import { POST } from '@/app/api/admin/market-data/disclosures/route';
import { ProviderError } from '@/lib/providers/shared';

const request = (body: unknown = { chamber: 'house' }) => new Request('https://example.test/api/admin/market-data/disclosures', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); rateLimitRequest.mockReturnValue(null); requireAdminApiAccess.mockResolvedValue({ ok: true, admin: {}, user: {}, access: {} }); });

describe('market data admin boundaries', () => {
  it.each([401, 403])('denies %s before reading contracts or using FMP quota', async status => {
    requireAdminApiAccess.mockResolvedValue({ ok: false, code: 'FORBIDDEN', status });
    expect((await POST(request())).status).toBe(status);
    expect((await GET(new Request('https://example.test/api/admin/market-data/registry'))).status).toBe(status);
    expect(runDisclosureAudit).not.toHaveBeenCalled();
  });
  it('validates the chamber before making provider requests', async () => {
    expect((await POST(request({ chamber: '../quote?apikey=unsafe' }))).status).toBe(400);
    expect(runDisclosureAudit).not.toHaveBeenCalled();
  });
  it('returns a private count-only audit with no raw payload', async () => {
    runDisclosureAudit.mockResolvedValue({ status: 'passed', checkedRows: 50 });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ ok: true, audit: { status: 'passed' } });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(requireAdminApiAccess).toHaveBeenCalledWith(expect.any(Request), 'admin_dashboard');
  });
  it('distinguishes entitlement denial from an outage and removes provider messages', async () => {
    runDisclosureAudit.mockRejectedValue(new ProviderError('not_entitled', 'provider_access_denied', 403, 'private-provider-payload'));
    const response = await POST(request());
    expect(response.status).toBe(424);
    expect(await response.json()).toEqual({ ok: false, provider: 'fmp', status: 'not_entitled', code: 'provider_access_denied' });
  });
  it('does not consume FMP quota after the admin limiter rejects a request', async () => {
    rateLimitRequest.mockReturnValue(new Response(null, { status: 429 }));
    expect((await POST(request())).status).toBe(429);
    expect(runDisclosureAudit).not.toHaveBeenCalled();
  });
});
