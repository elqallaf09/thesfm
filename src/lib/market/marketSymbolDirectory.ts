import boursaKuwaitSymbols from '@/data/market-symbols/boursa-kuwait.json';
import cryptoSymbols from '@/data/market-symbols/crypto.json';
import dfmListedSymbols from '@/data/market-symbols/dfm-listed.json';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';
import { normalizeAssetType, type MarketAssetType, type MarketSearchItem } from '@/lib/market/marketService';
import {
  getMarketExchangeOption,
  marketExchangeLabel,
  normalizeMarketExchange,
  type MarketExchangeId,
} from '@/lib/market/marketExchangeOptions';

export type MarketSymbolRecord = {
  exchange: string;
  market?: string | null;
  symbol: string;
  display_symbol?: string | null;
  provider_symbol?: string | null;
  name?: string | null;
  company_name_ar?: string | null;
  company_name_en?: string | null;
  asset_type?: string | null;
  sector?: string | null;
  currency?: string | null;
  country?: string | null;
  price_unit?: 'major' | 'fils' | 'pence' | null;
  is_active?: boolean | null;
  source?: string | null;
  last_synced_at?: string | null;
  aliases?: string[] | null;
};

export type MarketSymbolSearchResult = MarketSearchItem & {
  displaySymbol: string;
  companyNameAr?: string;
  companyNameEn?: string;
  exchangeId?: MarketExchangeId;
  exchangeLabelAr?: string;
  exchangeLabelEn?: string;
  marketLabel?: string | null;
  priceUnit?: 'major' | 'fils' | 'pence' | null;
  source?: string | null;
  lastSyncedAt?: string | null;
};

type SearchParams = {
  query: string;
  assetType?: MarketAssetType;
  exchange?: MarketExchangeId | string | null;
  limit?: number;
};

const BUNDLED_SYMBOLS = [
  ...(boursaKuwaitSymbols as MarketSymbolRecord[]),
  ...(cryptoSymbols as MarketSymbolRecord[]),
  ...(dfmListedSymbols as MarketSymbolRecord[]),
];

const RECORD_ALIASES: Record<string, string[]> = {
  'BOURSA_KUWAIT:MKHZN': ['AGLTY', 'AGILITY', 'Agility', 'Agility Public Warehousing', 'أجيليتي', 'اجيليتي'],
  'BOURSA_KUWAIT:KFH': ['بيتك', 'بيت التمويل', 'بيت التمويل الكويتي'],
  'BOURSA_KUWAIT:NBK': ['وطني', 'بنك الكويت الوطني'],
  'BOURSA_KUWAIT:BOUBYAN': ['بوبيان', 'بنك بوبيان'],
  'BOURSA_KUWAIT:ZAIN': ['زين', 'شركة زين'],
  'BOURSA_KUWAIT:IFA': ['إيفا', 'ايفا', 'الاستشارات المالية الدولية', 'الاستشارات المالية الدولية القابضة'],
  'BOURSA_KUWAIT:IFAHR': ['إيفا فنادق', 'ايفا فنادق', 'إيفا للفنادق', 'ايفا للفنادق', 'إيفا للفنادق والمنتجعات'],
};

const ARABIC_TICKER_LETTERS: Record<string, string> = {
  A: 'ايه',
  B: 'بي',
  C: 'سي',
  D: 'دي',
  E: 'اي',
  F: 'اف',
  G: 'جي',
  H: 'اتش',
  I: 'اي',
  J: 'جيه',
  K: 'كي',
  L: 'ال',
  M: 'ام',
  N: 'ان',
  O: 'او',
  P: 'بي',
  Q: 'كيو',
  R: 'ار',
  S: 'اس',
  T: 'تي',
  U: 'يو',
  V: 'في',
  W: 'دبليو',
  X: 'اكس',
  Y: 'واي',
  Z: 'زد',
};

const ARABIC_TICKER_OVERRIDES: Record<string, string[]> = {
  IFA: ['إيفا', 'ايفا'],
  IFAHR: ['إيفا إتش آر', 'ايفا اتش ار', 'إيفا فنادق', 'ايفا فنادق'],
  STC: ['إس تي سي', 'اس تي سي'],
  OOREDOO: ['أوريدو', 'اوريدو'],
};

function cleanSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function compactSearchText(value: unknown) {
  return normalizeAssetSearchText(value).replace(/\s+/g, '');
}

function uniqueNonEmpty(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function arabicTickerAliases(symbol: unknown) {
  const cleaned = cleanSymbol(symbol).replace(/\..*$/, '');
  if (!/^[A-Z]{2,8}$/.test(cleaned)) return [];
  const spelledLetters = [...cleaned]
    .map(letter => ARABIC_TICKER_LETTERS[letter])
    .filter(Boolean);

  return uniqueNonEmpty([
    ...(ARABIC_TICKER_OVERRIDES[cleaned] ?? []),
    spelledLetters.join(' '),
    spelledLetters.join(''),
  ]);
}

function recordKey(record: MarketSymbolRecord) {
  return `${record.exchange}:${cleanSymbol(record.symbol)}`;
}

function recordAliases(record: MarketSymbolRecord) {
  return uniqueNonEmpty([
    record.symbol,
    record.display_symbol,
    record.provider_symbol,
    record.company_name_ar,
    record.company_name_en,
    record.market,
    record.exchange,
    record.sector,
    ...(record.aliases ?? []),
    ...arabicTickerAliases(record.symbol),
    ...arabicTickerAliases(record.display_symbol),
    ...(RECORD_ALIASES[recordKey(record)] ?? []),
  ]);
}

function recordMatchesExchange(record: MarketSymbolRecord, exchange?: MarketExchangeId | string | null) {
  const requested = normalizeMarketExchange(exchange);
  if (!requested) return true;
  const recordExchange = normalizeMarketExchange(record.exchange);
  return recordExchange === requested;
}

function scoreRecord(record: MarketSymbolRecord, query: string) {
  const normalizedQuery = normalizeAssetSearchText(query);
  const compactQuery = compactSearchText(query);
  const symbolQuery = cleanSymbol(query).replace(/\s+/g, '');
  if (!normalizedQuery && !compactQuery && !symbolQuery) return 1;
  const hasSymbolQuery = Boolean(symbolQuery);

  const symbol = cleanSymbol(record.symbol);
  const displaySymbol = cleanSymbol(record.display_symbol);
  const providerSymbol = cleanSymbol(record.provider_symbol);
  const searchable = recordAliases(record).map(value => ({
    normalized: normalizeAssetSearchText(value),
    compact: compactSearchText(value),
    symbol: cleanSymbol(value).replace(/\s+/g, ''),
  }));

  if (hasSymbolQuery && (symbol === symbolQuery || displaySymbol === symbolQuery || providerSymbol === symbolQuery)) return 120;
  if (hasSymbolQuery && searchable.some(value => value.symbol === symbolQuery)) return 116;
  if (hasSymbolQuery && (symbol.startsWith(symbolQuery) || displaySymbol.startsWith(symbolQuery) || providerSymbol.startsWith(symbolQuery))) return 104;
  if (searchable.some(value => value.normalized === normalizedQuery || value.compact === compactQuery)) return 98;
  if (searchable.some(value => value.normalized.startsWith(normalizedQuery) || value.compact.startsWith(compactQuery))) return 82;
  if (searchable.some(value => value.normalized.includes(normalizedQuery) || value.compact.includes(compactQuery))) return 64;
  return 0;
}

function displayMarketLabel(record: MarketSymbolRecord, locale: 'ar' | 'en') {
  const exchangeLabel = marketExchangeLabel(record.exchange, locale);
  const segment = String(record.market ?? '').trim();
  if (!segment || segment === exchangeLabel) return exchangeLabel;
  return locale === 'ar' ? exchangeLabel : `${exchangeLabel} - ${segment}`;
}

export function marketSymbolRecordToSearchItem(record: MarketSymbolRecord): MarketSymbolSearchResult {
  const symbol = cleanSymbol(record.display_symbol || record.symbol);
  const exchangeId = normalizeMarketExchange(record.exchange) ?? undefined;
  const option = getMarketExchangeOption(exchangeId);
  const assetType = normalizeAssetType(record.asset_type);
  const nameEn = String(record.company_name_en || record.name || record.company_name_ar || symbol).trim();
  const nameAr = record.company_name_ar ? String(record.company_name_ar).trim() : undefined;

  return {
    symbol,
    displaySymbol: symbol,
    providerSymbol: cleanSymbol(record.provider_symbol || symbol) || symbol,
    name: nameEn,
    assetType,
    exchange: displayMarketLabel(record, 'en'),
    country: record.country ?? option?.country,
    currency: record.currency ?? option?.currency,
    aliases: recordAliases(record),
    companyNameAr: nameAr,
    companyNameEn: nameEn,
    exchangeId,
    exchangeLabelAr: option?.labelAr,
    exchangeLabelEn: option?.labelEn,
    marketLabel: record.market ?? null,
    priceUnit: record.price_unit ?? 'major',
    source: record.source ?? option?.sourceUrl,
    lastSyncedAt: record.last_synced_at ?? null,
  };
}

export function searchBundledMarketSymbols({ query, assetType, exchange, limit = 24 }: SearchParams) {
  const normalizedAssetType = assetType ? normalizeAssetType(assetType) : undefined;
  return BUNDLED_SYMBOLS
    .filter(record => record.is_active !== false)
    .filter(record => recordMatchesExchange(record, exchange))
    .filter(record => !normalizedAssetType || normalizeAssetType(record.asset_type) === normalizedAssetType)
    .map(record => ({ record, score: scoreRecord(record, query) }))
    .filter(entry => !query || entry.score > 0)
    .sort((a, b) => b.score - a.score || cleanSymbol(a.record.symbol).localeCompare(cleanSymbol(b.record.symbol)))
    .slice(0, limit)
    .map(entry => marketSymbolRecordToSearchItem(entry.record));
}

export function listBundledMarketSymbols({ query = '', assetType, exchange, limit = 250 }: Partial<SearchParams> = {}) {
  return searchBundledMarketSymbols({
    query,
    assetType,
    exchange,
    limit,
  });
}

export function bundledExchangeSymbolCount(exchange: MarketExchangeId | string) {
  return BUNDLED_SYMBOLS.filter(record => record.is_active !== false && recordMatchesExchange(record, exchange)).length;
}
