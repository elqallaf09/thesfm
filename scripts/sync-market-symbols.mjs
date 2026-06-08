import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'src', 'data', 'market-symbols');
const BOURSA_RT306_EN = 'https://www.boursakuwait.com.kw/data-api/legacy-mix-services?RT=306&L=E&SRC=KSE';
const DFM_SECURITIES_URL = 'https://api2.dfm.ae/web/sf/v1/securities';
const SYNCED_AT = new Date().toISOString();

const ARABIC_NAME_OVERRIDES = {
  NBK: 'بنك الكويت الوطني',
  GBK: 'بنك الخليج',
  CBK: 'البنك التجاري الكويتي',
  ABK: 'البنك الأهلي الكويتي',
  KIB: 'بنك الكويت الدولي',
  BURG: 'بنك برقان',
  KFH: 'بيت التمويل الكويتي',
  BOUBYAN: 'بنك بوبيان',
  ZAIN: 'شركة الاتصالات المتنقلة زين',
  OOREDOO: 'أوريدو',
  STC: 'إس تي سي الكويت',
  MKHZN: 'أجيليتي للمخازن العمومية',
  BOURSA: 'بورصة الكويت',
  MABANEE: 'المباني',
  HUMANSOFT: 'هيومن سوفت',
  WARBABANK: 'بنك وربة',
};

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function cleanSymbol(value) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9.-]/g, '');
}

function boursaMarketName(code) {
  if (code === 'P') return 'Premier Market';
  if (code === 'M') return 'Main Market';
  if (code === 'T') return 'Auction Market';
  return 'Boursa Kuwait';
}

function boursaSectorName(typeCode) {
  const sectors = {
    14: 'Real Estate',
    16: 'Energy',
    18: 'Industrials',
    20: 'Consumer Goods',
    22: 'Telecommunications',
    24: 'Banks',
    26: 'Insurance',
    27: 'Financial Services',
    28: 'Consumer Services',
    30: 'Basic Materials',
    32: 'Health Care',
    34: 'Technology',
  };
  return sectors[String(typeCode)] ?? null;
}

function parseBoursaRows(payload) {
  const rows = Array.isArray(payload?.DAT?.WL?.TD) ? payload.DAT.WL.TD : [];
  const bySymbol = new Map();

  for (const raw of rows) {
    const parts = String(raw).split('|');
    const listingType = cleanText(parts[48]);
    const sourceSymbol = cleanText(parts[1]);
    const displaySymbol = cleanSymbol(parts[6] || parts[19]);
    const companyNameEn = cleanText(parts[3]);
    const marketCode = cleanText(parts[8]);
    const active = cleanText(parts[9]) === '1';
    const currency = cleanText(parts[5]).toUpperCase();

    if (!displaySymbol || !companyNameEn || currency !== 'KWD') continue;
    if (listingType !== 'R' && !sourceSymbol.endsWith('`R')) continue;
    if (!active) continue;

    bySymbol.set(displaySymbol, {
      exchange: 'BOURSA_KUWAIT',
      market: boursaMarketName(marketCode),
      symbol: displaySymbol,
      display_symbol: displaySymbol,
      provider_symbol: `${displaySymbol}.KW`,
      name: companyNameEn,
      company_name_ar: ARABIC_NAME_OVERRIDES[displaySymbol] ?? null,
      company_name_en: companyNameEn,
      asset_type: 'stock',
      sector: boursaSectorName(parts[4]),
      currency: 'KWD',
      country: 'KW',
      price_unit: 'fils',
      is_active: true,
      source: BOURSA_RT306_EN,
      last_synced_at: SYNCED_AT,
    });
  }

  return Array.from(bySymbol.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function mapDfmAssetType(type) {
  const normalized = cleanText(type).toLowerCase();
  if (normalized.includes('exchange traded fund')) return 'etf';
  if (normalized.includes('fund') || normalized.includes('trust')) return 'etf';
  if (normalized.includes('equities')) return 'stock';
  return null;
}

function dfmCurrency(row) {
  const currency = cleanText(row.Currency).toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) return currency;
  if (row.Exchange === 'NASDAQ Dubai') return 'USD';
  return 'AED';
}

function normalizeDfmRows(rows) {
  return rows
    .map(row => {
      const assetType = mapDfmAssetType(row.SecurityType);
      const symbol = cleanSymbol(row.SecuritySymbol || row.Symbol);
      if (!assetType || !symbol || !row.Active || !row.ShowOnList) return null;
      const exchange = row.Exchange === 'NASDAQ Dubai' ? 'NASDAQ_DUBAI' : 'DFM';
      const providerSuffix = exchange === 'DFM' ? '.DU' : '';
      return {
        exchange,
        market: row.Exchange === 'NASDAQ Dubai' ? 'Nasdaq Dubai' : 'Dubai Financial Market',
        symbol,
        display_symbol: symbol,
        provider_symbol: `${symbol}${providerSuffix}`,
        name: cleanText(row.FullName || row.SecurityName || symbol),
        company_name_ar: null,
        company_name_en: cleanText(row.FullName || row.SecurityName || symbol),
        asset_type: assetType,
        sector: cleanText(row.SecurityType) || null,
        currency: dfmCurrency(row),
        country: 'AE',
        price_unit: 'major',
        is_active: true,
        source: DFM_SECURITIES_URL,
        last_synced_at: SYNCED_AT,
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${a.exchange}:${a.symbol}`.localeCompare(`${b.exchange}:${b.symbol}`));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchDfmRows() {
  let url = DFM_SECURITIES_URL;
  const rows = [];
  for (let page = 0; url && page < 40; page += 1) {
    const payload = await fetchJson(url);
    rows.push(...(payload.value ?? []));
    const nextLink = payload['@odata.nextLink'];
    url = nextLink
      ? String(nextLink).replace('http://assets.dfm.ae/api/default', 'https://api2.dfm.ae/web/sf/v1')
      : '';
  }
  return rows;
}

async function upsertSupabase(records) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('Supabase upsert skipped: missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
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

async function writeJson(fileName, records) {
  await mkdir(OUT_DIR, { recursive: true });
  const filePath = path.join(OUT_DIR, fileName);
  await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${records.length} records to ${path.relative(ROOT, filePath)}`);
}

async function main() {
  const writeLocal = process.argv.includes('--write-local');
  const noSupabase = process.argv.includes('--no-supabase');

  const [boursaPayload, dfmRows] = await Promise.all([
    fetchJson(BOURSA_RT306_EN),
    fetchDfmRows(),
  ]);

  const boursa = parseBoursaRows(boursaPayload);
  const dfm = normalizeDfmRows(dfmRows);
  const all = [...boursa, ...dfm];

  console.log(`Boursa Kuwait active listed stocks: ${boursa.length}`);
  console.log(`DFM/Nasdaq Dubai listed equities and funds: ${dfm.length}`);

  if (writeLocal) {
    await writeJson('boursa-kuwait.json', boursa);
    await writeJson('dfm-listed.json', dfm);
  }

  if (!noSupabase) await upsertSupabase(all);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
