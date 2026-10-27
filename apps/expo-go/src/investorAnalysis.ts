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
  // A symbol can be an index, share class, or a single forex/crypto pair. Do
  // not accept URL punctuation (notably `:` or a second slash) into a request.
  const isSafeSymbol = (symbol: string) => /^(?:\^[A-Z0-9][A-Z0-9.^=_-]*|[A-Z0-9][A-Z0-9.^=_-]*)(?:\/[A-Z0-9][A-Z0-9.^=_-]*)?$/.test(symbol) && symbol.length <= 32;
  return [...new Set(value.split(/[\s,]+/).map(symbol => symbol.trim().toUpperCase()).filter(isSafeSymbol))].slice(0, 4);
}

export type ComparisonRow = { symbol: string; name: string; price: number | null; changePercent: number | null; currency: string; source: string; updatedAt: string };
export function comparisonRows(data: Record<string, unknown>): ComparisonRow[] {
  if (data.success !== true || !Array.isArray(data.results)) return [];
  return data.results.slice(0, 8).flatMap(value => {
    if (!value || typeof value !== 'object' || typeof value.symbol !== 'string' || !value.symbol.trim()) return [];
    const finite = (number: unknown) => typeof number === 'number' && Number.isFinite(number) ? number : null;
    const string = (text: unknown) => typeof text === 'string' ? text : '';
    return [{ symbol: value.symbol, name: string(value.name), price: finite(value.latestPrice), changePercent: finite(value.changePercent), currency: string(value.currency), source: string(value.source), updatedAt: string(value.lastUpdated) }];
  });
}
