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
  /** Exchange-qualified provider ticker (e.g. "KFH.KW", "2330.TW"). */
  providerSymbol?: string | null;
  name?: string | null;
  companyName?: string | null;
  assetType?: string | null;
  exchange?: string | null;
  /** ISO 10383 Market Identifier Code, when available. */
  mic?: string | null;
  market?: string | null;
  /** ISO 6166 International Securities Identification Number, when available. */
  isin?: string | null;
  /** Stable internal asset identity (not a per-holding record id), when available. */
  assetId?: string | null;
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

/** How the verified logo directory matched an asset (null = generic fallback). */
export type AssetIdentityMatch =
  | 'asset-id'
  | 'isin'
  | 'exchange-ticker'
  | 'ticker'
  | 'name'
  | null;

export type AssetIdentity = {
  /** Canonical ticker (class-share suffixes preserved; ADR/ADS stripped). */
  canonicalTicker: string;
  /** Normalized market/exchange tokens derived from the input. */
  marketTokens: string[];
  /** The verified directory entry, when one was matched. */
  verified: VerifiedAssetLogo | null;
  matchedBy: AssetIdentityMatch;
};

const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const SAFE_IMAGE_URL_PATTERN = /^https?:\/\//i;

// ─────────────────────────── Verified logo directory ───────────────────────────
//
// Verified logos come only from approved, project-permitted sources. Each entry
// stores its canonical identity, the approved logo URL, and the hostname that
// URL is expected to resolve to, so unexpected hosts can be rejected (enforced
// by the assetLogoIdentity test suite). A market-scoped entry only matches when
// the asset's market/exchange context agrees, which is how duplicate tickers
// across different exchanges are disambiguated. Never add scraped or unverified
// logos, and never point an entry at an unlisted host.

/** Hostnames permitted to serve a verified or fallback asset logo. */
export const APPROVED_LOGO_HOSTS: ReadonlySet<string> = new Set([
  'cdn.simpleicons.org',
  'www.google.com', // Google favicon service (domain_url points at the verified corporate site)
  'financialmodelingprep.com', // FMP image-stock, the generic by-ticker fallback
]);

export type VerifiedAssetLogo = {
  canonicalTicker: string;
  logoUrl: string;
  /** Hostname `logoUrl` must resolve to (validated in tests + at lookup build). */
  expectedHost: string;
  /** Alternate tickers that identify the same asset (e.g. TSMC → TSM). */
  tickerAliases?: string[];
  /** Verified ISINs for this asset. */
  isins?: string[];
  /** Stable internal asset ids for this asset, when the catalog assigns them. */
  assetIds?: string[];
  /**
   * Normalized company-name keys (see normalizeCompanyNameKey) used ONLY as a
   * fallback when no usable ticker is present — never fuzzy-matched.
   */
  nameAliases?: string[];
  /**
   * Market tokens this identity is listed on. When set, the entry is used only
   * if the asset's market context agrees (or is absent); this prevents one
   * company's logo from leaking onto a same-ticker asset on another exchange.
   * Omit for globally-unique tickers (NVDA, AMD, TSM).
   */
  markets?: string[];
};

const VERIFIED_ASSET_LOGO_DIRECTORY: readonly VerifiedAssetLogo[] = [
  {
    canonicalTicker: 'TSM',
    logoUrl: 'https://www.google.com/s2/favicons?domain_url=https://www.tsmc.com&sz=128',
    expectedHost: 'www.google.com',
    tickerAliases: ['TSMC'],
    isins: ['US8740391003'], // NYSE-listed Taiwan Semiconductor ADR
    nameAliases: ['tsmc', 'taiwan semiconductor', 'taiwan semiconductor manufacturing'],
  },
  {
    canonicalTicker: 'NVDA',
    logoUrl: 'https://cdn.simpleicons.org/nvidia',
    expectedHost: 'cdn.simpleicons.org',
    isins: ['US67066G1040'],
    nameAliases: ['nvidia'],
  },
  {
    canonicalTicker: 'AMD',
    logoUrl: 'https://cdn.simpleicons.org/amd',
    expectedHost: 'cdn.simpleicons.org',
    isins: ['US0079031078'],
    nameAliases: ['advanced micro devices'],
  },
  {
    canonicalTicker: 'KFH',
    logoUrl: 'https://www.google.com/s2/favicons?domain_url=https://www.kfh.com&sz=128',
    expectedHost: 'www.google.com',
    tickerAliases: ['KFH.KW'],
    markets: ['KW'],
    nameAliases: ['kuwait finance house', 'بيت التمويل الكويتي'],
  },
  {
    canonicalTicker: 'IFA',
    logoUrl: 'https://www.google.com/s2/favicons?domain_url=https://ifakuwait.com&sz=128',
    expectedHost: 'www.google.com',
    tickerAliases: ['IFA.KW'],
    markets: ['KW'],
    nameAliases: [
      'international financial advisors',
      'international financial advisors holding',
      'ifa holding',
      'الاستشارات المالية الدولية',
      'الاستشارات المالية الدولية القابضة',
    ],
  },
];

const CRYPTO_LOGO_SLUGS: Record<string, string> = {
  BTC: 'bitcoin/F7931A',
  ETH: 'ethereum/627EEA',
  SOL: 'solana/14F195',
  XRP: 'xrp/23292F',
  BNB: 'binance/F0B90B',
  DOGE: 'dogecoin/C2A633',
  ADA: 'cardano/0133AD',
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

// Compound forex-style spot quotes for precious metals (XAUUSD, XAGUSD=X) do
// not contain "XAU"/"XAG" as a separate word, so the \b-based keywords above
// never match them; matched against the bare symbol only (never the display
// name) so a metal spot ticker is never misread as a 6-letter currency pair.
const METAL_TICKER_PATTERNS: Array<[RegExp, 'gold' | 'silver']> = [
  [/^XAU(?:USD|EUR|GBP|AUD|CHF)?(?:=X)?$/i, 'gold'],
  [/^XAG(?:USD|EUR|GBP|AUD|CHF)?(?:=X)?$/i, 'silver'],
];

function commodityTypeFromSymbol(symbol: string): 'gold' | 'silver' | null {
  for (const [pattern, type] of METAL_TICKER_PATTERNS) {
    if (pattern.test(symbol)) return type;
  }
  return null;
}

// Dotted ticker suffixes that denote a listing venue (used to split
// "KFH.KW" → ticker "KFH" + market "KW" and to disambiguate duplicate
// tickers). Single-letter class-share suffixes (.A/.B/.C) are deliberately
// absent so BRK.A stays distinct from BRK.B and is never mistaken for a venue.
const EXCHANGE_SUFFIX_TO_MARKET: Record<string, string> = {
  KW: 'KW',
  SR: 'SA', TADAWUL: 'SA',
  QA: 'QA',
  AE: 'AE', AD: 'AE', DU: 'AE',
  BH: 'BH',
  OM: 'OM',
  L: 'UK',
  T: 'JP',
  HK: 'HK',
  TW: 'TW', TWO: 'TW',
  KS: 'KR', KQ: 'KR',
  SW: 'CH',
  PA: 'FR',
  DE: 'DE', F: 'DE',
  MC: 'ES',
  MI: 'IT',
  AS: 'NL',
  CO: 'DK',
  SI: 'SG',
  NS: 'IN', BO: 'IN',
  TO: 'CA', V: 'CA',
  AX: 'AU',
};

// Freeform market/exchange text → normalized market token, for disambiguation.
const MARKET_KEYWORD_TOKENS: Array<[RegExp, string]> = [
  [/KUWAIT|BOURSA|XKUW|\bKSE\b/i, 'KW'],
  [/SAUDI|TADAWUL|TASI|XSAU/i, 'SA'],
  [/U\.?A\.?E|EMIRATES|\bDFM\b|\bADX\b|DUBAI|ABU\s*DHABI/i, 'AE'],
  [/QATAR|\bQSE\b|\bQE\b/i, 'QA'],
  [/BAHRAIN|\bBHB\b/i, 'BH'],
  [/\bOMAN\b|\bMSM\b|\bMSX\b/i, 'OM'],
  [/NASDAQ|\bNYSE\b|\bAMEX\b|UNITED\s*STATES|U\.?S\.?\s*STOCK|\bUS\b/i, 'US'],
  [/LONDON|\bLSE\b/i, 'UK'],
  [/TOKYO|JAPAN|\bJPX\b/i, 'JP'],
  [/HONG\s*KONG|HKEX|\bHKG\b/i, 'HK'],
  [/TAIWAN|\bTWSE\b|\bTPEX\b/i, 'TW'],
];

// Corporate designators (including ADR/ADS depositary wording) stripped from the
// END of a display name before alias lookup, so "Taiwan Semiconductor
// Manufacturing Co. Ltd. ADR" and "Taiwan Semiconductor Manufacturing" resolve
// to the same identity. Stripped from the tail only, and never below one word,
// so a legal token can never empty a name or collide two distinct companies.
const NAME_DESIGNATOR_TOKENS = new Set([
  'adr', 'ads', 'american', 'depositary', 'depository', 'receipt', 'receipts',
  'sponsored', 'unsponsored', 'shares', 'share', 'class', 'cl',
  'inc', 'incorporated', 'corp', 'corporation', 'company', 'co',
  'ltd', 'limited', 'plc', 'sa', 'nv', 'ag', 'se', 'spa', 'oyj', 'ab', 'asa',
  'holding', 'holdings', 'group',
]);

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

/**
 * Normalizes a raw ticker for identity matching: strips a leading exchange
 * prefix ("NASDAQ:AAPL"), strips trailing ADR/ADS depositary designators
 * ("TSM ADR", "TSM.ADR", "TSM-ADS") which are aliases of the underlying
 * ticker, uppercases, and collapses whitespace. Meaningful punctuation —
 * including class-share suffixes (BRK.A) and venue suffixes (KFH.KW) — is
 * preserved.
 */
export function normalizeTickerSymbol(symbol: unknown): string {
  return cleanText(symbol)
    .toUpperCase()
    .replace(
      /^(NASDAQ|NYSE|AMEX|TADAWUL|TASI|TAD|DFM|ADX|KASE|XKUW|KW|KSE|LSE|TSX|ASX|HKEX|BATS|CRYPTO|FOREX|FX|US|EU|GCC)[:\s-]+/i,
      '',
    )
    .replace(/(?:[\s._\-/]+(?:ADR|ADS|ADRS))+\s*$/i, '')
    .replace(/\s+/g, '');
}

/** Splits a normalized ticker into base ticker + venue market token (if any). */
function splitTickerVenue(normalizedTicker: string): { base: string; market: string | null } {
  const dot = normalizedTicker.lastIndexOf('.');
  if (dot <= 0 || dot === normalizedTicker.length - 1) return { base: normalizedTicker, market: null };
  const suffix = normalizedTicker.slice(dot + 1);
  const market = EXCHANGE_SUFFIX_TO_MARKET[suffix];
  if (!market) return { base: normalizedTicker, market: null };
  return { base: normalizedTicker.slice(0, dot), market };
}

/** Normalizes an ISIN (2 letters + 9 alphanumerics + 1 check digit) or returns ''. */
export function normalizeIsin(value: unknown): string {
  const candidate = cleanText(value).toUpperCase().replace(/\s+/g, '');
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(candidate) ? candidate : '';
}

function normalizeCompanyNameKey(value: unknown): string {
  const words = cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && NAME_DESIGNATOR_TOKENS.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
}

// Ticker-shaped tokens may start with a digit (Saudi 2222.SR, HK 0700.HK,
// Tokyo 7203.T, Korea 005930.KS) and carry class-share / venue suffixes; the
// length cap keeps multi-word display names from being read as tickers.
const TICKER_SHAPE_PATTERN = /^[A-Z0-9][A-Z0-9.\-=^]{0,15}$/;

/** Collects normalized market/exchange tokens from every identity signal. */
function deriveMarketTokens(input: AssetVisualInput, ...normalizedTickers: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const ticker of normalizedTickers) {
    const venue = splitTickerVenue(ticker).market;
    if (venue) tokens.add(venue);
  }
  const context = `${cleanText(input.mic)} ${cleanText(input.exchange)} ${cleanText(input.market)}`;
  const upperMic = cleanText(input.mic).toUpperCase();
  if (EXCHANGE_SUFFIX_TO_MARKET[upperMic]) tokens.add(EXCHANGE_SUFFIX_TO_MARKET[upperMic]);
  for (const [pattern, token] of MARKET_KEYWORD_TOKENS) {
    if (pattern.test(context)) tokens.add(token);
  }
  return tokens;
}

// Lookup indexes built once from the verified directory.
type LogoIndex = {
  byAssetId: Map<string, VerifiedAssetLogo>;
  byIsin: Map<string, VerifiedAssetLogo>;
  byTicker: Map<string, VerifiedAssetLogo[]>;
  byName: Map<string, VerifiedAssetLogo[]>;
};

const logoIndex: LogoIndex = (() => {
  const byAssetId = new Map<string, VerifiedAssetLogo>();
  const byIsin = new Map<string, VerifiedAssetLogo>();
  const byTicker = new Map<string, VerifiedAssetLogo[]>();
  const byName = new Map<string, VerifiedAssetLogo[]>();
  const push = (map: Map<string, VerifiedAssetLogo[]>, key: string, entry: VerifiedAssetLogo) => {
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  };
  for (const entry of VERIFIED_ASSET_LOGO_DIRECTORY) {
    for (const assetId of entry.assetIds ?? []) byAssetId.set(cleanText(assetId), entry);
    for (const isin of entry.isins ?? []) {
      const normalized = normalizeIsin(isin);
      if (normalized) byIsin.set(normalized, entry);
    }
    const tickers = [entry.canonicalTicker, ...(entry.tickerAliases ?? [])];
    for (const ticker of tickers) {
      const normalized = normalizeTickerSymbol(ticker);
      push(byTicker, normalized, entry);
      const base = splitTickerVenue(normalized).base;
      if (base !== normalized) push(byTicker, base, entry);
    }
    for (const nameKey of entry.nameAliases ?? []) push(byName, normalizeCompanyNameKey(nameKey), entry);
  }
  return { byAssetId, byIsin, byTicker, byName };
})();

function marketsAgree(entry: VerifiedAssetLogo, tokens: Set<string>): boolean {
  // A globally-unique identity (no market constraint) always agrees. A scoped
  // identity agrees when the asset carries no market context (nothing to
  // contradict) or when its context intersects the entry's listed markets.
  if (!entry.markets || entry.markets.length === 0) return true;
  if (tokens.size === 0) return true;
  return entry.markets.some(market => tokens.has(market));
}

function matchTickerEntry(
  candidates: string[],
  tokens: Set<string>,
): { entry: VerifiedAssetLogo; matchedBy: 'exchange-ticker' | 'ticker' } | null {
  let tickerOnly: VerifiedAssetLogo | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const entries = logoIndex.byTicker.get(candidate);
    if (!entries) continue;
    for (const entry of entries) {
      if (!marketsAgree(entry, tokens)) continue;
      // A scoped entry confirmed by real market context is the strongest,
      // exchange-qualified match; remember a context-free ticker match as the
      // weaker fallback so an explicit market can still win.
      const contextConfirmed = Boolean(entry.markets?.length) && tokens.size > 0;
      if (contextConfirmed) return { entry, matchedBy: 'exchange-ticker' };
      tickerOnly ??= entry;
    }
  }
  return tickerOnly ? { entry: tickerOnly, matchedBy: 'ticker' } : null;
}

/**
 * Resolves an asset's canonical identity and any verified logo, following a
 * strict priority: stable internal id → ISIN → exchange-qualified ticker →
 * canonical ticker → verified alias → normalized company name → none. Ticker
 * identity always wins over display name; name aliases are consulted only when
 * no usable ticker exists. No fuzzy matching is performed.
 */
export function resolveAssetIdentity(input: AssetVisualInput): AssetIdentity {
  const symbolTicker = normalizeTickerSymbol(input.symbol);
  const providerTicker = normalizeTickerSymbol(input.providerSymbol);
  const primaryTicker = TICKER_SHAPE_PATTERN.test(symbolTicker)
    ? symbolTicker
    : (TICKER_SHAPE_PATTERN.test(providerTicker) ? providerTicker : symbolTicker);

  const tokens = deriveMarketTokens(input, symbolTicker, providerTicker);

  // 1. Stable internal asset id.
  const assetId = cleanText(input.assetId);
  const byAssetId = assetId ? logoIndex.byAssetId.get(assetId) : undefined;
  if (byAssetId) {
    return { canonicalTicker: byAssetId.canonicalTicker, marketTokens: [...tokens], verified: byAssetId, matchedBy: 'asset-id' };
  }

  // 2. ISIN.
  const isin = normalizeIsin(input.isin);
  const byIsin = isin ? logoIndex.byIsin.get(isin) : undefined;
  if (byIsin) {
    return { canonicalTicker: byIsin.canonicalTicker, marketTokens: [...tokens], verified: byIsin, matchedBy: 'isin' };
  }

  // 3-5. Exchange-qualified ticker → canonical ticker → verified alias.
  const tickerCandidates: string[] = [];
  for (const ticker of [symbolTicker, providerTicker]) {
    if (!ticker) continue;
    tickerCandidates.push(ticker);
    const base = splitTickerVenue(ticker).base;
    if (base !== ticker) tickerCandidates.push(base);
  }
  const tickerMatch = matchTickerEntry(tickerCandidates, tokens);
  if (tickerMatch) {
    return {
      canonicalTicker: tickerMatch.entry.canonicalTicker,
      marketTokens: [...tokens],
      verified: tickerMatch.entry,
      matchedBy: tickerMatch.matchedBy,
    };
  }

  // 6. Normalized company display name — fallback only, never over a ticker.
  const hasUsableTicker = TICKER_SHAPE_PATTERN.test(primaryTicker);
  if (!hasUsableTicker) {
    for (const candidate of [input.symbol, input.companyName, input.name]) {
      const nameKey = normalizeCompanyNameKey(candidate);
      const entries = nameKey ? logoIndex.byName.get(nameKey) : undefined;
      const entry = entries?.find(candidateEntry => marketsAgree(candidateEntry, tokens));
      if (entry) {
        return { canonicalTicker: entry.canonicalTicker, marketTokens: [...tokens], verified: entry, matchedBy: 'name' };
      }
    }
  }

  // 7. No verified identity — canonical ticker is the normalized ticker or, if
  // the record has only a name, that name's alias when one exists.
  let canonicalTicker = primaryTicker;
  if (!hasUsableTicker) {
    for (const candidate of [input.symbol, input.companyName, input.name]) {
      const nameKey = normalizeCompanyNameKey(candidate);
      const aliasEntry = nameKey ? logoIndex.byName.get(nameKey)?.[0] : undefined;
      if (aliasEntry) {
        canonicalTicker = aliasEntry.canonicalTicker;
        break;
      }
    }
  }
  return { canonicalTicker, marketTokens: [...tokens], verified: null, matchedBy: null };
}

/**
 * The one canonical ticker for an asset. A ticker-shaped symbol always wins
 * (logos resolve by ticker/market, never by display name); a verified name
 * alias steps in only when the record carries no usable ticker.
 */
export function canonicalAssetTicker(
  input: Pick<AssetVisualInput, 'symbol' | 'providerSymbol' | 'name' | 'companyName'>,
): string {
  return resolveAssetIdentity(input).canonicalTicker;
}

function safeImageUrl(value: unknown) {
  const text = cleanText(value);
  if (!text || !SAFE_IMAGE_URL_PATTERN.test(text)) return null;
  return text;
}

export function resolveAssetLogoUrl(input: AssetVisualInput): string | null {
  const explicitUrl = safeImageUrl(input.logoUrl) || safeImageUrl(input.imageUrl);
  if (explicitUrl) return explicitUrl;

  const identity = resolveAssetIdentity(input);
  if (identity.verified) return identity.verified.logoUrl;

  const symbol = identity.canonicalTicker;
  const label = cleanText(input.companyName) || cleanText(input.name) || symbol || 'Asset';
  const inferredType = inferAssetType(input, symbol, label);

  if (inferredType === 'crypto') {
    const compactCryptoSymbol = symbol.replace(/(?:-?USD|-?USDT)$/i, '');
    const cryptoSlug = CRYPTO_LOGO_SLUGS[compactCryptoSymbol];
    return cryptoSlug ? `https://cdn.simpleicons.org/${cryptoSlug}` : null;
  }

  // Only equity-shaped identities (stock/etf/fund) get the generic by-ticker
  // guess; metals, forex, indices, cash, etc. render their category icon
  // instead of fetching a company-logo-shaped URL that can never be correct.
  const stockLikeType = inferredType === 'stock' || inferredType === 'etf' || inferredType === 'fund';
  if (!stockLikeType || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return null;
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
}

/** Single source of truth for classification, shared by the logo resolver and getAssetVisualMeta. */
function inferAssetType(input: AssetVisualInput, symbol: string, label: string): AssetVisualType {
  return normalizeAssetType(input.assetType ?? input.market ?? input.exchange, symbol, label);
}

function normalizeAssetType(value: unknown, symbol: string, label: string): AssetVisualType {
  const raw = cleanText(value).toLowerCase();
  const haystack = `${symbol} ${label}`.toUpperCase();

  if (raw.includes('crypto') || raw === 'coin') return 'crypto';
  if (raw.includes('gold')) return 'gold';
  if (raw.includes('silver')) return 'silver';
  if (raw.includes('commodity') || raw.includes('future') || raw.includes('metal') || raw.includes('energy')) {
    return commodityType(haystack);
  }
  // Ticker-shaped metal spot/future quotes are checked before the generic
  // 6-letter forex shape below, so e.g. assetType "silver" + symbol "XAGUSD"
  // (or a bare XAGUSD with no assetType hint) is never read as a currency pair.
  const metalFromSymbol = commodityTypeFromSymbol(symbol);
  if (metalFromSymbol) return metalFromSymbol;
  if (raw.includes('forex') || raw.includes('currency') || /^[A-Z]{6}(?:=X)?$/.test(symbol)) return 'forex';
  if (raw.includes('etf')) return 'etf';
  if (raw.includes('fund')) return 'fund';
  if (raw.includes('real estate') || raw.includes('realestate') || raw.includes('property')) return 'real-estate';
  if (raw.includes('cash') || raw.includes('deposit')) return 'cash';
  if (raw.includes('project') || raw.includes('private investment')) return 'project';
  if (raw.includes('index') || raw.includes('indices') || symbol.startsWith('^')) return 'index';
  if (raw.includes('stock') || raw.includes('equity') || raw.includes('share')) return 'stock';

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
  const symbol = canonicalAssetTicker(input);
  // The display name is shown verbatim and is never mutated by identity
  // normalization — only the logo/ticker resolution uses the canonical forms.
  const label = cleanText(input.companyName) || cleanText(input.name) || symbol || 'Asset';
  const inferredType = inferAssetType(input, symbol, label);
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

/** Read-only view of the verified logo directory (for auditing/tests). */
export function getVerifiedLogoDirectory(): readonly VerifiedAssetLogo[] {
  return VERIFIED_ASSET_LOGO_DIRECTORY;
}

export function looksLikeUploadedImageFilename(value: unknown) {
  const text = cleanText(value);
  return IMAGE_EXTENSION_PATTERN.test(text) && !SAFE_IMAGE_URL_PATTERN.test(text);
}
