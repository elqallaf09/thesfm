import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { marketDataRegistrySnapshot } from '@/lib/market-data/records.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 30, windowMs: 60_000, prefix: 'admin-market-data-registry' },
}, ({ json }) => json({ ok: true, registry: marketDataRegistrySnapshot() }));
