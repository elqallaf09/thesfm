export type AssetVisualType =
  | 'stock'
  | 'crypto'
  | 'etf'
  | 'forex'
  | 'commodity'
  | 'gold'
  | 'silver'
  | 'oil'
  | 'gas'
  | 'index'
  | 'fund'
  | 'real-estate'
  | 'cash'
  | 'project'
  | 'unknown';

export type AssetVisualInput = {
  symbol?: string | null;
  name?: string | null;
  companyName?: string | null;
  assetType?: string | null;
  exchange?: string | null;
  market?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
};

export type AssetVisualMeta = {
  symbol: string;
  label: string;
  assetType: AssetVisualType;
  logoUrl: string | null;
  fallbackText: string;
  tone: AssetVisualType;
  iconKind: AssetVisualType;
  flags: string[];
  alt: string;
};

const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const SAFE_IMAGE_URL_PATTERN = /^https?:\/\//i;

const CRYPTO_LOGO_SLUGS: Record<string, string> = {
  BTC: 'bitcoin/F7931A',
  ETH: 'ethereum/627EEA',
  SOL: 'solana/14F195',
  XRP: 'xrp/23292F',
  BNB: 'binance/F0B90B',
  DOGE: 'dogecoin/C2A633',
  ADA: 'cardano/0133AD',
};

const VERIFIED_ASSET_LOGOS: Record<string, string> = {
  AMD: 'https://cdn.simpleicons.org/amd',
  NVDA: 'https://cdn.simpleicons.org/nvidia',
  KFH: 'https://www.google.com/s2/favicons?domain_url=https://www.kfh.com&sz=128',
  'KFH.KW': 'https://www.google.com/s2/favicons?domain_url=https://www.kfh.com&sz=128',
};

const CURRENCY_FLAGS: Record<string, string> = {
  AED: '🇦🇪',
  AUD: '🇦🇺',
  BHD: '🇧🇭',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  CNY: '🇨🇳',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  HKD: '🇭🇰',
  INR: '🇮🇳',
  JPY: '🇯🇵',
  KWD: '🇰🇼',
  NZD: '🇳🇿',
  OMR: '🇴🇲',
  QAR: '🇶🇦',
  SAR: '🇸🇦',
  SGD: '🇸🇬',
  USD: '🇺🇸',
};

const COMMODITY_KEYWORDS: Array<[RegExp, AssetVisualType]> = [
  [/\b(XAU|GOLD|GC=F)\b/i, 'gold'],
  [/\b(XAG|SILVER|SI=F)\b/i, 'silver'],
  [/\b(BRENT|WTI|CRUDE|OIL|CL=F|BZ=F)\b/i, 'oil'],
  [/\b(NATURAL\s*GAS|GAS|NG=F)\b/i, 'gas'],
  [/\b(COPPER|HG=F)\b/i, 'commodity'],
];

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeSymbol(symbol: unknown) {
  return cleanText(symbol)
    .toUpperCase()
    .replace(
      /^(NASDAQ|NYSE|AMEX|TADAWUL|TASI|TAD|DFM|ADX|KASE|XKUW|KW|KSE|LSE|TSX|ASX|HKEX|BATS|CRYPTO|FOREX|FX|US|EU|GCC)[:\s-]+/i,
      '',
    )
    .replace(/\s+/g, '');
}

function safeImageUrl(value: unknown) {
  const text = cleanText(value);
  if (!text || !SAFE_IMAGE_URL_PATTERN.test(text)) return null;
  return text;
}

export function resolveAssetLogoUrl(input: AssetVisualInput): string | null {
  const explicitUrl = safeImageUrl(input.logoUrl) || safeImageUrl(input.imageUrl);
  if (explicitUrl) return explicitUrl;

  const symbol = normalizeSymbol(input.symbol);
  const verifiedAssetLogo = VERIFIED_ASSET_LOGOS[symbol];
  if (verifiedAssetLogo) return verifiedAssetLogo;
  const rawType = cleanText(input.assetType ?? input.market ?? input.exchange).toLowerCase();
  const compactCryptoSymbol = symbol.replace(/(?:-?USD|-?USDT)$/i, '');
  const cryptoSlug = CRYPTO_LOGO_SLUGS[compactCryptoSymbol];
  if ((rawType.includes('crypto') || cryptoSlug) && cryptoSlug) {
    return `https://cdn.simpleicons.org/${cryptoSlug}`;
  }
  const stockLikeType = !rawType
    || rawType.includes('stock')
    || rawType.includes('equity')
    || rawType.includes('share')
    || rawType.includes('etf')
    || rawType.includes('fund');

  if (!stockLikeType || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return null;
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
}

function normalizeAssetType(value: unknown, symbol: string, label: string): AssetVisualType {
  const raw = cleanText(value).toLowerCase();
  const haystack = `${symbol} ${label}`.toUpperCase();

  if (raw.includes('crypto') || raw === 'coin') return 'crypto';
  if (raw.includes('forex') || raw.includes('currency') || /^[A-Z]{6}(?:=X)?$/.test(symbol)) return 'forex';
  if (raw.includes('etf')) return 'etf';
  if (raw.includes('fund')) return 'fund';
  if (raw.includes('real estate') || raw.includes('realestate') || raw.includes('property')) return 'real-estate';
  if (raw.includes('cash') || raw.includes('deposit')) return 'cash';
  if (raw.includes('project') || raw.includes('private investment')) return 'project';
  if (raw.includes('index') || raw.includes('indices') || symbol.startsWith('^')) return 'index';
  if (raw.includes('gold')) return 'gold';
  if (raw.includes('silver')) return 'silver';
  if (raw.includes('commodity') || raw.includes('future') || raw.includes('metal') || raw.includes('energy')) {
    return commodityType(haystack);
  }
  if (raw.includes('stock') || raw.includes('equity') || raw.includes('share')) return 'stock';

  if (/^[A-Z]{6}(?:=X)?$/.test(symbol)) return 'forex';
  if (/^(BTC|ETH|SOL|XRP|BNB|DOGE|ADA|TRX|LINK|AVAX|TON|DOT|LTC|BCH|XLM|ATOM|UNI|AAVE|MATIC|POL|NEAR|ICP|ETC|FIL|APT|SUI|SHIB)(?:USD|-USD)?$/.test(symbol)) return 'crypto';
  if (/^(SPY|QQQ|DIA|IWM|VTI|VOO|ARKK|XLF|XLK|XLE|XLV|VNQ|GLD|SLV|USO)$/.test(symbol)) return 'etf';
  if (COMMODITY_KEYWORDS.some(([pattern]) => pattern.test(haystack))) return commodityType(haystack);

  return 'stock';
}

function commodityType(value: string): AssetVisualType {
  for (const [pattern, type] of COMMODITY_KEYWORDS) {
    if (pattern.test(value)) return type;
  }
  return 'commodity';
}

function fallbackInitials(symbol: string, label: string) {
  const compactSymbol = symbol.replace(/[^A-Z0-9]/g, '');
  if (compactSymbol) return compactSymbol.slice(0, 3);

  const words = label
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const initials = words.slice(0, 2).map(word => word[0]).join('');
  return (initials || 'SFM').slice(0, 3).toUpperCase();
}

function forexFlags(symbol: string) {
  const compact = symbol.replace(/[^A-Z]/g, '').replace(/X$/, '');
  if (compact.length < 6) return [];
  const base = compact.slice(0, 3);
  const quote = compact.slice(3, 6);
  return [CURRENCY_FLAGS[base], CURRENCY_FLAGS[quote]].filter((flag): flag is string => Boolean(flag));
}

export function getAssetVisualMeta(input: AssetVisualInput): AssetVisualMeta {
  const symbol = normalizeSymbol(input.symbol);
  const label = cleanText(input.companyName) || cleanText(input.name) || symbol || 'Asset';
  const inferredType = normalizeAssetType(input.assetType ?? input.market ?? input.exchange, symbol, label);
  const logoUrl = resolveAssetLogoUrl(input);
  const flags = inferredType === 'forex' ? forexFlags(symbol) : [];
  const iconKind = inferredType === 'commodity' ? commodityType(`${symbol} ${label}`.toUpperCase()) : inferredType;
  const fallbackText = fallbackInitials(symbol, label);

  return {
    symbol,
    label,
    assetType: inferredType,
    logoUrl,
    fallbackText,
    tone: inferredType,
    iconKind,
    flags,
    alt: `${label}${symbol ? ` ${symbol}` : ''}`,
  };
}

export function looksLikeUploadedImageFilename(value: unknown) {
  const text = cleanText(value);
  return IMAGE_EXTENSION_PATTERN.test(text) && !SAFE_IMAGE_URL_PATTERN.test(text);
}
