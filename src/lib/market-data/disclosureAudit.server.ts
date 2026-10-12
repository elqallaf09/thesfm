import 'server-only';
import { cleanEnv } from '@/lib/market/providerConfig';
import { ProviderError } from '@/lib/providers/shared';
import { fmpQueuedFetch, markFmpRateLimited } from '@/lib/trader/providers/fmpRuntime.server';
import { auditDisclosurePages, type DisclosureRow } from './disclosureAudit';

export type DisclosureChamber = 'senate' | 'house';
const PAGE_SIZE = 25;

async function readPage(chamber: DisclosureChamber, page: number, limit: number, apiKey: string, signal: AbortSignal): Promise<DisclosureRow[]> {
  const url = new URL(`https://financialmodelingprep.com/stable/${chamber}-latest`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  const response = await fmpQueuedFetch(url, { cache: 'no-store', headers: { accept: 'application/json', apikey: apiKey }, signal });
  if (response.status === 401) throw new ProviderError('unauthorized', 'provider_access_denied', 401);
  if (response.status === 403) throw new ProviderError('not_entitled', 'provider_access_denied', 403);
  if (response.status === 429) throw new ProviderError('rate_limited', 'provider_rate_limited', 429);
  if (!response.ok) throw new ProviderError('provider_error', 'provider_temporarily_unavailable', response.status);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    const message = payload && typeof payload === 'object' ? JSON.stringify(payload).toLowerCase() : '';
    if (/rate.?limit|too many|quota/.test(message)) {
      markFmpRateLimited(null, 'provider_rate_limited');
      throw new ProviderError('rate_limited', 'provider_rate_limited', 429);
    }
    if (/subscription|premium|not available|upgrade|not included/.test(message)) throw new ProviderError('not_entitled', 'provider_access_denied', 403);
    if (/invalid.*key|unauthori[sz]ed/.test(message)) throw new ProviderError('unauthorized', 'provider_access_denied', 401);
    throw new ProviderError('invalid_response', 'provider_invalid_response');
  }
  if (payload.length > limit || payload.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new ProviderError('invalid_response', 'provider_invalid_response');
  return payload as DisclosureRow[];
}

export async function runDisclosureAudit(chamber: DisclosureChamber) {
  const key = cleanEnv(process.env.FMP_API_KEY);
  if (!key) throw new ProviderError('not_configured', 'provider_not_configured');
  // Four sequential calls, one bounded sample, no retries and shared FMP cooldown.
  const signal = AbortSignal.timeout(25_000);
  const before = await readPage(chamber, 0, PAGE_SIZE * 2, key, signal);
  const page0 = await readPage(chamber, 0, PAGE_SIZE, key, signal);
  const page1 = await readPage(chamber, 1, PAGE_SIZE, key, signal);
  const after = await readPage(chamber, 0, PAGE_SIZE * 2, key, signal);
  return { provider: 'fmp', chamber, checkedAt: new Date().toISOString(), ...auditDisclosurePages({ pageSize: PAGE_SIZE, before, after, pages: [{ page: 0, rows: page0 }, { page: 1, rows: page1 }] }) };
}
