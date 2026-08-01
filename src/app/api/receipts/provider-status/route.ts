import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { getReceiptProviderStatus } from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createAdminApiRoute(
  { permission: 'admin_dashboard', rateLimit: { max: 30, windowMs: 60_000, prefix: 'receipt-provider-status' } },
  ({ json }) => json(getReceiptProviderStatus()),
);
