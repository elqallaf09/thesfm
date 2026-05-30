import { normalizeAssetType, validateSymbol, type MarketAssetType } from '@/lib/market/marketService';

export type AssetProfileHolding = {
  symbol?: string;
  name?: string;
  weight?: number;
};

export type AssetProfileExposure = {
  sector: string;
  weight?: number;
};

export type AssetProfile = {
  name?: string;
  ticker?: string;
  exchange?: string;
  category?: string;
  sector?: string;
  industry?: string;
  country?: string;
  website?: string;
  description?: string;
  issuer?: string;
  indexTracked?: string;
  objective?: string;
  expenseRatio?: number | string;
  aum?: number | string;
  inceptionDate?: string;
  topHoldings?: AssetProfileHolding[];
  sectorExposure?: AssetProfileExposure[];
  marketCap?: number | string;
  employees?: number | string;
  ceo?: string;
  currency?: string;
  dataLimitations?: string[];
};

export type AssetProfileResponse = {
  success: true;
  symbol: string;
  providerSymbol?: string;
  assetType: MarketAssetType;
  source: string;
  lastUpdated: string;
  profileAvailable: boolean;
  profile: AssetProfile | null;
  unavailableReason?: string;
  message?: string;
};

type YahooQuoteSummaryResponse = {
  quoteSummary?: {
    result?: Array<Record<string, unknown>>;
    error?: unknown;
  };
};

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: Array<Record<string, unknown>>;
  };
};

type FetchAssetProfileInput = {
  symbol: string;
  providerSymbol?: string;
  assetType?: unknown;
  name?: string;
  exchange?: string;
  language?: string;
};

const PROFILE_REVALIDATE_SECONDS = 3600;
const USER_AGENT = 'THE-SFM/1.0 (+https://www.the-sfm.com)';

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
    console.info(message, meta);
  }
}

function stringOrUndefined(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 && !/^n\/?a$/i.test(text) ? text : undefined;
}

function numberOrUndefined(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function objectOrUndefined(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getPath(root: unknown, path: string[]) {
  let current: unknown = root;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function unwrapRaw(value: unknown) {
  if (value && typeof value === 'object' && 'raw' in value) return (value as { raw?: unknown }).raw;
  return value;
}

function unwrapFmt(value: unknown) {
  if (value && typeof value === 'object') {
    const obj = value as { fmt?: unknown; longFmt?: unknown; raw?: unknown };
    return stringOrUndefined(obj.fmt) ?? stringOrUndefined(obj.longFmt) ?? obj.raw;
  }
  return value;
}

function isoFromUnix(value: unknown) {
  const raw = Number(unwrapRaw(value));
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return new Date(raw * 1000).toISOString();
}

function hasProfileValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function compactProfile(profile: AssetProfile): AssetProfile {
  const next: AssetProfile = {};
  for (const [key, value] of Object.entries(profile) as Array<[keyof AssetProfile, AssetProfile[keyof AssetProfile]]>) {
    if (hasProfileValue(value)) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

function normalizeLanguage(language: unknown) {
  const normalized = String(language ?? '').trim().toLowerCase();
  return normalized === 'en' || normalized === 'fr' ? normalized : 'ar';
}

function fallbackDescription(assetType: MarketAssetType, language: string) {
  const lang = normalizeLanguage(language);
  const map: Record<MarketAssetType, Record<'ar' | 'en' | 'fr', string>> = {
    stock: {
      ar: 'هذا الأصل مصنف كسهم شركة. يمكن عرض نشاط الشركة والقطاع وبيانات الملف عند توفرها من مزود البيانات.',
      en: 'This asset is classified as a company stock. Company activity, sector, and profile details appear when they are available from the data provider.',
      fr: 'Cet actif est classé comme une action. L’activité de l’entreprise, le secteur et les détails du profil apparaissent lorsqu’ils sont disponibles auprès du fournisseur de données.',
    },
    etf: {
      ar: 'هذا الأصل مصنف كصندوق متداول. قد تتوفر بيانات إضافية مثل المؤشر المتتبع والمكونات الرئيسية ونسبة المصاريف من مزود البيانات عند توفرها.',
      en: 'This asset is classified as an exchange-traded fund. Additional fund details such as tracked index, holdings, and expense ratio appear when they are available from the data provider.',
      fr: 'Cet actif est classé comme un fonds négocié en bourse. Des détails comme l’indice suivi, les positions et le ratio de frais apparaissent lorsqu’ils sont disponibles auprès du fournisseur de données.',
    },
    index: {
      ar: 'هذا الأصل مصنف كمؤشر سوق. يمثل سوقًا أو منطقة أو مجموعة أوراق مالية عندما تتوفر تفاصيل المكونات من مزود البيانات.',
      en: 'This asset is classified as a market index. It represents a market, region, or group of securities when detailed constituents are available from the data provider.',
      fr: 'Cet actif est classé comme un indice de marché. Il représente un marché, une région ou un groupe de titres lorsque les détails sont disponibles auprès du fournisseur de données.',
    },
    commodity: {
      ar: 'هذا الأصل مصنف كسلعة. لا تنطبق عليه مقاييس الشركات مثل الإيرادات أو عدد الموظفين.',
      en: 'This asset is classified as a commodity. Company-specific metrics are not applicable to this asset type.',
      fr: 'Cet actif est classé comme une matière première. Les indicateurs propres aux entreprises ne s’appliquent pas à ce type d’actif.',
    },
    gold: {
      ar: 'يمثل هذا الأصل الذهب أو أداة سوقية مرتبطة بالذهب. لا تنطبق عليه مقاييس الشركات مثل الإيرادات أو عدد الموظفين.',
      en: 'This asset represents gold or a gold-linked market instrument. Company-specific metrics are not applicable to this asset type.',
      fr: 'Cet actif représente l’or ou un instrument de marché lié à l’or. Les indicateurs propres aux entreprises ne s’appliquent pas à ce type d’actif.',
    },
    crypto: {
      ar: 'هذا الأصل مصنف كأصل رقمي. تظهر بيانات الشبكة والسوق عند توفرها من مزود البيانات.',
      en: 'This asset is classified as a crypto asset. Network and market details appear when they are available from the data provider.',
      fr: 'Cet actif est classé comme un cryptoactif. Les détails du réseau et du marché apparaissent lorsqu’ils sont disponibles auprès du fournisseur de données.',
    },
    forex: {
      ar: 'هذا الأصل مصنف كزوج عملات. لا تنطبق عليه مقاييس الشركات مثل الإيرادات أو عدد الموظفين.',
      en: 'This asset is classified as a currency pair. Company-specific metrics are not applicable to this asset type.',
      fr: 'Cet actif est classé comme une paire de devises. Les indicateurs propres aux entreprises ne s’appliquent pas à ce type d’actif.',
    },
  };
  return map[assetType][lang];
}

function sectorNameFromYahooKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function parseTopHoldings(value: unknown): AssetProfileHolding[] {
  return arrayOrEmpty(value)
    .map(item => {
      const row = objectOrUndefined(item);
      if (!row) return null;
      const holding: AssetProfileHolding = {
        symbol: stringOrUndefined(row.symbol),
        name: stringOrUndefined(row.holdingName) ?? stringOrUndefined(row.name),
        weight: numberOrUndefined(unwrapRaw(row.holdingPercent ?? row.weight)),
      };
      return holding;
    })
    .filter((item): item is AssetProfileHolding => item !== null && Boolean(item.symbol || item.name));
}

function parseSectorExposure(value: unknown): AssetProfileExposure[] {
  return arrayOrEmpty(value).flatMap(item => {
    const row = objectOrUndefined(item);
    if (!row) return [];
    return Object.entries(row)
      .map(([sector, weight]) => ({
        sector: sectorNameFromYahooKey(sector),
        weight: numberOrUndefined(unwrapRaw(weight)),
      }))
      .filter(entry => entry.sector && entry.weight !== undefined);
  });
}

async function fetchYahooQuoteSummary(symbol: string) {
  const modules = [
    'assetProfile',
    'summaryProfile',
    'summaryDetail',
    'topHoldings',
    'fundProfile',
    'price',
    'quoteType',
    'defaultKeyStatistics',
  ].join(',');
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  const response = await fetch(url, {
    next: { revalidate: PROFILE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(9000),
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
  });
  const body = await response.json().catch(() => null) as YahooQuoteSummaryResponse | null;
  const result = body?.quoteSummary?.result?.[0] ?? null;
  devLog('[AssetProfile] Yahoo quoteSummary response', {
    provider: 'Yahoo Finance',
    symbol,
    status: response.status,
    fieldsReturned: result ? Object.keys(result) : [],
    unavailableReason: response.ok && result ? null : response.ok ? 'provider_returned_empty' : `provider_http_${response.status}`,
  });
  return response.ok && result ? result : null;
}

async function fetchYahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const response = await fetch(url, {
    next: { revalidate: PROFILE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
  });
  const body = await response.json().catch(() => null) as YahooQuoteResponse | null;
  const quote = body?.quoteResponse?.result?.[0] ?? null;
  devLog('[AssetProfile] Yahoo quote response', {
    provider: 'Yahoo Finance',
    symbol,
    status: response.status,
    fieldsReturned: quote ? Object.keys(quote) : [],
    unavailableReason: response.ok && quote ? null : response.ok ? 'provider_returned_empty' : `provider_http_${response.status}`,
  });
  return response.ok && quote ? quote : null;
}

async function fetchFinnhubProfile(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    next: { revalidate: PROFILE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  devLog('[AssetProfile] Finnhub profile response', {
    provider: 'Finnhub',
    symbol,
    url: `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=REDACTED`,
    status: response.status,
    fieldsReturned: body ? Object.keys(body) : [],
    unavailableReason: response.ok && body && Object.keys(body).length > 0 ? null : response.ok ? 'provider_returned_empty' : `provider_http_${response.status}`,
  });
  if (!response.ok || !body || Object.keys(body).length === 0) return null;
  return body;
}

function profileFromFinnhub(data: Record<string, unknown>): AssetProfile {
  return compactProfile({
    name: stringOrUndefined(data.name),
    ticker: stringOrUndefined(data.ticker),
    exchange: stringOrUndefined(data.exchange),
    industry: stringOrUndefined(data.finnhubIndustry),
    country: stringOrUndefined(data.country),
    website: stringOrUndefined(data.weburl),
    marketCap: numberOrUndefined(data.marketCapitalization),
    inceptionDate: stringOrUndefined(data.ipo),
    currency: stringOrUndefined(data.currency),
  });
}

function profileFromYahoo(summary: Record<string, unknown> | null, quote: Record<string, unknown> | null, input: {
  symbol: string;
  providerSymbol: string;
  assetType: MarketAssetType;
  name?: string;
  exchange?: string;
}): AssetProfile {
  const assetProfile = objectOrUndefined(summary?.assetProfile);
  const summaryProfile = objectOrUndefined(summary?.summaryProfile);
  const summaryDetail = objectOrUndefined(summary?.summaryDetail);
  const topHoldings = objectOrUndefined(summary?.topHoldings);
  const fundProfile = objectOrUndefined(summary?.fundProfile);
  const price = objectOrUndefined(summary?.price);
  const quoteType = objectOrUndefined(summary?.quoteType);
  const stats = objectOrUndefined(summary?.defaultKeyStatistics);
  const profileSource = assetProfile ?? summaryProfile;

  const profile: AssetProfile = {
    name: stringOrUndefined(getPath(price, ['longName']))
      ?? stringOrUndefined(getPath(price, ['shortName']))
      ?? stringOrUndefined(quote?.longName)
      ?? stringOrUndefined(quote?.shortName)
      ?? input.name,
    ticker: stringOrUndefined(getPath(price, ['symbol'])) ?? stringOrUndefined(quote?.symbol) ?? input.symbol,
    exchange: stringOrUndefined(getPath(price, ['exchangeName']))
      ?? stringOrUndefined(getPath(quoteType, ['exchange']))
      ?? stringOrUndefined(quote?.fullExchangeName)
      ?? input.exchange,
    category: stringOrUndefined(getPath(fundProfile, ['categoryName']))
      ?? stringOrUndefined(getPath(quoteType, ['quoteType']))
      ?? stringOrUndefined(quote?.quoteType),
    sector: input.assetType === 'stock' ? stringOrUndefined(profileSource?.sector) : undefined,
    industry: input.assetType === 'stock' ? stringOrUndefined(profileSource?.industry) : undefined,
    country: stringOrUndefined(profileSource?.country),
    website: stringOrUndefined(profileSource?.website),
    description: stringOrUndefined(profileSource?.longBusinessSummary),
    issuer: input.assetType === 'etf'
      ? stringOrUndefined(getPath(fundProfile, ['family']))
        ?? stringOrUndefined(getPath(topHoldings, ['fundFamily']))
      : undefined,
    indexTracked: input.assetType === 'etf'
      ? stringOrUndefined(getPath(fundProfile, ['indexName']))
        ?? stringOrUndefined(getPath(topHoldings, ['indexName']))
      : undefined,
    objective: input.assetType === 'etf'
      ? stringOrUndefined(getPath(fundProfile, ['investmentStrategy']))
        ?? stringOrUndefined(profileSource?.longBusinessSummary)
      : undefined,
    expenseRatio: input.assetType === 'etf'
      ? numberOrUndefined(unwrapRaw(getPath(summaryDetail, ['annualReportExpenseRatio'])))
        ?? numberOrUndefined(unwrapRaw(getPath(fundProfile, ['feesExpensesInvestment', 'annualReportExpenseRatio'])))
        ?? stringOrUndefined(unwrapFmt(getPath(summaryDetail, ['annualReportExpenseRatio'])))
      : undefined,
    aum: input.assetType === 'etf'
      ? numberOrUndefined(unwrapRaw(getPath(summaryDetail, ['totalAssets'])))
        ?? stringOrUndefined(unwrapFmt(getPath(summaryDetail, ['totalAssets'])))
      : undefined,
    inceptionDate: input.assetType === 'etf'
      ? isoFromUnix(getPath(fundProfile, ['inceptionDate']))
        ?? stringOrUndefined(unwrapFmt(getPath(fundProfile, ['inceptionDate'])))
      : undefined,
    topHoldings: input.assetType === 'etf' ? parseTopHoldings(topHoldings?.holdings) : undefined,
    sectorExposure: input.assetType === 'etf' ? parseSectorExposure(topHoldings?.sectorWeightings) : undefined,
    marketCap: input.assetType === 'stock' || input.assetType === 'crypto'
      ? numberOrUndefined(unwrapRaw(getPath(price, ['marketCap'])))
        ?? numberOrUndefined(quote?.marketCap)
        ?? numberOrUndefined(unwrapRaw(getPath(stats, ['marketCap'])))
      : undefined,
    employees: input.assetType === 'stock' ? numberOrUndefined(profileSource?.fullTimeEmployees) : undefined,
    currency: stringOrUndefined(getPath(price, ['currency'])) ?? stringOrUndefined(quote?.currency),
    dataLimitations: [],
  };

  return compactProfile(profile);
}

function mergeProfiles(primary: AssetProfile, secondary: AssetProfile) {
  const merged: AssetProfile = { ...secondary, ...primary };
  if (!merged.description) merged.description = secondary.description;
  return compactProfile(merged);
}

function unavailableResponse(symbol: string, providerSymbol: string, assetType: MarketAssetType, reason: string): AssetProfileResponse {
  return {
    success: true,
    symbol,
    providerSymbol,
    assetType,
    source: 'Yahoo Finance/Finnhub',
    lastUpdated: new Date().toISOString(),
    profileAvailable: false,
    profile: null,
    unavailableReason: reason,
    message: 'بيانات هذا الأصل غير متاحة حاليًا من مزود البيانات.',
  };
}

export async function fetchAssetProfile(input: FetchAssetProfileInput): Promise<AssetProfileResponse> {
  const symbol = validateSymbol(input.symbol);
  const providerSymbol = validateSymbol(input.providerSymbol) ?? symbol;
  if (!symbol || !providerSymbol) {
    return unavailableResponse(String(input.symbol ?? '').toUpperCase(), String(input.providerSymbol ?? input.symbol ?? '').toUpperCase(), normalizeAssetType(input.assetType), 'invalid_symbol');
  }

  const assetType = normalizeAssetType(input.assetType);
  const language = normalizeLanguage(input.language);
  const providersTried: string[] = [];
  let source = 'Symbol directory';
  let profile: AssetProfile = {};

  devLog('[AssetProfile] Fetch start', {
    symbol,
    providerSymbol,
    assetType,
    providersTried,
  });

  if (assetType === 'stock') {
    providersTried.push('Finnhub');
    const finnhub = await fetchFinnhubProfile(providerSymbol);
    if (finnhub) {
      profile = profileFromFinnhub(finnhub);
      source = 'Finnhub';
    }
  }

  providersTried.push('Yahoo Finance');
  const [yahooSummary, yahooQuote] = await Promise.allSettled([
    fetchYahooQuoteSummary(providerSymbol),
    fetchYahooQuote(providerSymbol),
  ]);
  const summary = yahooSummary.status === 'fulfilled' ? yahooSummary.value : null;
  const quote = yahooQuote.status === 'fulfilled' ? yahooQuote.value : null;
  const yahooHasData = Boolean(summary || quote);
  const yahooProfile = yahooHasData ? profileFromYahoo(summary, quote, {
    symbol,
    providerSymbol,
    assetType,
    name: input.name,
    exchange: input.exchange,
  }) : {};
  if (yahooHasData && Object.keys(yahooProfile).length > 0) {
    profile = mergeProfiles(profile, yahooProfile);
    source = source === 'Finnhub' && Object.keys(profile).length > Object.keys(yahooProfile).length
      ? 'Finnhub/Yahoo Finance'
      : 'Yahoo Finance';
  }

  const dataLimitations = [
    ...(profile.dataLimitations ?? []),
    ...(profile.description ? [] : ['profile_description_unavailable']),
    ...(assetType === 'stock' && !profile.sector ? ['sector_unavailable'] : []),
    ...(assetType === 'etf' && (!profile.topHoldings || profile.topHoldings.length === 0) ? ['holdings_unavailable'] : []),
    ...(assetType === 'etf' && !profile.expenseRatio ? ['expense_ratio_unavailable'] : []),
  ];
  profile = compactProfile({
    ...profile,
    name: profile.name ?? input.name ?? symbol,
    ticker: profile.ticker ?? symbol,
    exchange: profile.exchange ?? input.exchange,
    description: profile.description ?? fallbackDescription(assetType, language),
    dataLimitations,
  });

  const profileAvailable = Object.keys(profile).some(key => key !== 'dataLimitations' && hasProfileValue((profile as Record<string, unknown>)[key]));
  const unavailableReason = profileAvailable ? undefined : 'provider_returned_empty';
  devLog('[AssetProfile] Fetch complete', {
    symbol,
    providerSymbol,
    assetType,
    providersTried,
    source,
    fieldsReturned: Object.keys(profile),
    unavailableReason,
  });

  if (!profileAvailable) return unavailableResponse(symbol, providerSymbol, assetType, unavailableReason ?? 'provider_returned_empty');

  return {
    success: true,
    symbol,
    providerSymbol,
    assetType,
    source,
    lastUpdated: new Date().toISOString(),
    profileAvailable: true,
    profile,
  };
}
