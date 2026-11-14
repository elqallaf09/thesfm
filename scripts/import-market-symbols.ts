import { syncMarketSymbols } from './lib/market-symbol-sync.mjs';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import readline from 'readline';

type MarketSymbolCsvRow = {
  symbol: string;
  provider_symbol?: string;
  primary_exchange?: string | null;
  requested_exchange?: string | null;
  name: string;
  asset_type?: string;
  exchange?: string;
  market?: string;
  display_symbol?: string;
  company_name_ar?: string;
  company_name_en?: string;
  sector?: string;
  country?: string;
  currency?: string;
  price_unit?: string;
  is_active?: boolean;
  source?: string;
  last_synced_at?: string;
};

const SUPPORTED_TYPES = new Set(['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold']);

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function normalizeRow(headers: string[], cells: string[]): MarketSymbolCsvRow | null {
  const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])) as Record<string, string>;
  const symbol = row.symbol?.trim().toUpperCase();
  const name = row.name?.trim();
  if (!symbol || !name) return null;

  const assetType = (row.asset_type || row.assetType || 'stock').trim().toLowerCase();
  const normalizedType = SUPPORTED_TYPES.has(assetType) ? assetType : 'stock';

  return {
    symbol,
    primary_exchange: row.primary_exchange?.trim() || row.primaryExchange?.trim() || null,
    requested_exchange: row.requested_exchange?.trim() || row.requestedExchange?.trim() || null,
    provider_symbol: (row.provider_symbol || row.providerSymbol || symbol).trim().toUpperCase(),
    name,
    asset_type: normalizedType,
    exchange: row.exchange?.trim() || undefined,
    market: row.market?.trim() || row.exchange?.trim() || undefined,
    display_symbol: (row.display_symbol || row.displaySymbol || symbol).trim().toUpperCase(),
    company_name_ar: row.company_name_ar || row.companyNameAr || undefined,
    company_name_en: row.company_name_en || row.companyNameEn || name,
    sector: row.sector?.trim() || undefined,
    country: row.country?.trim() || undefined,
    currency: row.currency?.trim() || 'USD',
    price_unit: row.price_unit || row.priceUnit || 'major',
    is_active: row.is_active === undefined || row.is_active === '' ? true : row.is_active !== 'false',
    source: row.source?.trim() || 'csv_import',
    last_synced_at: row.last_synced_at || row.lastSyncedAt || new Date().toISOString(),
  };
}

async function readCsv(filePath: string) {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] | null = null;
  const rows: MarketSymbolCsvRow[] = [];

  for await (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (!headers) {
      headers = cells.map(cell => cell.trim());
      continue;
    }
    const row = normalizeRow(headers, cells);
    if (!row) throw new Error('symbol_sync_invalid_csv_row');
    rows.push(row);
  }

  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error('Usage: tsx scripts/import-market-symbols.ts ./symbols.csv');
  }

  await readFile(csvPath, 'utf8');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const rows = await readCsv(csvPath);
  console.log(await syncMarketSymbols(rows, { url: supabaseUrl, serviceRoleKey }));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
