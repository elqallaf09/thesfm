import type {
  CanonicalAssetIdentity,
  IntelligenceAssetType,
} from '@/domain/intelligence/contracts';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import type { MarketAssetType } from '@/lib/market/marketService';
import { IntelligenceError } from './errors';

export function marketAssetTypeFromIntelligence(assetType: IntelligenceAssetType): MarketAssetType {
  if (assetType === 'FUND') return 'etf';
  if (assetType === 'CRYPTO') return 'crypto';
  if (assetType === 'FOREX') return 'forex';
  if (assetType === 'INDEX') return 'index';
  if (assetType === 'COMMODITY') return 'commodity';
  return 'stock';
}

export function intelligenceAssetTypeFromMarket(assetType: MarketAssetType): IntelligenceAssetType {
  if (assetType === 'etf') return 'FUND';
  if (assetType === 'crypto') return 'CRYPTO';
  if (assetType === 'forex') return 'FOREX';
  if (assetType === 'index') return 'INDEX';
  if (assetType === 'commodity' || assetType === 'gold') return 'COMMODITY';
  return 'STOCK';
}

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
