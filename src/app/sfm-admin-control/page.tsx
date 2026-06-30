import { redirect } from 'next/navigation';
import AdminAnalyticsClient from './AdminAnalyticsClient';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control', 'admin_dashboard');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  return <AdminAnalyticsClient />;
}
