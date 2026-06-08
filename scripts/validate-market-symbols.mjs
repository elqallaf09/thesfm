import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function bySymbol(records, symbol) {
  return records.find(record => record.symbol === symbol);
}

function validateBoursa(records) {
  assert(Array.isArray(records), 'Boursa Kuwait data must be an array.');
  assert(records.length > 100, `Boursa Kuwait coverage is too small: ${records.length} records.`);

  for (const symbol of ['NBK', 'ZAIN', 'BOUBYAN', 'KFH', 'MKHZN']) {
    const record = bySymbol(records, symbol);
    assert(record, `Missing expected Boursa Kuwait symbol: ${symbol}`);
    assert(record.currency === 'KWD', `${symbol} must use KWD.`);
    assert(record.price_unit === 'fils', `${symbol} must use fils as provider price unit.`);
    assert(record.provider_symbol === `${symbol}.KW`, `${symbol} must use provider_symbol ${symbol}.KW.`);
    assert(record.exchange === 'BOURSA_KUWAIT', `${symbol} must use exchange BOURSA_KUWAIT.`);
    assert(record.is_active === true, `${symbol} must be active.`);
  }

  const arabicSearchable = ['NBK', 'KFH', 'BOUBYAN', 'ZAIN', 'MKHZN']
    .filter(symbol => bySymbol(records, symbol)?.company_name_ar);
  assert(arabicSearchable.length >= 5, 'Known Kuwait symbols must include Arabic searchable names.');
}

function validateDfm(records) {
  assert(Array.isArray(records), 'DFM data must be an array.');
  assert(records.length > 20, `DFM/Nasdaq Dubai coverage is too small: ${records.length} records.`);
  for (const record of records) {
    assert(['DFM', 'NASDAQ_DUBAI'].includes(record.exchange), `Unexpected DFM exchange: ${record.exchange}`);
    assert(['AED', 'USD'].includes(record.currency), `${record.symbol} has unexpected currency ${record.currency}`);
    assert(record.provider_symbol, `${record.symbol} is missing provider_symbol.`);
  }
}

async function main() {
  const boursa = await readJson('src/data/market-symbols/boursa-kuwait.json');
  const dfm = await readJson('src/data/market-symbols/dfm-listed.json');
  validateBoursa(boursa);
  validateDfm(dfm);
  console.log(`Validated market symbols: Boursa Kuwait ${boursa.length}, DFM/Nasdaq Dubai ${dfm.length}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
