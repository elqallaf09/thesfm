import { requireSuperAdminApiAccess, type AdminRoleRow } from '@/lib/server/adminAccess';
import {
  adminJson,
  logAdminAudit,
  parsePermissionsForWrite,
  permissionsToJson,
  roleSnapshot,
} from '@/lib/server/adminRoleManagement';
import { isSuperAdminEmail } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSuperAdminApiAccess(request);
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, { status: auth.status });

  const { id } = await context.params;
  if (!id) return adminJson({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return adminJson({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

  const { data: current, error: loadError } = await auth.admin
    .from('admin_roles')
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .eq('id', id)
    .single();

  if (loadError || !current) return adminJson({ ok: false, code: 'ROLE_NOT_FOUND' }, { status: 404 });

  const role = current as AdminRoleRow;
  if (role.user_id === auth.user.id) {
    return adminJson({ ok: false, code: 'SELF_ADMIN_CHANGE_NOT_ALLOWED' }, { status: 400 });
  }
  if (isSuperAdminEmail(role.email)) {
    return adminJson({ ok: false, code: 'SUPER_ADMIN_ENV_LOCKED' }, { status: 400 });
  }

  const permissions = parsePermissionsForWrite(payload.permissions);
  const oldValue = roleSnapshot(role);
  const { data, error } = await auth.admin
    .from('admin_roles')
    .update({
      permissions: permissionsToJson(permissions),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .single();

  if (error) {
    console.error('[admin-roles] update permissions failed', { code: error.code, message: error.message });
    return adminJson({ ok: false, code: 'UPDATE_FAILED' }, { status: 500 });
  }

  const updated = data as AdminRoleRow;
  await logAdminAudit(auth.admin, {
    actor: auth.user,
    target: {
      id: role.user_id,
      email: role.email,
      username: null,
      displayName: role.display_name,
      role,
    },
    action: 'update_permissions',
    oldValue,
    newValue: roleSnapshot(updated),
  });

  return adminJson({ ok: true, role: roleSnapshot(updated) });
}
