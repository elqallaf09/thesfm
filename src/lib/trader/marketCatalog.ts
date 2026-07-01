import staticUsSymbols from '@/data/us-symbols.json';
import legacyMarketSymbols from '@/data/market-symbols.json';
import boursaKuwaitSymbols from '@/data/market-symbols/boursa-kuwait.json';
import cryptoSymbols from '@/data/market-symbols/crypto.json';
import dfmListedSymbols from '@/data/market-symbols/dfm-listed.json';
import { cleanEnv } from '@/lib/market/providerConfig';
import { normalizeAssetType, type MarketAssetType } from '@/lib/market/marketService';
import {
  providerSymbolsForProviderAlias,
  resolveProviderSymbolAlias,
} from '@/lib/market/providerSymbolAliases';

export type TraderAssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'fund';
export type TraderQuoteProvider = 'fmp' | 'yahoo' | 'finnhub' | 'openbb';

export type TraderMarketDef = {
  id: string;
  ar: string;
  en: string;
  family: string;
  currency: string;
  symbols: string[];
  tone?: string;
  apiMarket: string;
  source: 'seed' | 'bundled' | 'fmp' | 'mixed';
  totalSymbols: number;
};

export type TraderCatalogSymbol = {
  symbol: string;
  providerSymbol: string;
  providerSymbols: Partial<Record<TraderQuoteProvider, string[]>>;
  name: string;
  assetType: TraderAssetType;
  exchange?: string;
  country?: string;
  currency?: string;
  aliases: string[];
  marketIds: string[];
  source: 'seed' | 'bundled' | 'fmp';
};

export type ProviderCapability = {
  provider: TraderQuoteProvider;
  configured: boolean;
  supportsQuotes: boolean;
  supportsTechnicalAnalysis: boolean;
  supportsEarnings: boolean;
  supportsDividends: boolean;
  supportsIpos: boolean;
  supportsEconomicCalendar: boolean;
  reason: string | null;
};

export type CatalogDiagnostics = {
  provider: TraderQuoteProvider | 'bundled';
  reason: string | null;
  totalSymbolsDiscovered: number;
  totalSymbolsLoaded: number;
  failedSymbols: Array<{ symbol: string; provider: string; reason: string }>;
  unsupportedSymbols: Array<{ symbol: string; provider: string; reason: string }>;
  providerLatencyMs: Record<string, number | null>;
  cacheStatus: 'hit' | 'miss' | 'disabled';
  sources: Record<string, number>;
  generatedAt: string;
};

export type TraderMarketCatalog = {
  markets: TraderMarketDef[];
  symbols: TraderCatalogSymbol[];
  diagnostics: CatalogDiagnostics;
  capabilityMatrix: Record<TraderQuoteProvider, ProviderCapability>;
};

type SeedMarket = Omit<TraderMarketDef, 'source' | 'totalSymbols'>;
type RawSymbolRecord = Record<string, unknown>;

const CATALOG_CACHE_MS = 6 * 60 * 60 * 1000;
const FMP_DISCOVERY_TIMEOUT_MS = 12_000;

export const TRADER_MARKET_SEEDS: SeedMarket[] = [
  { id: 'us-stocks', ar: 'الأسهم الأمريكية', en: 'US Stocks', family: 'Equities', currency: 'USD', symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA'], tone: 'featured', apiMarket: 'us-stocks' },
  { id: 'forex', ar: 'العملات', en: 'Forex', family: 'FX', currency: 'Pair', symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'GBPJPY'], apiMarket: 'forex' },
  { id: 'crypto', ar: 'الأصول الرقمية', en: 'Crypto', family: 'Digital', currency: 'USD', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD'], tone: 'featured', apiMarket: 'crypto' },
  { id: 'commodities', ar: 'السلع', en: 'Commodities', family: 'Macro', currency: 'USD', symbols: ['XAUUSD', 'XAGUSD', 'WTI', 'BRENT'], apiMarket: 'commodities' },
  { id: 'indices', ar: 'المؤشرات', en: 'Indices', family: 'Benchmarks', currency: 'Local', symbols: ['US30', 'NAS100', 'SPX500', 'DAX', 'FTSE', 'CAC40', 'NIKKEI', 'HSI', 'DXY'], apiMarket: 'indices' },
  { id: 'etfs', ar: 'الصناديق المتداولة', en: 'ETFs', family: 'Funds', currency: 'USD', symbols: ['SPY', 'QQQ', 'VOO', 'DIA', 'IWM', 'GLD'], apiMarket: 'etfs' },
  { id: 'gcc', ar: 'أسواق الخليج', en: 'Gulf Markets', family: 'Regional', currency: 'Mixed', symbols: ['2222.SR', 'EMAAR.AE', 'QNBK.QA', 'KFH.KW'], apiMarket: 'gcc' },
  { id: 'saudi', ar: 'السوق السعودي', en: 'Saudi Market', family: 'Tadawul', currency: 'SAR', symbols: ['2222.SR', '1120.SR', '7010.SR'], apiMarket: 'saudi' },
  { id: 'kuwait', ar: 'بورصة الكويت', en: 'Kuwait Market', family: 'Boursa', currency: 'KWD', symbols: ['KFH.KW', 'NBK.KW', 'ZAIN.KW'], apiMarket: 'kuwait' },
  { id: 'uae', ar: 'سوق الإمارات', en: 'UAE Market', family: 'ADX/DFM', currency: 'AED', symbols: ['EMAAR.AE', 'FAB.AE', 'ETISALAT.AE'], apiMarket: 'uae' },
  { id: 'qatar', ar: 'سوق قطر', en: 'Qatar Market', family: 'QSE', currency: 'QAR', symbols: ['QNBK.QA', 'IQCD.QA', 'QIBK.QA'], apiMarket: 'qatar' },
  { id: 'bahrain', ar: 'سوق البحرين', en: 'Bahrain Market', family: 'BHB', currency: 'BHD', symbols: ['AUB.BH', 'GFH.BH', 'BATELCO.BH'], apiMarket: 'bahrain' },
  { id: 'oman', ar: 'سوق عمان', en: 'Oman Market', family: 'MSX', currency: 'OMR', symbols: ['BKMB.OM', 'OMINV.OM'], apiMarket: 'oman' },
  { id: 'europe', ar: 'الأسهم الأوروبية', en: 'European Markets', family: 'Global', currency: 'EUR', symbols: ['ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'SHEL.L'], apiMarket: 'europe' },
  { id: 'asia', ar: 'الأسواق الآسيوية', en: 'Asian Markets', family: 'Global', currency: 'Mixed', symbols: ['7203.T', '9988.HK', 'TSM', '005930.KS'], apiMarket: 'asia' },
  { id: 'technology', ar: 'أسهم التقنية', en: 'Technology', family: 'Sector', currency: 'USD', symbols: ['AAPL', 'MSFT', 'GOOGL', 'ORCL', 'CRM'], apiMarket: 'technology' },
  { id: 'ai', ar: 'أسهم الذكاء الاصطناعي', en: 'AI Stocks', family: 'Sector', currency: 'USD', symbols: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'PLTR'], tone: 'featured', apiMarket: 'ai' },
  { id: 'semiconductors', ar: 'أشباه الموصلات', en: 'Semiconductors', family: 'Sector', currency: 'USD', symbols: ['NVDA', 'AMD', 'TSM', 'AVGO', 'INTC'], apiMarket: 'semiconductors' },
  { id: 'energy', ar: 'الطاقة', en: 'Energy Stocks', family: 'Sector', currency: 'Mixed', symbols: ['XOM', 'CVX', '2222.SR', 'OXY'], apiMarket: 'energy' },
  { id: 'banking', ar: 'البنوك', en: 'Banking Stocks', family: 'Sector', currency: 'Mixed', symbols: ['JPM', 'BAC', 'NBK.KW', 'QNBK.QA'], apiMarket: 'banking' },
  { id: 'food', ar: 'الأغذية والاستهلاك', en: 'Food / Consumer', family: 'Sector', currency: 'USD', symbols: ['KO', 'PEP', 'MCD', 'COST'], apiMarket: 'food' },
  { id: 'healthcare', ar: 'الصحة والدواء', en: 'Pharma / Healthcare', family: 'Sector', currency: 'USD', symbols: ['LLY', 'PFE', 'JNJ', 'MRK'], apiMarket: 'healthcare' },
];

const SEED_SYMBOL_NAMES: Record<string, string> = {
  US30: 'Dow Jones Industrial Average',
  NAS100: 'Nasdaq 100',
  SPX500: 'S&P 500',
  DAX: 'DAX Index',
  FTSE: 'FTSE 100',
  CAC40: 'CAC 40',
  NIKKEI: 'Nikkei 225',
  HSI: 'Hang Seng Index',
  DXY: 'US Dollar Index',
  WTI: 'WTI Crude Oil',
  BRENT: 'Brent Crude Oil',
};

const STATIC_SOURCE_RECORDS: Array<{ records: RawSymbolRecord[]; source: 'bundled' | 'seed' }> = [
  { records: staticUsSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: legacyMarketSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: boursaKuwaitSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: cryptoSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: dfmListedSymbols as RawSymbolRecord[], source: 'bundled' },
];

const MARKET_ID_SET = new Set(TRADER_MARKET_SEEDS.map(market => market.id));
let catalogCache: { expiresAt: number; value: TraderMarketCatalog } | null = null;

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function uniq(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = text(value);
    const key = item.toUpperCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function defaultCurrency(symbol: string): string | undefined {
  if (/\.KW$/.test(symbol)) return 'KWD';
  if (/\.SR$|\.SA$/.test(symbol)) return 'SAR';
  if (/\.AE$|\.DU$|\.AD$/.test(symbol)) return 'AED';
  if (/\.QA$/.test(symbol)) return 'QAR';
  if (/\.OM$/.test(symbol)) return 'OMR';
  if (/\.BH$/.test(symbol)) return 'BHD';
  if (/\.L$/.test(symbol)) return 'GBP';
  if (/\.T$|^NIKKEI$/.test(symbol)) return 'JPY';
  if (/\.HK$|^HSI$/.test(symbol)) return 'HKD';
  if (/\.DE$|\.PA$|\.AS$|\.MI$|\.MC$|^DAX$|^CAC40$/.test(symbol)) return 'EUR';
  if (/^[A-Z]{6}$/.test(symbol)) return symbol.slice(3);
  return 'USD';
}

function traderAssetType(value: unknown, symbol: string): TraderAssetType {
  const normalized = normalizeAssetType(value);
  if (normalized === 'etf') return 'fund';
  if (normalized === 'gold' || normalized === 'commodity') return 'commodity';
  if (normalized === 'crypto' || normalized === 'forex' || normalized === 'index') return normalized;
  if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|USDT|AVAX|DOT|LTC|BCH|LINK)(?:USD|-USD)?$/.test(symbol)) return 'crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(symbol)) return 'commodity';
  if (/^(US30|NAS100|SPX500|DAX|FTSE|CAC40|NIKKEI|HSI|DXY|\^)/.test(symbol)) return 'index';
  return 'stock';
}

function suffix(symbol: string) {
  return symbol.match(/\.([A-Z]{1,3})$/)?.[1] ?? '';
}

function marketIdsForRecord(record: {
  symbol: string;
  assetType: TraderAssetType;
  exchange?: string;
  country?: string;
  name?: string;
}) {
  const ids = new Set<string>();
  const symbol = record.symbol;
  const suff = suffix(symbol);
  const exchange = upper(record.exchange);
  const country = upper(record.country);
  const haystack = `${symbol} ${exchange} ${country} ${upper(record.name)}`;

  if (record.assetType === 'fund') ids.add('etfs');
  if (record.assetType === 'crypto') ids.add('crypto');
  if (record.assetType === 'forex') ids.add('forex');
  if (record.assetType === 'commodity') ids.add('commodities');
  if (record.assetType === 'index') ids.add('indices');
  if (record.assetType === 'stock' && (country === 'US' || /NASDAQ|NYSE|AMEX|CBOE/.test(exchange) || !suff)) ids.add('us-stocks');

  if (suff === 'KW' || /KUWAIT|BOURSA/.test(haystack)) { ids.add('kuwait'); ids.add('gcc'); }
  if (suff === 'SR' || suff === 'SA' || /SAUDI|TADAWUL/.test(haystack)) { ids.add('saudi'); ids.add('gcc'); }
  if (suff === 'AE' || suff === 'DU' || suff === 'AD' || /DUBAI|ABU DHABI|UAE|UNITED ARAB/.test(haystack)) { ids.add('uae'); ids.add('gcc'); }
  if (suff === 'QA' || /QATAR/.test(haystack)) { ids.add('qatar'); ids.add('gcc'); }
  if (suff === 'BH' || /BAHRAIN/.test(haystack)) { ids.add('bahrain'); ids.add('gcc'); }
  if (suff === 'OM' || /OMAN|MUSCAT/.test(haystack)) { ids.add('oman'); ids.add('gcc'); }

  if (/\.L$|\.DE$|\.PA$|\.AS$|\.MI$|\.MC$|\.SW$|EUROPE|LONDON|XETRA|EURONEXT|PARIS|MILAN|MADRID|AMSTERDAM|SWISS|GERMANY|FRANCE|UNITED KINGDOM|ITALY|SPAIN|NETHERLANDS/.test(haystack)) ids.add('europe');
  if (/\.T$|\.HK$|\.KS$|ASIA|TOKYO|HONG KONG|KOREA|JAPAN|TAIWAN|SHANGHAI|SHENZHEN/.test(haystack)) ids.add('asia');

  for (const market of TRADER_MARKET_SEEDS) {
    if (market.symbols.map(upper).includes(symbol)) ids.add(market.id);
  }

  return Array.from(ids).filter(id => MARKET_ID_SET.has(id));
}

function providerSymbolsFor(symbol: string, assetType: TraderAssetType, providerSymbol?: string) {
  const normalizedAssetType: MarketAssetType = assetType === 'fund' ? 'etf' : assetType === 'commodity' ? 'commodity' : assetType;
  const alias = resolveProviderSymbolAlias(symbol, normalizedAssetType);
  const fmpAlias = providerSymbolsForProviderAlias(symbol, 'fmp', normalizedAssetType);
  const yahooAlias = providerSymbolsForProviderAlias(symbol, 'yahoo', normalizedAssetType);
  const finnhubAlias = providerSymbolsForProviderAlias(symbol, 'finnhub', normalizedAssetType);
  const base = providerSymbol || alias?.displaySymbol || symbol;
  const compactCrypto = symbol.replace(/[/-]/g, '').replace(/USD$/, '');

  return {
    fmp: uniq([...(fmpAlias.length ? fmpAlias : []), providerSymbol, base, assetType === 'crypto' ? `${compactCrypto}USD` : null]),
    yahoo: uniq([...(yahooAlias.length ? yahooAlias : []), providerSymbol, base, assetType === 'crypto' ? `${compactCrypto}-USD` : null]),
    finnhub: uniq([...(finnhubAlias.length ? finnhubAlias : []), providerSymbol, base]),
  };
}

function symbolFromRecord(record: RawSymbolRecord, fallback?: string) {
  return upper(record.display_symbol ?? record.displaySymbol ?? record.symbol ?? record.ticker ?? fallback);
}

function normalizeRecord(record: RawSymbolRecord, source: 'seed' | 'bundled' | 'fmp', fallbackMarketIds: string[] = []): TraderCatalogSymbol | null {
  const symbol = symbolFromRecord(record);
  if (!symbol) return null;
  const providerSymbol = upper(record.provider_symbol ?? record.providerSymbol ?? record.symbol ?? symbol) || symbol;
  const assetType = traderAssetType(record.asset_type ?? record.assetType ?? record.type, symbol);
  const name = text(record.company_name_en ?? record.name ?? record.companyName ?? record.company_name_ar ?? SEED_SYMBOL_NAMES[symbol] ?? symbol);
  const exchange = text(record.exchange ?? record.exchangeShortName ?? record.market);
  const country = text(record.country);
  const currency = upper(record.currency) || defaultCurrency(symbol);
  const marketIds = uniq([...fallbackMarketIds, ...marketIdsForRecord({ symbol, assetType, exchange, country, name })]);

  return {
    symbol,
    providerSymbol,
    providerSymbols: providerSymbolsFor(symbol, assetType, providerSymbol),
    name,
    assetType,
    exchange: exchange || undefined,
    country: country || undefined,
    currency,
    aliases: uniq([symbol, providerSymbol, name, ...(Array.isArray(record.aliases) ? record.aliases : [])]),
    marketIds,
    source,
  };
}

function mergeSymbol(target: TraderCatalogSymbol, next: TraderCatalogSymbol) {
  target.marketIds = uniq([...target.marketIds, ...next.marketIds]);
  target.aliases = uniq([...target.aliases, ...next.aliases]);
  target.exchange ||= next.exchange;
  target.country ||= next.country;
  target.currency ||= next.currency;
  target.name = target.name === target.symbol && next.name !== next.symbol ? next.name : target.name;
  target.providerSymbol = target.providerSymbol || next.providerSymbol;
  for (const provider of ['fmp', 'yahoo', 'finnhub', 'openbb'] as TraderQuoteProvider[]) {
    target.providerSymbols[provider] = uniq([...(target.providerSymbols[provider] ?? []), ...(next.providerSymbols[provider] ?? [])]);
  }
  if (target.source !== next.source) target.source = target.source === 'fmp' || next.source === 'fmp' ? 'fmp' : 'bundled';
}

function addRecord(map: Map<string, TraderCatalogSymbol>, record: TraderCatalogSymbol | null) {
  if (!record) return;
  const key = record.symbol;
  const existing = map.get(key);
  if (existing) mergeSymbol(existing, record);
  else map.set(key, record);
}

function seedRecords() {
  const records: TraderCatalogSymbol[] = [];
  for (const market of TRADER_MARKET_SEEDS) {
    for (const symbol of market.symbols) {
      records.push(normalizeRecord({
        symbol,
        providerSymbol: symbol,
        name: SEED_SYMBOL_NAMES[upper(symbol)] ?? symbol,
        currency: market.currency === 'Mixed' || market.currency === 'Local' || market.currency === 'Pair' ? defaultCurrency(upper(symbol)) : market.currency,
      }, 'seed', [market.id])!);
    }
  }
  return records.filter(Boolean);
}

async function fetchFmpEndpoint(endpoint: string, apiKey: string) {
  const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);
  url.searchParams.set('apikey', apiKey);
  const startedAt = Date.now();
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FMP_DISCOVERY_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(`fmp_${endpoint}_http_${response.status}`);
  return {
    data: Array.isArray(payload) ? payload as RawSymbolRecord[] : [],
    latencyMs: Date.now() - startedAt,
  };
}

async function discoverFmpSymbols() {
  const apiKey = cleanEnv(process.env.FMP_API_KEY);
  if (!apiKey) {
    return {
      records: [] as TraderCatalogSymbol[],
      latencyMs: null as number | null,
      failed: [] as CatalogDiagnostics['failedSymbols'],
      reason: 'fmp_not_configured',
    };
  }

  const endpoints = [
    { endpoint: 'stock-list', assetType: undefined },
    { endpoint: 'etf-list', assetType: 'etf' },
    { endpoint: 'indexes-list', assetType: 'index' },
    { endpoint: 'batch-forex-quotes', assetType: 'forex' },
    { endpoint: 'batch-crypto-quotes', assetType: 'crypto' },
    { endpoint: 'batch-commodity-quotes', assetType: 'commodity' },
  ] as const;
  const settled = await Promise.allSettled(endpoints.map(item => fetchFmpEndpoint(item.endpoint, apiKey)));
  const records: TraderCatalogSymbol[] = [];
  const failed: CatalogDiagnostics['failedSymbols'] = [];
  let latencyMs = 0;

  settled.forEach((result, index) => {
    const { endpoint, assetType } = endpoints[index]!;
    if (result.status === 'rejected') {
      failed.push({ symbol: endpoint, provider: 'fmp', reason: result.reason instanceof Error ? result.reason.message : 'fmp_discovery_failed' });
      return;
    }
    latencyMs += result.value.latencyMs;
    result.value.data.forEach(item => {
      const normalized = normalizeRecord({
        ...item,
        assetType: assetType ?? item.type,
      }, 'fmp');
      if (normalized) records.push(normalized);
    });
  });

  return {
    records,
    latencyMs,
    failed,
    reason: failed.length === endpoints.length ? 'fmp_discovery_failed' : null,
  };
}

function capabilityMatrix() {
  const fmpConfigured = Boolean(cleanEnv(process.env.FMP_API_KEY));
  const finnhubConfigured = Boolean(cleanEnv(process.env.FINNHUB_API_KEY));
  const openbbConfigured = Boolean(cleanEnv(process.env.OPENBB_API_URL) || cleanEnv(process.env.OPENBB_API_KEY));
  return {
    fmp: {
      provider: 'fmp',
      configured: fmpConfigured,
      supportsQuotes: true,
      supportsTechnicalAnalysis: true,
      supportsEarnings: true,
      supportsDividends: true,
      supportsIpos: true,
      supportsEconomicCalendar: true,
      reason: fmpConfigured ? null : 'fmp_not_configured',
    },
    yahoo: {
      provider: 'yahoo',
      configured: true,
      supportsQuotes: true,
      supportsTechnicalAnalysis: true,
      supportsEarnings: false,
      supportsDividends: false,
      supportsIpos: false,
      supportsEconomicCalendar: false,
      reason: null,
    },
    finnhub: {
      provider: 'finnhub',
      configured: finnhubConfigured,
      supportsQuotes: true,
      supportsTechnicalAnalysis: false,
      supportsEarnings: true,
      supportsDividends: true,
      supportsIpos: false,
      supportsEconomicCalendar: true,
      reason: finnhubConfigured ? null : 'finnhub_not_configured',
    },
    openbb: {
      provider: 'openbb',
      configured: openbbConfigured,
      supportsQuotes: true,
      supportsTechnicalAnalysis: true,
      supportsEarnings: false,
      supportsDividends: false,
      supportsIpos: false,
      supportsEconomicCalendar: false,
      reason: openbbConfigured ? null : 'openbb_not_configured',
    },
  } satisfies Record<TraderQuoteProvider, ProviderCapability>;
}

function buildMarkets(symbols: TraderCatalogSymbol[]): TraderMarketDef[] {
  return TRADER_MARKET_SEEDS.map(seed => {
    const seedOrder = new Map(seed.symbols.map((symbol, index) => [upper(symbol), index]));
    const marketSymbols = symbols
      .filter(symbol => symbol.marketIds.includes(seed.id))
      .sort((a, b) => {
        const ai = seedOrder.get(a.symbol) ?? Number.MAX_SAFE_INTEGER;
        const bi = seedOrder.get(b.symbol) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi || a.symbol.localeCompare(b.symbol);
      })
      .map(symbol => symbol.symbol);
    const sources = new Set(symbols.filter(symbol => symbol.marketIds.includes(seed.id)).map(symbol => symbol.source));
    return {
      ...seed,
      symbols: marketSymbols,
      source: sources.size > 1 ? 'mixed' : (Array.from(sources)[0] ?? 'seed') as TraderMarketDef['source'],
      totalSymbols: marketSymbols.length,
    };
  });
}

export async function getTraderMarketCatalog(options: { forceFresh?: boolean } = {}): Promise<TraderMarketCatalog> {
  const now = Date.now();
  if (!options.forceFresh && catalogCache && catalogCache.expiresAt > now) {
    return {
      ...catalogCache.value,
      diagnostics: {
        ...catalogCache.value.diagnostics,
        cacheStatus: 'hit',
      },
    };
  }

  const bySymbol = new Map<string, TraderCatalogSymbol>();
  seedRecords().forEach(record => addRecord(bySymbol, record));
  for (const group of STATIC_SOURCE_RECORDS) {
    group.records.forEach(record => addRecord(bySymbol, normalizeRecord(record, group.source)));
  }

  const fmp = await discoverFmpSymbols();
  fmp.records.forEach(record => addRecord(bySymbol, record));

  const allSymbols = Array.from(bySymbol.values())
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
  const symbols = allSymbols.filter(symbol => symbol.marketIds.length > 0);
  const markets = buildMarkets(symbols);
  const sources = symbols.reduce<Record<string, number>>((acc, symbol) => {
    acc[symbol.source] = (acc[symbol.source] ?? 0) + 1;
    return acc;
  }, {});
  const diagnostics: CatalogDiagnostics = {
    provider: cleanEnv(process.env.FMP_API_KEY) ? 'fmp' : 'bundled',
    reason: fmp.reason,
    totalSymbolsDiscovered: allSymbols.length,
    totalSymbolsLoaded: symbols.length,
    failedSymbols: fmp.failed,
    unsupportedSymbols: allSymbols
      .filter(symbol => symbol.marketIds.length === 0)
      .map(symbol => ({ symbol: symbol.symbol, provider: symbol.source, reason: 'no_supported_market_mapping' })),
    providerLatencyMs: {
      fmp: fmp.latencyMs,
    },
    cacheStatus: 'miss',
    sources,
    generatedAt: new Date().toISOString(),
  };
  const value: TraderMarketCatalog = {
    markets,
    symbols,
    diagnostics,
    capabilityMatrix: capabilityMatrix(),
  };
  catalogCache = { expiresAt: now + CATALOG_CACHE_MS, value };
  return value;
}

export function getStaticTraderMarket(marketId: string | null | undefined): TraderMarketDef {
  const raw = String(marketId ?? '').trim().toLowerCase();
  const alias = raw === 'us' || raw === 'stocks' || raw === '' ? 'us-stocks' : raw;
  const seed = TRADER_MARKET_SEEDS.find(market => market.id === alias) ?? TRADER_MARKET_SEEDS[0]!;
  return {
    ...seed,
    source: 'seed',
    totalSymbols: seed.symbols.length,
  };
}

export async function resolveTraderMarketFromCatalog(marketId: string | null | undefined, options: { forceFresh?: boolean } = {}) {
  const catalog = await getTraderMarketCatalog(options);
  const fallback = getStaticTraderMarket(marketId);
  const market = catalog.markets.find(item => item.id === fallback.id) ?? fallback;
  const symbolMeta = catalog.symbols.filter(symbol => symbol.marketIds.includes(market.id));
  return { market, symbolMeta, catalog };
}

export function providerCapabilityMatrix() {
  return capabilityMatrix();
}
