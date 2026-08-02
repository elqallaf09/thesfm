import type { AnalysisResult, IntelligenceAssetType } from '@/domain/intelligence/contracts';
import { ASSET_TYPE_LABELS, type AiAnalystLocale } from './copy';

// The asset type shown beside a symbol must come from the same verified,
// server-resolved catalog data the analysis itself is built on
// (result.asset.assetType, produced by resolveCanonicalIntelligenceAsset —
// see src/services/intelligence/assetResolver.ts) — never guessed from the
// raw symbol string. Until that resolution has actually completed, the only
// truthful states are "still resolving" and "could not be resolved"; there
// is no third guessed state.
export type AssetTypeDisplayState =
  | { status: 'resolved'; assetType: IntelligenceAssetType; label: string }
  | { status: 'loading' }
  | { status: 'unresolved' };

export function assetTypeDisplayFromResult(
  asset: Pick<AnalysisResult['asset'], 'assetType'> | null | undefined,
  loading: boolean,
  errorCode: string | null,
  locale: AiAnalystLocale,
): AssetTypeDisplayState {
  if (asset?.assetType) {
    return { status: 'resolved', assetType: asset.assetType, label: ASSET_TYPE_LABELS[locale][asset.assetType] };
  }
  if (errorCode) return { status: 'unresolved' };
  if (loading) return { status: 'loading' };
  return { status: 'unresolved' };
}
