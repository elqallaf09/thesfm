import { requireSuperAdminApiAccess, type AdminRoleRow } from '@/lib/server/adminAccess';
import { adminJson, roleSnapshot } from '@/lib/server/adminRoleManagement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireSuperAdminApiAccess(request);
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, { status: auth.status });

  const { data, error } = await auth.admin
    .from('admin_roles')
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[admin-roles] list failed', { code: error.code, message: error.message });
    return adminJson({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }

  return adminJson({
    ok: true,
    roles: (data ?? []).map(row => roleSnapshot(row as AdminRoleRow)).filter(Boolean),
  });
}
