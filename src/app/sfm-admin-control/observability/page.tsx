import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import ObservabilityDashboardClient from './ObservabilityDashboardClient';

export const dynamic = 'force-dynamic';

export default async function ObservabilityDashboardPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control/observability', 'admin_dashboard');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;
  return <ObservabilityDashboardClient />;
}
