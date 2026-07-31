import 'server-only';

export type BundledUsSymbolRow = {
  symbol?: string;
  providerSymbol?: string;
  name?: string;
  assetType?: string;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  [key: string]: unknown;
};

export type BundledUsSymbolCatalog = {
  rows: readonly BundledUsSymbolRow[];
  bySymbol: ReadonlyMap<string, BundledUsSymbolRow>;
  byProviderSymbol: ReadonlyMap<string, BundledUsSymbolRow>;
};

let catalogPromise: Promise<BundledUsSymbolCatalog> | null = null;

function normalizeLookupKey(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

async function loadCatalog(): Promise<BundledUsSymbolCatalog> {
  const symbolData = await import('@/data/us-symbols.json');
  const rows = symbolData.default as BundledUsSymbolRow[];
  const bySymbol = new Map<string, BundledUsSymbolRow>();
  const byProviderSymbol = new Map<string, BundledUsSymbolRow>();

  for (const row of rows) {
    const symbol = normalizeLookupKey(row.symbol);
    const providerSymbol = normalizeLookupKey(row.providerSymbol);
    if (symbol && !bySymbol.has(symbol)) bySymbol.set(symbol, row);
    if (providerSymbol && !byProviderSymbol.has(providerSymbol)) byProviderSymbol.set(providerSymbol, row);
  }

  return { rows, bySymbol, byProviderSymbol };
}

export function getBundledUsSymbolCatalog() {
  catalogPromise ??= loadCatalog();
  return catalogPromise;
}

export async function findBundledUsSymbol(symbol: unknown, providerSymbol?: unknown) {
  const catalog = await getBundledUsSymbolCatalog();
  const symbolKey = normalizeLookupKey(symbol);
  const providerKey = normalizeLookupKey(providerSymbol);
  return catalog.bySymbol.get(symbolKey)
    ?? catalog.byProviderSymbol.get(symbolKey)
    ?? catalog.byProviderSymbol.get(providerKey)
    ?? catalog.bySymbol.get(providerKey)
    ?? null;
}
