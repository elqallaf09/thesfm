import { cleanEnv } from '@/lib/market/providerConfig';

const LOGIN_URL = 'https://www.myfxbook.com/api/login.json';
const OUTLOOK_URL = 'https://www.myfxbook.com/api/get-community-outlook.json';
const REQUEST_TIMEOUT_MS = 10000;
const SESSION_TTL_MS = 25 * 60 * 1000;
const OUTLOOK_TTL_MS = 5 * 60 * 1000;

type MyfxbookErrorCode =
  | 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED'
  | 'MYFXBOOK_AUTH_FAILED'
  | 'MYFXBOOK_SESSION_MISSING'
  | 'MYFXBOOK_RATE_LIMITED'
  | 'MYFXBOOK_PROVIDER_FAILED'
  | 'MYFXBOOK_TIMEOUT'
  | 'INVALID_FOREX_PAIR'
  | 'NO_MARKET_SENTIMENT_DATA'
  | 'SYMBOL_REQUIRED';

type MyfxbookApiSymbol = {
  name?: unknown;
  symbol?: unknown;
  pair?: unknown;
  longPercentage?: unknown;
  shortPercentage?: unknown;
  buyPercentage?: unknown;
  sellPercentage?: unknown;
  longVolume?: unknown;
  shortVolume?: unknown;
};

type MyfxbookLoginResponse = {
  error?: boolean;
  message?: string;
  session?: string;
};

type MyfxbookOutlookResponse = {
  error?: boolean;
  message?: string;
  symbols?: MyfxbookApiSymbol[];
  data?: MyfxbookApiSymbol[];
  communityOutlook?: MyfxbookApiSymbol[];
};

type MyfxbookLoginResult =
  | { ok: true; session: string; providerMessage: string | null; httpStatus?: number; canReachMyfxbook?: boolean }
  | { ok: false; code: MyfxbookErrorCode; providerMessage: string | null; httpStatus?: number; canReachMyfxbook?: boolean };

export type MyfxbookSentimentItem = {
  symbol: string;
  ticker: string;
  name: string;
  displaySymbol: string;
  buyPercentage: number | null;
  sellPercentage: number | null;
  longPercentage: number | null;
  shortPercentage: number | null;
  buyPercent: number | null;
  sellPercent: number | null;
  buy: number | null;
  sell: number | null;
  longVolume: number | null;
  shortVolume: number | null;
  provider: 'myfxbook';
  source: 'Myfxbook';
  updated_at: string;
  updatedAt: string;
};

export type MyfxbookSentimentResult =
  | {
      ok: true;
      source: 'myfxbook';
      items: MyfxbookSentimentItem[];
      updated_at: string;
    }
  | {
      ok: false;
      source: 'myfxbook';
      code: MyfxbookErrorCode;
      items: [];
      updated_at: null;
      providerMessage?: string | null;
      suggestions?: string[];
    };

export class MyfxbookProviderError extends Error {
  code: MyfxbookErrorCode;
  status?: number;
  providerMessage?: string | null;

  constructor(code: MyfxbookErrorCode, message: string, status?: number, providerMessage?: string | null) {
    super(message);
    this.name = 'MyfxbookProviderError';
    this.code = code;
    this.status = status;
    this.providerMessage = providerMessage ?? null;
  }
}

let cachedSession: { value: string; expiresAt: number } | null = null;
let cachedOutlook: { items: MyfxbookSentimentItem[]; updatedAt: string; expiresAt: number } | null = null;
let cachedFailure: { code: MyfxbookErrorCode; providerMessage: string | null; expiresAt: number } | null = null;
let envCheckLogged = false;
const FAILURE_TTL_MS = 60 * 1000;
const SUPPORTED_MYFXBOOK_FOREX_PAIRS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'USDCHF',
  'USDCAD',
  'AUDUSD',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
] as const;
const SUPPORTED_MYFXBOOK_FOREX_SET = new Set<string>(SUPPORTED_MYFXBOOK_FOREX_PAIRS);

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function isRateLimitMessage(message: string | undefined) {
  return /rate|limit|too many|throttle/i.test(message ?? '');
}

function maskProviderMessage(message: string | null | undefined) {
  if (!message) return null;
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

function logEnvCheckOnce() {
  if (envCheckLogged) return;
  envCheckLogged = true;
  const email = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const password = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  console.log('[Myfxbook] email configured:', Boolean(email));
  console.log('[Myfxbook] password configured:', Boolean(password));
  console.log('[Myfxbook] password length:', password.length);
}

function normalizeSymbol(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/=X$/, '')
    .replace(/[^A-Z0-9]/g, '');
}

export function normalizeMyfxbookSymbol(value: string) {
  return normalizeSymbol(value);
}

export function resolveMyfxbookForexSymbol(value: unknown) {
  const compact = normalizeSymbol(String(value ?? ''));
  if (!compact) {
    return {
      ok: false as const,
      symbol: '',
      code: 'SYMBOL_REQUIRED' as const,
      suggestions: [] as string[],
    };
  }

  if (SUPPORTED_MYFXBOOK_FOREX_SET.has(compact)) {
    return {
      ok: true as const,
      symbol: compact,
      suggestions: [] as string[],
    };
  }

  const reversed = compact.length === 6 ? `${compact.slice(3, 6)}${compact.slice(0, 3)}` : '';
  const suggestions = reversed && SUPPORTED_MYFXBOOK_FOREX_SET.has(reversed) ? [reversed] : [];
  return {
    ok: false as const,
    symbol: compact,
    code: 'INVALID_FOREX_PAIR' as const,
    suggestions,
  };
}

export function isMyfxbookSupportedSymbol(value: string) {
  return resolveMyfxbookForexSymbol(value).ok;
}

export function formatMyfxbookDisplaySymbol(value: string) {
  const compact = normalizeSymbol(value);
  if (/^[A-Z]{6}$/.test(compact)) {
    return `${compact.slice(0, 3)}/${compact.slice(3)}`;
  }
  if (/^[A-Z]{3,4}USD$/.test(compact)) {
    return `${compact.slice(0, -3)}/USD`;
  }
  return compact || value.trim().toUpperCase();
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? '').replace('%', '').replace(/,/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentage(value: unknown) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  const asPercent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
  return Math.max(0, Math.min(100, asPercent));
}

function extractSymbolArray(payload: MyfxbookOutlookResponse) {
  if (Array.isArray(payload.symbols)) return payload.symbols;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.communityOutlook)) return payload.communityOutlook;
  return [];
}

function normalizeOutlookSymbol(item: MyfxbookApiSymbol, updatedAt: string): MyfxbookSentimentItem | null {
  const rawSymbol = String(item.name ?? item.symbol ?? item.pair ?? '').trim();
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return null;

  const longPercentage = parsePercentage(item.longPercentage ?? item.buyPercentage);
  const shortPercentage = parsePercentage(item.shortPercentage ?? item.sellPercentage);
  const longVolume = parseNumber(item.longVolume);
  const shortVolume = parseNumber(item.shortVolume);

  return {
    symbol,
    ticker: symbol,
    name: formatMyfxbookDisplaySymbol(symbol),
    displaySymbol: formatMyfxbookDisplaySymbol(symbol),
    buyPercentage: longPercentage,
    sellPercentage: shortPercentage,
    longPercentage,
    shortPercentage,
    buyPercent: longPercentage,
    sellPercent: shortPercentage,
    buy: longPercentage,
    sell: shortPercentage,
    longVolume,
    shortVolume,
    provider: 'myfxbook',
    source: 'Myfxbook',
    updated_at: updatedAt,
    updatedAt,
  };
}

function unavailable(code: MyfxbookErrorCode, providerMessage: string | null = null, suggestions: string[] = []): MyfxbookSentimentResult {
  return {
    ok: false,
    source: 'myfxbook',
    code,
    items: [],
    updated_at: null,
    providerMessage,
    suggestions,
  };
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

async function fetchJsonWithTimeout<T>(url: URL, timeoutMs = REQUEST_TIMEOUT_MS) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (response.status === 429) {
    throw new MyfxbookProviderError('MYFXBOOK_RATE_LIMITED', 'Myfxbook request was rate limited', response.status);
  }

  if (!response.ok) {
    throw new MyfxbookProviderError('MYFXBOOK_PROVIDER_FAILED', 'Myfxbook request failed', response.status);
  }

  return response.json().catch(() => ({})) as Promise<T>;
}

export async function loginToMyfxbook(options: { force?: boolean } = {}): Promise<MyfxbookLoginResult> {
  const now = Date.now();
  if (!options.force && cachedSession && cachedSession.expiresAt > now) {
    return { ok: true as const, session: cachedSession.value, providerMessage: null, canReachMyfxbook: true };
  }
  if (!options.force && cachedFailure && cachedFailure.expiresAt > now) {
    return {
      ok: false as const,
      code: cachedFailure.code,
      providerMessage: cachedFailure.providerMessage,
      canReachMyfxbook: cachedFailure.code !== 'MYFXBOOK_PROVIDER_FAILED',
    };
  }

  const rawEmail = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const rawPassword = cleanEnv(process.env.MYFXBOOK_PASSWORD);

  if (!rawEmail || !rawPassword) {
    return { ok: false as const, code: 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED' as const, providerMessage: null };
  }

  logEnvCheckOnce();

  const params = new URLSearchParams({
    email: rawEmail,
    password: rawPassword,
  });
  const loginUrl = `${LOGIN_URL}?${params.toString()}`;

  console.log('[Myfxbook] login attempt');

  let response: Response;
  let payload: MyfxbookLoginResponse;
  try {
    response = await fetch(loginUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    payload = await response.json().catch(() => ({})) as MyfxbookLoginResponse;
  } catch (error) {
    const code = isTimeoutError(error) ? 'MYFXBOOK_TIMEOUT' : 'MYFXBOOK_PROVIDER_FAILED';
    console.error('[Myfxbook] login network error:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
    });
    cachedFailure = {
      code,
      providerMessage: null,
      expiresAt: now + FAILURE_TTL_MS,
    };
    return {
      ok: false as const,
      code,
      providerMessage: null,
      canReachMyfxbook: false,
    };
  }

  console.log('[Myfxbook] login response:', {
    httpStatus: response.status,
    error: payload?.error,
    message: maskProviderMessage(payload?.message),
    hasSession: Boolean(payload?.session),
  });

  if (response.status === 429) {
    cachedFailure = {
      code: 'MYFXBOOK_RATE_LIMITED',
      providerMessage: payload.message ?? null,
      expiresAt: now + FAILURE_TTL_MS,
    };
    return {
      ok: false as const,
      code: 'MYFXBOOK_RATE_LIMITED' as const,
      providerMessage: payload.message ?? null,
      httpStatus: response.status,
      canReachMyfxbook: true,
    };
  }

  if (!response.ok) {
    cachedFailure = {
      code: 'MYFXBOOK_PROVIDER_FAILED',
      providerMessage: payload.message ?? null,
      expiresAt: now + FAILURE_TTL_MS,
    };
    return {
      ok: false as const,
      code: 'MYFXBOOK_PROVIDER_FAILED' as const,
      providerMessage: payload.message ?? null,
      httpStatus: response.status,
      canReachMyfxbook: false,
    };
  }

  if (payload.error === true) {
    const code: MyfxbookErrorCode = isRateLimitMessage(payload.message) ? 'MYFXBOOK_RATE_LIMITED' : 'MYFXBOOK_AUTH_FAILED';
    cachedFailure = {
      code,
      providerMessage: payload.message ?? null,
      expiresAt: now + FAILURE_TTL_MS,
    };
    return {
      ok: false as const,
      code,
      providerMessage: payload.message ?? null,
      httpStatus: response.status,
      canReachMyfxbook: true,
    };
  }

  if (!payload.session) {
    cachedFailure = {
      code: 'MYFXBOOK_SESSION_MISSING',
      providerMessage: payload.message ?? null,
      expiresAt: now + FAILURE_TTL_MS,
    };
    return {
      ok: false as const,
      code: 'MYFXBOOK_SESSION_MISSING' as const,
      providerMessage: payload.message ?? null,
      httpStatus: response.status,
      canReachMyfxbook: true,
    };
  }

  cachedSession = {
    value: payload.session,
    expiresAt: now + SESSION_TTL_MS,
  };
  cachedFailure = null;
  return {
    ok: true as const,
    session: payload.session,
    providerMessage: payload.message ?? null,
    httpStatus: response.status,
    canReachMyfxbook: true,
  };
}

async function getSession() {
  const login = await loginToMyfxbook();
  if (!login.ok) {
    throw new MyfxbookProviderError(login.code, 'Myfxbook login failed', undefined, login.providerMessage);
  }
  return login.session;
}

async function fetchCommunityOutlookPayload(session: string) {
  const url = new URL(OUTLOOK_URL);
  url.searchParams.set('session', session);
  return fetchJsonWithTimeout<MyfxbookOutlookResponse>(url);
}

function isInvalidSessionPayload(payload: MyfxbookOutlookResponse) {
  return Boolean(payload.error && payload.message && /session|auth|login/i.test(payload.message));
}

async function getCommunityOutlook() {
  const now = Date.now();
  if (cachedOutlook && cachedOutlook.expiresAt > now) {
    return cachedOutlook;
  }

  const session = await getSession();
  let payload = await fetchCommunityOutlookPayload(session);

  if (isInvalidSessionPayload(payload)) {
    cachedSession = null;
    const relogin = await loginToMyfxbook({ force: true });
    if (!relogin.ok) {
      throw new MyfxbookProviderError(relogin.code, 'Myfxbook re-login failed', relogin.httpStatus, relogin.providerMessage);
    }
    payload = await fetchCommunityOutlookPayload(relogin.session);
  }

  if (payload.error) {
    if (isInvalidSessionPayload(payload)) {
      cachedSession = null;
      throw new MyfxbookProviderError('MYFXBOOK_AUTH_FAILED', 'Myfxbook session was rejected', undefined, payload.message);
    }
    if (isRateLimitMessage(payload.message)) {
      throw new MyfxbookProviderError('MYFXBOOK_RATE_LIMITED', 'Myfxbook outlook request was rate limited', undefined, payload.message);
    }
    throw new MyfxbookProviderError('MYFXBOOK_PROVIDER_FAILED', 'Myfxbook returned an outlook error', undefined, payload.message);
  }

  const updatedAt = new Date().toISOString();
  const items = extractSymbolArray(payload)
    .map(item => normalizeOutlookSymbol(item, updatedAt))
    .filter((item): item is MyfxbookSentimentItem => Boolean(item));

  if (shouldDebug()) {
    console.info('[myfxbook-sentiment] normalized outlook', {
      fieldsReturned: items.length,
      symbolsReturned: items.map(item => item.symbol).slice(0, 12),
    });
  }

  cachedOutlook = {
    items,
    updatedAt,
    expiresAt: now + OUTLOOK_TTL_MS,
  };
  return cachedOutlook;
}

export async function getMyfxbookSentiment(symbol: string): Promise<MyfxbookSentimentResult> {
  const resolvedSymbol = resolveMyfxbookForexSymbol(symbol);
  if (!resolvedSymbol.ok) {
    return unavailable(resolvedSymbol.code, null, resolvedSymbol.suggestions);
  }
  const requestedSymbol = resolvedSymbol.symbol;

  const email = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const password = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  if (!email || !password) return unavailable('MYFXBOOK_CREDENTIALS_NOT_CONFIGURED');

  try {
    const outlook = await getCommunityOutlook();
    const matchingItems = outlook.items.filter(item => item.symbol === requestedSymbol);

    if (matchingItems.length === 0) {
      return unavailable('NO_MARKET_SENTIMENT_DATA');
    }

    return {
      ok: true,
      source: 'myfxbook',
      items: matchingItems,
      updated_at: outlook.updatedAt,
    };
  } catch (error) {
    if (error instanceof MyfxbookProviderError) {
      if (shouldDebug()) {
        console.warn('[myfxbook-sentiment] provider unavailable', {
          code: error.code,
          status: error.status,
        });
      }
      return unavailable(error.code, error.providerMessage ?? null);
    }

    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return unavailable('MYFXBOOK_TIMEOUT');
    }

    if (shouldDebug()) {
      console.warn('[myfxbook-sentiment] provider failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return unavailable('MYFXBOOK_PROVIDER_FAILED');
  }
}
