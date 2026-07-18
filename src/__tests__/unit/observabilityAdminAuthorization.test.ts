import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAccess: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ requireAdminApiAccess: mocks.requireAccess }));

import { GET } from '@/app/api/admin/observability/route';

describe('admin observability authorization', () => {
  it.each([[401, 'UNAUTHORIZED'], [403, 'FORBIDDEN']])('returns %s when admin access is denied', async (status, code) => {
    mocks.requireAccess.mockResolvedValue({ ok: false, status, code });
    const response = await GET(new Request('https://www.the-sfm.com/api/admin/observability'));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(mocks.requireAccess).toHaveBeenCalledWith(expect.any(Request), 'admin_dashboard');
  });
});
