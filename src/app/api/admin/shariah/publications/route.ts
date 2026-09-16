import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { syncPublishedOpinions } from '@/lib/sharia-research/publishedOpinionCatalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;
export const POST = createAdminApiRoute({ permission: 'admin_dashboard', rateLimit: { max: 3, windowMs: 60_000, prefix: 'admin-shariah-publications' } }, async ({ request, auth, json }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, code: 'INVALID_ORIGIN' }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) return json({ ok: false, code: 'INVALID_PUBLICATION_OPTIONS' }, { status: 400 });
  const result = await syncPublishedOpinions(auth.admin, AbortSignal.timeout(30_000), true);
  return json(result, { status: result.ok ? 200 : result.saved > 0 ? 207 : 503 });
});
