import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import readline from 'readline';

type MarketSymbolCsvRow = {
  symbol: string;
  provider_symbol?: string;
  name: string;
  asset_type?: string;
  exchange?: string;
  country?: string;
  currency?: string;
  source?: string;
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
    provider_symbol: (row.provider_symbol || row.providerSymbol || symbol).trim().toUpperCase(),
    name,
    asset_type: normalizedType,
    exchange: row.exchange?.trim() || undefined,
    country: row.country?.trim() || undefined,
    currency: row.currency?.trim() || 'USD',
    source: row.source?.trim() || 'csv_import',
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
    if (row) rows.push(row);
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = await readCsv(csvPath);
  const chunkSize = 500;
  let imported = 0;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase
      .from('market_symbols')
      .upsert(chunk, { onConflict: 'symbol,asset_type,provider_symbol', ignoreDuplicates: false });

    if (error) throw error;
    imported += chunk.length;
    console.log(`Imported ${imported}/${rows.length}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
