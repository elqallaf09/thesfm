import 'server-only';

import { getEconomicCalendarHealthReport } from '@/lib/providers/economic-calendar';
import type { EconomicCalendarResponse } from '@/lib/providers/economic-calendar/types';
import type { OpsFeatureHealthStatus, OpsFeatureMeasurement, OpsHealthEvidence } from './types';

/** Uses the calendar's own measured source results, independently of quote-provider health. */
export async function getCalendarHealthMeasurement(current?: EconomicCalendarResponse): Promise<OpsFeatureMeasurement> {
  const report = current ?? await getEconomicCalendarHealthReport();
  if (!report) {
    return {
      status: 'unmeasured',
      detailKey: 'ops_center_calendar_not_measured',
      evidence: [{
        source: 'SFM Economic Calendar', scope: 'none', capability: 'economic_calendar',
        checkedAt: null, lastSuccessAt: null,
        reasonKey: 'ops_center_calendar_not_measured', reason: null,
      }],
    };
  }

  const status: OpsFeatureHealthStatus = report.stale ? 'partial'
    : report.status !== 'success' ? 'failed' : report.partial ? 'partial' : 'healthy';
  const evidence: OpsHealthEvidence[] = (report.sources ?? []).map(source => ({
    source: source.provider, provider: source.provider, scope: 'runtime', capability: 'economic_calendar',
    status: source.status === 'success' ? 'healthy' : source.status === 'stale' ? 'partial' : 'failed',
    checkedAt: source.checkedAt, lastSuccessAt: source.lastSuccessfulUpdate,
    reasonKey: source.status === 'success' ? 'ops_center_calendar_source_current'
      : source.status === 'stale' ? 'ops_center_calendar_source_stale' : 'ops_center_calendar_source_failed',
    // Persisted provider codes are bounded identifiers, never raw upstream response bodies.
    reason: source.errorCode && /^[a-zA-Z0-9_-]{1,80}$/.test(source.errorCode) ? source.errorCode : null,
  }));
  if (evidence.length === 0) evidence.push({
    source: 'SFM Economic Calendar', scope: 'runtime', capability: 'economic_calendar', status,
    checkedAt: report.checkedAt ?? null, lastSuccessAt: report.lastSuccessfulUpdate ?? null,
    reasonKey: 'ops_center_calendar_source_details_missing', reason: null,
  });
  return {
    status,
    detailKey: status === 'healthy' ? null : report.stale ? 'ops_center_calendar_source_stale' : 'ops_center_calendar_sources_partial',
    evidence,
  };
}
