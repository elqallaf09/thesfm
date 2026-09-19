import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFICIAL_CALENDAR_SOURCES, officialCalendarTime, parseBeaSchedule, parseBocSchedule, parseOfficialIcs } from '@/lib/providers/economic-calendar/official';
import { mergeCalendarEvents, selectCalendarEvents } from '@/lib/providers/economic-calendar/merge';
import { normalizeEconomicEvent } from '@/lib/market/normalizeEconomicEvents';
import { calendarSearchText } from '@/components/market-analysis/EconomicCalendarSources';
import { calculateFreshness, isDecisionFreshnessEligible } from '@/lib/intelligence/freshness';

const { persisted } = vi.hoisted(() => ({ persisted: new Map<string, unknown>() }));
vi.mock('@/lib/trader/persistentCache', () => ({
  getPersistentCache: vi.fn(async (key: string) => persisted.get(key) ?? null),
  setPersistentCache: vi.fn(async (key: string, value: unknown) => { persisted.set(key, structuredClone(value)); }),
}));
const bea = OFFICIAL_CALENDAR_SOURCES[0];
const boc = OFFICIAL_CALENDAR_SOURCES[1];
const bls = OFFICIAL_CALENDAR_SOURCES[2];
const beaHtml = '<table id="release-schedule-table"><thead><tr><th>Year 2026</th></tr></thead><tbody><tr><td>September 24 <small>8:30 AM</small></td><td>News</td><td>GDP (Third Estimate)</td></tr></tbody></table>';
const bocHtml = '<div id="eventscalendar-results"><article><span class="media-date">September 24, 2026</span><a href="https://www.bankofcanada.ca/2026/09/test/" data-content-type="Upcoming events">Interest Rate Announcement</a><p>09:45 (ET)</p></article></div>';
const query = { from: '2026-09-19', to: '2026-09-26' };
const emptyIcs = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR';

beforeEach(() => {
  persisted.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-19T09:00:00Z'));
  vi.stubEnv('FINNHUB_API_KEY', ''); vi.stubEnv('FMP_API_KEY', ''); vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
  vi.resetModules();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function network() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('bea.gov')) return new Response(beaHtml);
    if (url.includes('bankofcanada')) return new Response(bocHtml);
    if (url.includes('bls.gov')) return new Response('denied', { status: 403 });
    return new Response(emptyIcs);
  });
}

describe('official economic source parsers', () => {
  it('converts publisher timezone and DST without changing the published wall time', () => {
    expect(officialCalendarTime('20260715T083000', 'US-Eastern')).toBe('2026-07-15T12:30:00.000Z');
    expect(officialCalendarTime('20260115T083000', 'America/New_York')).toBe('2026-01-15T13:30:00.000Z');
    expect(officialCalendarTime('20260924T070000', 'Europe/London')).toBe('2026-09-24T06:00:00.000Z');
    expect(officialCalendarTime('20260230T083000', 'America/New_York')).toBeNull();
    expect(officialCalendarTime('20260308T023000', 'America/New_York')).toBeNull();
    expect(officialCalendarTime('20260924', 'America/New_York')).toBeNull();
  });
  it('reads BEA and Bank of Canada publications with source links and null unsupplied values', () => {
    const [us] = parseBeaSchedule(beaHtml, bea);
    const [ca] = parseBocSchedule(bocHtml, boc);
    expect(us).toMatchObject({ currency: 'USD', dateTimeUtc: '2026-09-24T12:30:00.000Z', actual: null, previous: null, forecast: null, impact: 'high', impactMethod: 'sfm-title-rule-v1', sourceUrl: bea.url });
    expect(ca).toMatchObject({ currency: 'CAD', dateTimeUtc: '2026-09-24T13:45:00.000Z', sourceUrl: 'https://www.bankofcanada.ca/2026/09/test/' });
    expect(() => parseBeaSchedule('<html>Captcha</html>', bea)).toThrow();
    expect(() => parseBocSchedule(bocHtml.replace('09:45 (ET)', 'To be confirmed'), boc)).toThrow();
  });
  it('unfolds ICS lines, ignores cancelled/all-day records and rejects HTML failures', () => {
    const text = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;TZID=US-Eastern:20260924T083000\r\nSUMMARY:Consumer Price\r\n Index\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:20260924T120000Z\r\nSUMMARY:Cancelled\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260925\r\nSUMMARY:No time\r\nEND:VEVENT\r\nEND:VCALENDAR';
    expect(parseOfficialIcs(text, bls)).toHaveLength(1);
    expect(parseOfficialIcs(text, bls)[0].title).toBe('Consumer PriceIndex');
    expect(() => parseOfficialIcs('<html>403</html>', bls)).toThrow();
  });
});

describe('THE SFM multi-source discovery', () => {
  it('combines independent sources despite one denied source and one empty response', async () => {
    const fetch = network(); vi.stubGlobal('fetch', fetch);
    const { getEconomicCalendar, getEconomicCalendarHealth } = await import('@/lib/providers/economic-calendar');
    const result = await getEconomicCalendar(query);
    expect(result).toMatchObject({ provider: 'sfm', status: 'success', partial: true, stale: false });
    expect(result.data).toHaveLength(2);
    expect(result.sources?.find(source => source.provider === 'bls')).toMatchObject({ status: 'failed', errorCode: 'http_403' });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(await getEconomicCalendarHealth()).toBe('partial');
    const second = await getEconomicCalendar(query);
    expect(second.data).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('uses persistent source copies after process restart and labels failed refreshes stale', async () => {
    vi.stubGlobal('fetch', network());
    let engine = await import('@/lib/providers/economic-calendar');
    await engine.getEconomicCalendar(query);
    vi.resetModules();
    vi.advanceTimersByTime(8 * 60_000);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    engine = await import('@/lib/providers/economic-calendar');
    const result = await engine.getEconomicCalendar(query);
    expect(result).toMatchObject({ status: 'provider_error', stale: true, lastSuccessfulUpdate: '2026-09-19T09:00:00.000Z' });
    expect(result.data).toHaveLength(2);
    expect(result.data.every(event => event.stale)).toBe(true);
    expect(await engine.getEconomicCalendarHealth()).toBe('partial');
  });
  it('does not leak stale values into fresh duplicates or collapse distinct units', () => {
    const event = parseBeaSchedule(beaHtml, bea)[0];
    const result = mergeCalendarEvents([{ ...event, stale: true, actual: 9 }, { ...event, provider: 'fmp', stale: false }, { ...event, unit: '%' }]);
    expect(result).toHaveLength(2);
    expect(result[0].actual).toBeNull();
    expect(result[0].sources).toHaveLength(2);
    expect(selectCalendarEvents(result, { ...query, country: 'United States', currency: 'USD' })).toHaveLength(2);
    expect(selectCalendarEvents(result, { ...query, country: 'Canada' })).toHaveLength(0);
  });
  it('shares overlapping refresh work and bypasses valid caches on explicit refresh after the minimum interval', async () => {
    const fetch = network(); vi.stubGlobal('fetch', fetch);
    const { getEconomicCalendar } = await import('@/lib/providers/economic-calendar');
    await Promise.all([getEconomicCalendar(query), getEconomicCalendar({ ...query, currency: 'USD', force: true })]);
    expect(fetch).toHaveBeenCalledTimes(4);
    vi.advanceTimersByTime(31_000);
    await getEconomicCalendar({ ...query, force: true });
    expect(fetch).toHaveBeenCalledTimes(7); // Denied source remains in cooldown.
  });
  it('does not claim a past scheduled release has a published value and supports Arabic search', () => {
    const event = normalizeEconomicEvent({ title: 'GDP', dateTime: '2026-09-18T12:30:00Z', actual: null, country: 'US' })!;
    expect(event.status).toBe('unknown');
    expect(calendarSearchText(event)).toContain('الناتج المحلي');
  });
});

describe('price observation freshness', () => {
  it('accepts a current cached observation and rejects the same observation after its horizon expires', () => {
    const fresh = calculateFreshness({ observedAt: new Date().toISOString(), thresholdSeconds: 90, providerState: 'CACHED' });
    expect(fresh.state).toBe('FRESH');
    expect(isDecisionFreshnessEligible({ providerState: 'CACHED', freshnessState: fresh.state, horizon: 'INTRADAY' })).toBe(true);
    vi.advanceTimersByTime(100_000);
    const old = calculateFreshness({ observedAt: '2026-09-19T09:00:00.000Z', thresholdSeconds: 90, providerState: 'CACHED' });
    expect(isDecisionFreshnessEligible({ providerState: 'CACHED', freshnessState: old.state, horizon: 'INTRADAY' })).toBe(false);
  });
});
