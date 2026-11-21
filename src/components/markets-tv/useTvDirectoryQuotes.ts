'use client';
import type { TvInstrument } from '@/lib/markets-tv/selections';
import type { TvSnapshot } from '@/lib/markets-tv/types';
import { tvStripSourceCooling } from '@/lib/markets-tv/scene-display';
import { useTvResource } from './useTvResource';

// Each snapshot accepts at most twelve listings, including on older servers.
const SNAPSHOT_LIMIT = 12;
export const TV_DIRECTORY_MAX_ROWS = 2 * SNAPSHOT_LIMIT;

function snapshotPath(items: TvInstrument[], params: Record<string, string>, size: number) {
  if (!items.length) return null;
  const query = new URLSearchParams(params);
  query.set('pageSize', String(Math.min(size, SNAPSHOT_LIMIT)));
  if (items.every(item => item.listingKey)) query.set('listingKeys', JSON.stringify(items.map(item => item.listingKey)));
  else query.set('symbols', JSON.stringify(items.map(item => item.symbol)));
  return `/api/tv/snapshot?${query}`;
}

export function useTvDirectoryQuotes(items: TvInstrument[], params: Record<string, string>, size: number, revision: number, now: number) {
  const first = useTvResource<TvSnapshot>(snapshotPath(items.slice(0, SNAPSHOT_LIMIT), params, size), 60_000, '', revision);
  const second = useTvResource<TvSnapshot>(snapshotPath(items.slice(SNAPSHOT_LIMIT), params, size), 60_000, '', revision);
  const batches = items.length > SNAPSHOT_LIMIT ? [first, second] : [first];
  return {
    quotes: batches.flatMap(batch => batch.data?.quotes ?? []),
    loading: batches.some(batch => batch.loading),
    ready: batches.every(batch => Boolean(batch.data)),
    error: batches.find(batch => batch.error)?.error,
    cooling: batches.some(batch => tvStripSourceCooling(batch.data?.quotes ?? [], batch.data?.retryAt, now)),
  };
}
