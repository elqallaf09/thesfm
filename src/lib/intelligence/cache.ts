import type { AnalysisResult, CanonicalAssetIdentity, IntelligenceHorizon } from '@/domain/intelligence/contracts';

type CacheScope = 'SHARED' | 'PRIVATE';

function part(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toUpperCase();
  // Resolver validation restricts the key inputs. Keeping this human-readable
  // deliberately matches the forward-only SQL backfill for legacy records.
  return normalized || fallback;
}

export function intelligenceScopeForUser(userId: string | null): CacheScope {
  return userId ? 'PRIVATE' : 'SHARED';
}

/**
 * Stable lookup key. Private keys always include the authenticated owner and
 * shared keys intentionally never do, so they cannot cross a privacy boundary.
 */
export function intelligenceCacheScopeKey(input: {
  asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'assetType' | 'market'>;
  horizon: IntelligenceHorizon;
  scope: CacheScope;
  userId: string | null;
}) {
  const owner = input.scope === 'PRIVATE' ? part(input.userId, 'MISSING_OWNER') : 'PUBLIC';
  return [
    'v1',
    input.scope.toLowerCase(),
    owner,
    part(input.asset.canonicalSymbol, 'UNKNOWN'),
    part(input.asset.assetType, 'UNKNOWN'),
    part(input.asset.market, 'GLOBAL'),
    part(input.horizon, 'SWING'),
  ].join(':');
}

/**
 * Immutable persistence key. It includes the selected provider, methodology
 * versions, and generation timestamp so a prior result is never overwritten.
 */
export function intelligenceCacheRecordKey(result: AnalysisResult, userId: string | null) {
  return [
    intelligenceCacheScopeKey({
      asset: result.asset,
      horizon: result.horizon,
      scope: result.scope,
      userId,
    }),
    part(result.providerProvenance.selectedProvider, 'UNAVAILABLE'),
    part(result.engineVersion, 'ENGINE'),
    part(result.rulesVersion, 'RULES'),
    part(result.weightingVersion, 'WEIGHTS'),
    result.generatedAt,
  ].join(':');
}
