import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAdminAccessForUser } from '@/lib/server/adminAccess';

type RoleResult = {
  data: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
};

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';

function roleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    user_id: userId,
    email: 'admin-fixture@example.test',
    display_name: 'Preview Admin',
    role: 'admin',
    permissions: { admin_dashboard: true },
    is_active: true,
    created_by: null,
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
    ...overrides,
  };
}

function mockRoleClient(result: RoleResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const client = { from: vi.fn().mockReturnValue(query) };
  return { client, query };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('admin authorization resolution', () => {
  it('denies a normal user without an explicit role', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'legacy-super@example.test');
    const { client } = mockRoleClient({ data: null, error: null });

    const access = await getAdminAccessForUser({ id: userId, email: 'user@example.test' }, client as never);

    expect(access).toMatchObject({ isAdmin: false, isSuperAdmin: false, role: null });
  });

  it('honors an active explicit admin role before the email fallback', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin-fixture@example.test');
    const { client, query } = mockRoleClient({ data: roleRow(), error: null });

    const access = await getAdminAccessForUser({ id: userId, email: 'ADMIN-FIXTURE@example.test' }, client as never);

    expect(client.from).toHaveBeenCalledWith('admin_roles');
    expect(query.eq).toHaveBeenCalledOnce();
    expect(query.eq).toHaveBeenCalledWith('user_id', userId);
    expect(access).toMatchObject({ isAdmin: true, isSuperAdmin: false, role: 'admin' });
    expect(access.permissions.admin_dashboard).toBe(true);
  });

  it('preserves the legacy super-admin fallback when no role row exists', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'legacy-super@example.test');
    const { client } = mockRoleClient({ data: null, error: null });

    const access = await getAdminAccessForUser({ id: userId, email: 'LEGACY-SUPER@example.test' }, client as never);

    expect(access).toMatchObject({ isAdmin: true, isSuperAdmin: true, role: 'super_admin', roleId: null });
  });

  it('denies an inactive explicit role instead of re-granting the email fallback', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin-fixture@example.test');
    const { client } = mockRoleClient({ data: roleRow({ is_active: false }), error: null });

    const access = await getAdminAccessForUser({ id: userId, email: 'admin-fixture@example.test' }, client as never);

    expect(access).toMatchObject({ isAdmin: false, isSuperAdmin: false, role: null });
  });

  it('rejects a role row that does not belong to the authenticated user', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', '');
    const { client } = mockRoleClient({ data: roleRow({ user_id: otherUserId }), error: null });

    const access = await getAdminAccessForUser({ id: userId, email: 'admin-fixture@example.test' }, client as never);

    expect(access).toMatchObject({ isAdmin: false, isSuperAdmin: false, role: null });
  });

  it('fails closed on role lookup errors without leaking another user role', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin-fixture@example.test');
    const { client } = mockRoleClient({ data: null, error: { code: 'PGRST000', message: 'lookup unavailable' } });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const access = await getAdminAccessForUser({ id: userId, email: 'admin-fixture@example.test' }, client as never);

    expect(access).toMatchObject({ isAdmin: false, isSuperAdmin: false, role: null });
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
