import { mergeStripSnapshot } from '@/lib/markets-tv/stripQuotes';
import type { TvSnapshot } from '@/lib/markets-tv/types';

/** Offscreen/network retention must never outlive authorization to a private row. */
export function retainVisibleTvSnapshot(previous: TvSnapshot | null, resource: { data: TvSnapshot | null; errorStatus: number | null }): TvSnapshot | null {
  if (resource.errorStatus === 401 || resource.errorStatus === 403) return null;
  return resource.data ? mergeStripSnapshot(previous, resource.data) : previous;
}
