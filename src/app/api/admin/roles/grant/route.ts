import { requireSuperAdminApiAccess, type AdminRoleRow } from '@/lib/server/adminAccess';
import {
  adminJson,
  logAdminAudit,
  parsePermissionsForWrite,
  permissionsToJson,
  resolveTargetUser,
  roleSnapshot,
  validateAdminRoleChange,
} from '@/lib/server/adminRoleManagement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireSuperAdminApiAccess(request);
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, { status: auth.status });

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return adminJson({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

  const target = await resolveTargetUser(auth.admin, payload);
  if (!target) return adminJson({ ok: false, code: 'USER_NOT_FOUND' }, { status: 404 });

  const validation = validateAdminRoleChange(auth.user, target);
  if (!validation.ok) return adminJson({ ok: false, code: validation.code }, { status: validation.status });

  const permissions = parsePermissionsForWrite(payload.permissions);
  const oldValue = roleSnapshot(target.role);
  const action = target.role?.is_active ? 'update_permissions' : 'grant_admin';

  const { data, error } = await auth.admin
    .from('admin_roles')
    .upsert({
      user_id: target.id,
      email: target.email,
      display_name: target.displayName,
      role: 'admin',
      permissions: permissionsToJson(permissions),
      is_active: true,
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .single();

  if (error) {
    console.error('[admin-roles] grant failed', { code: error.code, message: error.message });
    return adminJson({ ok: false, code: 'GRANT_FAILED' }, { status: 500 });
  }

  const role = data as AdminRoleRow;
  await logAdminAudit(auth.admin, {
    actor: auth.user,
    target,
    action,
    oldValue,
    newValue: roleSnapshot(role),
  });

  return adminJson({ ok: true, role: roleSnapshot(role) });
}
