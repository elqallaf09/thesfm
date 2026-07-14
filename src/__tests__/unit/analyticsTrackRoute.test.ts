import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdmin: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: mocks.createAdmin,
  getUserFromBearerToken: mocks.getUser,
}));

import { POST } from '@/app/api/analytics/track/route';

function request() {
  return new Request('https://www.the-sfm.com/api/analytics/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event_type: 'page_view',
      page_path: '/dashboard',
      session_id: 'unit-test-session',
    }),
  });
}

describe('POST /api/analytics/track configuration diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAdmin.mockReturnValue(null);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('DATABASE_SERVICE_ROLE_KEY', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns the existing ignored response and warns only once with missing variable names', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const first = await POST(request());
    const second = await POST(request());

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      ok: false,
      ignored: true,
      code: 'ANALYTICS_SERVICE_NOT_CONFIGURED',
    });
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      ok: false,
      ignored: true,
      code: 'ANALYTICS_SERVICE_NOT_CONFIGURED',
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[analytics] tracking disabled: incomplete Supabase configuration',
      { missing: 'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY' },
    );
  });
});
