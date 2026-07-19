import type {
  CanonicalAssetIdentity,
  IntelligenceAssetType,
} from '@/domain/intelligence/contracts';
import {
  intelligenceAssetTypeFromMarket,
  marketAssetTypeFromIntelligence,
} from '@/lib/intelligence/assetTypes';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { IntelligenceError } from './errors';

export async function resolveCanonicalIntelligenceAsset(input: {
  symbol: string;
  assetType: IntelligenceAssetType;
  exchange?: string | null;
  market?: string | null;
  quoteCurrency?: string | null;
}): Promise<CanonicalAssetIdentity> {
  const resolved = await resolveMarketSymbol(input.symbol, marketAssetTypeFromIntelligence(input.assetType));
  if (!resolved.ok) throw new IntelligenceError('INVALID_ASSET', false);
  const resolvedType = intelligenceAssetTypeFromMarket(resolved.asset.assetType);
  if (resolvedType !== input.assetType) throw new IntelligenceError('UNSUPPORTED_ASSET', false);

  return {
    canonicalSymbol: resolved.asset.symbol.trim().toUpperCase(),
    providerSymbol: resolved.asset.providerSymbol.trim().toUpperCase(),
    displaySymbol: (resolved.asset.displaySymbol || resolved.asset.symbol).trim().toUpperCase(),
    name: resolved.asset.name.trim() || resolved.asset.symbol.trim().toUpperCase(),
    assetType: resolvedType,
    exchange: input.exchange ?? resolved.asset.exchange ?? null,
    market: input.market ?? resolved.asset.market ?? null,
    quoteCurrency: (input.quoteCurrency ?? resolved.asset.currency ?? null)?.toUpperCase() ?? null,
    country: resolved.asset.country ?? null,
    logoUrl: null,
  };
}
