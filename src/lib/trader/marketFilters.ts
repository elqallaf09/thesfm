export type MarketFilterAsset = {
  symbol?: unknown;
  displaySymbol?: unknown;
  canonicalSymbol?: unknown;
  providerSymbol?: unknown;
  providerSymbolUsed?: unknown;
  assetType?: unknown;
  asset_type?: unknown;
  quoteType?: unknown;
  instrumentType?: unknown;
  category?: unknown;
  sector?: unknown;
  industry?: unknown;
  exchange?: unknown;
  exchangeName?: unknown;
  exchangeCode?: unknown;
  exchange_code?: unknown;
  market?: unknown;
  marketName?: unknown;
  country?: unknown;
  countryCode?: unknown;
  currency?: unknown;
  currencyCode?: unknown;
  quoteCurrency?: unknown;
  providerStatus?: Record<string, unknown> | null;
  provider_status?: Record<string, unknown> | null;
  metadataDiagnostics?: Record<string, unknown> | null;
  metadata_diagnostics?: Record<string, unknown> | null;
};

type StrictMarketRule = {
  id: string;
  currency: string;
  exchange: string;
  country: string;
  countries: string[];
  exchanges: RegExp[];
  markets: RegExp[];
  symbolSuffix: RegExp;
  allowedAssetTypes: string[];
};

export type MarketFilterDecision = {
  allowed: boolean;
  marketId: string | null;
  reason: string;
};

export type AssetSelectionDecision = MarketFilterDecision & {
  category: string;
};

const GLOBAL_MARKET_KEYS = new Set([
  '',
  'all',
  'all market',
  'all markets',
  'all-market',
  'all-markets',
  'global',
  'global market',
  'global markets',
]);

const STRICT_MARKET_RULES: Record<string, StrictMarketRule> = {
  bahrain: {
    id: 'bahrain',
    currency: 'BHD',
    exchange: 'Bahrain Bourse',
    country: 'Bahrain',
    countries: ['BH', 'BAHRAIN'],
    exchanges: [/\b(BHB|XBAH)\b/i, /BAHRAIN/i, /BAHRAIN BOURSE/i],
    markets: [/BAHRAIN/i, /\bBHB\b/i, /BAHRAIN BOURSE/i],
    symbolSuffix: /\.BH$/i,
    allowedAssetTypes: ['stock', 'equity'],
  },
  kuwait: {
    id: 'kuwait',
    currency: 'KWD',
    exchange: 'Boursa Kuwait',
    country: 'Kuwait',
    countries: ['KW', 'KUWAIT'],
    exchanges: [/\b(KSE|XKUW)\b/i, /KUWAIT/i, /BOURSA KUWAIT/i],
    markets: [/KUWAIT/i, /BOURSA KUWAIT/i],
    symbolSuffix: /\.KW$/i,
    allowedAssetTypes: ['stock', 'equity'],
  },
  saudi: {
    id: 'saudi',
    currency: 'SAR',
    exchange: 'Tadawul',
    country: 'Saudi Arabia',
    countries: ['SA', 'SAUDI', 'SAUDI ARABIA'],
    exchanges: [/\b(TADAWUL|XSAU)\b/i, /SAUDI EXCHANGE/i],
    markets: [/TADAWUL/i, /SAUDI/i],
    symbolSuffix: /\.(SR|SA)$/i,
    allowedAssetTypes: ['stock', 'equity'],
  },
  uae: {
    id: 'uae',
    currency: 'AED',
    exchange: 'ADX/DFM',
    country: 'United Arab Emirates',
    countries: ['AE', 'UAE', 'UNITED ARAB EMIRATES'],
    exchanges: [/\b(ADX|DFM|XADS|XDFM)\b/i, /ABU DHABI/i, /DUBAI FINANCIAL MARKET/i],
    markets: [/\b(ADX|DFM)\b/i, /UAE/i, /ABU DHABI/i, /DUBAI/i, /UNITED ARAB/i],
    symbolSuffix: /\.(AE|DU|AD)$/i,
    allowedAssetTypes: ['stock', 'equity'],
  },
  oman: {
    id: 'oman',
    currency: 'OMR',
    exchange: 'Muscat Stock Exchange',
    country: 'Oman',
    countries: ['OM', 'OMAN'],
    exchanges: [/\b(MSX|XMUS)\b/i, /MUSCAT/i],
    markets: [/OMAN/i, /\bMSX\b/i, /MUSCAT/i],
    symbolSuffix: /\.OM$/i,
    allowedAssetTypes: ['stock', 'equity'],
  },
  qatar: {
    id: 'qatar',
    currency: 'QAR',
    exchange: 'Qatar Exchange',
    country: 'Qatar',
    countries: ['QA', 'QATAR'],
    exchanges: [/\b(QSE|DSMD|DSM)\b/i, /QATAR/i, /QATAR EXCHANGE/i],
    markets: [/QATAR/i, /\bQSE\b/i, /QATAR EXCHANGE/i],
    symbolSuffix: /\.QA$/i,
    allowedAssetTypes: ['stock', 'equity'],
  },
};

const CATEGORY_ALIASES: Record<string, string> = {
  'all': 'all',
  'all assets': 'all',
  'stock': 'stock',
  'stocks': 'stock',
  'equity': 'stock',
  'equities': 'stock',
  'tech': 'technology',
  'tech stock': 'technology',
  'tech stocks': 'technology',
  'technology': 'technology',
  'technology stocks': 'technology',
  'semiconductor': 'semiconductors',
  'semiconductors': 'semiconductors',
  'semiconductor stocks': 'semiconductors',
  'crypto': 'crypto',
  'cryptocurrency': 'crypto',
  'digital assets': 'crypto',
  'forex': 'forex',
  'fx': 'forex',
  'currency': 'forex',
  'currency pairs': 'forex',
  'commodity': 'commodity',
  'commodities': 'commodity',
  'metals': 'commodity',
  'etf': 'fund',
  'etfs': 'fund',
  'fund': 'fund',
  'funds': 'fund',
  'indices': 'index',
  'index': 'index',
};

const CATEGORY_MARKET_IDS = new Set([
  'technology',
  'semiconductors',
  'crypto',
  'forex',
  'commodities',
  'etfs',
  'indices',
]);

const US_MARKET_KEYS = new Set(['us', 'usa', 'us stocks', 'us-stocks', 'u s stocks', 'american stocks']);
const US_EXCHANGE_PATTERN = /\b(NASDAQ|NYSE|AMEX|CBOE|ARCX|NYSE ARCA)\b/i;

const TECHNOLOGY_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PANW', 'CRWD', 'SHOP',
  'INTU', 'ADP', 'IBM', 'CSCO', 'NET', 'UBER', 'PLTR', 'DELL', 'META', 'AMZN', 'NVDA', 'AMD',
  'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'MCHP', 'ON',
  'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC', 'COHR', 'UMC', 'GFS', 'WOLF',
]);

const SEMICONDUCTOR_SYMBOLS = new Set([
  'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
  'MRVL', 'MCHP', 'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC',
  'COHR', 'UMC', 'GFS', 'WOLF',
]);

export function strictMarketContextForSelection(selectedMarket: unknown) {
  const marketId = normalizeSelectedMarketKey(selectedMarket);
  if (!marketId) return null;
  const rule = STRICT_MARKET_RULES[marketId];
  if (!rule) return null;
  return {
    marketId,
    exchange: rule.exchange,
    currency: rule.currency,
    country: rule.country,
    countries: rule.countries,
    allowedAssetTypes: rule.allowedAssetTypes,
  };
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function compactMarketKey(value: unknown) {
  return text(value).toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeSelectedCategoryKey(selectedCategory: unknown) {
  const raw = compactMarketKey(selectedCategory).replace(/-/g, ' ');
  if (!raw) return 'all';
  return CATEGORY_ALIASES[raw] ?? raw;
}

export function normalizeSelectedMarketKey(selectedMarket: unknown) {
  const raw = compactMarketKey(selectedMarket);
  if (GLOBAL_MARKET_KEYS.has(raw)) return null;
  if (raw === 'bh' || raw === 'bhd' || raw.includes('bahrain') || raw.includes('bhb')) return 'bahrain';
  if (raw === 'kw' || raw === 'kwd' || raw.includes('kuwait') || raw.includes('boursa')) return 'kuwait';
  if (raw === 'sa' || raw === 'sar' || raw.includes('saudi') || raw.includes('tadawul')) return 'saudi';
  if (raw === 'ae' || raw === 'aed' || raw.includes('uae') || raw.includes('emirates') || raw.includes('adx') || raw.includes('dfm')) return 'uae';
  if (raw === 'om' || raw === 'omr' || raw.includes('oman') || raw.includes('muscat') || raw.includes('msx')) return 'oman';
  if (raw === 'qa' || raw === 'qar' || raw.includes('qatar') || raw.includes('qse')) return 'qatar';
  return STRICT_MARKET_RULES[raw] ? raw : null;
}

function nestedRecord(asset: MarketFilterAsset, key: 'providerStatus' | 'metadataDiagnostics') {
  const value = asset[key] ?? asset[key === 'providerStatus' ? 'provider_status' : 'metadata_diagnostics'];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstText(asset: MarketFilterAsset, keys: string[]) {
  const providerStatus = nestedRecord(asset, 'providerStatus');
  const metadataDiagnostics = nestedRecord(asset, 'metadataDiagnostics');
  for (const source of [asset as Record<string, unknown>, providerStatus, metadataDiagnostics]) {
    for (const key of keys) {
      const value = text(source[key]);
      if (value) return value;
    }
  }
  return '';
}

function symbolText(asset: MarketFilterAsset) {
  return upper(firstText(asset, ['symbol', 'displaySymbol', 'canonicalSymbol', 'providerSymbolUsed', 'providerSymbol']));
}

function normalizedAssetSymbol(asset: MarketFilterAsset) {
  return symbolText(asset).replace(/[-=].*$/, '').replace(/\..*$/, '');
}

function normalizedAssetType(value: string) {
  const normalized = value.toLowerCase().replace(/[-_]/g, ' ').trim();
  if (/\b(stock|equity|ordinary share|common stock|common share|share)\b/.test(normalized)) return 'stock';
  if (/\b(etf|fund)\b/.test(normalized)) return 'fund';
  if (/\b(crypto|cryptocurrency|digital asset)\b/.test(normalized)) return 'crypto';
  if (/\b(forex|fx|currency|currency pair)\b/.test(normalized)) return 'forex';
  if (/\b(commodity|metal|gold|silver)\b/.test(normalized)) return 'commodity';
  if (/\b(index|indices)\b/.test(normalized)) return 'index';
  return normalized;
}

function inferredAssetType(asset: MarketFilterAsset) {
  const explicit = normalizedAssetType(firstText(asset, [
    'assetType',
    'asset_type',
    'quoteType',
    'instrumentType',
    'finalAssetType',
    'category',
  ]));
  if (explicit) return explicit;

  const symbol = symbolText(asset);
  if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|USDT|AVAX|DOT|LTC|BCH|LINK)(?:USD|-USD)?$/i.test(symbol)) return 'crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/i.test(symbol) || /XAU|XAG|GOLD|SILVER|OIL/i.test(symbol)) return 'commodity';
  if (/^[A-Z]{6}$/i.test(symbol.replace(/[.\-=].*/, ''))) return 'forex';
  if (/^(SPY|QQQ|VOO|DIA|IWM|GLD|SLV|VTI|VEA|VWO|AGG|BND|TLT|HYG|SOXX)$/i.test(symbol)) return 'fund';
  if (/^(US30|NAS100|SPX500|DAX|FTSE|CAC40|NIKKEI|HSI|DXY|\^)/i.test(symbol)) return 'index';
  return 'stock';
}

function classificationText(asset: MarketFilterAsset) {
  return upper([
    firstText(asset, ['sector', 'category']),
    firstText(asset, ['industry']),
    firstText(asset, ['market', 'marketName', 'market_name', 'finalMarket']),
    firstText(asset, ['exchange', 'exchangeName', 'exchange_name']),
  ].filter(Boolean).join(' '));
}

function marketSelectionKey(selectedMarket: unknown) {
  return compactMarketKey(selectedMarket).replace(/-/g, ' ');
}

function categoryFromMarketSelection(selectedMarket: unknown) {
  const raw = marketSelectionKey(selectedMarket);
  if (!raw) return 'all';
  if (CATEGORY_MARKET_IDS.has(raw)) return normalizeSelectedCategoryKey(raw);
  return 'all';
}

function selectedCategoryKey(selectedMarket: unknown, selectedCategory: unknown) {
  const explicit = normalizeSelectedCategoryKey(selectedCategory);
  return explicit !== 'all' ? explicit : categoryFromMarketSelection(selectedMarket);
}

function isUsEquity(asset: MarketFilterAsset, assetType: string) {
  if (assetType !== 'stock') return false;
  const symbol = symbolText(asset);
  const country = upper(firstText(asset, ['country', 'countryCode', 'country_code', 'finalCountry']));
  const currency = upper(firstText(asset, ['currency', 'currencyCode', 'currency_code', 'quoteCurrency', 'finalCurrency']));
  const exchange = upper(firstText(asset, ['exchange', 'exchangeName', 'exchange_name', 'exchangeCode', 'exchange_code', 'finalExchange', 'finalExchangeCode']));
  const hasNonUsSuffix = /\.[A-Z]{1,3}$/i.test(symbol) && !/\.(US)$/i.test(symbol);

  if (currency && currency !== 'USD') return false;
  if (country && !['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(country)) return false;
  if (exchange && !US_EXCHANGE_PATTERN.test(exchange)) return false;
  if (hasNonUsSuffix) return false;
  return true;
}

function categoryDecision(asset: MarketFilterAsset, selectedMarket: unknown, category: string): AssetSelectionDecision {
  if (category === 'all') return { allowed: true, marketId: normalizeSelectedMarketKey(selectedMarket), category, reason: 'category_all' };

  const assetType = inferredAssetType(asset);
  const symbol = normalizedAssetSymbol(asset);
  const classification = classificationText(asset);
  const marketId = normalizeSelectedMarketKey(selectedMarket);

  if (category === 'stock') {
    return assetType === 'stock'
      ? { allowed: true, marketId, category, reason: 'matched_stock_category' }
      : { allowed: false, marketId, category, reason: 'category_asset_type_mismatch' };
  }
  if (category === 'crypto' || category === 'forex' || category === 'commodity' || category === 'fund' || category === 'index') {
    return assetType === category
      ? { allowed: true, marketId, category, reason: `matched_${category}_category` }
      : { allowed: false, marketId, category, reason: 'category_asset_type_mismatch' };
  }
  if (category === 'technology') {
    const matchesTechnology = TECHNOLOGY_SYMBOLS.has(symbol)
      || /\b(TECHNOLOGY|INFORMATION TECHNOLOGY|SOFTWARE|CLOUD|CYBERSECURITY|SEMICONDUCTORS?|ELECTRONIC COMPONENTS?)\b/.test(classification);
    return isUsEquity(asset, assetType) && matchesTechnology
      ? { allowed: true, marketId, category, reason: 'matched_technology_category' }
      : { allowed: false, marketId, category, reason: assetType === 'crypto' || assetType === 'forex' || assetType === 'commodity' ? 'technology_category_asset_type_mismatch' : 'category_classification_mismatch' };
  }
  if (category === 'semiconductors') {
    const matchesSemiconductors = SEMICONDUCTOR_SYMBOLS.has(symbol)
      || /\b(SEMICONDUCTORS?|SEMICONDUCTOR EQUIPMENT|SEMICONDUCTOR MATERIALS?|INTEGRATED CIRCUITS?|CHIP(?:S|MAKER|MAKERS)?)\b/.test(classification);
    return assetType === 'stock' && matchesSemiconductors
      ? { allowed: true, marketId, category, reason: 'matched_semiconductors_category' }
      : { allowed: false, marketId, category, reason: assetType === 'crypto' || assetType === 'forex' || assetType === 'commodity' ? 'semiconductors_category_asset_type_mismatch' : 'category_classification_mismatch' };
  }

  return { allowed: false, marketId, category, reason: 'unknown_category' };
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some(pattern => pattern.test(value));
}

export function marketFilterDecision(asset: MarketFilterAsset, selectedMarket: unknown): MarketFilterDecision {
  const marketId = normalizeSelectedMarketKey(selectedMarket);
  if (!marketId) {
    const raw = marketSelectionKey(selectedMarket);
    if (US_MARKET_KEYS.has(raw)) {
      const assetType = inferredAssetType(asset);
      return isUsEquity(asset, assetType)
        ? { allowed: true, marketId: 'us-stocks', reason: 'matched_us_equity_market' }
        : { allowed: false, marketId: 'us-stocks', reason: 'us_market_asset_mismatch' };
    }
    return { allowed: true, marketId: null, reason: 'global_or_unrestricted_market' };
  }

  const rule = STRICT_MARKET_RULES[marketId];
  if (!rule) return { allowed: true, marketId, reason: 'no_strict_rule' };

  const symbol = symbolText(asset);
  const exchange = upper(firstText(asset, ['exchange', 'exchangeName', 'exchange_name', 'exchangeCode', 'exchange_code', 'finalExchange', 'finalExchangeCode']));
  const market = upper(firstText(asset, ['market', 'marketName', 'market_name', 'finalMarket']));
  const country = upper(firstText(asset, ['country', 'countryCode', 'country_code', 'finalCountry']));
  const currency = upper(firstText(asset, ['currency', 'currencyCode', 'currency_code', 'quoteCurrency', 'finalCurrency']));
  const assetType = inferredAssetType(asset);

  const exchangeMatches = matchesAny(exchange, rule.exchanges);
  const marketMatches = matchesAny(market, rule.markets);
  const venueMatches = exchangeMatches || marketMatches || rule.symbolSuffix.test(symbol);
  const countryMatches = rule.countries.includes(country) || rule.symbolSuffix.test(symbol);
  const currencyMatches = currency === rule.currency;
  const assetTypeMatches = rule.allowedAssetTypes.includes(assetType);

  if (!venueMatches) return { allowed: false, marketId, reason: 'venue_mismatch' };
  if (!countryMatches) return { allowed: false, marketId, reason: 'country_mismatch' };
  if (!currencyMatches) return { allowed: false, marketId, reason: 'currency_mismatch' };
  if (!assetTypeMatches) return { allowed: false, marketId, reason: 'asset_type_mismatch' };

  return { allowed: true, marketId, reason: 'matched_strict_market_rule' };
}

export function filterAssetsByMarket<T extends MarketFilterAsset>(assets: T[], selectedMarket: unknown): T[] {
  if (!Array.isArray(assets)) return [];
  return assets.filter(asset => marketFilterDecision(asset, selectedMarket).allowed);
}

export function assetSelectionDecision(
  asset: MarketFilterAsset,
  selectedMarket: unknown,
  selectedCategory: unknown = 'all',
): AssetSelectionDecision {
  const marketDecision = marketFilterDecision(asset, selectedMarket);
  const category = selectedCategoryKey(selectedMarket, selectedCategory);

  if (!marketDecision.allowed) {
    return { ...marketDecision, category };
  }

  const categoryFilterDecision = categoryDecision(asset, selectedMarket, category);
  if (!categoryFilterDecision.allowed) return categoryFilterDecision;

  return {
    allowed: true,
    marketId: marketDecision.marketId,
    category,
    reason: category === 'all' ? marketDecision.reason : categoryFilterDecision.reason,
  };
}

export function isAssetAllowedForSelection(
  asset: MarketFilterAsset,
  selectedMarket: unknown,
  selectedCategory: unknown = 'all',
) {
  return assetSelectionDecision(asset, selectedMarket, selectedCategory).allowed;
}

export function filterAssetsBySelection<T extends MarketFilterAsset>(
  assets: T[],
  selectedMarket: unknown,
  selectedCategory: unknown = 'all',
): T[] {
  if (!Array.isArray(assets)) return [];
  return assets.filter(asset => isAssetAllowedForSelection(asset, selectedMarket, selectedCategory));
}
