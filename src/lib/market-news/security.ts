import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import {
  FinancialNewsProviderError,
  FinancialNewsProviderErrorCode,
} from './types';

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 2;
const ABSOLUTE_MAX_BYTES = 5 * 1024 * 1024;
const ABSOLUTE_MAX_REDIRECTS = 5;
const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'guccounter',
  'ocid',
  'cmpid',
]);
const SENSITIVE_REDIRECT_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
  'x-finnhub-token',
]);

type NextFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

export type SafeFetchTextOptions = {
  providerId: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowedContentTypes: readonly string[];
  headers?: Record<string, string>;
  cache?: RequestCache;
  revalidateSeconds?: number;
  signal?: AbortSignal;
};

export type SafeFetchTextResult = {
  text: string;
  finalUrl: string;
  contentType: string;
  status: number;
};

function privateIpv4(hostname: string) {
  const octets = hostname.split('.').map(value => Number.parseInt(value, 10));
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true;
  }

  const [a, b] = octets as [number, number, number, number];
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51)
    || (a === 203 && b === 0)
    || a >= 224;
}

function privateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('::ffff:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized.startsWith('2001:db8:')) return true;
  return false;
}

function privateOrLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
  if (!normalized) return true;
  if (
    normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
    || normalized.endsWith('.home')
    || normalized.endsWith('.lan')
    || normalized === 'metadata.google.internal'
    || normalized === 'instance-data'
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return privateIpv4(normalized);
  if (ipVersion === 6) return privateIpv6(normalized);

  // Single-label names commonly resolve through a private search domain.
  return !normalized.includes('.');
}

export function assertSafePublicHttpUrl(value: string | URL, providerId = 'market-news'): URL {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value.toString()) : new URL(value);
  } catch {
    throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UNSAFE_URL);
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:')
    || url.username
    || url.password
    || privateOrLocalHostname(url.hostname)
  ) {
    throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UNSAFE_URL);
  }

  return url;
}

async function assertPublicDnsResolution(url: URL, providerId: string) {
  if (isIP(url.hostname.replace(/^\[|\]$/g, ''))) return;
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.NETWORK_ERROR, { retryable: true });
  }
  if (addresses.length === 0 || addresses.some(({ address, family }) => (
    family === 4 ? privateIpv4(address) : family === 6 ? privateIpv6(address) : true
  ))) {
    throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UNSAFE_URL);
  }
}

export function safePublicHttpUrl(value: unknown, providerId = 'market-news'): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return assertSafePublicHttpUrl(value.trim(), providerId).toString();
  } catch {
    return null;
  }
}

export function sourceDomainFromUrl(value: string | URL | null | undefined): string | null {
  if (!value) return null;
  try {
    return assertSafePublicHttpUrl(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function normalizeCanonicalUrl(value: string, providerId = 'market-news'): string | null {
  try {
    const url = assertSafePublicHttpUrl(value, providerId);
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.startsWith('utm_') || TRACKING_PARAMETERS.has(normalizedKey)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function decodeEntity(entity: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    quot: '"',
    lt: '<',
    gt: '>',
    nbsp: ' ',
    ndash: '–',
    mdash: '—',
    hellip: '…',
  };
  const lower = entity.toLowerCase();
  if (lower in named) return named[lower];

  const numeric = lower.startsWith('#x')
    ? Number.parseInt(lower.slice(2), 16)
    : lower.startsWith('#')
      ? Number.parseInt(lower.slice(1), 10)
      : Number.NaN;
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 0x10ffff || (numeric >= 0xd800 && numeric <= 0xdfff)) {
    return ' ';
  }
  return String.fromCodePoint(numeric);
}

export function sanitizeExternalText(value: unknown, maxLength = 1_000): string {
  if (typeof value !== 'string' || maxLength <= 0) return '';
  const sanitized = value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/&([a-zA-Z0-9#]+);/g, (_match, entity: string) => decodeEntity(entity))
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(sanitized).slice(0, maxLength).join('').trim();
}

export function sanitizeXmlDocument(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/<!DOCTYPE[\s\S]*?(?:\]>|>)/gi, '')
    .replace(/<!ENTITY[\s\S]*?>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function contentTypeAllowed(contentType: string, allowed: readonly string[]) {
  const mime = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return Boolean(mime && allowed.some(candidate => mime === candidate.toLowerCase()));
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 86_400);
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, Math.min(86_400, Math.ceil((date - Date.now()) / 1_000)));
}

function responseError(providerId: string, response: Response) {
  const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'));
  if (response.status === 401 || response.status === 403) {
    return new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UNAUTHORIZED, {
      httpStatus: response.status,
    });
  }
  if (response.status === 429) {
    return new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.RATE_LIMITED, {
      retryable: true,
      httpStatus: response.status,
      retryAfterSeconds,
    });
  }
  return new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UPSTREAM_ERROR, {
    retryable: response.status >= 500,
    httpStatus: response.status,
    retryAfterSeconds,
  });
}

function redirectHeaders(headers: Record<string, string>, previous: URL, next: URL) {
  if (previous.origin === next.origin) return headers;
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !SENSITIVE_REDIRECT_HEADERS.has(name.toLowerCase())),
  );
}

async function readBoundedBody(response: Response, providerId: string, maxBytes: number) {
  const declaredLength = Number.parseInt(response.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.RESPONSE_TOO_LARGE);
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.RESPONSE_TOO_LARGE);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]?.toLowerCase();
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset || 'utf-8', { fatal: false });
  } catch {
    decoder = new TextDecoder('utf-8', { fatal: false });
  }
  return decoder.decode(body);
}

export async function safeFetchText(
  input: string | URL,
  options: SafeFetchTextOptions,
): Promise<SafeFetchTextResult> {
  const providerId = options.providerId;
  const timeoutMs = Math.min(20_000, Math.max(1_000, options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  const maxBytes = Math.min(ABSOLUTE_MAX_BYTES, Math.max(1_024, options.maxBytes ?? DEFAULT_MAX_BYTES));
  const maxRedirects = Math.min(ABSOLUTE_MAX_REDIRECTS, Math.max(0, options.maxRedirects ?? DEFAULT_MAX_REDIRECTS));
  const controller = new AbortController();
  const externalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', externalAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let currentUrl = assertSafePublicHttpUrl(input, providerId);
  let headers = { ...(options.headers ?? {}) };
  let redirectCount = 0;

  try {
    while (true) {
      // Validate DNS immediately before every request, including redirects.
      // This fails closed when a hostname resolves to any private/link-local
      // address and prevents configured feeds from targeting internal services.
      await assertPublicDnsResolution(currentUrl, providerId);
      const init: NextFetchInit = {
        method: 'GET',
        redirect: 'manual',
        headers,
        signal: controller.signal,
        cache: options.cache,
        ...(typeof options.revalidateSeconds === 'number'
          ? { next: { revalidate: Math.max(0, Math.trunc(options.revalidateSeconds)) } }
          : {}),
      };

      let response: Response;
      try {
        response = await fetch(currentUrl, init);
      } catch {
        const timedOut = controller.signal.aborted && !options.signal?.aborted;
        throw new FinancialNewsProviderError(
          providerId,
          timedOut ? FinancialNewsProviderErrorCode.TIMEOUT : FinancialNewsProviderErrorCode.NETWORK_ERROR,
          { retryable: true },
        );
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirectCount >= maxRedirects) {
          throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.REDIRECT_LIMIT, {
            retryable: true,
            httpStatus: response.status,
          });
        }
        const nextUrl = assertSafePublicHttpUrl(new URL(location, currentUrl), providerId);
        if (currentUrl.protocol === 'https:' && nextUrl.protocol !== 'https:') {
          throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UNSAFE_URL);
        }
        headers = redirectHeaders(headers, currentUrl, nextUrl);
        currentUrl = nextUrl;
        redirectCount += 1;
        continue;
      }

      if (!response.ok) throw responseError(providerId, response);
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentTypeAllowed(contentType, options.allowedContentTypes)) {
        throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.UNSUPPORTED_CONTENT_TYPE, {
          httpStatus: response.status,
        });
      }
      const text = await readBoundedBody(response, providerId, maxBytes);
      return {
        text,
        finalUrl: currentUrl.toString(),
        contentType,
        status: response.status,
      };
    }
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', externalAbort);
  }
}
