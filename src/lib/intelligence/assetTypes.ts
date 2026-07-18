import type { IntelligenceAssetType } from '@/domain/intelligence/contracts';
import type { MarketAssetType } from '@/lib/market/marketService';

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
