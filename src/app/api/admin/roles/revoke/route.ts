import { requireSuperAdminApiAccess, type AdminRoleRow } from '@/lib/server/adminAccess';
import {
  adminJson,
  logAdminAudit,
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
  if (!target.role) return adminJson({ ok: false, code: 'ROLE_NOT_FOUND' }, { status: 404 });

  const oldValue = roleSnapshot(target.role);
  const { data, error } = await auth.admin
    .from('admin_roles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', target.id)
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .single();

  if (error) {
    console.error('[admin-roles] revoke failed', { code: error.code, message: error.message });
    return adminJson({ ok: false, code: 'REVOKE_FAILED' }, { status: 500 });
  }

  const role = data as AdminRoleRow;
  await logAdminAudit(auth.admin, {
    actor: auth.user,
    target,
    action: 'revoke_admin',
    oldValue,
    newValue: roleSnapshot(role),
  });

  return adminJson({ ok: true, role: roleSnapshot(role) });
}
