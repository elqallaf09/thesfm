import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createAdmin: vi.fn(), insert: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.createAdmin }));

import { POST } from '@/app/api/observability/route';

function payload() {
  return { events: [{
    type: 'web_vital', name: 'LCP', value: 2500, rating: 'good', route: '/projects/3f57a8c2-c1aa-4fd0-b4bc-193c956b2ed1?tab=finance',
    timestamp: new Date().toISOString(), sessionId: 'abcdef1234567890', authenticated: false, locale: 'en', theme: 'light',
    viewportClass: 'large', deviceClass: 'desktop', browserFamily: 'Chrome', networkClass: '4g',
    deploymentSha: 'untrusted-client-sha', buildVersion: 'untrusted', environment: 'preview',
  }] };
}

function request(body: string, ip = `test-${Math.random()}`, headers: Record<string, string> = {}) {
  return new Request('https://www.the-sfm.com/api/observability', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://www.the-sfm.com', 'x-forwarded-for': ip, ...headers }, body });
}

describe('POST /api/observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_OBSERVABILITY_ENABLED', 'true');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'server-deployment-sha');
    mocks.insert.mockResolvedValue({ error: null });
    mocks.createAdmin.mockReturnValue({ from: vi.fn(() => ({ insert: mocks.insert })) });
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('accepts only whitelisted data and attributes the server deployment', async () => {
    const response = await POST(request(JSON.stringify(payload())));
    expect(response.status).toBe(204);
    const rows = mocks.insert.mock.calls[0][0];
    expect(rows[0]).toMatchObject({ deployment_sha: 'server-deployment-sha', environment: 'production', route_template: '/projects/[id]' });
    expect(JSON.stringify(rows[0])).not.toContain('tab=finance');
    expect(JSON.stringify(rows[0])).not.toContain('untrusted-client-sha');
  });

  it('rejects wrong origin, wrong content type, secret fields, and oversized payloads', async () => {
    expect((await POST(new Request('https://www.the-sfm.com/api/observability', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify(payload()) }))).status).toBe(403);
    expect((await POST(new Request('https://www.the-sfm.com/api/observability', { method: 'POST', headers: { 'content-type': 'text/plain', origin: 'https://www.the-sfm.com' }, body: '{}' }))).status).toBe(415);
    expect((await POST(request(JSON.stringify({ events: [{ ...payload().events[0], access_token: 'hidden' }] })))).status).toBe(400);
    expect((await POST(request('{}', 'large', { 'content-length': '70000' }))).status).toBe(413);
  });

  it('rate limits repeated ingestion without persisting the full IP', async () => {
    mocks.createAdmin.mockReturnValue(null);
    const ip = `rate-${Math.random()}`;
    for (let index = 0; index < 30; index += 1) await POST(request(JSON.stringify(payload()), ip));
    const blocked = await POST(request(JSON.stringify(payload()), ip));
    expect(blocked.status).toBe(429);
  });
});
