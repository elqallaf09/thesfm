import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { runDisclosureAudit } from '@/lib/market-data/disclosureAudit.server';
import { ProviderError } from '@/lib/providers/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 2, windowMs: 60_000, prefix: 'admin-disclosure-audit' },
}, async ({ request, json }) => {
  const body: unknown = await request.json().catch(() => null);
  const chamber = body && typeof body === 'object' && 'chamber' in body ? body.chamber : null;
  if (chamber !== 'senate' && chamber !== 'house') return json({ ok: false, code: 'invalid_chamber' }, { status: 400 });
  try {
    return json({ ok: true, audit: await runDisclosureAudit(chamber) });
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 'provider_error';
    // Account restrictions and quota errors are not a general provider outage.
    return json({ ok: false, provider: 'fmp', status, code: error instanceof ProviderError ? error.messageCode : 'provider_temporarily_unavailable' }, {
      status: status === 'rate_limited' ? 429 : ['not_configured', 'not_entitled', 'unauthorized'].includes(status) ? 424 : 502,
    });
  }
});
