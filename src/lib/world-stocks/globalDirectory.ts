import directory from '@/data/market-symbols/global-directory-snapshot.json';
import type { MarketSearchItem } from '@/lib/market/marketService';

type DirectoryRow = {
  symbol: string;
  providerSymbol: string;
  name: string;
  localName?: string;
  currency: string;
  sector?: string;
};

type DirectorySnapshot = {
  kuwait: { rows: DirectoryRow[] };
  shanghai: { rows: DirectoryRow[] };
  shenzhen: { rows: DirectoryRow[] };
};

const snapshot = directory as DirectorySnapshot;

const DIRECTORY_EXCHANGES = [
  { key: 'kuwait', exchange: 'BOURSA_KUWAIT', country: 'KW' },
  { key: 'shanghai', exchange: 'SSE', country: 'CN' },
  { key: 'shenzhen', exchange: 'SZSE', country: 'CN' },
] as const;

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function score(row: DirectoryRow, query: string) {
  if (!query) return 1;
  const needle = normalize(query);
  const values = [row.symbol, row.providerSymbol, row.name, row.localName].filter(Boolean).map(normalize);
  if (values.some(value => value === needle)) return 100;
  if (values.some(value => value.startsWith(needle))) return 80;
  if (values.some(value => value.includes(needle))) return 60;
  return 0;
}

export function globalDirectoryMarketItems({ query = '', exchange }: { query?: string; exchange?: string | null } = {}): MarketSearchItem[] {
  const requested = exchange?.toUpperCase() ?? null;
  return DIRECTORY_EXCHANGES.flatMap(config => {
    if (requested && requested !== config.exchange) return [];
    return (snapshot[config.key]?.rows ?? [])
      .map(row => ({ row, score: score(row, query) }))
      .filter(entry => !query || entry.score > 0)
      .sort((a, b) => b.score - a.score || a.row.symbol.localeCompare(b.row.symbol))
      .map(({ row }) => ({
        symbol: row.symbol,
        displaySymbol: row.symbol,
        providerSymbol: row.providerSymbol,
        name: row.name,
        assetType: 'stock' as const,
        exchange: config.exchange,
        country: config.country,
        currency: row.currency,
        aliases: [row.symbol, row.providerSymbol, row.localName].filter(Boolean) as string[],
        companyNameAr: config.country === 'KW' ? row.localName : undefined,
        companyNameEn: row.name,
        exchangeId: config.exchange,
        source: 'official-directory-snapshot',
        lastSyncedAt: String((directory as { asOf?: string }).asOf ?? ''),
      }));
  });
}

export function globalDirectoryCount(exchange?: string | null) {
  return globalDirectoryMarketItems({ exchange }).length;
}
