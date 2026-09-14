import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { LISTING_SOURCES, parseKuwaitListings, parseShanghaiListings, parseShenzhenListings } from '../src/lib/market/marketListingParsers.ts';

const inputDirectory = process.argv.find(arg => arg.startsWith('--from-dir='))?.slice('--from-dir='.length);
async function source(name, url) {
  if (inputDirectory) return readFile(resolve(inputDirectory, `coverage-${name}.txt`));
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Directory unavailable: ${name} (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
function workbook(data) {
  const book = XLSX.read(data, { type: 'buffer' });
  return parseShenzhenListings(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]));
}
const [kuwaitEn, kuwaitAr, shanghaiData, shenzhenA, shenzhenB] = await Promise.all([
  source('kw', LISTING_SOURCES.kuwait), source('kw-ar', LISTING_SOURCES.kuwait.replace('L=E', 'L=A')),
  source('sse-symbols', LISTING_SOURCES.shanghai), source('szse-list', LISTING_SOURCES.shenzhen), source('szse-b', LISTING_SOURCES.shenzhenB),
]);
const bundledKuwait = JSON.parse(await readFile(new URL('../src/data/market-symbols/boursa-kuwait.json', import.meta.url), 'utf8'));
const arabicNames = new Map(bundledKuwait.filter(row => row.company_name_ar).map(row => [row.symbol, row.company_name_ar]));
for (const row of parseKuwaitListings(JSON.parse(kuwaitAr.toString()))) if (/[\u0600-\u06ff]/.test(row.name)) arabicNames.set(row.symbol, row.name);
const kuwait = parseKuwaitListings(JSON.parse(kuwaitEn.toString())).map(row => ({ ...row, localName: arabicNames.get(row.symbol) }));
const shanghai = parseShanghaiListings(shanghaiData.toString());
const shenzhen = [...new Map([...workbook(shenzhenA), ...workbook(shenzhenB)].map(row => [row.symbol, row])).values()];
if (kuwait.length < 100 || shanghai.length < 2000 || shenzhen.length < 2500) throw new Error('Refusing to replace a directory with incomplete source data');
const snapshot = { asOf: new Date().toISOString() };
for (const [name, rows] of Object.entries({ kuwait, shanghai, shenzhen })) {
  snapshot[name] = { source: LISTING_SOURCES[name], rows: rows.sort((a, b) => a.symbol.localeCompare(b.symbol)) };
  console.log(`${name}: ${rows.length} listed instruments`);
}
// Normalized symbol metadata only: no prices, provider payloads or credentials.
await writeFile(new URL('../src/data/market-symbols/global-directory-snapshot.json', import.meta.url), JSON.stringify(snapshot) + '\n');
