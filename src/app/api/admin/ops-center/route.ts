import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { getEconomicCalendarHealth } from '@/lib/providers/economic-calendar';
import { getOperationsCenterState } from '@/lib/admin/opsCenter/aggregateOperationsCenter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 30, windowMs: 60_000, prefix: 'admin-ops-center' },
}, async ({ request, json }) => {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.get('forceFresh') === '1';
  const [state, calendarHealth] = await Promise.all([getOperationsCenterState({ forceFresh }), getEconomicCalendarHealth()]);
  state.calendarHealth = calendarHealth;

  return json({ ok: true, generatedAt: state.generatedAt, state });
});
