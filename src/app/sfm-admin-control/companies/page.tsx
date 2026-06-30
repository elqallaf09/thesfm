import { redirect } from 'next/navigation';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import { COMPANY_LISTING_SELECT_COLUMNS, normalizeCompanyListing } from '@/lib/server/companyListingHelpers';
import CompanyAdminClient from './CompanyAdminClient';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminCompaniesPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control/companies', 'company_reviews');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  const supabase = auth.admin;
  const { data: companies, error } = await supabase
    .from('company_listings')
    .select(COMPANY_LISTING_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminCompanies] fetch error:', error);
  }

  return (
    <CompanyAdminClient
      companies={(companies ?? []).map(row => normalizeCompanyListing(row as Record<string, unknown>))}
      adminEmail={auth.user.email ?? ''}
    />
  );
}
