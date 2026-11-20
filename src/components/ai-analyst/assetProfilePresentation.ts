import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';

export type AnalystAssetProfile = {
  issuer: string | null;
  objective: string | null;
  indexTracked: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  source: string | null;
  retrievedAt: string | null;
};

type ProfileIdentity = Pick<CanonicalAssetIdentity, 'displaySymbol' | 'providerSymbol' | 'assetType'>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && !/^(?:n\/?a|null|undefined|unavailable)$/i.test(trimmed) ? trimmed : null;
}

function symbol(value: unknown): string | null { return text(value)?.toUpperCase() ?? null; }

/** Provider websites are links, never executable URLs or credential-bearing URLs. */
export function assetProfileWebsite(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Keep existing provider provenance; do not turn a directory name or Shariah
 * evidence registry into a fund issuer, objective, index, or publication date. */
export function readAnalystAssetProfile(value: unknown, asset: ProfileIdentity): AnalystAssetProfile {
  const payload = record(value);
  const expectedType = asset.assetType === 'FUND' ? ['etf', 'fund'] : ['stock'];
  if (!payload || payload.success !== true || symbol(payload.symbol) !== symbol(asset.displaySymbol)
    || !expectedType.includes(String(payload.assetType).toLowerCase())) throw new Error('asset_profile_identity_mismatch');
  const source = text(payload.source);
  const profile = payload.profileAvailable === true && source ? record(payload.profile) : null;
  if (profile?.ticker && ![symbol(asset.displaySymbol), symbol(asset.providerSymbol)].includes(symbol(profile.ticker))) {
    throw new Error('asset_profile_identity_mismatch');
  }
  const retrievedAt = text(payload.lastUpdated);
  return {
    issuer: asset.assetType === 'FUND' ? text(profile?.issuer) : null,
    objective: asset.assetType === 'FUND' ? text(profile?.objective) : null,
    indexTracked: asset.assetType === 'FUND' ? text(profile?.indexTracked) : null,
    sector: asset.assetType === 'STOCK' ? text(profile?.sector) : null,
    industry: asset.assetType === 'STOCK' ? text(profile?.industry) : null,
    description: asset.assetType === 'STOCK' ? text(profile?.description) : null,
    website: asset.assetType === 'STOCK' ? assetProfileWebsite(profile?.website) : null,
    source,
    // The existing endpoint stamps retrieval time, not a provider observation date.
    retrievedAt: retrievedAt && Number.isFinite(Date.parse(retrievedAt)) ? new Date(retrievedAt).toISOString() : null,
  };
}
