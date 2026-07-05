export type TraderLocale = 'ar' | 'en';

export type TraderMarketMetadata = {
  id: string;
  labelAr: string;
  labelEn: string;
  assetClassAr: string;
  assetClassEn: string;
  currency: string;
  country?: string;
  exchange?: string;
  apiMarket?: string;
};

export type TraderMarketContext = {
  marketId?: string;
  marketName: string;
  marketNameAr: string;
  marketNameEn: string;
  assetClass: string;
  assetClassAr: string;
  assetClassEn: string;
  currency: string;
  country: string | null;
  exchange: string | null;
  selectedSymbol: string | null;
  selectedProvider: string | null;
  selectedProviderName: string | null;
  fallbackProviderUsed: boolean;
  fallbackUsed: boolean;
  availableProviders: string[];
};

export type TraderSymbolMetadataDiagnostics = {
  provider: string | null;
  providerSymbol: string | null;
  finalExchange: string | null;
  finalExchangeCode: string | null;
  finalMarket: string | null;
  finalCountry: string | null;
  finalCurrency: string | null;
  finalAssetType: string | null;
  currencySource: string | null;
  exchangeSource: string | null;
  warnings: string[];
};

export type TraderSymbolMetadataInput = {
  symbol?: unknown;
  displaySymbol?: unknown;
  provider?: unknown;
  providerSymbol?: unknown;
  assetType?: unknown;
  quote?: Record<string, unknown> | null;
  catalog?: Record<string, unknown> | null;
};

export const TRADER_PROVIDER_LABELS: Record<string, string> = {
  fmp: 'FMP',
  financialmodelingprep: 'FMP',
  'financial modeling prep': 'FMP',
  yahoo: 'Yahoo Finance',
  yahoofinance: 'Yahoo Finance',
  'yahoo finance': 'Yahoo Finance',
  finnhub: 'Finnhub',
  twelve_data: 'Twelve Data',
  twelvedata: 'Twelve Data',
  'twelve data': 'Twelve Data',
  eodhd: 'EODHD',
  marketstack: 'Marketstack',
  openbb: 'OpenBB',
  tradingeconomics: 'Trading Economics',
  trading_economics: 'Trading Economics',
};

export const TRADER_MARKET_METADATA: Record<string, TraderMarketMetadata> = {
  'us-stocks': { id: 'us-stocks', labelAr: 'الأسهم الأمريكية', labelEn: 'US Stocks', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD', country: 'US', exchange: 'US' },
  etfs: { id: 'etfs', labelAr: 'الصناديق المتداولة', labelEn: 'ETFs', assetClassAr: 'الصناديق المتداولة', assetClassEn: 'ETFs', currency: 'USD', country: 'US', exchange: 'US' },
  crypto: { id: 'crypto', labelAr: 'العملات الرقمية', labelEn: 'Crypto', assetClassAr: 'العملات الرقمية', assetClassEn: 'Crypto', currency: 'USD' },
  forex: { id: 'forex', labelAr: 'العملات', labelEn: 'Forex', assetClassAr: 'عملات', assetClassEn: 'Forex', currency: 'USD' },
  commodities: { id: 'commodities', labelAr: 'السلع', labelEn: 'Commodities', assetClassAr: 'سلع', assetClassEn: 'Commodities', currency: 'USD' },
  metals: { id: 'metals', labelAr: 'المعادن', labelEn: 'Metals', assetClassAr: 'المعادن', assetClassEn: 'Metals', currency: 'USD', apiMarket: 'commodities' },
  indices: { id: 'indices', labelAr: 'المؤشرات', labelEn: 'Indices', assetClassAr: 'مؤشرات', assetClassEn: 'Indices', currency: 'USD' },
  kuwait: { id: 'kuwait', labelAr: 'بورصة الكويت', labelEn: 'Boursa Kuwait', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'KWD', country: 'KW', exchange: 'Boursa Kuwait' },
  saudi: { id: 'saudi', labelAr: 'السوق السعودي', labelEn: 'Saudi Exchange', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'SAR', country: 'SA', exchange: 'Tadawul' },
  uae: { id: 'uae', labelAr: 'سوق الإمارات', labelEn: 'UAE Markets', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'AED', country: 'AE', exchange: 'ADX/DFM' },
  qatar: { id: 'qatar', labelAr: 'بورصة قطر', labelEn: 'Qatar Exchange', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'QAR', country: 'QA', exchange: 'Qatar Exchange' },
  bahrain: { id: 'bahrain', labelAr: 'بورصة البحرين', labelEn: 'Bahrain Bourse', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'BHD', country: 'BH', exchange: 'Bahrain Bourse' },
  oman: { id: 'oman', labelAr: 'بورصة عمان', labelEn: 'Oman Exchange', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'OMR', country: 'OM', exchange: 'Muscat Stock Exchange' },
  europe: { id: 'europe', labelAr: 'الأسواق الأوروبية', labelEn: 'European Markets', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'EUR' },
  asia: { id: 'asia', labelAr: 'الأسواق الآسيوية', labelEn: 'Asian Markets', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  technology: { id: 'technology', labelAr: 'أسهم التقنية', labelEn: 'Technology', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  ai: { id: 'ai', labelAr: 'أسهم الذكاء الاصطناعي', labelEn: 'AI Stocks', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  semiconductors: { id: 'semiconductors', labelAr: 'أشباه الموصلات', labelEn: 'Semiconductors', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  energy: { id: 'energy', labelAr: 'الطاقة', labelEn: 'Energy Stocks', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  banking: { id: 'banking', labelAr: 'البنوك', labelEn: 'Banking Stocks', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  food: { id: 'food', labelAr: 'الأغذية والاستهلاك', labelEn: 'Food / Consumer', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
  healthcare: { id: 'healthcare', labelAr: 'الصحة والدواء', labelEn: 'Pharma / Healthcare', assetClassAr: 'أسهم', assetClassEn: 'Stocks', currency: 'USD' },
};

const ETF_SYMBOLS = new Set(['SPY', 'QQQ', 'VOO', 'DIA', 'IWM', 'GLD', 'SLV', 'TLT', 'VTI']);
const METAL_SYMBOLS = new Set(['XAUUSD', 'XAGUSD', 'GOLD', 'SILVER', 'GC=F', 'SI=F']);

function text(value: unknown) {
  return String(value ?? '').trim();
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function cleanCurrency(value: unknown) {
  const currency = upper(value);
  return /^[A-Z]{3,4}$/.test(currency) ? currency : '';
}

function compactSymbol(value: unknown) {
  return upper(value).replace(/[-_/]/g, '').replace(/=X$/i, '');
}

export function traderProviderDisplayName(provider: unknown) {
  const raw = text(provider);
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[-\s]+/g, '_');
  return TRADER_PROVIDER_LABELS[key] ?? TRADER_PROVIDER_LABELS[key.replace(/_/g, ' ')] ?? raw;
}

export function inferTraderMarketIdFromSymbol(symbol: unknown, assetType?: unknown) {
  const s = upper(symbol);
  const compact = compactSymbol(s);
  const type = text(assetType).toLowerCase();
  if (type === 'crypto' || /^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|DOT|LTC|BCH|LINK)(USD|USDT)?$/.test(compact)) return 'crypto';
  if (type === 'gold' || type === 'commodity' || METAL_SYMBOLS.has(compact)) return 'metals';
  if (type === 'forex' || /^[A-Z]{6}$/.test(compact)) return 'forex';
  if (type === 'etf' || type === 'fund' || ETF_SYMBOLS.has(s)) return 'etfs';
  if (/\.KW$/.test(s)) return 'kuwait';
  if (/\.SR$|\.SA$/.test(s)) return 'saudi';
  if (/\.AE$|\.DU$|\.AD$/.test(s)) return 'uae';
  if (/\.QA$/.test(s)) return 'qatar';
  if (/\.BH$/.test(s)) return 'bahrain';
  if (/\.OM$/.test(s)) return 'oman';
  if (/\.L$|\.DE$|\.PA$|\.AS$|\.MI$|\.MC$|\.SW$/.test(s)) return 'europe';
  if (/\.T$|\.HK$|\.KS$/.test(s)) return 'asia';
  return 'us-stocks';
}

export function resolveTraderContextCurrency(input: {
  marketId?: unknown;
  symbol?: unknown;
  assetType?: unknown;
  currency?: unknown;
}) {
  const explicit = cleanCurrency(input.currency);
  if (explicit) return explicit;
  const symbol = upper(input.symbol);
  const compact = compactSymbol(symbol);
  if (/USDT$/.test(compact)) return 'USDT';
  if (inferTraderMarketIdFromSymbol(symbol, input.assetType) === 'forex' && compact.length >= 6) return compact.slice(3, 6);
  const marketId = text(input.marketId) || inferTraderMarketIdFromSymbol(symbol, input.assetType);
  return TRADER_MARKET_METADATA[marketId]?.currency ?? 'USD';
}

export function resolveTraderMarketContext(input: {
  marketId?: unknown;
  assetType?: unknown;
  currency?: unknown;
  country?: unknown;
  exchange?: unknown;
  selectedSymbol?: unknown;
  selectedProvider?: unknown;
  fallbackProviderUsed?: boolean | null;
  fallbackUsed?: boolean | null;
  availableProviders?: unknown[];
} = {}): TraderMarketContext {
  const symbol = upper(input.selectedSymbol);
  const inferredMarketId = inferTraderMarketIdFromSymbol(symbol, input.assetType);
  const marketId = text(input.marketId) || inferredMarketId;
  const metadata = TRADER_MARKET_METADATA[marketId] ?? TRADER_MARKET_METADATA[inferredMarketId] ?? TRADER_MARKET_METADATA['us-stocks']!;
  const selectedProviderName = traderProviderDisplayName(input.selectedProvider);
  const fallbackUsed = Boolean(input.fallbackProviderUsed ?? input.fallbackUsed);
  const availableProviders = Array.from(new Set((input.availableProviders ?? [])
    .map(traderProviderDisplayName)
    .filter((provider): provider is string => Boolean(provider))));

  return {
    marketId: metadata.id,
    marketName: metadata.labelEn,
    marketNameAr: metadata.labelAr,
    marketNameEn: metadata.labelEn,
    assetClass: metadata.assetClassEn,
    assetClassAr: metadata.assetClassAr,
    assetClassEn: metadata.assetClassEn,
    currency: resolveTraderContextCurrency({ marketId: metadata.id, symbol, assetType: input.assetType, currency: input.currency }),
    country: text(input.country) || metadata.country || null,
    exchange: text(input.exchange) || metadata.exchange || null,
    selectedSymbol: symbol || null,
    selectedProvider: selectedProviderName,
    selectedProviderName,
    fallbackProviderUsed: fallbackUsed,
    fallbackUsed,
    availableProviders,
  };
}

export function formatTraderMarketHeader(context: TraderMarketContext, locale: TraderLocale = 'ar') {
  const label = locale === 'ar' ? context.marketNameAr : context.marketNameEn;
  return `${label} · ${context.currency}`;
}

function recordText(record: Record<string, unknown> | null | undefined, keys: string[]) {
  const records = [record];
  const nested = record?.metadata;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    records.push(nested as Record<string, unknown>);
  }

  for (const source of records) {
    for (const key of keys) {
      const value = text(source?.[key]);
      if (value) return value;
    }
  }
  return '';
}

function inferExchangeCode(symbol: string) {
  if (/\.KW$/.test(symbol)) return 'XKUW';
  if (/\.SR$|\.SA$/.test(symbol)) return 'XSAU';
  if (/\.AE$|\.DU$/.test(symbol)) return 'XDFM';
  if (/\.AD$/.test(symbol)) return 'XADS';
  if (/\.QA$/.test(symbol)) return 'DSMD';
  if (/\.BH$/.test(symbol)) return 'XBAH';
  if (/\.OM$/.test(symbol)) return 'XMUS';
  return null;
}

function assetTypeFromMarket(marketId: string): string {
  if (marketId === 'etfs') return 'fund';
  if (marketId === 'crypto') return 'crypto';
  if (marketId === 'forex') return 'forex';
  if (marketId === 'metals' || marketId === 'commodities') return 'commodity';
  if (marketId === 'indices') return 'index';
  return 'stock';
}

const EXCHANGE_ALIASES: Record<string, { exchange: string; code?: string }> = {
  NMS: { exchange: 'NASDAQ', code: 'NASDAQ' },
  XNAS: { exchange: 'NASDAQ', code: 'NASDAQ' },
  NASDAQ: { exchange: 'NASDAQ', code: 'NASDAQ' },
  NASDAQGS: { exchange: 'NASDAQ', code: 'NASDAQ' },
  'NASDAQ GLOBAL SELECT': { exchange: 'NASDAQ', code: 'NASDAQ' },
  'NASDAQ GLOBAL MARKET': { exchange: 'NASDAQ', code: 'NASDAQ' },
  NYQ: { exchange: 'NYSE', code: 'NYSE' },
  XNYS: { exchange: 'NYSE', code: 'NYSE' },
  NYSE: { exchange: 'NYSE', code: 'NYSE' },
  ARCX: { exchange: 'NYSE Arca', code: 'ARCX' },
  'NYSE ARCA': { exchange: 'NYSE Arca', code: 'ARCX' },
  DFM: { exchange: 'Dubai Financial Market', code: 'XDFM' },
  XDFM: { exchange: 'Dubai Financial Market', code: 'XDFM' },
  ADX: { exchange: 'Abu Dhabi Securities Exchange', code: 'XADS' },
  XADS: { exchange: 'Abu Dhabi Securities Exchange', code: 'XADS' },
  XKUW: { exchange: 'Boursa Kuwait', code: 'XKUW' },
  XSAU: { exchange: 'Tadawul', code: 'XSAU' },
  TADAWUL: { exchange: 'Tadawul', code: 'XSAU' },
  XMUS: { exchange: 'Muscat Stock Exchange', code: 'XMUS' },
  MSX: { exchange: 'Muscat Stock Exchange', code: 'XMUS' },
};

function normalizedAssetType(value: string, marketId: string) {
  const normalized = value.toLowerCase().replace(/[-_]/g, ' ').trim();
  if (!normalized) return assetTypeFromMarket(marketId);
  if (/\b(etf|fund)\b/.test(normalized)) return 'fund';
  if (/\b(crypto|cryptocurrency|digital asset)\b/.test(normalized)) return 'crypto';
  if (/\b(forex|fx|currency|currency pair)\b/.test(normalized)) return 'forex';
  if (/\b(commodity|metal|gold|silver)\b/.test(normalized)) return 'commodity';
  if (/\b(index|indices)\b/.test(normalized)) return 'index';
  if (/\b(stock|equity|ordinary share|common stock|common share|common shares)\b/.test(normalized)) return 'stock';
  return normalized;
}

function exchangeAlias(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, ' ').replace(/[^A-Z0-9 ]/g, '').trim();
  return EXCHANGE_ALIASES[compact] ?? (compact.includes('NASDAQ') ? EXCHANGE_ALIASES.NASDAQ : null);
}

function normalizedExchange(value: string) {
  return exchangeAlias(value)?.exchange ?? value;
}

function normalizedExchangeCode(value: string) {
  if (!value) return '';
  return exchangeAlias(value)?.code ?? value.toUpperCase();
}

const FALLBACK_EXCHANGE_BY_SYMBOL: Record<string, string> = {
  AAPL: 'NASDAQ',
  MSFT: 'NASDAQ',
  NVDA: 'NASDAQ',
  GOOGL: 'NASDAQ',
  QQQ: 'NASDAQ',
  SPY: 'NYSE Arca',
  VOO: 'NYSE Arca',
  IWM: 'NYSE Arca',
  DIA: 'NYSE Arca',
  GLD: 'NYSE Arca',
  SLV: 'NYSE Arca',
  TLT: 'NYSE Arca',
  VTI: 'NYSE Arca',
  'EMAAR.AE': 'Dubai Financial Market',
};

function fallbackExchangeForSymbol(symbol: string, marketId: string) {
  if (FALLBACK_EXCHANGE_BY_SYMBOL[symbol]) return FALLBACK_EXCHANGE_BY_SYMBOL[symbol];
  if (marketId === 'crypto') return 'Crypto';
  if (marketId === 'forex') return 'Forex';
  if (marketId === 'metals') return 'Metals';
  if (marketId === 'uae') return /\.AD$/.test(symbol) ? 'Abu Dhabi Securities Exchange' : 'Dubai Financial Market';
  return TRADER_MARKET_METADATA[marketId]?.exchange ?? null;
}

function fallbackMarketLabel(marketId: string) {
  if (marketId === 'etfs') return 'US ETFs';
  if (marketId === 'uae') return 'UAE Market';
  if (marketId === 'kuwait') return 'Kuwait Market';
  if (marketId === 'saudi') return 'Saudi Market';
  if (marketId === 'oman') return 'Oman Market';
  if (marketId === 'qatar') return 'Qatar Market';
  if (marketId === 'bahrain') return 'Bahrain Market';
  return TRADER_MARKET_METADATA[marketId]?.labelEn ?? null;
}

export function normalizeTraderSymbolMetadata(input: TraderSymbolMetadataInput) {
  const quote = input.quote ?? null;
  const catalog = input.catalog ?? null;
  const symbol = upper(input.symbol) || upper(catalog?.symbol) || upper(quote?.symbol);
  const displaySymbol = upper(input.displaySymbol) || upper(catalog?.displaySymbol ?? catalog?.display_symbol) || symbol;
  const providerSymbol = upper(input.providerSymbol)
    || upper(catalog?.providerSymbol ?? catalog?.provider_symbol)
    || upper(quote?.providerSymbol ?? quote?.provider_symbol)
    || symbol;
  const explicitAssetType = text(input.assetType)
    || recordText(catalog, ['assetType', 'asset_type', 'type', 'quoteType', 'instrumentType'])
    || recordText(quote, ['assetType', 'asset_type', 'quoteType', 'instrumentType', 'type']);
  const marketId = inferTraderMarketIdFromSymbol(displaySymbol || providerSymbol, explicitAssetType);
  const assetType = normalizedAssetType(explicitAssetType, marketId);
  const market = TRADER_MARKET_METADATA[marketId] ?? TRADER_MARKET_METADATA['us-stocks']!;
  const catalogExchange = recordText(catalog, ['exchange', 'exchangeName', 'exchange_name', 'fullExchangeName', 'exchangeShortName', 'mic', 'mic_code']);
  const providerExchange = recordText(quote, ['exchangeShortName', 'exchangeName', 'fullExchangeName', 'quoteSourceName', 'exchange', 'mic', 'mic_code']);
  const fallbackExchange = fallbackExchangeForSymbol(displaySymbol || providerSymbol, marketId);
  const exchange = (catalogExchange ? normalizedExchange(catalogExchange) : '')
    || (providerExchange ? normalizedExchange(providerExchange) : '')
    || fallbackExchange;
  const exchangeCode = recordText(catalog, ['exchangeCode', 'exchange_code'])
    || normalizedExchangeCode(recordText(quote, ['exchangeCode', 'exchange_code', 'mic_code', 'mic', 'exchange']))
    || inferExchangeCode(displaySymbol);
  const country = recordText(catalog, ['country']) || recordText(quote, ['country']) || market.country || null;
  const catalogCurrency = recordText(catalog, ['currency']);
  const providerCurrency = recordText(quote, ['currency']);
  const currency = resolveTraderContextCurrency({
    marketId,
    symbol: displaySymbol || providerSymbol,
    assetType,
    currency: catalogCurrency || providerCurrency,
  });
  const companyName = recordText(catalog, ['name', 'companyName', 'company_name_en', 'company_name_ar'])
    || recordText(quote, ['name', 'companyName', 'shortName', 'longName'])
    || null;
  const finalMarket = recordText(catalog, ['market'])
    || recordText(quote, ['market'])
    || fallbackMarketLabel(marketId)
    || market.labelEn;

  return {
    symbol,
    displaySymbol,
    providerSymbol,
    companyName,
    assetType,
    exchange,
    exchangeCode,
    market: finalMarket,
    country,
    currency,
    diagnostics: {
      provider: text(input.provider) || null,
      providerSymbol: providerSymbol || null,
      finalExchange: exchange,
      finalExchangeCode: exchangeCode,
      finalMarket,
      finalCountry: country,
      finalCurrency: currency,
      finalAssetType: assetType,
      currencySource: catalogCurrency ? 'catalog' : providerCurrency ? 'provider' : 'metadata',
      exchangeSource: catalogExchange ? 'catalog' : providerExchange ? 'provider' : fallbackExchange ? 'fallback' : null,
      warnings: [],
    } satisfies TraderSymbolMetadataDiagnostics,
  };
}
