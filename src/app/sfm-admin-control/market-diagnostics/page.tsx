import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import MarketDiagnosticsClient from './MarketDiagnosticsClient';

export const dynamic = 'force-dynamic';

export default async function MarketDiagnosticsPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control/market-diagnostics', 'admin_dashboard');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  return <MarketDiagnosticsClient />;
}
