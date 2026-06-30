import { getAdminAccessForUser, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { adminJson } from '@/lib/server/adminRoleManagement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return adminJson({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

  const access = await getAdminAccessForUser(user);
  return adminJson({
    ok: true,
    isAdmin: access.isAdmin,
    isSuperAdmin: access.isSuperAdmin,
    role: access.role,
    roleId: access.roleId,
    permissions: access.permissions,
    email: user.email ?? null,
  });
}
