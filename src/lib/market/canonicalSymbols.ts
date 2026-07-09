import cryptoSymbols from '@/data/market-symbols/crypto.json';

export type CanonicalAssetClass = 'crypto' | 'stock' | 'forex' | 'etf' | 'fund' | 'index' | 'commodity';

export type CanonicalProviderSymbols = {
  yahoo: string;
  finnhub: string;
  binance: string;
  fmp: string;
  twelveData: string;
  eodhd: string;
};

export type CanonicalMarketSymbol = {
  canonicalSymbol: string;
  assetClass: CanonicalAssetClass;
  displaySymbol: string;
  providerSymbols: CanonicalProviderSymbols;
  name: string;
  baseSymbol: string;
  quoteSymbol: string;
  aliases: string[];
};

type CryptoSymbolRecord = {
  symbol?: string;
  provider_symbol?: string | null;
  name?: string | null;
  company_name_en?: string | null;
  aliases?: string[] | null;
};

export type CryptoQuoteValidationInput = {
  requestedSymbol?: unknown;
  canonicalSymbol?: unknown;
  assetClass?: unknown;
  provider?: unknown;
  providerSymbol?: unknown;
  responseSymbol?: unknown;
  responseName?: unknown;
  responseAssetType?: unknown;
  responsePrice?: unknown;
};

const COMPANY_NAME_COLLISION_PATTERN = /\b(?:INC|INCORPORATED|CORP|CORPORATION|LTD|LIMITED|PLC|LLC|HOLDING|HOLDINGS|BANCO|BANK|TECH|TECHNOLOG(?:Y|IES)|THERAPEUTICS?|SYSTEMS?)\b/i;
const NON_CRYPTO_RESPONSE_TYPES = new Set([
  'EQUITY',
  'ETF',
  'MUTUALFUND',
  'MUTUAL_FUND',
  'INDEX',
  'FUND',
  'OPTION',
  'FUTURE',
]);

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function compactCryptoKey(value: unknown) {
  return upper(value)
    .replace(/\.CC$/, '')
    .replace(/^(BINANCE|COINBASE|KRAKEN|BITSTAMP|CRYPTO)[:/\\-]/, '')
    .replace(/\s+/g, '')
    .replace(/[\\/:._-]/g, '')
    .replace(/^([A-Z0-9]{2,12})USDT$/, '$1USDT');
}

function normalizeAssetClass(value: unknown): CanonicalAssetClass | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return null;
  if (normalized === 'stocks' || normalized === 'equity' || normalized === 'equities') return 'stock';
  if (normalized === 'crypto' || normalized === 'cryptocurrency' || normalized === 'digital_asset') return 'crypto';
  if (normalized === 'fx' || normalized === 'currency') return 'forex';
  if (normalized === 'etfs') return 'etf';
  if (normalized === 'funds') return 'fund';
  if (normalized === 'indices' || normalized === 'indexes') return 'index';
  if (normalized === 'commodity' || normalized === 'commodities' || normalized === 'gold') return 'commodity';
  return null;
}

function unique(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    const key = text.toUpperCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function cryptoBaseFromCompact(value: string) {
  const compact = value.replace(/^(BINANCE|COINBASE|KRAKEN|BITSTAMP|CRYPTO)/, '');
  if (/^[A-Z0-9]{2,12}USDT$/.test(compact)) return compact.slice(0, -4);
  if (/^[A-Z0-9]{2,12}USD$/.test(compact)) return compact.slice(0, -3);
  if (/^[A-Z0-9]{2,12}$/.test(compact)) return compact;
  return null;
}

function buildCanonicalCryptoAsset(baseSymbol: string, name?: string | null, aliases: unknown[] = []): CanonicalMarketSymbol | null {
  const base = upper(baseSymbol).replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z0-9]{2,12}$/.test(base)) return null;
  const displayName = String(name ?? '').trim() || base;
  const yahoo = `${base}-USD`;
  const fmp = `${base}USD`;
  const binance = `BINANCE:${base}USDT`;
  return {
    canonicalSymbol: `${base}/USD`,
    assetClass: 'crypto',
    displaySymbol: `${base}/USD`,
    providerSymbols: {
      yahoo,
      finnhub: binance,
      binance,
      fmp,
      twelveData: `${base}/USD`,
      eodhd: `${base}-USD.CC`,
    },
    name: displayName,
    baseSymbol: base,
    quoteSymbol: 'USD',
    aliases: unique([
      base,
      `${base}USD`,
      `${base}-USD`,
      `${base}/USD`,
      `${base}USDT`,
      yahoo,
      fmp,
      binance,
      displayName,
      ...aliases,
    ]),
  };
}

const canonicalCryptoAssets = (cryptoSymbols as CryptoSymbolRecord[])
  .map(record => buildCanonicalCryptoAsset(
    record.symbol ?? '',
    record.company_name_en ?? record.name ?? record.symbol,
    [record.provider_symbol, ...(record.aliases ?? [])],
  ))
  .filter((asset): asset is CanonicalMarketSymbol => Boolean(asset));

const cryptoAssetByKey = new Map<string, CanonicalMarketSymbol>();

for (const asset of canonicalCryptoAssets) {
  for (const alias of asset.aliases) {
    const compact = compactCryptoKey(alias);
    if (compact) cryptoAssetByKey.set(compact, asset);
  }
  cryptoAssetByKey.set(compactCryptoKey(asset.canonicalSymbol), asset);
  cryptoAssetByKey.set(compactCryptoKey(asset.providerSymbols.yahoo), asset);
  cryptoAssetByKey.set(compactCryptoKey(asset.providerSymbols.fmp), asset);
  cryptoAssetByKey.set(compactCryptoKey(asset.providerSymbols.binance), asset);
}

export function listCanonicalCryptoAssets() {
  return canonicalCryptoAssets.slice();
}

export function isKnownCryptoBase(baseSymbol: unknown) {
  return cryptoAssetByKey.has(compactCryptoKey(baseSymbol));
}

export function canonicalCryptoProviderSymbols(value: unknown) {
  return resolveCanonicalCryptoSymbol(value)?.providerSymbols ?? null;
}

export function resolveCanonicalCryptoSymbol(
  value: unknown,
  options: { assetClass?: unknown; allowInferred?: boolean } = {},
): CanonicalMarketSymbol | null {
  const requestedAssetClass = normalizeAssetClass(options.assetClass);
  if (requestedAssetClass && requestedAssetClass !== 'crypto') return null;

  const compact = compactCryptoKey(value);
  if (!compact) return null;
  const direct = cryptoAssetByKey.get(compact);
  if (direct) return direct;

  if (!options.allowInferred && requestedAssetClass !== 'crypto') return null;
  const base = cryptoBaseFromCompact(compact);
  return base ? buildCanonicalCryptoAsset(base) : null;
}

function normalizedWords(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(word => word && !['USD', 'US', 'DOLLAR', 'TOKEN', 'COIN', 'CRYPTO', 'CRYPTOCURRENCY'].includes(word));
}

function responseNameMatchesCrypto(responseName: unknown, asset: CanonicalMarketSymbol) {
  const responseWords = new Set(normalizedWords(responseName));
  if (responseWords.size === 0) return true;
  if (responseWords.has(asset.baseSymbol)) return true;
  const expectedWords = normalizedWords(asset.name);
  return expectedWords.length > 0 && expectedWords.every(word => responseWords.has(word));
}

function cryptoProviderSymbolMatches(providerSymbol: unknown, asset: CanonicalMarketSymbol) {
  const compact = compactCryptoKey(providerSymbol);
  return compact === `${asset.baseSymbol}USD` || compact === `${asset.baseSymbol}USDT`;
}

export function cryptoQuoteRejectionReason(input: CryptoQuoteValidationInput) {
  const assetClass = normalizeAssetClass(input.assetClass);
  const asset = resolveCanonicalCryptoSymbol(input.canonicalSymbol || input.requestedSymbol || input.providerSymbol || input.responseSymbol, {
    assetClass: 'crypto',
    allowInferred: assetClass === 'crypto',
  });
  if (assetClass !== 'crypto' || !asset) return null;

  const responseType = upper(input.responseAssetType).replace(/\s+/g, '_');
  if (NON_CRYPTO_RESPONSE_TYPES.has(responseType)) return `asset_type_collision:${responseType}`;

  const provider = upper(input.provider);
  const providerSymbol = input.providerSymbol;
  const responseSymbol = input.responseSymbol || providerSymbol;
  const responseName = String(input.responseName ?? '').trim();

  if (!cryptoProviderSymbolMatches(responseSymbol, asset)) {
    return `symbol_collision:${String(responseSymbol ?? providerSymbol ?? '').trim() || 'empty_response_symbol'}`;
  }

  if (provider.includes('YAHOO') && !cryptoProviderSymbolMatches(providerSymbol, asset)) {
    return `provider_symbol_not_crypto_pair:${String(providerSymbol ?? '').trim() || 'empty_provider_symbol'}`;
  }

  if (responseName && !responseNameMatchesCrypto(responseName, asset) && COMPANY_NAME_COLLISION_PATTERN.test(responseName)) {
    return `company_name_collision:${responseName}`;
  }

  const price = Number(input.responsePrice);
  if (!Number.isFinite(price) || price <= 0) return 'provider_returned_empty_quote';

  return null;
}
