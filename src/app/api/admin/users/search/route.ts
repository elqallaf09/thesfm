import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { adminJson, adminUserToClient, cleanString, searchUsersForAdmin } from '@/lib/server/adminRoleManagement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createAdminApiRoute({ access: 'super-admin' }, async ({ request, auth }) => {
  const url = new URL(request.url);
  const query = cleanString(url.searchParams.get('query'), 120);
  if (query.length < 2) return adminJson({ ok: true, users: [] });

  try {
    const users = await searchUsersForAdmin(auth.admin, query);
    return adminJson({ ok: true, users: users.map(adminUserToClient) });
  } catch (error) {
    console.error('[admin-users-search] failed', error);
    return adminJson({ ok: false, code: 'SEARCH_FAILED' }, { status: 500 });
  }
});
