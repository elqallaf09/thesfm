import { cleanEnv } from '@/lib/market/providerConfig';

const LOGIN_URL = 'https://www.myfxbook.com/api/login.json';
const OUTLOOK_URL = 'https://www.myfxbook.com/api/get-community-outlook.json';
const REQUEST_TIMEOUT_MS = 10000;
const SESSION_TTL_MS = 25 * 60 * 1000;
const OUTLOOK_TTL_MS = 5 * 60 * 1000;

type MyfxbookErrorCode =
  | 'MYFXBOOK_CREDENTIALS_NOT_CONFIGURED'
  | 'MYFXBOOK_AUTH_FAILED'
  | 'MYFXBOOK_RATE_LIMITED'
  | 'MYFXBOOK_PROVIDER_FAILED'
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
    };

export class MyfxbookProviderError extends Error {
  code: MyfxbookErrorCode;
  status?: number;

  constructor(code: MyfxbookErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'MyfxbookProviderError';
    this.code = code;
    this.status = status;
  }
}

let cachedSession: { value: string; expiresAt: number } | null = null;
let cachedOutlook: { items: MyfxbookSentimentItem[]; updatedAt: string; expiresAt: number } | null = null;

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true';
}

function isRateLimitMessage(message: string | undefined) {
  return /rate|limit|too many|throttle/i.test(message ?? '');
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

function unavailable(code: MyfxbookErrorCode): MyfxbookSentimentResult {
  return {
    ok: false,
    source: 'myfxbook',
    code,
    items: [],
    updated_at: null,
  };
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

async function getSession(email: string, password: string) {
  const now = Date.now();
  if (cachedSession && cachedSession.expiresAt > now) return cachedSession.value;

  const url = new URL(`${LOGIN_URL}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);

  const payload = await fetchJsonWithTimeout<MyfxbookLoginResponse>(url);
  if (payload.error || !payload.session) {
    const code = isRateLimitMessage(payload.message) ? 'MYFXBOOK_RATE_LIMITED' : 'MYFXBOOK_AUTH_FAILED';
    throw new MyfxbookProviderError(code, 'Myfxbook login failed');
  }

  cachedSession = {
    value: payload.session,
    expiresAt: now + SESSION_TTL_MS,
  };
  return payload.session;
}

async function getCommunityOutlook(email: string, password: string) {
  const now = Date.now();
  if (cachedOutlook && cachedOutlook.expiresAt > now) {
    return cachedOutlook;
  }

  const session = await getSession(email, password);
  const url = new URL(`${OUTLOOK_URL}?session=${encodeURIComponent(session)}`);

  const payload = await fetchJsonWithTimeout<MyfxbookOutlookResponse>(url);
  if (payload.error) {
    if (payload.message && /session|auth|login/i.test(payload.message)) {
      cachedSession = null;
      throw new MyfxbookProviderError('MYFXBOOK_AUTH_FAILED', 'Myfxbook session was rejected');
    }
    if (isRateLimitMessage(payload.message)) {
      throw new MyfxbookProviderError('MYFXBOOK_RATE_LIMITED', 'Myfxbook outlook request was rate limited');
    }
    throw new MyfxbookProviderError('MYFXBOOK_PROVIDER_FAILED', 'Myfxbook returned an outlook error');
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
  const requestedSymbol = normalizeSymbol(symbol);
  if (!requestedSymbol) return unavailable('SYMBOL_REQUIRED');

  const email = cleanEnv(process.env.MYFXBOOK_EMAIL);
  const password = cleanEnv(process.env.MYFXBOOK_PASSWORD);
  if (!email || !password) return unavailable('MYFXBOOK_CREDENTIALS_NOT_CONFIGURED');

  try {
    const outlook = await getCommunityOutlook(email, password);
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
      return unavailable(error.code);
    }

    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return unavailable('MYFXBOOK_PROVIDER_FAILED');
    }

    if (shouldDebug()) {
      console.warn('[myfxbook-sentiment] provider failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return unavailable('MYFXBOOK_PROVIDER_FAILED');
  }
}
