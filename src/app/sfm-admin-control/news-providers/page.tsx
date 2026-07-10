import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import NewsProvidersAdminClient from './NewsProvidersAdminClient';

export const dynamic = 'force-dynamic';

export default async function NewsProvidersAdminPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control/news-providers', 'admin_dashboard');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  return <NewsProvidersAdminClient />;
}
