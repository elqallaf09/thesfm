import staticUsSymbols from '@/data/us-symbols.json';
import { normalizeAssetType, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';

type USSymbolRecord = MarketSearchItem & {
  providerSymbol: string;
  country: string;
  currency: string;
};

const NASDAQ_LISTED_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt';
const OTHER_LISTED_URL = 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt';
const US_SYMBOL_CACHE_MS = 24 * 60 * 60 * 1000;

const exchangeMap: Record<string, string> = {
  A: 'NYSE American',
  N: 'NYSE',
  P: 'NYSE Arca',
  Z: 'Cboe BZX',
  V: 'IEX',
};

const aliasMap: Record<string, string[]> = {
  nvidia: ['NVDA'],
  'nvidia corporation': ['NVDA'],
  apple: ['AAPL'],
  'apple inc': ['AAPL'],
  tesla: ['TSLA'],
  microsoft: ['MSFT'],
  amazon: ['AMZN'],
  meta: ['META'],
  facebook: ['META'],
  alphabet: ['GOOGL', 'GOOG'],
  google: ['GOOGL', 'GOOG'],
  amd: ['AMD'],
  palantir: ['PLTR'],
  broadcom: ['AVGO'],
  boeing: ['BA'],
  'boeing company': ['BA'],
  'the boeing company': ['BA'],
  boing: ['BA'],
};

let cachedUniverse: { expiresAt: number; rows: USSymbolRecord[]; source: 'nasdaqtrader' | 'static' } | null = null;

function cleanQuery(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function normalizeProviderSymbol(symbol: string) {
  return symbol.trim().replace(/\$/g, '-').replace(/\./g, '-').toUpperCase();
}

function cleanName(value: unknown) {
  return String(value ?? '')
    .replace(/\s+-\s+(Common Stock|Ordinary Shares|Class [A-Z].*|ETF|Exchange Traded Fund).*$/i, '')
    .trim();
}

function parsePipeFile(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('File Creation Time'));
}

function rowFromHeaders(headers: string[], line: string) {
  const values = line.split('|');
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
}

function parseNasdaqListed(text: string): USSymbolRecord[] {
  const lines = parsePipeFile(text);
  const headers = lines.shift()?.split('|') ?? [];
  return lines
    .map(line => rowFromHeaders(headers, line))
    .filter(row => row.Symbol && row['Test Issue'] === 'N')
    .map(row => ({
      symbol: String(row.Symbol).toUpperCase(),
      providerSymbol: normalizeProviderSymbol(String(row.Symbol)),
      name: cleanName(row['Security Name']) || String(row.Symbol).toUpperCase(),
      assetType: row.ETF === 'Y' ? 'etf' : 'stock',
      exchange: 'NASDAQ',
      country: 'US',
      currency: 'USD',
    }));
}

function parseOtherListed(text: string): USSymbolRecord[] {
  const lines = parsePipeFile(text);
  const headers = lines.shift()?.split('|') ?? [];
  return lines
    .map(line => rowFromHeaders(headers, line))
    .filter(row => row['ACT Symbol'] && row['Test Issue'] === 'N')
    .map(row => ({
      symbol: String(row['ACT Symbol']).toUpperCase(),
      providerSymbol: normalizeProviderSymbol(String(row['ACT Symbol'])),
      name: cleanName(row['Security Name']) || String(row['ACT Symbol']).toUpperCase(),
      assetType: row.ETF === 'Y' ? 'etf' : 'stock',
      exchange: exchangeMap[String(row.Exchange)] ?? String(row.Exchange || 'US'),
      country: 'US',
      currency: 'USD',
    }));
}

function dedupe(rows: USSymbolRecord[]) {
  return Array.from(
    new Map(rows.map(row => [`${row.symbol}:${row.assetType}`, row])).values(),
  ).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function staticUniverse() {
  return staticUsSymbols as USSymbolRecord[];
}

export async function getUSSymbolUniverse() {
  const now = Date.now();
  if (cachedUniverse && cachedUniverse.expiresAt > now) return cachedUniverse;

  try {
    const [nasdaqResponse, otherResponse] = await Promise.all([
      fetch(NASDAQ_LISTED_URL, { next: { revalidate: 86400 } }),
      fetch(OTHER_LISTED_URL, { next: { revalidate: 86400 } }),
    ]);
    if (!nasdaqResponse.ok || !otherResponse.ok) throw new Error('NasdaqTrader symbol directory unavailable');
    const rows = dedupe([
      ...parseNasdaqListed(await nasdaqResponse.text()),
      ...parseOtherListed(await otherResponse.text()),
    ]);
    cachedUniverse = { rows, source: 'nasdaqtrader', expiresAt: now + US_SYMBOL_CACHE_MS };
    return cachedUniverse;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[MarketSearch] Falling back to bundled US symbols', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    cachedUniverse = { rows: staticUniverse(), source: 'static', expiresAt: now + US_SYMBOL_CACHE_MS };
    return cachedUniverse;
  }
}

function normalizedText(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

function scoreSymbol(row: USSymbolRecord, query: string, aliases: string[]) {
  if (!query) return 1;
  const needle = normalizedText(query);
  const symbol = row.symbol.toLowerCase();
  const providerSymbol = row.providerSymbol.toLowerCase();
  const name = normalizedText(row.name);
  const exchange = normalizedText(row.exchange);
  const aliasIndex = aliases.indexOf(row.symbol);
  if (aliasIndex >= 0) return 130 - aliasIndex;
  if (symbol === needle || providerSymbol === needle) return 110;
  if (symbol.startsWith(needle)) return 95;
  if (name === needle) return 92;
  if (name.startsWith(needle)) return 84;
  if (name.split(' ').includes(needle)) return 74;
  if (symbol.includes(needle) || providerSymbol.includes(needle)) return 64;
  if (name.includes(needle)) return 56;
  if (exchange.includes(needle)) return 24;
  return 0;
}

export async function searchUSSymbols(queryInput: unknown, assetTypeInput?: MarketAssetType) {
  const query = cleanQuery(queryInput);
  const assetType = assetTypeInput ? normalizeAssetType(assetTypeInput) : undefined;
  const { rows, source } = await getUSSymbolUniverse();
  const aliasSymbols = aliasMap[normalizedText(query)] ?? [];
  const results = rows
    .filter(row => !assetType || row.assetType === assetType)
    .map(row => ({ row, score: scoreSymbol(row, query, aliasSymbols) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.symbol.localeCompare(b.row.symbol))
    .slice(0, 20)
    .map(({ row }) => row);

  return { success: true, query, source, results };
}

export function mergeMarketSearchResults(primary: MarketSearchItem[], fallback: MarketSearchItem[]) {
  return Array.from(
    new Map(
      [...fallback, ...primary].map(item => [
        `${item.symbol.toUpperCase()}:${normalizeAssetType(item.assetType)}`,
        {
          ...item,
          symbol: item.symbol.toUpperCase(),
          providerSymbol: item.providerSymbol?.toUpperCase(),
          assetType: normalizeAssetType(item.assetType),
        },
      ]),
    ).values(),
  );
}
