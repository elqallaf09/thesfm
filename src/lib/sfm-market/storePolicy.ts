import type { SfmMarketSourceClass } from '@/lib/sfm-market/types';

export type SfmRedistributionPolicy = 'internal_only' | 'rights_review_required' | 'redistributable';

export function sfmRedistributionPolicy(sourceClass: SfmMarketSourceClass): SfmRedistributionPolicy {
  if (sourceClass === 'aggregator') return 'internal_only';
  return 'rights_review_required';
}
