import { redirect } from 'next/navigation';
import { requireInstagramAutomationAdminPage } from '@/lib/server/instagramAutomation';
import InstagramAutomationClient from './InstagramAutomationClient';

export const dynamic = 'force-dynamic';

export default async function InstagramAutomationAdminPage() {
  const auth = await requireInstagramAutomationAdminPage('/sfm-admin-control/instagram-automation');
  if (!auth.ok) redirect(auth.redirectTo);
  return <InstagramAutomationClient adminEmail={auth.user.email ?? ''} />;
}
