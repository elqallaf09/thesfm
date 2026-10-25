export const intelligenceAssetTypes = ['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND'] as const;
export type IntelligenceAssetType = (typeof intelligenceAssetTypes)[number];

/** Market labels are normalized before requests reach the stable intelligence contract. */
export function intelligenceAssetType(value: unknown): IntelligenceAssetType {
  switch (String(value ?? '').trim().toUpperCase()) {
    case 'CRYPTO': return 'CRYPTO';
    case 'FOREX': return 'FOREX';
    case 'INDEX': return 'INDEX';
    case 'COMMODITY':
    case 'METAL': return 'COMMODITY';
    case 'FUND':
    case 'ETF': return 'FUND';
    default: return 'STOCK';
  }
}

export function boundedSymbols(value: string) {
  return [...new Set(value.split(/[\s,]+/).map(symbol => symbol.trim().toUpperCase()).filter(symbol => /^[A-Z0-9.^=:_/-]{1,32}$/.test(symbol)))].slice(0, 4);
}
