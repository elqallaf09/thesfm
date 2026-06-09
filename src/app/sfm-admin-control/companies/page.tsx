import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserFromBearerToken, isAdminEmail, createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import CompanyAdminClient from './CompanyAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminCompaniesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);
  if (!user) redirect('/login?next=/sfm-admin-control/companies');
  if (!isAdminEmail(user.email)) redirect('/dashboard');

  const supabase = createServerSupabaseAdmin();
  const { data: companies, error } = await supabase
    .from('company_listings')
    .select('id, company_name, category, country, city, status, admin_notes, reviewed_at, reviewed_by, created_at, email, website_url, short_description, logo_url')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminCompanies] fetch error:', error);
  }

  return <CompanyAdminClient companies={companies ?? []} adminEmail={user.email ?? ''} />;
}
