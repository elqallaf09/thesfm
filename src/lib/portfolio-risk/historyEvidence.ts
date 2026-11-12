import { analyzePortfolioSeries, type NavPoint, type PortfolioRiskSnapshot } from './series';

export const HISTORY_VERIFICATION = 'server_verified_portfolio_history_v1';
export const CALENDAR_VERIFICATION = 'server_verified_portfolio_calendar_v1';
export const HISTORY_SCHEMA = 'portfolio-nav-history-v1';
export const CALENDAR_SCHEMA = 'portfolio-valuation-calendar-v1';
export const MAX_HISTORY_POINTS = 3660;
export type StoredHistoryEvidence = {
  id: string; user_id: string; source: string; observed_at: string; received_at: string; payload: unknown;
};
export type HistoricalRiskSnapshot = PortfolioRiskSnapshot & {
  evidence: {
    sourceName: string; calendarName: string; timeZone: string; periodsPerYear: number;
    verifiedAt: string; valuedAt: string; fxPolicy: string; valuationPolicy: string;
    scope: 'all_recorded_investments_long_only'; flowTiming: 'end_of_period';
    concentrationBasis: 'period_end_assets_and_cash';
  };
};
export type HistoricalRiskResult = { ok: true; snapshot: HistoricalRiskSnapshot } | { ok: false; code: string };
export const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 240): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const instant = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export const historyDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const fail = (code: string): HistoricalRiskResult => ({ ok: false, code });

/**
 * A server-only reader supplies these records after session/MFA authorization.
 * A marker is trusted ONLY in the protected store; never call this on request JSON.
 * The public connector writes user_connector_supplied and cannot set these markers.
 * This adapter verifies consistency; it is NOT a broker-import approval mechanism.
 */
export function adaptVerifiedHistory(input: {
  ownerId: string; history: StoredHistoryEvidence; calendar: StoredHistoryEvidence;
  expectedPositions: Array<{ id: string; assetId: string }>; expectedCurrency: string; now: number;
}): HistoricalRiskResult {
  const { ownerId, history, calendar, expectedPositions, expectedCurrency, now } = input;
  if (!Number.isFinite(now) || !ownerId || history.user_id !== ownerId || calendar.user_id !== ownerId || history.id === calendar.id) return fail('HISTORY_SCOPE_MISMATCH');
  const h = history.payload;
  const c = calendar.payload;
  if (history.source !== 'custom' || calendar.source !== 'custom' || !isRecord(h) || !isRecord(c) ||
      h.schema !== HISTORY_SCHEMA || h.verification !== HISTORY_VERIFICATION ||
      c.schema !== CALENDAR_SCHEMA || c.verification !== CALENDAR_VERIFICATION) return fail('HISTORY_UNVERIFIED_SOURCE');
  if (!uuid(h.calendarId) || h.calendarId !== calendar.id || h.scope !== 'all_recorded_investments_long_only' ||
      c.scope !== h.scope || !text(h.currency, 3) || !/^[A-Z]{3}$/.test(h.currency) || h.currency !== expectedCurrency || c.currency !== h.currency) return fail('HISTORY_SCOPE_MISMATCH');
  if (!text(h.sourceName) || !text(h.sourceReference, 500) || !text(c.sourceName) || !text(c.sourceReference, 500) ||
      h.sourceReference === c.sourceReference || h.rights !== 'account_analytics_permitted' || c.rights !== 'account_analytics_permitted') return fail('HISTORY_UNVERIFIED_SOURCE');
  for (const [row, payload] of [[history, h], [calendar, c]] as const) {
    if (!instant(row.observed_at) || !instant(row.received_at) || !instant(payload.verifiedAt) ||
        Date.parse(row.observed_at) > Date.parse(payload.verifiedAt) || Date.parse(payload.verifiedAt) > Date.parse(row.received_at) || Date.parse(row.received_at) > now) return fail('HISTORY_INVALID_TIMESTAMPS');
  }
  const coverage = h.coverage;
  if (!isRecord(coverage) || coverage.positions !== 'complete_over_time' || coverage.cash !== 'included' ||
      coverage.externalFlows !== 'complete' || coverage.corporateActions !== 'accounted_for' ||
      coverage.liabilities !== 'none' || coverage.shortPositions !== 'none' || h.flowTiming !== 'end_of_period') return fail('HISTORY_INCOMPLETE_COVERAGE');
  if (coverage.fx !== 'synchronized_to_valuation' || !text(h.fxPolicy, 500) || !text(c.valuationPolicy, 500)) return fail('HISTORY_FX_OR_CALENDAR_UNVERIFIED');
  if (!finite(c.periodsPerYear) || !Number.isSafeInteger(c.periodsPerYear) || c.periodsPerYear < 1 || c.periodsPerYear > 366 || !text(c.timeZone, 100)) return fail('HISTORY_FX_OR_CALENDAR_UNVERIFIED');
  let dateFormatter: Intl.DateTimeFormat;
  try { dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: c.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return fail('HISTORY_FX_OR_CALENDAR_UNVERIFIED'); }
  if (!Array.isArray(c.sessions) || c.sessions.length < 61 || c.sessions.length > MAX_HISTORY_POINTS ||
      !Array.isArray(h.points) || h.points.length !== c.sessions.length) return fail('HISTORY_INCOMPLETE_DATES');
  const points: NavPoint[] = [];
  const expectedDates: string[] = [];
  let previousCutoff = -Infinity;
  for (let i = 0; i < c.sessions.length; i += 1) {
    const session: unknown = c.sessions[i];
    const point: unknown = h.points[i];
    if (!isRecord(session) || !historyDate(session.date) || !instant(session.at) ||
        (i > 0 && session.date <= expectedDates[i - 1]) || Date.parse(session.at) <= previousCutoff || Date.parse(session.at) > now) return fail('HISTORY_INVALID_CALENDAR');
    const parts = dateFormatter.formatToParts(new Date(session.at));
    const part = (type: string) => parts.find(item => item.type === type)?.value;
    if (`${part('year')}-${part('month')}-${part('day')}` !== session.date) return fail('HISTORY_INVALID_CALENDAR');
    if (!isRecord(point) || point.date !== session.date || !instant(point.at) || Date.parse(point.at) !== Date.parse(session.at)) return fail('HISTORY_INCOMPLETE_DATES');
    if (!finite(point.nav) || point.nav <= 0 || !finite(point.netExternalFlow)) return fail('HISTORY_INVALID_VALUES');
    expectedDates.push(session.date);
    points.push({ date: session.date, nav: point.nav, netExternalFlow: point.netExternalFlow });
    previousCutoff = Date.parse(session.at);
  }
  if (previousCutoff !== Date.parse(history.observed_at)) return fail('HISTORY_INVALID_TIMESTAMPS');
  // Do not invent a zero for a missing cash balance, absent position or missing flow.
  if (!Array.isArray(expectedPositions) || !expectedPositions.length || expectedPositions.length >= 5000 ||
      !Array.isArray(h.endPositions) || h.endPositions.length !== expectedPositions.length || !finite(h.endCashBase) || h.endCashBase < 0) return fail('HISTORY_POSITION_COVERAGE_MISMATCH');
  const assets = new Map<string, string>();
  for (const position of expectedPositions) {
    if (!position || !text(position.id, 160) || !text(position.assetId, 500) || assets.has(position.id)) return fail('HISTORY_POSITION_COVERAGE_MISMATCH');
    assets.set(position.id, position.assetId);
  }
  const remaining = new Set(assets.keys());
  const grouped = new Map<string, number>();
  for (const position of h.endPositions as unknown[]) {
    if (!isRecord(position) || !text(position.positionId, 160) || !remaining.delete(position.positionId) ||
        !text(position.assetId, 500) || !finite(position.valueBase) || position.valueBase < 0) return fail('HISTORY_POSITION_COVERAGE_MISMATCH');
    if (assets.get(position.positionId) !== position.assetId) return fail('HISTORY_POSITION_IDENTITY_MISMATCH');
    const key = JSON.stringify(['asset', position.assetId]);
    grouped.set(key, (grouped.get(key) ?? 0) + position.valueBase);
  }
  if (remaining.size) return fail('HISTORY_POSITION_COVERAGE_MISMATCH');
  if (h.endCashBase > 0) grouped.set(JSON.stringify(['cash', h.currency]), h.endCashBase);
  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
  const lastNav = points[points.length - 1].nav;
  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - lastNav) > Math.max(1e-6, lastNav * 1e-8)) return fail('HISTORY_NAV_RECONCILIATION_FAILED');
  const result = analyzePortfolioSeries({ points, weights: [...grouped.values()].map(value => value / total), currency: h.currency, periodsPerYear: c.periodsPerYear, expectedDates });
  if ('error' in result) return fail('HISTORY_INVALID_VALUES');
  return { ok: true, snapshot: { ...result, evidence: {
    sourceName: h.sourceName, calendarName: c.sourceName, timeZone: c.timeZone, periodsPerYear: c.periodsPerYear,
    verifiedAt: h.verifiedAt as string, valuedAt: history.observed_at, fxPolicy: h.fxPolicy, valuationPolicy: c.valuationPolicy,
    scope: 'all_recorded_investments_long_only', flowTiming: 'end_of_period', concentrationBasis: 'period_end_assets_and_cash',
  } } };
}

/** Defensive browser boundary. Does not establish the source's authenticity. */
export function isHistoricalRiskSnapshot(value: unknown): value is HistoricalRiskSnapshot {
  if (!isRecord(value) || !isRecord(value.metrics) || !isRecord(value.concentration) || !isRecord(value.dataQuality) || !isRecord(value.evidence)) return false;
  const { metrics: m, concentration: c, evidence: e } = value;
  const fraction = (v: unknown): v is number => finite(v) && v >= 0 && v <= 1;
  return value.methodologyVersion === 'risk-v2' && historyDate(value.periodStart) && historyDate(value.periodEnd) && value.periodStart < value.periodEnd &&
    typeof value.currency === 'string' && /^[A-Z]{3}$/.test(value.currency) &&
    finite(m.observations) && Number.isSafeInteger(m.observations) && m.observations >= 60 && m.observations < MAX_HISTORY_POINTS &&
    finite(m.volatilityAnnualized) && m.volatilityAnnualized >= 0 && fraction(m.historicalVar95) && fraction(m.historicalCvar95) &&
    m.historicalCvar95 + 1e-12 >= m.historicalVar95 && fraction(m.maximumDrawdown) &&
    fraction(c.hhi) && c.hhi > 0 && fraction(c.largestWeight) && c.largestWeight > 0 &&
    c.hhi + 1e-9 >= c.largestWeight ** 2 && c.hhi <= c.largestWeight + 1e-9 &&
    value.dataQuality.status === 'complete' && value.dataQuality.observations === m.observations &&
    e.scope === 'all_recorded_investments_long_only' && e.flowTiming === 'end_of_period' && e.concentrationBasis === 'period_end_assets_and_cash' &&
    text(e.sourceName) && text(e.calendarName) && text(e.timeZone, 100) && finite(e.periodsPerYear) && Number.isSafeInteger(e.periodsPerYear) && e.periodsPerYear >= 1 && e.periodsPerYear <= 366 &&
    instant(e.verifiedAt) && instant(e.valuedAt) && Date.parse(e.verifiedAt) >= Date.parse(e.valuedAt) && text(e.fxPolicy, 500) && text(e.valuationPolicy, 500);
}
