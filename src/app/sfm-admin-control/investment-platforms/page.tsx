import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/AdminAccessDenied';
import { isPotentialPlatformDuplicate, platformRowToDirectoryItem } from '@/lib/investments/platformDirectory';
import { requireAdminPageAccess } from '@/lib/server/adminAccess';
import InvestmentPlatformsAdminClient from './InvestmentPlatformsAdminClient';

export const dynamic = 'force-dynamic';

const ADMIN_COLUMNS = 'id,canonical_name,normalized_name,slug,platform_type,website_url,logo_url,country_code,aliases,status,is_seeded,approved_at,created_at,updated_at';

export default async function InvestmentPlatformsAdminPage() {
  const auth = await requireAdminPageAccess('/sfm-admin-control/investment-platforms', 'company_reviews');
  if (!auth.ok && auth.reason === 'unauthenticated') redirect(auth.redirectTo);
  if (!auth.ok) return <AdminAccessDenied />;

  const { data, error } = await auth.admin
    .from('investment_platforms')
    .select(ADMIN_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[AdminInvestmentPlatforms] fetch failed', { code: error.code, message: error.message });
  }

  const items = (data ?? []).map(row => platformRowToDirectoryItem(row as Record<string, unknown>));
  return (
    <InvestmentPlatformsAdminClient
      initialItems={items.map(item => ({
        ...item,
        potentialDuplicates: items
          .filter(candidate => candidate.id !== item.id && isPotentialPlatformDuplicate(item.canonicalName, candidate.canonicalName))
          .slice(0, 5)
          .map(candidate => ({ id: candidate.id, name: candidate.canonicalName, status: candidate.status })),
      }))}
    />
  );
}
