import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminAnalyticsClient from './AdminAnalyticsClient';
import { getUserFromBearerToken, isAdminEmail } from '@/lib/server/adminAccess';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);

  if (!user) redirect('/login?next=/sfm-admin-control');
  if (!isAdminEmail(user.email)) redirect('/dashboard');

  return <AdminAnalyticsClient />;
}
