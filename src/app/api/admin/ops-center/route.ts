import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { getOperationsCenterState } from '@/lib/admin/opsCenter/aggregateOperationsCenter';
import { buildOperationsHealthSummary } from '@/lib/admin/opsCenter/healthTruth';
import { getCalendarHealthMeasurement } from '@/lib/admin/opsCenter/calendarHealth';
import { getCatalogRefreshMeasurement } from '@/lib/admin/opsCenter/catalogHealth';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

export const GET = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 30, windowMs: 60_000, prefix: 'admin-ops-center' },
}, async ({ request, json }) => {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.get('forceFresh') === '1';
  const state = await getOperationsCenterState({ forceFresh });
  return json({ ok: true, generatedAt: state.generatedAt, state });
});

const ACTIONS = new Set(['retry_market_providers', 'refresh_symbol_catalog', 'check_service_health', 'refresh_economic_calendar']);

export const POST = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 6, windowMs: 60_000, prefix: 'admin-ops-center-action' },
}, async ({ request, requestId, json }) => {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ ok: false, code: 'INVALID_ORIGIN' }, { status: 403 });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return json({ ok: false, code: 'INVALID_CONTENT_TYPE' }, { status: 415 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => key !== 'action') || !('action' in body)
    || typeof body.action !== 'string' || !ACTIONS.has(body.action)) {
    return json({ ok: false, code: 'UNSUPPORTED_ACTION' }, { status: 400 });
  }

  const action = body.action;
  const startedAt = Date.now();
  console.info('[ops-center] action started', { action, requestId });

  // Rebuild the actual catalog. Reading the Operations Center snapshot alone is not this action.
  const catalog = action === 'refresh_symbol_catalog' ? await getTraderMarketCatalog({ forceFresh: true }) : null;
  const catalogCheckedAt = new Date().toISOString();

  const calendar = action === 'refresh_economic_calendar' ? await getEconomicCalendar({
    from: new Date(startedAt).toISOString().slice(0, 10),
    to: new Date(startedAt + 14 * 86_400_000).toISOString().slice(0, 10),
    force: true,
  }) : null;
  const state = await getOperationsCenterState({
    forceFresh: action === 'retry_market_providers' || action === 'refresh_symbol_catalog',
    forceServiceHealth: action === 'check_service_health',
    ...(catalog ? { prefetchedCatalog: catalog } : {}),
  });
  if (catalog) {
    state.featureMeasurements = {
      ...state.featureMeasurements,
      market_data: getCatalogRefreshMeasurement(state, catalog, startedAt, catalogCheckedAt),
    };
  }
  if (calendar) {
    const measurement = await getCalendarHealthMeasurement(calendar);
    state.featureMeasurements = { ...state.featureMeasurements, economic_calendar: measurement };
    state.calendarHealth = measurement.status;
  }
  const snapshot = { ...state, ...buildOperationsHealthSummary(state) };
  const relatedFeatures = action === 'check_service_health' ? ['ai_services', 'notifications', 'storage']
    : action === 'refresh_economic_calendar' ? ['economic_calendar'] : ['market_data'];
  const related = snapshot.featureHealth.filter(row => relatedFeatures.includes(row.feature));
  const hasFindings = related.some(row => row.status === 'failed' || row.status === 'partial');
  const hasGaps = related.some(row => row.status === 'unmeasured' || row.status === 'uninstrumented');
  const messageKey = hasFindings ? 'ops_center_action_completed_with_findings'
    : hasGaps ? 'ops_center_action_completed_measurements_missing'
    : action === 'refresh_symbol_catalog' ? 'ops_center_action_catalog_refreshed'
    : action === 'refresh_economic_calendar' ? 'ops_center_action_calendar_refreshed'
    : action === 'check_service_health' ? 'ops_center_action_services_checked' : 'ops_center_action_providers_checked';

  console.info('[ops-center] action completed', { action, requestId, durationMs: Date.now() - startedAt, hasFindings, hasGaps });
  return json({
    ok: true,
    state: snapshot,
    generatedAt: snapshot.generatedAt,
    result: { actionId: action, ok: true, messageKey, completedAt: new Date().toISOString() },
  });
});
