import { normalizeAssetType, validateSymbol, type MarketAssetType } from '@/lib/market/marketService';
import staticUsSymbols from '@/data/us-symbols.json';

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
  employeeCount?: number | string;
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

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>;
    }>;
  };
};

type SecCompanyTickersExchangeResponse = {
  data?: Array<[number, string, string, string]>;
};

type SecSubmissionResponse = {
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string;
  sicDescription?: string;
  website?: string;
};

type SecCompanyFactsResponse = {
  facts?: {
    dei?: Record<string, {
      units?: Record<string, Array<{
        val?: number;
        end?: string;
        filed?: string;
        form?: string;
      }>>;
    }>;
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
const SEC_USER_AGENT = process.env.SEC_USER_AGENT || 'THE-SFM admin@the-sfm.com';
const staticUsSymbolRows = staticUsSymbols as Array<Record<string, unknown>>;

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.DEBUG_MARKET_DATA === 'true') {
    console.info(message, meta);
  }
}

function stringOrUndefined(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 && !/^n\/?a$/i.test(text) ? text : undefined;
}

function numberOrUndefined(value: unknown) {
  if (typeof value === 'string' && value.trim().length === 0) return undefined;
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

function pickString(source: Record<string, unknown> | undefined | null, keys: string[]) {
  if (!source) return undefined;
  for (const key of keys) {
    const value = stringOrUndefined(unwrapFmt(source[key]));
    if (value) return value;
  }
  return undefined;
}

function pickNumber(source: Record<string, unknown> | undefined | null, keys: string[]) {
  if (!source) return undefined;
  for (const key of keys) {
    const value = numberOrUndefined(unwrapRaw(source[key]));
    if (value !== undefined) return value;
  }
  return undefined;
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

function sectorNameFromYahooKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function sectorFromSic(sic?: string) {
  const code = Number(sic);
  if (!Number.isFinite(code)) return undefined;
  if (code >= 100 && code <= 999) return 'Agriculture';
  if (code >= 1000 && code <= 1499) return 'Energy and Mining';
  if (code >= 1500 && code <= 1799) return 'Industrials';
  if (code >= 2000 && code <= 3999) {
    if (code >= 3570 && code <= 3579) return 'Technology';
    if (code >= 3600 && code <= 3699) return 'Technology';
    if (code >= 3800 && code <= 3899) return 'Healthcare';
    return 'Manufacturing';
  }
  if (code >= 4000 && code <= 4999) return 'Utilities and Communications';
  if (code >= 5000 && code <= 5999) return 'Consumer and Retail';
  if (code >= 6000 && code <= 6799) return 'Financial Services';
  if (code >= 7000 && code <= 8999) {
    if (code >= 7370 && code <= 7379) return 'Technology';
    if (code >= 8000 && code <= 8099) return 'Healthcare';
    return 'Services';
  }
  return undefined;
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

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
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
  const body = await safeJson<YahooQuoteSummaryResponse>(response);
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
  const body = await safeJson<YahooQuoteResponse>(response);
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

async function fetchYahooChartProfile(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const response = await fetch(url, {
    next: { revalidate: PROFILE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
  });
  const body = await safeJson<YahooChartResponse>(response);
  const meta = body?.chart?.result?.[0]?.meta ?? null;
  devLog('[AssetProfile] Yahoo chart response', {
    provider: 'Yahoo Finance Chart',
    symbol,
    status: response.status,
    fieldsReturned: meta ? Object.keys(meta) : [],
    unavailableReason: response.ok && meta ? null : response.ok ? 'provider_returned_empty' : `provider_http_${response.status}`,
  });
  return response.ok && meta ? meta : null;
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
  const body = await safeJson<Record<string, unknown>>(response);
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

async function fetchSecCompanyProfile(symbol: string) {
  const exchangeResponse = await fetch('https://www.sec.gov/files/company_tickers_exchange.json', {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(9000),
    headers: {
      accept: 'application/json',
      'user-agent': SEC_USER_AGENT,
    },
  });
  const exchangeBody = await safeJson<SecCompanyTickersExchangeResponse>(exchangeResponse);
  const row = exchangeBody?.data?.find(item => String(item[2] ?? '').toUpperCase() === symbol.toUpperCase());
  if (!exchangeResponse.ok || !row) {
    devLog('[AssetProfile] SEC ticker directory response', {
      provider: 'SEC',
      symbol,
      status: exchangeResponse.status,
      fieldsReturned: exchangeBody ? Object.keys(exchangeBody) : [],
      unavailableReason: exchangeResponse.ok ? 'symbol_not_found' : `provider_http_${exchangeResponse.status}`,
    });
    return null;
  }

  const cik = String(row[0]).padStart(10, '0');
  const [submissionResponse, factsResponse] = await Promise.all([
    fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(9000),
      headers: {
        accept: 'application/json',
        'user-agent': SEC_USER_AGENT,
      },
    }),
    fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(9000),
      headers: {
        accept: 'application/json',
        'user-agent': SEC_USER_AGENT,
      },
    }),
  ]);

  const submission = await safeJson<SecSubmissionResponse>(submissionResponse);
  const facts = await safeJson<SecCompanyFactsResponse>(factsResponse);
  devLog('[AssetProfile] SEC profile response', {
    provider: 'SEC',
    symbol,
    normalizedSymbol: row[2],
    cik,
    status: { submissions: submissionResponse.status, facts: factsResponse.status },
    rawResponseKeys: {
      submissions: submission ? Object.keys(submission) : [],
      facts: facts?.facts?.dei ? Object.keys(facts.facts.dei) : [],
    },
  });

  const shareCount = latestSecFact(facts, 'EntityCommonStockSharesOutstanding');
  const publicFloat = latestSecFact(facts, 'EntityPublicFloat');
  const profile = compactProfile({
    name: stringOrUndefined(submission?.name) ?? stringOrUndefined(row[1]),
    ticker: stringOrUndefined(submission?.tickers?.[0]) ?? stringOrUndefined(row[2]),
    exchange: stringOrUndefined(submission?.exchanges?.[0]) ?? stringOrUndefined(row[3]),
    industry: stringOrUndefined(submission?.sicDescription),
    sector: sectorFromSic(submission?.sic),
    country: 'US',
    currency: 'USD',
    marketCap: publicFloat,
  });
  return { profile, shareCount, source: 'SEC EDGAR' };
}

function latestSecFact(facts: SecCompanyFactsResponse | null, concept: string) {
  const units = facts?.facts?.dei?.[concept]?.units;
  if (!units) return undefined;
  const rows = Object.values(units)
    .flat()
    .filter(row => Number.isFinite(Number(row.val)))
    .sort((a, b) => {
      const filedDiff = String(b.filed ?? '').localeCompare(String(a.filed ?? ''));
      if (filedDiff !== 0) return filedDiff;
      return String(b.end ?? '').localeCompare(String(a.end ?? ''));
    });
  return rows[0]?.val;
}

function profileFromFinnhub(data: Record<string, unknown>): AssetProfile {
  return compactProfile({
    name: pickString(data, ['name', 'companyName']),
    ticker: pickString(data, ['ticker', 'symbol']),
    exchange: pickString(data, ['exchange', 'exchangeCode', 'mic']),
    sector: pickString(data, ['sector', 'gsector', 'category']),
    industry: pickString(data, ['finnhubIndustry', 'industry', 'gind', 'industryName']),
    country: pickString(data, ['country', 'countryName']),
    website: pickString(data, ['weburl', 'website']),
    marketCap: pickNumber(data, ['marketCapitalization', 'marketCap', 'market_cap']),
    inceptionDate: pickString(data, ['ipo']),
    currency: pickString(data, ['currency', 'currencyCode', 'financialCurrency']),
  });
}

function profileFromDirectory(symbol: string, providerSymbol: string, input: FetchAssetProfileInput): AssetProfile {
  const row = staticUsSymbolRows.find(item => {
    const itemSymbol = String(item.symbol ?? '').toUpperCase();
    const itemProviderSymbol = String(item.providerSymbol ?? '').toUpperCase();
    return itemSymbol === symbol.toUpperCase() || itemProviderSymbol === providerSymbol.toUpperCase();
  });
  return compactProfile({
    name: stringOrUndefined(input.name) ?? stringOrUndefined(row?.name),
    ticker: symbol,
    exchange: stringOrUndefined(input.exchange) ?? stringOrUndefined(row?.exchange),
    country: stringOrUndefined(row?.country),
    currency: stringOrUndefined(row?.currency),
    category: stringOrUndefined(row?.assetType),
  });
}

function profileFromYahoo(summary: Record<string, unknown> | null, quote: Record<string, unknown> | null, chart: Record<string, unknown> | null, input: {
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
    name: pickString(price, ['longName', 'shortName'])
      ?? pickString(quote, ['longName', 'shortName'])
      ?? pickString(chart, ['longName', 'shortName'])
      ?? input.name,
    ticker: pickString(price, ['symbol']) ?? pickString(quote, ['symbol']) ?? pickString(chart, ['symbol']) ?? input.symbol,
    exchange: pickString(price, ['exchangeName', 'exchange'])
      ?? pickString(quoteType, ['exchange'])
      ?? pickString(quote, ['fullExchangeName', 'exchange'])
      ?? pickString(chart, ['fullExchangeName', 'exchangeName'])
      ?? input.exchange,
    category: pickString(fundProfile, ['categoryName'])
      ?? pickString(quoteType, ['quoteType'])
      ?? pickString(quote, ['quoteType'])
      ?? pickString(chart, ['instrumentType']),
    sector: input.assetType === 'stock' ? pickString(profileSource, ['sector', 'gsector', 'category']) : undefined,
    industry: input.assetType === 'stock' ? pickString(profileSource, ['industry', 'gind', 'industryName']) : undefined,
    country: pickString(profileSource, ['country', 'countryName']),
    website: pickString(profileSource, ['website', 'weburl']),
    description: pickString(profileSource, ['longBusinessSummary', 'description', 'businessSummary']),
    issuer: input.assetType === 'etf'
      ? pickString(fundProfile, ['family'])
        ?? pickString(topHoldings, ['fundFamily'])
      : undefined,
    indexTracked: input.assetType === 'etf'
      ? pickString(fundProfile, ['indexName'])
        ?? pickString(topHoldings, ['indexName'])
      : undefined,
    objective: input.assetType === 'etf'
      ? pickString(fundProfile, ['investmentStrategy'])
        ?? pickString(profileSource, ['longBusinessSummary', 'description'])
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
      ? pickNumber(price, ['marketCap', 'market_cap', 'marketCapitalization'])
        ?? pickNumber(quote, ['marketCap', 'market_cap', 'marketCapitalization'])
        ?? pickNumber(stats, ['marketCap', 'market_cap', 'marketCapitalization'])
      : undefined,
    employees: input.assetType === 'stock' ? pickNumber(profileSource, ['fullTimeEmployees', 'employeeCount', 'employees']) : undefined,
    employeeCount: input.assetType === 'stock' ? pickNumber(profileSource, ['employeeCount', 'fullTimeEmployees', 'employees']) : undefined,
    currency: pickString(price, ['currency', 'currencyCode', 'financialCurrency'])
      ?? pickString(quote, ['currency', 'currencyCode', 'financialCurrency'])
      ?? pickString(chart, ['currency', 'currencyCode', 'financialCurrency']),
    dataLimitations: [],
  };

  return compactProfile(profile);
}

function mergeProfiles(primary: AssetProfile, secondary: AssetProfile) {
  const merged: AssetProfile = { ...secondary, ...primary };
  if (!merged.description) merged.description = secondary.description;
  if (!merged.employees) merged.employees = secondary.employees ?? secondary.employeeCount;
  if (!merged.employeeCount) merged.employeeCount = secondary.employeeCount ?? secondary.employees;
  return compactProfile(merged);
}

function unavailableResponse(symbol: string, providerSymbol: string, assetType: MarketAssetType, reason: string): AssetProfileResponse {
  return {
    success: true,
    symbol,
    providerSymbol,
    assetType,
    source: 'Market data providers',
    lastUpdated: new Date().toISOString(),
    profileAvailable: false,
    profile: null,
    unavailableReason: reason,
    message: 'profile_unavailable',
  };
}

function normalizeProviderSymbol(symbol: string, exchange?: string) {
  const validated = validateSymbol(symbol);
  if (!validated) return null;
  const withoutExchange = validated.includes(':') ? validated.split(':').pop() || validated : validated;
  const cleaned = withoutExchange.replace(/\$/g, '-').replace(/\./g, '-').toUpperCase();
  if (/^(NASDAQ|NYSE|AMEX|NYSEARCA)$/i.test(String(exchange ?? ''))) return cleaned;
  return validateSymbol(cleaned);
}

function usefulProfileFields(profile: AssetProfile) {
  return Object.entries(profile).filter(([key, value]) => (
    key !== 'dataLimitations'
    && key !== 'category'
    && hasProfileValue(value)
  ));
}

export async function fetchAssetProfile(input: FetchAssetProfileInput): Promise<AssetProfileResponse> {
  const symbol = validateSymbol(input.symbol);
  const providerSymbol = normalizeProviderSymbol(input.providerSymbol ?? input.symbol, input.exchange);
  const assetType = normalizeAssetType(input.assetType);
  if (!symbol || !providerSymbol) {
    return unavailableResponse(String(input.symbol ?? '').toUpperCase(), String(input.providerSymbol ?? input.symbol ?? '').toUpperCase(), assetType, 'invalid_symbol');
  }

  const providersTried: string[] = [];
  let source = 'Symbol directory';
  let profile: AssetProfile = profileFromDirectory(symbol, providerSymbol, input);
  let secShareCount: number | undefined;
  let latestChartPrice: number | undefined;

  devLog('[AssetProfile] Fetch start', {
    requestedSymbol: input.symbol,
    normalizedSymbol: providerSymbol,
    symbol,
    assetType,
    exchange: input.exchange,
  });

  if (assetType === 'stock') {
    providersTried.push('Finnhub');
    const finnhub = await fetchFinnhubProfile(providerSymbol);
    if (finnhub) {
      profile = mergeProfiles(profileFromFinnhub(finnhub), profile);
      source = 'Finnhub';
    }
  }

  providersTried.push('Yahoo Finance');
  const [yahooSummary, yahooQuote, yahooChart] = await Promise.allSettled([
    fetchYahooQuoteSummary(providerSymbol),
    fetchYahooQuote(providerSymbol),
    fetchYahooChartProfile(providerSymbol),
  ]);
  const summary = yahooSummary.status === 'fulfilled' ? yahooSummary.value : null;
  const quote = yahooQuote.status === 'fulfilled' ? yahooQuote.value : null;
  const chart = yahooChart.status === 'fulfilled' ? yahooChart.value : null;
  latestChartPrice = pickNumber(chart, ['regularMarketPrice']);
  const yahooHasData = Boolean(summary || quote || chart);
  const yahooProfile = yahooHasData ? profileFromYahoo(summary, quote, chart, {
    symbol,
    providerSymbol,
    assetType,
    name: input.name,
    exchange: input.exchange,
  }) : {};
  if (yahooHasData && usefulProfileFields(yahooProfile).length > 0) {
    profile = mergeProfiles(yahooProfile, profile);
    source = source === 'Finnhub' ? 'Finnhub/Yahoo Finance' : 'Yahoo Finance';
  }

  if (assetType === 'stock') {
    providersTried.push('SEC EDGAR');
    const sec = await fetchSecCompanyProfile(providerSymbol);
    if (sec) {
      secShareCount = sec.shareCount;
      profile = mergeProfiles(profile, sec.profile);
      source = source.includes('Yahoo') || source.includes('Finnhub')
        ? `${source}/SEC EDGAR`
        : sec.source;
    }
  }

  if (secShareCount && latestChartPrice) {
    profile.marketCap = secShareCount * latestChartPrice;
  }
  if (!profile.employees && profile.employeeCount) profile.employees = profile.employeeCount;
  if (!profile.employeeCount && profile.employees) profile.employeeCount = profile.employees;

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
    dataLimitations,
  });

  const profileAvailable = usefulProfileFields(profile).length > 0;
  const unavailableReason = profileAvailable ? undefined : 'provider_returned_empty';
  devLog('[AssetProfile] Fetch complete', {
    requestedSymbol: input.symbol,
    normalizedSymbol: providerSymbol,
    symbol,
    assetType,
    providersTried,
    providerUsed: source,
    rawResponseKeys: Object.keys(profile),
    missingFields: {
      sector: !profile.sector,
      industry: !profile.industry,
      marketCap: !profile.marketCap,
      country: !profile.country,
      currency: !profile.currency,
      employeeCount: !(profile.employeeCount ?? profile.employees),
      description: !profile.description,
    },
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
