import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import ShariahAdminClient from './ShariahAdminClient';

export const dynamic = 'force-dynamic';

export default async function ShariahAdminPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control/shariah', 'admin_dashboard');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  return <ShariahAdminClient reviewer={auth.access.email ?? auth.user.email ?? ''} />;
}
