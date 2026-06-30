import { redirect } from 'next/navigation';
import { requireInstagramAutomationAdminPage } from '@/lib/server/instagramAutomation';
import InstagramAutomationClient from './InstagramAutomationClient';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function InstagramAutomationAdminPage() {
  const auth = await requireInstagramAutomationAdminPage('/sfm-admin-control/instagram-automation');
  if (!auth.ok && 'redirectTo' in auth && auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;
  return (
    <InstagramAutomationClient
      adminEmail={auth.user.email ?? ''}
      contentStyle={{ width: '100%', maxWidth: '100%', margin: 0 }}
    />
  );
}
