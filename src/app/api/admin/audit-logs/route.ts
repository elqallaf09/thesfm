import { requireSuperAdminApiAccess } from '@/lib/server/adminAccess';
import { adminJson } from '@/lib/server/adminRoleManagement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireSuperAdminApiAccess(request);
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, { status: auth.status });

  const { data, error } = await auth.admin
    .from('admin_audit_logs')
    .select('id,actor_user_id,actor_email,target_user_id,target_email,action,old_value,new_value,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[admin-audit-logs] load failed', { code: error.code, message: error.message });
    return adminJson({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }

  return adminJson({ ok: true, logs: data ?? [] });
}
