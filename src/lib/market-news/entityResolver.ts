import staticSymbols from '@/data/market-symbols.json';
import { listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { STOCK_CATEGORY_CONFIGS } from '@/lib/market/stockCategoryConfigs';
import type { NewsFetchParams, NormalizedNewsItem } from './types';

type EntityRecord = {
  symbol: string;
  providerSymbol: string | null;
  name: string;
  aliases: string[];
  exchange: string | null;
  market: string | null;
  country: string | null;
  assetType: string | null;
  sector: string | null;
};

export type EntityResolutionResult = {
  symbols: string[];
  companyNames: string[];
  exchangeCodes: string[];
  marketCodes: string[];
  countries: string[];
  assetTypes: string[];
  sectors: string[];
  confidenceScore: number;
  ambiguousSymbols: string[];
};

function normalized(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}$.:_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))];
}

function symbolMentioned(text: string, symbol: string, explicitProviderSymbols: Set<string>) {
  const clean = symbol.trim().toUpperCase();
  if (!clean) return false;
  if (explicitProviderSymbols.has(clean)) return true;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (clean.length <= 2) return new RegExp(`(?:^|[^A-Z0-9])\\$${escaped}(?:$|[^A-Z0-9])`, 'i').test(text);
  return new RegExp(`(?:^|[^A-Z0-9])${escaped}(?:$|[^A-Z0-9])`, 'i').test(text);
}

function phraseMentioned(text: string, phrase: string) {
  const needle = normalized(phrase);
  if (needle.length < 4) return false;
  // Entity names must match complete normalized tokens. A substring fallback
  // incorrectly mapped words such as "completed" to the ticker/name "COMP".
  return ` ${text} `.includes(` ${needle} `);
}

function createUniverse() {
  const map = new Map<string, EntityRecord>();
  const add = (row: Partial<EntityRecord> & { symbol?: string | null; name?: string | null }) => {
    const symbol = String(row.symbol ?? '').trim().toUpperCase();
    const name = String(row.name ?? '').trim();
    if (!symbol || !name) return;
    const exchange = String(row.exchange ?? '').trim() || null;
    const key = `${exchange ?? 'ANY'}:${symbol}:${normalized(name)}`;
    const existing = map.get(key);
    map.set(key, {
      symbol,
      providerSymbol: String(row.providerSymbol ?? '').trim().toUpperCase() || null,
      name,
      aliases: unique([...(existing?.aliases ?? []), ...(row.aliases ?? [])]),
      exchange,
      market: String(row.market ?? '').trim() || null,
      country: String(row.country ?? '').trim() || null,
      assetType: String(row.assetType ?? '').trim() || null,
      sector: String(row.sector ?? '').trim() || null,
    });
  };

  (staticSymbols as Array<Record<string, unknown>>).forEach(row => add({
    symbol: String(row.symbol ?? ''),
    providerSymbol: String(row.providerSymbol ?? ''),
    name: String(row.name ?? ''),
    exchange: String(row.exchange ?? ''),
    country: String(row.country ?? ''),
    assetType: String(row.assetType ?? ''),
  }));

  listBundledMarketSymbols({ limit: 500 }).forEach(row => add({
    symbol: row.symbol,
    providerSymbol: row.providerSymbol ?? null,
    name: row.name,
    aliases: row.aliases ?? [],
    exchange: row.exchange ?? row.exchangeCode ?? null,
    market: row.market ?? null,
    country: row.country ?? null,
    assetType: row.assetType,
  }));

  STOCK_CATEGORY_CONFIGS.forEach(config => config.watchlist.forEach(stock => add({
    symbol: stock.symbol,
    providerSymbol: stock.symbol,
    name: stock.name,
    aliases: stock.aliases ?? [],
    exchange: 'US',
    market: 'US',
    country: 'US',
    assetType: 'stock',
    sector: stock.filter,
  })));

  return [...map.values()];
}

const ENTITY_UNIVERSE = createUniverse();

function requestedSymbolSet(params: Partial<NewsFetchParams>) {
  return new Set((params.symbols ?? []).map(symbol => symbol.trim().toUpperCase()).filter(Boolean));
}

export function identifyEntities(item: NormalizedNewsItem, params: Partial<NewsFetchParams> = {}): EntityResolutionResult {
  const textOriginal = `${item.title} ${item.summary ?? ''}`;
  const text = normalized(textOriginal);
  const providerSymbols = new Set((item.symbols ?? []).map(symbol => symbol.trim().toUpperCase()).filter(Boolean));
  const requested = requestedSymbolSet(params);
  const exchangeFilters = new Set((params.exchangeCodes ?? []).map(value => value.trim().toUpperCase()).filter(Boolean));

  const candidates = ENTITY_UNIVERSE.map(record => {
    const symbolHit = symbolMentioned(textOriginal.toUpperCase(), record.symbol, providerSymbols);
    const providerSymbolHit = record.providerSymbol
      ? symbolMentioned(textOriginal.toUpperCase(), record.providerSymbol, providerSymbols)
      : false;
    const nameHit = phraseMentioned(text, record.name);
    const aliasHit = record.aliases.some(alias => phraseMentioned(text, alias));
    const requestedHit = requested.has(record.symbol) || Boolean(record.providerSymbol && requested.has(record.providerSymbol));
    const exchangeHit = exchangeFilters.size === 0 || Boolean(record.exchange && exchangeFilters.has(record.exchange.toUpperCase()));

    let score = 0;
    if (providerSymbols.has(record.symbol) || Boolean(record.providerSymbol && providerSymbols.has(record.providerSymbol))) score = 0.98;
    else if (nameHit) score = 0.94;
    else if (aliasHit) score = 0.89;
    else if (symbolHit || providerSymbolHit) score = record.symbol.length <= 2 ? 0.82 : 0.9;
    if (requestedHit && score > 0) score = Math.min(1, score + 0.04);
    if (!exchangeHit) score -= 0.18;
    return { record, score };
  }).filter(candidate => candidate.score >= 0.7);

  const bySymbol = new Map<string, typeof candidates>();
  candidates.forEach(candidate => {
    const group = bySymbol.get(candidate.record.symbol) ?? [];
    group.push(candidate);
    bySymbol.set(candidate.record.symbol, group);
  });

  const ambiguousSymbols: string[] = [];
  const accepted = candidates.filter(candidate => {
    const sameSymbol = bySymbol.get(candidate.record.symbol) ?? [];
    const exchanges = unique(sameSymbol.map(entry => entry.record.exchange));
    if (exchanges.length <= 1) return candidate.score >= 0.78;
    const explicitlyQualified = exchangeFilters.size > 0 && Boolean(candidate.record.exchange && exchangeFilters.has(candidate.record.exchange.toUpperCase()));
    const nameDisambiguates = phraseMentioned(text, candidate.record.name) || candidate.record.aliases.some(alias => phraseMentioned(text, alias));
    if (!explicitlyQualified && !nameDisambiguates) {
      ambiguousSymbols.push(candidate.record.symbol);
      return false;
    }
    return candidate.score >= 0.78;
  });

  const bestBySymbol = new Map<string, (typeof accepted)[number]>();
  accepted.forEach(candidate => {
    const current = bestBySymbol.get(candidate.record.symbol);
    if (!current || candidate.score > current.score) bestBySymbol.set(candidate.record.symbol, candidate);
  });
  const resolved = [...bestBySymbol.values()];
  const confidenceScore = resolved.length > 0 ? Math.max(...resolved.map(candidate => candidate.score)) : 0;

  return {
    symbols: resolved.map(candidate => candidate.record.symbol),
    companyNames: unique(resolved.map(candidate => candidate.record.name)),
    exchangeCodes: unique(resolved.map(candidate => candidate.record.exchange)),
    marketCodes: unique(resolved.map(candidate => candidate.record.market ?? candidate.record.exchange)),
    countries: unique(resolved.map(candidate => candidate.record.country)),
    assetTypes: unique(resolved.map(candidate => candidate.record.assetType)),
    sectors: unique(resolved.map(candidate => candidate.record.sector)),
    confidenceScore,
    ambiguousSymbols: unique(ambiguousSymbols),
  };
}

export function enrichNewsEntities(item: NormalizedNewsItem, params: Partial<NewsFetchParams> = {}): NormalizedNewsItem {
  const result = identifyEntities(item, params);
  return {
    ...item,
    symbols: unique([...(item.symbols ?? []), ...result.symbols]),
    companyNames: unique([...(item.companyNames ?? []), ...result.companyNames]),
    exchangeCodes: unique([...(item.exchangeCodes ?? []), ...result.exchangeCodes]),
    marketCodes: unique([...(item.marketCodes ?? []), ...result.marketCodes]),
    countries: unique([...(item.countries ?? []), ...result.countries]),
    assetTypes: unique([...(item.assetTypes ?? []), ...result.assetTypes]),
    sectors: unique([...(item.sectors ?? []), ...result.sectors]),
    entityConfidenceScore: Math.max(item.entityConfidenceScore ?? 0, result.confidenceScore),
  };
}
