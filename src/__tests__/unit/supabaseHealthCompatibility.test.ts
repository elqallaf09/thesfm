import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/server/adminAccess', () => ({
  requireAdminApiAccess: vi.fn(),
}));

vi.mock('@/lib/server/rateLimiter', () => ({
  rateLimitRequest: vi.fn(() => null),
}));

import { GET } from '@/app/api/health/database/route';

describe('database health Supabase key compatibility', () => {
  beforeEach(() => {
    mocks.createClient.mockReset().mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ error: null }),
      })),
    });
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://preview.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'legacy-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the preferred publishable key for a healthy public probe', async () => {
    const response = await GET(new Request('https://preview.example/api/health/database'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, database: 'available' });
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://preview.supabase.co',
      'publishable-key',
      expect.any(Object),
    );
  });

  it('keeps the legacy anon key working for the health probe', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');

    const response = await GET(new Request('https://preview.example/api/health/database'));

    expect(response.status).toBe(200);
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://preview.supabase.co',
      'legacy-anon-key',
      expect.any(Object),
    );
  });
});
