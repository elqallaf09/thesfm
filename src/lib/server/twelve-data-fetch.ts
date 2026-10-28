import 'server-only';
import { logReliabilityEvent } from '@/lib/runtime/reliability';
import { publishTwelveDataCooldown, readTwelveDataCooldown } from './market-provider-cooldown';

type Block = { until: number; status: 401 | 403 | 429 };
type Pending = { work: Promise<Response>; controller: AbortController; subscribers: number; settled: boolean };
const pending = new Map<string, Pending>();
type Account = { rateUntil: number; authUntil: number; failures: number; checkedAt: number; syncing: Promise<void> | null; markets: Map<string, Block> };
const accounts = new Map<string, Account>();
function account(key: string): Account {
  const existing = accounts.get(key); if (existing) return existing;
  if (accounts.size >= 8) accounts.delete(accounts.keys().next().value!);
  const state: Account = { rateUntil: 0, authUntil: 0, failures: 0, checkedAt: 0, syncing: null, markets: new Map() };
  accounts.set(key, state); return state;
}
const waiters: Array<() => void> = [];
let active = 0;
export const TWELVE_RETRY_HEADER = 'x-sfm-provider-retry-at';

function scope(url: URL) {
  return url.searchParams.get('mic_code') ? `mic:${url.searchParams.get('mic_code')}`
    : url.searchParams.get('exchange') ? `exchange:${url.searchParams.get('exchange')}`
      : `symbol:${url.searchParams.get('symbol') || url.pathname}`;
}
function blocked(url: URL, state: Account): Block | null {
  const now = Date.now();
  if (state.rateUntil > now) return { until: state.rateUntil, status: 429 };
  if (state.authUntil > now) return { until: state.authUntil, status: 401 };
  const market = state.markets.get(scope(url));
  if (market && market.until > now) return market;
  if (market) state.markets.delete(scope(url));
  return null;
}
function unavailable(block: Block) {
  return Response.json({ code: block.status, status: 'error', message: block.status === 429 ? 'provider_rate_limited' : 'provider_access_denied' },
    { status: block.status, headers: { [TWELVE_RETRY_HEADER]: new Date(block.until).toISOString(),
      'retry-after': String(Math.max(1, Math.ceil((block.until - Date.now()) / 1000))) } });
}
async function synchronize(state: Account, key: string) {
  if (Date.now() - state.checkedAt < 5_000) return;
  if (state.syncing) return state.syncing;
  state.syncing = readTwelveDataCooldown(key).then(until => {
    if (until) state.rateUntil = Math.max(state.rateUntil, until);
    state.checkedAt = Date.now();
  }).catch(() => { state.checkedAt = Date.now(); }).finally(() => { state.syncing = null; });
  return state.syncing;
}

/** Reset schedules come from provider evidence, never an assumed subscription. */
export function twelveDataRetry(response: Response, message: unknown, now = Date.now(), attempt = 1) {
  const header = response.headers.get('retry-after');
  if (header) {
    const seconds = Number(header), date = Date.parse(header);
    const until = Number.isFinite(seconds) && seconds > 0 ? now + seconds * 1000 : date;
    if (Number.isFinite(until) && until > now) return { until, quota: 'retry_after' };
  }
  const text = typeof message === 'string' ? message : '';
  if (/daily|per day|for the day|day.s (?:limit|credit)/i.test(text)) {
    return { until: Math.floor(now / 86_400_000) * 86_400_000 + 86_400_000 + 1000, quota: 'day' };
  }
  if (/per minute|minute.{0,30}(?:limit|credit)|(?:limit|credit).{0,30}minute/i.test(text)) {
    return { until: Math.floor(now / 60_000) * 60_000 + 61_000, quota: 'minute' };
  }
  return { until: now + Math.min(900_000, 90_000 * 2 ** Math.min(4, Math.max(0, attempt - 1))), quota: 'unknown' };
}

async function setRateLimit(state: Account, until: number, key: string) {
  state.rateUntil = Math.max(state.rateUntil, until);
  // Await bounded persistence before the serverless response can end.
  await publishTwelveDataCooldown(state.rateUntil, key);
}
async function run(url: URL, init: RequestInit): Promise<Response> {
  const key = url.searchParams.get('apikey') || '', state = account(key);
  await synchronize(state, key);
  const early = blocked(url, state); if (early) return unavailable(early);
  if (active >= 2) {
    if (waiters.length >= 48) throw new DOMException('Provider queue is full', 'TimeoutError');
    await new Promise<void>(resolve => waiters.push(resolve));
  } else active++;
  try {
    init.signal?.throwIfAborted();
    const late = blocked(url, state); if (late) return unavailable(late);
    const response = await fetch(url, { ...init, cache: 'no-store' });
    const payload: unknown = await response.clone().json().catch(() => null);
    const row = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
    const batchErrors = url.searchParams.get('symbol')?.includes(',') && row ? Object.values(row).filter(value => value && typeof value === 'object') as Record<string, unknown>[] : [];
    const status = [429, 401, 403].find(code => response.status === code || Number(row?.code) === code || batchErrors.some(value => Number(value.code) === code));
    let block: Block | null = null;
    if (status === 429) {
      const retry = twelveDataRetry(response, row?.message || batchErrors.find(value => Number(value.code) === 429)?.message, Date.now(), ++state.failures);
      await setRateLimit(state, retry.until, key); block = { status: 429, until: state.rateUntil };
      logReliabilityEvent('warn', 'market_data_provider_cooldown', { provider: 'twelve_data', failureCode: 'RATE_LIMITED',
        httpStatus: response.status, quota: retry.quota, retryAt: new Date(state.rateUntil).toISOString() });
    } else if (status === 401) {
      state.authUntil = Date.now() + 60_000; block = { status: 401, until: state.authUntil };
    } else if (status === 403) {
      if (state.markets.size >= 500) state.markets.delete(state.markets.keys().next().value!);
      block = { status: 403, until: Date.now() + 300_000 }; state.markets.set(scope(url), block);
    } else if (response.ok && row?.status !== 'error') {
      state.failures = 0;
      // Official usage headers describe the current minute, not the daily plan.
      const remaining = response.headers.get('api-credits-left');
      if (remaining !== null && Number(remaining) === 0) {
        await setRateLimit(state, Math.floor(Date.now() / 60_000) * 60_000 + 61_000, key);
      }
    }
    if (!block) return response;
    const headers = new Headers(response.headers); headers.set(TWELVE_RETRY_HEADER, new Date(block.until).toISOString());
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } finally {
    const next = waiters.shift(); if (next) next(); else active--;
  }
}

/** Every consumer of the account shares quota backoff, bounded concurrency and identical in-flight requests. */
export async function twelveDataFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(input);
  if (url.origin !== 'https://api.twelvedata.com') throw new Error('INVALID_TWELVE_DATA_ORIGIN');
  init.signal?.throwIfAborted();
  const key = url.toString();
  let request = pending.get(key);
  if (!request || request.controller.signal.aborted) {
    if (pending.size >= 500) throw new DOMException('Provider queue is full', 'TimeoutError');
    const controller = new AbortController();
    const entry: Pending = { controller, subscribers: 0, settled: false, work: Promise.resolve(new Response()) };
    entry.work = run(url, { ...init, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(9_000)]) })
      .finally(() => { entry.settled = true; if (pending.get(key) === entry) pending.delete(key); });
    request = entry; pending.set(key, entry);
  }
  const shared = request;
  shared.subscribers++;
  let onAbort: (() => void) | undefined;
  try {
    const response = await Promise.race([shared.work, new Promise<never>((_, reject) => {
      onAbort = () => reject(init.signal?.reason || new DOMException('Aborted', 'AbortError'));
      init.signal?.addEventListener('abort', onAbort, { once: true });
      if (init.signal?.aborted) onAbort();
    })]);
    return response.clone();
  } finally {
    if (onAbort) init.signal?.removeEventListener('abort', onAbort);
    if (--shared.subscribers === 0 && !shared.settled) shared.controller.abort();
  }
}
