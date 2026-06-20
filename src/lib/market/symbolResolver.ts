import staticUsSymbols from '@/data/us-symbols.json';
import {
  marketSymbolSuggestions,
  normalizeAssetType,
  normalizeMarketSymbolInput,
  validateSymbol,
  type MarketAssetType,
  type MarketSearchItem,
} from '@/lib/market/marketService';
import { findAssetAliasMatches } from '@/lib/market/assetAliases';
import { resolveMarketCurrency } from '@/lib/market/marketCurrency';
import { mergeMarketSearchResults, searchUSSymbols } from '@/lib/market/usSymbolResolver';
import symbolDirectory from '../../data/market-symbols.json';

export type MarketApiErrorCode = 'INVALID_SYMBOL' | 'NO_DATA' | 'PROVIDER_DOWN' | 'TIMEOUT' | 'RATE_LIMIT';

export type ResolvedMarketSymbol = MarketSearchItem & {
  providerSymbol: string;
  resolution: 'alias' | 'exact_symbol' | 'known_pair' | 'company_name';
};

type ResolverFailure = {
  ok: false;
  code: 'INVALID_SYMBOL';
  message: string;
  suggestions: MarketSearchItem[];
};

type ResolverSuccess = {
  ok: true;
  asset: ResolvedMarketSymbol;
  suggestions: MarketSearchItem[];
};

export type SymbolResolverResult = ResolverSuccess | ResolverFailure;

type CanonicalAlias = {
  symbol: string;
  providerSymbol: string;
  name: string;
  assetType: MarketAssetType;
  exchange?: string;
  country?: string;
  currency?: string;
  aliases: string[];
  typoAliases?: string[];
};

const SYMBOL_ALIASES: CanonicalAlias[] = [
  {
    symbol: 'BA',
    providerSymbol: 'BA',
    name: 'Boeing Company',
    assetType: 'stock',
    exchange: 'NYSE',
    country: 'US',
    currency: 'USD',
    aliases: ['ba', 'boeing', 'boeing company', 'the boeing company'],
    typoAliases: ['boing'],
  },
  {
    symbol: 'AAPL',
    providerSymbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['aapl', 'apple', 'apple inc', 'apple incorporated'],
  },
  {
    symbol: 'MSFT',
    providerSymbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['msft', 'microsoft', 'microsoft corporation'],
  },
  {
    symbol: 'TSLA',
    providerSymbol: 'TSLA',
    name: 'Tesla Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['tsla', 'tesla', 'tesla inc'],
  },
  {
    symbol: 'NVDA',
    providerSymbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetType: 'stock',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['nvda', 'nvidia', 'nvidia corporation'],
  },
  {
    symbol: 'SPY',
    providerSymbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetType: 'etf',
    exchange: 'NYSE Arca',
    country: 'US',
    currency: 'USD',
    aliases: ['spy', 'spdr s&p 500', 'spdr s&p 500 etf', 's&p 500 etf'],
  },
  {
    symbol: 'QQQ',
    providerSymbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    assetType: 'etf',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    aliases: ['qqq', 'invesco qqq', 'nasdaq 100 etf'],
  },
  {
    symbol: 'XAUUSD',
    providerSymbol: 'GC=F',
    name: 'Gold / US Dollar',
    assetType: 'gold',
    exchange: 'COMEX',
    country: 'Global',
    currency: 'USD',
    aliases: ['xau', 'xauusd', 'xau/usd', 'gold', 'gold usd', 'Ø°Ù‡Ø¨', 'Ø§Ù„Ø°Ù‡Ø¨'],
  },
  {
    symbol: 'BTCUSD',
    providerSymbol: 'BTC-USD',
    name: 'Bitcoin / US Dollar',
    assetType: 'crypto',
    exchange: 'Crypto',
    country: 'Global',
    currency: 'USD',
    aliases: ['btc', 'btcusd', 'btc/usd', 'bitcoin', 'bitcoin usd', 'Ø¨ÙŠØªÙƒÙˆÙŠÙ†'],
  },
];

const EXCHANGE_SUFFIX_META: Record<string, { exchange: string; country: string }> = {
  KW: { exchange: 'Boursa Kuwait', country: 'Kuwait' },
  SR: { exchange: 'Tadawul', country: 'Saudi Arabia' },
  SA: { exchange: 'Tadawul', country: 'Saudi Arabia' },
  AE: { exchange: 'UAE', country: 'United Arab Emirates' },
  DU: { exchange: 'Dubai Financial Market', country: 'United Arab Emirates' },
  AD: { exchange: 'Abu Dhabi Securities Exchange', country: 'United Arab Emirates' },
  QA: { exchange: 'Qatar Exchange', country: 'Qatar' },
  BH: { exchange: 'Bahrain Bourse', country: 'Bahrain' },
  OM: { exchange: 'Muscat Stock Exchange', country: 'Oman' },
  L: { exchange: 'London Stock Exchange', country: 'United Kingdom' },
  TO: { exchange: 'Toronto Stock Exchange', country: 'Canada' },
  HK: { exchange: 'Hong Kong Exchange', country: 'Hong Kong' },
  T: { exchange: 'Tokyo Stock Exchange', country: 'Japan' },
  DE: { exchange: 'Xetra', country: 'Germany' },
  PA: { exchange: 'Euronext Paris', country: 'France' },
  MI: { exchange: 'Borsa Italiana', country: 'Italy' },
  MC: { exchange: 'Bolsa de Madrid', country: 'Spain' },
  AS: { exchange: 'Euronext Amsterdam', country: 'Netherlands' },
  AX: { exchange: 'ASX', country: 'Australia' },
};

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function compactText(value: unknown) {
  return normalizeText(value).replace(/\s+/g, '');
}

function aliasToItem(alias: CanonicalAlias): MarketSearchItem {
  return {
    symbol: alias.symbol,
    providerSymbol: alias.providerSymbol,
    name: alias.name,
    assetType: alias.assetType,
    exchange: alias.exchange,
    country: alias.country,
    currency: alias.currency,
    aliases: [...alias.aliases, ...(alias.typoAliases ?? [])],
  };
}

function directoryToItem(item: Record<string, unknown>): MarketSearchItem {
  return {
    symbol: String(item.symbol ?? '').toUpperCase(),
    providerSymbol: String(item.providerSymbol ?? item.symbol ?? '').toUpperCase(),
    name: String(item.name ?? item.symbol ?? ''),
    assetType: normalizeAssetType(item.assetType),
    exchange: item.exchange ? String(item.exchange) : undefined,
    country: item.country ? String(item.country) : undefined,
    currency: item.currency ? String(item.currency) : undefined,
  };
}

function resolveFromItem(item: MarketSearchItem, resolution: ResolvedMarketSymbol['resolution']): ResolvedMarketSymbol {
  return {
    ...item,
    symbol: item.symbol.toUpperCase(),
    providerSymbol: (item.providerSymbol ?? item.symbol).toUpperCase(),
    assetType: normalizeAssetType(item.assetType),
    resolution,
  };
}

function matchesAssetType(item: MarketSearchItem, assetType?: MarketAssetType) {
  return !assetType || normalizeAssetType(item.assetType) === assetType;
}

function exactAlias(query: string, assetType?: MarketAssetType) {
  const normalized = normalizeText(query);
  const compact = compactText(query);
  return SYMBOL_ALIASES.find(alias => matchesAssetType(aliasToItem(alias), assetType)
    && alias.aliases.some(value => normalizeText(value) === normalized || compactText(value) === compact));
}

function typoAlias(query: string, assetType?: MarketAssetType) {
  const normalized = normalizeText(query);
  const compact = compactText(query);
  return SYMBOL_ALIASES.find(alias => matchesAssetType(aliasToItem(alias), assetType)
    && (alias.typoAliases ?? []).some(value => normalizeText(value) === normalized || compactText(value) === compact));
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function fuzzyAliasSuggestions(query: string, assetType?: MarketAssetType) {
  const compact = compactText(query);
  if (compact.length < 3) return [];
  return SYMBOL_ALIASES
    .filter(alias => matchesAssetType(aliasToItem(alias), assetType))
    .map(alias => {
      const score = Math.min(...alias.aliases.map(value => levenshtein(compact, compactText(value))));
      return { alias, score };
    })
    .filter(entry => entry.score <= Math.max(1, Math.floor(compact.length * 0.34)))
    .sort((a, b) => a.score - b.score)
    .map(entry => aliasToItem(entry.alias));
}

function exactDirectoryItem(query: string, assetType?: MarketAssetType) {
  const compact = compactText(query);
  return (symbolDirectory as Array<Record<string, unknown>>)
    .map(directoryToItem)
    .find(item => matchesAssetType(item, assetType)
      && (compactText(item.symbol) === compact
        || compactText(item.providerSymbol) === compact
        || compactText(item.name) === compact));
}

function exactStaticUsItem(query: string, assetType?: MarketAssetType) {
  const compact = compactText(query);
  return (staticUsSymbols as MarketSearchItem[])
    .find(item => matchesAssetType(item, assetType)
      && (compactText(item.symbol) === compact
        || compactText(item.providerSymbol) === compact));
}

function assetAliasItems(query: string, assetType?: MarketAssetType): MarketSearchItem[] {
  return findAssetAliasMatches(query)
    .filter(alias => !assetType || normalizeAssetType(alias.assetType) === assetType)
    .map(alias => {
      const providerSymbol = alias.symbolCandidates
        .map(candidate => validateSymbol(candidate))
        .find(Boolean) ?? validateSymbol(alias.symbol) ?? alias.symbol.toUpperCase();
      const symbol = providerSymbol.includes('.') ? providerSymbol : (validateSymbol(alias.symbol) ?? providerSymbol);
      const resolvedCurrency = resolveMarketCurrency({
        providerCurrency: alias.currency,
        symbol,
        providerSymbol,
        exchange: alias.marketEn,
        assetType: alias.assetType,
      });

      return {
        symbol,
        providerSymbol,
        name: alias.nameEn,
        assetType: alias.assetType,
        exchange: alias.marketEn,
        currency: resolvedCurrency.currency ?? undefined,
        currencySource: resolvedCurrency.source,
        aliases: [
          alias.nameAr,
          alias.nameEn,
          alias.marketAr,
          alias.marketEn,
          ...alias.aliases,
          ...alias.symbolCandidates,
        ],
      };
    });
}

function exchangeSuffixItem(query: string, assetType?: MarketAssetType): MarketSearchItem | null {
  const symbol = validateSymbol(query);
  if (!symbol) return null;
  if (assetType && !['stock', 'etf', 'index'].includes(assetType)) return null;

  const suffix = symbol.match(/\.([A-Z]{1,3})$/)?.[1];
  const meta = suffix ? EXCHANGE_SUFFIX_META[suffix] : undefined;
  if (!meta) return null;

  const alias = findAssetAliasMatches(symbol).find(match =>
    match.symbolCandidates.some(candidate => validateSymbol(candidate) === symbol),
  );
  const providerSymbol = alias?.symbolCandidates
    .map(candidate => validateSymbol(candidate))
    .find(candidate => candidate === symbol) ?? symbol;
  const resolvedCurrency = resolveMarketCurrency({
    providerCurrency: alias?.currency,
    symbol,
    providerSymbol,
    exchange: alias?.marketEn ?? meta.exchange,
    country: meta.country,
    assetType: alias?.assetType ?? assetType ?? 'stock',
  });

  return {
    symbol,
    providerSymbol,
    name: alias?.nameEn ?? symbol,
    assetType: alias?.assetType ?? assetType ?? 'stock',
    exchange: alias?.marketEn ?? meta.exchange,
    country: meta.country,
    currency: resolvedCurrency.currency ?? undefined,
    currencySource: resolvedCurrency.source,
  };
}

function stringsToItems(symbols: string[], assetType?: MarketAssetType) {
  return symbols
    .map(symbol => exactAlias(symbol, assetType) ? aliasToItem(exactAlias(symbol, assetType)!) : exactDirectoryItem(symbol, assetType) ?? exactStaticUsItem(symbol, assetType) ?? null)
    .filter((item): item is MarketSearchItem => Boolean(item));
}

function dedupe(items: MarketSearchItem[]) {
  return mergeMarketSearchResults([], items).slice(0, 8);
}

function isKnownDirectPair(normalized: ReturnType<typeof normalizeMarketSymbolInput>) {
  if (!normalized.valid) return false;
  if (normalized.assetType === 'forex') return normalized.providerSymbol.endsWith('=X');
  if (normalized.assetType === 'crypto') return normalized.providerSymbol.includes('-') && normalized.providerSymbol !== normalized.symbol;
  if (normalized.assetType === 'gold' || normalized.assetType === 'commodity') return normalized.providerSymbol !== normalized.symbol;
  return false;
}

export function marketApiMessage(code: MarketApiErrorCode) {
  const messages: Record<MarketApiErrorCode, string> = {
    INVALID_SYMBOL: 'Symbol was not found. Search by company name or choose one of the suggestions.',
    NO_DATA: 'The symbol is valid, but the data provider returned no market data right now.',
    PROVIDER_DOWN: 'The market data provider is temporarily unavailable.',
    TIMEOUT: 'Loading market data took longer than expected.',
    RATE_LIMIT: 'The market data provider is rate limited right now.',
  };
  return messages[code];
}

export function normalizeMarketApiCode(code?: string | null): MarketApiErrorCode {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (normalized === 'INVALID_SYMBOL' || normalized === 'SYMBOL_NOT_FOUND' || normalized === 'INVALID_SYMBOL_INPUT') return 'INVALID_SYMBOL';
  if (normalized === 'NO_DATA' || normalized === 'PROVIDER_NO_DATA' || normalized === 'RESPONSE_MAPPING_FAILED') return 'NO_DATA';
  if (normalized === 'TIMEOUT' || normalized === 'MARKET_DATA_TIMEOUT') return 'TIMEOUT';
  if (normalized === 'RATE_LIMIT' || normalized === 'TOO_MANY_REQUESTS' || normalized === 'MARKET_DATA_RATE_LIMIT') return 'RATE_LIMIT';
  return 'PROVIDER_DOWN';
}

export async function resolveMarketSymbol(queryInput: unknown, assetTypeInput?: unknown): Promise<SymbolResolverResult> {
  const query = String(queryInput ?? '').trim();
  const assetType = assetTypeInput && String(assetTypeInput) !== 'all' ? normalizeAssetType(assetTypeInput) : undefined;

  if (query.length < 1) {
    return { ok: false, code: 'INVALID_SYMBOL', message: marketApiMessage('INVALID_SYMBOL'), suggestions: [] };
  }

  const alias = exactAlias(query, assetType);
  if (alias) {
    const item = aliasToItem(alias);
    return { ok: true, asset: resolveFromItem(item, 'alias'), suggestions: [item] };
  }

  const typo = typoAlias(query, assetType);
  if (typo) {
    const suggestion = aliasToItem(typo);
    return { ok: false, code: 'INVALID_SYMBOL', message: marketApiMessage('INVALID_SYMBOL'), suggestions: [suggestion] };
  }

  const exactDirectory = exactDirectoryItem(query, assetType);
  if (exactDirectory) return { ok: true, asset: resolveFromItem(exactDirectory, 'exact_symbol'), suggestions: [exactDirectory] };

  const exactStatic = exactStaticUsItem(query, assetType);
  if (exactStatic) return { ok: true, asset: resolveFromItem(exactStatic, 'exact_symbol'), suggestions: [exactStatic] };

  const assetAliases = dedupe(assetAliasItems(query, assetType));
  if (assetAliases.length > 0) {
    return { ok: true, asset: resolveFromItem(assetAliases[0]!, 'alias'), suggestions: assetAliases };
  }

  const exchangeSuffix = exchangeSuffixItem(query, assetType);
  if (exchangeSuffix) {
    return { ok: true, asset: resolveFromItem(exchangeSuffix, 'exact_symbol'), suggestions: [exchangeSuffix] };
  }

  const normalized = normalizeMarketSymbolInput(query, assetType);
  if (isKnownDirectPair(normalized)) {
    const knownPair: MarketSearchItem = {
      symbol: (normalized.displaySymbol ?? normalized.symbol)! ?? normalized.symbol,
      providerSymbol: normalized.providerSymbol!,
      name: (normalized.displaySymbol ?? normalized.symbol)! ?? normalized.symbol,
      assetType: normalized.assetType!,
      exchange: normalized.assetType === 'forex' ? 'FX' : normalized.assetType === 'crypto' ? 'Crypto' : 'COMEX',
      currency: 'USD',
    };
    return { ok: true, asset: resolveFromItem(knownPair, 'known_pair'), suggestions: [knownPair] };
  }

  const usResults = await searchUSSymbols(query, assetType === 'stock' || assetType === 'etf' ? assetType : undefined);
  const searchSuggestions = dedupe([
    ...fuzzyAliasSuggestions(query, assetType),
    ...(usResults.results ?? []),
    ...stringsToItems(marketSymbolSuggestions(query), assetType),
  ]);

  const normalizedQuery = normalizeText(query);
  const exactCompany = searchSuggestions.find(item => normalizeText(item.name) === normalizedQuery || normalizeText(item.name).startsWith(`${normalizedQuery} `));
  if (exactCompany && !normalized.valid) {
    return { ok: true, asset: resolveFromItem(exactCompany, 'company_name'), suggestions: searchSuggestions };
  }

  return {
    ok: false,
    code: 'INVALID_SYMBOL',
    message: marketApiMessage('INVALID_SYMBOL'),
    suggestions: searchSuggestions,
  };
}
