import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdminApiAccess: vi.fn(),
  getReceiptProviderStatus: vi.fn(),
}));

vi.mock('@/lib/server/adminAccess', () => ({
  requireAdminApiAccess: mocks.requireAdminApiAccess,
}));
vi.mock('@/lib/server/receiptProviderConfig', () => ({
  getReceiptProviderStatus: mocks.getReceiptProviderStatus,
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/receipts/provider-status/route';

function request(cookie?: string) {
  return new NextRequest('https://www.the-sfm.com/api/receipts/provider-status', {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('GET /api/receipts/provider-status authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReceiptProviderStatus.mockReturnValue({
      google: { configured: true },
      openai: { configured: false },
    });
  });

  it('rejects the legacy forged sfm_auth cookie when no authenticated admin exists', async () => {
    mocks.requireAdminApiAccess.mockResolvedValue({ ok: false, code: 'UNAUTHORIZED', status: 401 });

    const response = await GET(request('sfm_auth=true'));

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('private, no-store');
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
    expect(mocks.getReceiptProviderStatus).not.toHaveBeenCalled();
  });

  it('rejects an authenticated user without the admin_dashboard permission', async () => {
    mocks.requireAdminApiAccess.mockResolvedValue({ ok: false, code: 'FORBIDDEN', status: 403 });

    const response = await GET(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(mocks.getReceiptProviderStatus).not.toHaveBeenCalled();
  });

  it('returns provider configuration only after centralized admin authorization', async () => {
    mocks.requireAdminApiAccess.mockResolvedValue({ ok: true, user: { id: 'admin-1' }, access: {}, admin: {} });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('private, no-store');
    await expect(response.json()).resolves.toEqual({
      google: { configured: true },
      openai: { configured: false },
    });
    expect(mocks.requireAdminApiAccess).toHaveBeenCalledWith(expect.any(NextRequest), 'admin_dashboard');
  });

  it('fails closed when the authorization service throws', async () => {
    mocks.requireAdminApiAccess.mockRejectedValue(new Error('auth unavailable'));

    const response = await GET(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: 'SERVICE_NOT_CONFIGURED' });
    expect(mocks.getReceiptProviderStatus).not.toHaveBeenCalled();
  });
});
