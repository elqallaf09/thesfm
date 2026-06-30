import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';
import { requireSuperAdminPageAccess } from '@/lib/server/adminAccess';
import AdminPermissionsClient from './AdminPermissionsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPermissionsPage() {
  const auth = await requireSuperAdminPageAccess('/sfm-admin-control/admin-permissions');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  return <AdminPermissionsClient actorEmail={auth.user.email ?? ''} />;
}
