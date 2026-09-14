import 'server-only';
import { GLOBAL_MARKET_STRIPS, SECTOR_LABEL, inferStripCurrency, type GlobalMarketSector } from '@/lib/market/globalMarketStrips';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';
import { DIRECTORY_MAX_PAGE_SIZE, type GlobalDirectoryRow, type GlobalDirectoryCoverage, type GlobalDirectoryPage } from '@/lib/market/globalMarketDirectoryTypes';
import type { ExchangeListing } from '@/lib/market/marketListingParsers';
import { getGlobalMarketListings } from '@/lib/server/globalMarketListingSources';

const SOURCES = { kuwait_boursa: 'kuwait', us_nasdaq: 'us', us_nyse: 'us', china_sse: 'shanghai', china_szse: 'shenzhen' } as const;
type DirectorySourceId = keyof typeof SOURCES;
type Strip = typeof GLOBAL_MARKET_STRIPS[number];
const STRIP_ORDER = new Map(GLOBAL_MARKET_STRIPS.map((strip, index) => [strip.id, index]));

function sector(value?: string): GlobalMarketSector | undefined {
  return value && value in SECTOR_LABEL ? value as GlobalMarketSector : undefined;
}

function mapListing(row: ExchangeListing, strip: Strip): GlobalDirectoryRow {
  const curated = strip.items.find(item => item.symbol === row.providerSymbol);
  return {
    id: `${strip.id}:${row.providerSymbol}`, symbol: row.providerSymbol, providerSymbol: row.providerSymbol,
    name: curated?.name || row.name, nameAr: curated?.nameAr || (strip.countryCode === 'KW' ? row.localName : undefined),
    localName: row.localName, sector: sector(row.sector) || curated?.sector,
    countryCode: strip.countryCode, stripId: strip.id, kind: strip.kind,
    currency: row.currency, priceUnit: row.priceUnit,
  };
}

export async function loadGlobalDirectory(exchange = 'all', country = 'all') {
  const strips = GLOBAL_MARKET_STRIPS.filter(strip => (exchange === 'all' || strip.id === exchange) && (country === 'all' || strip.countryCode === country));
  const batches = await Promise.all(strips.map(async strip => {
    const source = SOURCES[strip.id as DirectorySourceId];
    if (source) {
      const listing = await getGlobalMarketListings(source);
      const selected = listing.rows.filter(row => source !== 'us' || (row.exchange === strip.exchangeCode && row.assetType === 'stock'));
      const rows = selected.map(row => mapListing(row, strip));
      return { rows, coverage: { stripId: strip.id, count: rows.length, status: listing.status, source: listing.source, asOf: listing.asOf } satisfies GlobalDirectoryCoverage };
    }
    if (strip.id === 'uae_dfm') {
      const bundled = await import('@/data/market-symbols/dfm-listed.json');
      const selected = bundled.default.filter(row => row.exchange === 'DFM' && row.is_active && row.asset_type === 'stock');
      const rows = selected.map(row => mapListing({ symbol: row.symbol, providerSymbol: row.provider_symbol, name: row.name, localName: row.company_name_ar || undefined, currency: row.currency }, strip));
      return { rows, coverage: { stripId: strip.id, count: rows.length, status: 'snapshot', source: 'https://www.dfm.ae/the-exchange/market-information/listed-securities', asOf: selected[0]?.last_synced_at || null } satisfies GlobalDirectoryCoverage };
    }
    const rows: GlobalDirectoryRow[] = strip.items.map(item => ({
      id: `${strip.id}:${item.symbol}`, symbol: item.symbol, providerSymbol: item.symbol, name: item.name, nameAr: item.nameAr,
      sector: item.sector, countryCode: strip.countryCode, stripId: strip.id, kind: strip.kind, currency: inferStripCurrency(item.symbol),
    }));
    return { rows, coverage: { stripId: strip.id, count: rows.length, status: rows.length ? 'selected' : 'unavailable', source: '', asOf: null } satisfies GlobalDirectoryCoverage };
  }));
  return { rows: batches.flatMap(batch => batch.rows), coverage: batches.map(batch => batch.coverage) };
}

export function paginateGlobalDirectory(rows: GlobalDirectoryRow[], coverage: GlobalDirectoryCoverage[], params: URLSearchParams): GlobalDirectoryPage {
  const query = normalizeAssetSearchText(params.get('q') || '').slice(0, 80);
  const selectedSector = params.get('sector') || 'all';
  const assetType = params.get('assetType') || 'all';
  const offset = Math.max(0, Math.min(100000, Number.parseInt(params.get('offset') || '0', 10) || 0));
  const limit = Math.max(1, Math.min(DIRECTORY_MAX_PAGE_SIZE, Number.parseInt(params.get('limit') || '12', 10) || 12));
  const matches = rows.filter(row => (selectedSector === 'all' || row.sector === selectedSector) && (assetType === 'all' || row.kind === assetType))
    .map(row => {
      const symbol = normalizeAssetSearchText(row.symbol);
      const text = normalizeAssetSearchText(`${row.symbol} ${row.name} ${row.nameAr || ''} ${row.localName || ''}`);
      return { row, rank: !query ? 1 : symbol === query ? 3 : symbol.startsWith(query) ? 2 : text.includes(query) ? 1 : 0 };
    }).filter(entry => entry.rank > 0)
    .sort((a, b) => b.rank - a.rank || (STRIP_ORDER.get(a.row.stripId) || 0) - (STRIP_ORDER.get(b.row.stripId) || 0) || a.row.id.localeCompare(b.row.id));
  const items = matches.slice(offset, offset + limit).map(entry => entry.row);
  return { success: true, items, total: matches.length, offset, nextOffset: offset + items.length < matches.length ? offset + items.length : null, coverage };
}
