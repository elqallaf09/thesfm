import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  user: vi.fn(), rate: vi.fn(), configured: vi.fn(), health: vi.fn(),
}));

vi.mock('@/lib/server/adminAccess', () => ({ getCurrentUserFromRequest: mocks.user }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/lib/server/aiProvider', () => ({ aiProviderConfigured: mocks.configured, checkPrivateAiHealth: mocks.health }));

import { GET } from '@/app/api/ai/private-health/route';

const request = () => new NextRequest('https://example.test/api/ai/private-health');

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'owner' });
  mocks.rate.mockReturnValue({ allowed: true });
  mocks.configured.mockReturnValue(true);
  mocks.health.mockResolvedValue([
    { provider: 'sfm-private-primary', configured: true, reachable: true, model: 'sfm-primary', latencyMs: 42, status: 200 },
  ]);
});

afterEach(() => vi.restoreAllMocks());

describe('SFM Private AI health route', () => {
  it('requires an authenticated user', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.health).not.toHaveBeenCalled();
  });

  it('does not claim readiness without private provider configuration', async () => {
    mocks.configured.mockReturnValue(false);
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'SFM_PRIVATE_AI_NOT_CONFIGURED' }, nodes: [] });
    expect(mocks.health).not.toHaveBeenCalled();
  });

  it('returns only non-secret node health metadata', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, service: 'sfm-private-ai', reachable: 1, configured: 1 });
    expect(JSON.stringify(body)).not.toContain('key');
    expect(response.headers.get('cache-control')).toContain('private, no-store');
  });

  it('returns 503 when configured nodes are unreachable', async () => {
    mocks.health.mockResolvedValue([
      { provider: 'sfm-private-primary', configured: true, reachable: false, model: 'sfm-primary', latencyMs: 22001, status: null },
    ]);
    expect((await GET(request())).status).toBe(503);
  });
});
