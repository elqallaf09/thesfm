import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'src', 'data', 'market-symbols', 'crypto.json');
const COINGECKO_MARKETS_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const SYNCED_AT = new Date().toISOString();

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function cleanSymbol(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function providerSymbolFor(symbol) {
  return `${symbol}-USD`;
}

function normalizeCoin(row) {
  const symbol = cleanSymbol(row.symbol);
  const name = cleanText(row.name);
  if (!symbol || !name || symbol.length > 12) return null;
  if (/\b(wrapped|staked|bridged|wormhole|binance-peg|liquid staked|restaked)\b/i.test(`${row.id} ${name}`)) return null;

  return {
    exchange: 'CRYPTO',
    market: 'Crypto',
    symbol,
    display_symbol: symbol,
    provider_symbol: providerSymbolFor(symbol),
    name,
    company_name_ar: null,
    company_name_en: name,
    asset_type: 'crypto',
    sector: 'Cryptocurrency',
    currency: 'USD',
    country: 'Global',
    price_unit: 'major',
    is_active: true,
    source: 'https://www.coingecko.com/en/coins',
    last_synced_at: SYNCED_AT,
    aliases: Array.from(new Set([symbol, name, cleanText(row.id), `${symbol}-USD`, `${symbol}USD`].filter(Boolean))),
  };
}

async function fetchCoinGeckoMarkets(page) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: '250',
    page: String(page),
    sparkline: 'false',
  });
  const response = await fetch(`${COINGECKO_MARKETS_URL}?${params.toString()}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  if (!response.ok) throw new Error(`CoinGecko returned HTTP ${response.status}`);
  const json = await response.json();
  return Array.isArray(json) ? json : [];
}

async function readFallbackRecords() {
  const text = await readFile(OUT_FILE, 'utf8');
  return JSON.parse(text);
}

function dedupe(records) {
  return Array.from(
    new Map(records.map(record => [`${record.exchange}:${record.symbol}`, record])).values(),
  ).sort((a, b) => {
    const left = Number(a.market_cap_rank ?? 999999);
    const right = Number(b.market_cap_rank ?? 999999);
    return left - right || a.symbol.localeCompare(b.symbol);
  });
}

async function loadRecords() {
  const pages = Number(process.env.CRYPTO_SYMBOL_SYNC_PAGES || 4);
  const rows = [];
  for (let page = 1; page <= pages; page += 1) {
    rows.push(...await fetchCoinGeckoMarkets(page));
  }
  const records = dedupe(rows.map(normalizeCoin).filter(Boolean));
  if (records.length === 0) throw new Error('CoinGecko returned no usable crypto symbols');
  return records;
}

async function writeLocal(records) {
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${records.length} crypto symbols to ${path.relative(ROOT, OUT_FILE)}`);
}

async function upsertSupabase(records) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('Supabase upsert skipped: missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.');
    return;
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/market_symbols?on_conflict=exchange,symbol`;
  const chunkSize = 500;
  for (let index = 0; index < records.length; index += chunkSize) {
    const chunk = records.slice(index, index + chunkSize);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      throw new Error(`Supabase upsert failed with HTTP ${response.status}: ${await response.text()}`);
    }
    console.log(`Upserted ${Math.min(index + chunk.length, records.length)}/${records.length}`);
  }
}

async function main() {
  const writeLocalFlag = process.argv.includes('--write-local');
  const noSupabase = process.argv.includes('--no-supabase');
  let records;
  try {
    records = await loadRecords();
  } catch (error) {
    console.warn(`CoinGecko sync failed, using bundled fallback: ${error instanceof Error ? error.message : String(error)}`);
    records = await readFallbackRecords();
  }

  if (writeLocalFlag) await writeLocal(records);
  if (!noSupabase) await upsertSupabase(records);
  console.log(`Crypto symbols ready: ${records.length}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
