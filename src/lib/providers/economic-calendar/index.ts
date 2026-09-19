import { cleanEnv } from '@/lib/market/providerConfig';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';
import { ProviderError } from '../shared';
import { createFmpCalendarProvider } from './fmp';
import { createFinnhubCalendarProvider } from './finnhub';
import { createTradingEconomicsCalendarProvider } from './tradingEconomics';
import { fetchOfficialCalendar, OFFICIAL_CALENDAR_SOURCES } from './official';
import { mergeCalendarEvents, selectCalendarEvents } from './merge';
import type { CalendarSourceReport, EconomicCalendarEvent, EconomicCalendarProviderName, EconomicCalendarQuery, EconomicCalendarResponse } from './types';

const FRESH_MS = 7 * 60_000;
const RETENTION_MS = 48 * 3600_000;
const HEALTH_KEY = 'sfm:calendar:health:v1';
type SourceCache = { data: EconomicCalendarEvent[]; updatedAt: string; expiresAt: number };
type Candidate = { provider: EconomicCalendarProviderName; key: string; load: () => Promise<EconomicCalendarEvent[]> };
const memory = new Map<string, SourceCache>();
const pending = new Map<string, Promise<{ events: EconomicCalendarEvent[]; report: CalendarSourceReport }>>();
const failures = new Map<string, { until: number; code: string; checkedAt: string }>();
let latest: EconomicCalendarResponse | null = null;

async function bounded<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([task, new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), ms); })]); }
  finally { if (timer) clearTimeout(timer); }
}

export function getEconomicCalendarProviderConfig() {
  const providers = OFFICIAL_CALENDAR_SOURCES.map(source => source.provider) as EconomicCalendarProviderName[];
  if (cleanEnv(process.env.FINNHUB_API_KEY)) providers.push('finnhub');
  if (cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)) providers.push('tradingeconomics');
  if (cleanEnv(process.env.FMP_API_KEY)) providers.push('fmp');
  return { configured: true as const, provider: 'sfm' as const, providers, missingEnvName: null };
}

export function getEconomicCalendarProviderStatus() {
  return {
    ...getEconomicCalendarProviderConfig(),
    status: latest?.status ?? 'not_checked',
    entitlementStatus: latest?.status === 'success' ? 'available' : 'not_checked',
    responseStatusCode: null,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    tradingEconomicsConfigured: Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)),
    fmpConfigured: Boolean(cleanEnv(process.env.FMP_API_KEY)),
    eventsReturned: latest?.data.length ?? null,
    lastFetchStatus: latest?.status ?? null,
    lastFetchTime: latest?.checkedAt ?? null,
    lastSuccessfulUpdate: latest?.lastSuccessfulUpdate ?? null,
    sources: latest?.sources ?? [],
  };
}

function candidates(query: EconomicCalendarQuery): Candidate[] {
  const list: Candidate[] = OFFICIAL_CALENDAR_SOURCES.map(source => ({
    provider: source.provider, key: `sfm:calendar:v1:${source.provider}`,
    load: () => fetchOfficialCalendar(source, query.force),
  }));
  const commercial = [
    ['finnhub', cleanEnv(process.env.FINNHUB_API_KEY), createFinnhubCalendarProvider],
    ['tradingeconomics', cleanEnv(process.env.TRADING_ECONOMICS_API_KEY), createTradingEconomicsCalendarProvider],
    ['fmp', cleanEnv(process.env.FMP_API_KEY), createFmpCalendarProvider],
  ] as const;
  for (const [provider, key, factory] of commercial) {
    if (key) list.push({ provider, key: `sfm:calendar:v1:${provider}:${query.from}:${query.to}`, load: () => factory(key).getEvents({ from: query.from, to: query.to, force: query.force }) });
  }
  return list;
}

function errorCode(error: unknown) {
  return error instanceof ProviderError ? error.status
    : error instanceof Error && /^http_\d{3}$|^invalid_\w+$|^calendar_too_large$/.test(error.message) ? error.message : 'provider_error';
}

async function loadSource(candidate: Candidate, force: boolean) {
  const inFlight = pending.get(candidate.key);
  if (inFlight) return inFlight;
  const task = (async () => {
    const now = Date.now();
    let stored = memory.get(candidate.key) ?? await bounded(getPersistentCache<SourceCache>(candidate.key), 350, null);
    if (stored && (!Array.isArray(stored.data) || !Number.isFinite(Date.parse(stored.updatedAt)) || now - Date.parse(stored.updatedAt) > RETENTION_MS)) stored = null;
    const checkedAt = new Date(now).toISOString();
    const failure = failures.get(candidate.key);
    // Brief minimum interval prevents refresh clicks from stampeding all upstreams.
    const fresh = stored && stored.expiresAt > now && (!force || now - Date.parse(stored.updatedAt) < 30_000);
    let code: string | null = failure && failure.until > now ? failure.code : null;
    if (!fresh && !code) {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const data = await Promise.race([
          candidate.load(),
          new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new Error('provider_error')), 4500); deadline.unref?.(); }),
        ]);
        const updatedAt = new Date().toISOString();
        stored = { data: data.map(event => ({ ...event, retrievedAt: updatedAt, stale: false })), updatedAt, expiresAt: Date.now() + FRESH_MS };
        if (memory.size >= 120) memory.delete(memory.keys().next().value!);
        memory.set(candidate.key, stored);
        failures.delete(candidate.key);
        await bounded(setPersistentCache(candidate.key, stored, RETENTION_MS), 350, undefined);
      } catch (error) {
        code = errorCode(error);
        if (failures.size >= 120) failures.delete(failures.keys().next().value!);
        failures.set(candidate.key, { code, checkedAt, until: now + (/not_entitled|http_403|unauthorized|forbidden/.test(code) ? 30 * 60_000 : 60_000) });
      } finally { if (deadline) clearTimeout(deadline); }
    }
    const stale = Boolean(stored && (!fresh && code));
    const report: CalendarSourceReport = { provider: candidate.provider, status: stored ? stale ? 'stale' : 'success' : 'failed', count: stored?.data.length ?? 0,
      checkedAt: fresh ? stored!.updatedAt : code && failure ? failure.checkedAt : checkedAt, lastSuccessfulUpdate: stored?.updatedAt ?? null, errorCode: code };
    return { events: (stored?.data ?? []).map(event => ({ ...event, stale })), report };
  })();
  pending.set(candidate.key, task);
  try { return await task; } finally { pending.delete(candidate.key); }
}

/** All sources contribute; an empty response or a rejected entitlement cannot hide another source. */
export async function getEconomicCalendar(query: EconomicCalendarQuery): Promise<EconomicCalendarResponse> {
  const settled = await Promise.all(candidates(query).map(candidate => loadSource(candidate, Boolean(query.force))));
  const sources = settled.map(result => result.report);
  const data = selectCalendarEvents(mergeCalendarEvents(settled.flatMap(result => result.events)), query);
  const anyFresh = sources.some(source => source.status === 'success');
  const stale = data.length > 0 && data.every(event => event.stale);
  const updates = sources.map(source => source.lastSuccessfulUpdate).filter((value): value is string => Boolean(value)).sort();
  const result: EconomicCalendarResponse = {
    status: anyFresh ? 'success' : 'provider_error', provider: 'sfm', data,
    cached: data.some(event => Boolean(event.stale)) || sources.some(source => source.checkedAt !== source.lastSuccessfulUpdate),
    stale, partial: sources.some(source => source.status !== 'success') || data.some(event => event.stale),
    lastSuccessfulUpdate: updates.at(-1) ?? null, checkedAt: new Date().toISOString(), sources,
    messageCode: stale ? 'calendar_stale_data' : !anyFresh ? 'provider_temporarily_unavailable' : !data.length ? 'calendar_no_events' : null,
  };
  latest = result;
  // Health describes a broad calendar request, never a currency/search filter's empty result.
  if (!query.currency && !query.country && !query.impact) await bounded(setPersistentCache(HEALTH_KEY, { ...result, data: [], eventCount: data.length }, 15 * 60_000), 350, undefined);
  return result;
}

export async function getEconomicCalendarHealth() {
  const health = await bounded(getPersistentCache<EconomicCalendarResponse & { eventCount: number }>(HEALTH_KEY), 500, null);
  if (!health?.checkedAt || Date.now() - Date.parse(health.checkedAt) > 15 * 60_000) return 'maintenance' as const;
  if (health.stale) return 'partial' as const;
  if (health.status !== 'success') return 'failed' as const;
  return health.partial ? 'partial' as const : 'healthy' as const;
}
