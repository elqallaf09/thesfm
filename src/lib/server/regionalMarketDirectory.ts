import 'server-only';
import { REGIONAL_DIRECTORIES, parseRegionalDirectory, type RegionalMarket, type DirectoryFailure } from '@/lib/market/regionalDirectory';
import type { ExchangeListing } from '@/lib/market/marketListingParsers';

export type RegionalDirectoryResult = {
  rows: ExchangeListing[];
  source: string;
  status: 'directory' | 'snapshot' | 'unavailable';
  checkedAt: string;
  lastSyncAt: string | null;
  sourceRecords: number | null;
  excludedRecords: number | null;
  reason?: DirectoryFailure;
};
const cache = new Map<RegionalMarket, { expires: number; result: RegionalDirectoryResult }>();
const pending = new Map<RegionalMarket, Promise<RegionalDirectoryResult>>();
const DAY = 86_400_000;

async function load(market: RegionalMarket): Promise<RegionalDirectoryResult> {
  const config = REGIONAL_DIRECTORIES[market];
  const source = `https://api.twelvedata.com/stocks?mic_code=${config.mic}`;
  const checkedAt = new Date().toISOString();
  let reason: DirectoryFailure = 'source_unavailable';
  try {
    const response = await fetch(source, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6500) });
    if (!response.ok) {
      reason = response.status === 429 ? 'rate_limited' : [401, 403].includes(response.status) ? 'access_required' : 'source_unavailable';
      throw new Error(reason);
    }
    reason = 'invalid_response';
    const payload = await response.json();
    if (payload?.status === 'error') {
      reason = Number(payload.code) === 429 ? 'rate_limited' : [401, 403].includes(Number(payload.code)) ? 'access_required' : 'source_unavailable';
      throw new Error(reason);
    }
    const parsed = parseRegionalDirectory(payload, market);
    if (parsed.rows.length < config.minimum) throw new Error('incomplete_directory');
    return { ...parsed, source, status: 'directory', checkedAt, lastSyncAt: checkedAt };
  } catch {
    const saved = cache.get(market)?.result;
    return {
      rows: saved?.rows || [], source, status: saved?.rows.length ? 'snapshot' : 'unavailable',
      checkedAt, lastSyncAt: saved?.lastSyncAt || null,
      sourceRecords: saved?.sourceRecords ?? null, excludedRecords: saved?.excludedRecords ?? null, reason,
    };
  }
}

export function getRegionalMarketDirectory(market: RegionalMarket): Promise<RegionalDirectoryResult> {
  const current = cache.get(market);
  if (current && current.expires > Date.now()) return Promise.resolve(current.result);
  const existing = pending.get(market);
  if (existing) return existing;
  const promise = load(market).then(result => {
    cache.set(market, { result, expires: Date.now() + (result.status === 'directory' ? DAY : 300_000) });
    return result;
  }).finally(() => pending.delete(market));
  pending.set(market, promise);
  return promise;
}
