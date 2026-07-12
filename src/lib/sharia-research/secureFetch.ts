import 'server-only';

import { lookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
// https.RequestOptions includes the TLS fields (servername) and remains
// assignable to the plain-http transport's options.
import { request as httpsRequest, type RequestOptions } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { Readable } from 'node:stream';

const DEFAULT_USER_AGENT = process.env.SHARIA_RESEARCH_USER_AGENT?.trim()
  || 'THE-SFM-ShariaResearch/1.0 (+https://www.the-sfm.com; public-source-research)';
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_REDIRECTS = 4;
const MAX_CACHE_ENTRIES = 200;

type CacheEntry = { expiresAt: number; value: SecureFetchResult };
type ResolvedAddress = { address: string; family: 4 | 6 };
type ResolvedPublicUrl = { url: URL; addresses: ResolvedAddress[] };
const responseCache = new Map<string, CacheEntry>();
const domainNextRequestAt = new Map<string, number>();

export class UnsafeUrlError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
    this.code = code;
  }
}

export type SecureFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  retries?: number;
  retryBaseMs?: number;
  cacheTtlMs?: number;
  minDomainIntervalMs?: number;
  respectRobots?: boolean;
  acceptedContentTypes?: string[];
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type SecureFetchResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string | null;
  contentLength: number;
  retrievedAt: string;
  body: Uint8Array;
  redirects: string[];
  headers: Record<string, string>;
  fromCache: boolean;
};

function parseIpv4(ip: string) {
  const octets = ip.split('.').map(Number);
  return octets.length === 4 && octets.every(octet => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    ? octets
    : null;
}

function isBlockedIpv4(ip: string) {
  const octets = parseIpv4(ip);
  if (!octets) return true;
  const [a, b] = octets;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
  );
}

function isBlockedIpv6(ip: string) {
  const normalized = ip.toLowerCase().split('%')[0];
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('ff')) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isBlockedIpv4(mapped[1]) : false;
}

export function isBlockedIpAddress(ip: string) {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

function isBlockedHostname(hostname: string) {
  const host = normalizeHostname(hostname).toLowerCase().replace(/\.$/, '');
  return host === 'localhost'
    || host === 'metadata'
    || host === 'metadata.google.internal'
    || host === 'instance-data'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host.endsWith('.home.arpa');
}

function normalizeHostname(hostname: string) {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

async function resolveSafePublicUrl(input: string | URL): Promise<ResolvedPublicUrl> {
  let url: URL;
  try {
    url = input instanceof URL ? new URL(input) : new URL(input);
  } catch {
    throw new UnsafeUrlError('INVALID_URL', 'The source URL is invalid.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UnsafeUrlError('UNSUPPORTED_PROTOCOL', 'Only HTTP and HTTPS source URLs are supported.');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URL_CREDENTIALS_BLOCKED', 'URLs containing credentials are blocked.');
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new UnsafeUrlError('UNSUPPORTED_PORT', 'Only standard HTTP and HTTPS ports are supported.');
  }
  if (isBlockedHostname(url.hostname)) {
    throw new UnsafeUrlError('INTERNAL_HOST_BLOCKED', 'Internal hostnames are blocked.');
  }

  const hostname = normalizeHostname(url.hostname);
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isBlockedIpAddress(hostname)) {
      throw new UnsafeUrlError('PRIVATE_IP_BLOCKED', 'Private, local, and special-use IP addresses are blocked.');
    }
    return {
      url,
      addresses: [{ address: hostname, family: literalFamily as 4 | 6 }],
    };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError('DNS_RESOLUTION_FAILED', 'The source hostname could not be resolved.');
  }
  if (addresses.length === 0 || addresses.some(({ address, family }) => {
    const detectedFamily = isIP(address);
    return (detectedFamily !== 4 && detectedFamily !== 6)
      || family !== detectedFamily
      || isBlockedIpAddress(address);
  })) {
    throw new UnsafeUrlError('PRIVATE_DNS_TARGET_BLOCKED', 'The source hostname resolves to a blocked network address.');
  }
  return {
    url,
    addresses: addresses.map(({ address, family }) => ({ address, family: family as 4 | 6 })),
  };
}

export async function assertSafePublicUrl(input: string | URL) {
  return (await resolveSafePublicUrl(input)).url;
}

function sleep(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

async function rateLimitDomain(hostname: string, intervalMs: number, signal?: AbortSignal) {
  const key = hostname.toLowerCase();
  const now = Date.now();
  const next = domainNextRequestAt.get(key) ?? now;
  if (next > now) await sleep(next - now, signal);
  domainNextRequestAt.set(key, Date.now() + intervalMs);
}

function cacheKey(url: URL, options: SecureFetchOptions) {
  return `${url.toString()}|${(options.acceptedContentTypes ?? []).join(',')}`;
}

function cacheGet(key: string) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return { ...entry.value, body: entry.value.body.slice(), fromCache: true };
}

function cacheSet(key: string, value: SecureFetchResult, ttlMs: number) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { expiresAt: Date.now() + ttlMs, value: { ...value, body: value.body.slice() } });
}

function parseRobotsGroups(text: string) {
  const groups: Array<{ agents: string[]; disallow: string[]; allow: string[] }> = [];
  let current: { agents: string[]; disallow: string[]; allow: string[] } | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'user-agent') {
      if (!current || current.disallow.length > 0 || current.allow.length > 0) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && key === 'disallow' && value) {
      current.disallow.push(value);
    } else if (current && key === 'allow' && value) {
      current.allow.push(value);
    }
  }
  return groups;
}

function pathMatchesRule(pathname: string, rule: string) {
  const escaped = rule
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\$$/, '$');
  return new RegExp(`^${escaped}`).test(pathname);
}

export function robotsAllows(robotsText: string, url: URL, userAgent = DEFAULT_USER_AGENT) {
  const agentToken = userAgent.split(/[\s/]/)[0].toLowerCase();
  const groups = parseRobotsGroups(robotsText);
  const applicable = groups.filter(group => group.agents.some(agent => agent === '*' || agentToken.includes(agent)));
  if (applicable.length === 0) return true;
  const path = `${url.pathname}${url.search}`;
  const matches = applicable.flatMap(group => [
    ...group.allow.map(rule => ({ type: 'allow' as const, rule })),
    ...group.disallow.map(rule => ({ type: 'disallow' as const, rule })),
  ]).filter(entry => pathMatchesRule(path, entry.rule));
  if (matches.length === 0) return true;
  matches.sort((a, b) => b.rule.length - a.rule.length || (a.type === 'allow' ? -1 : 1));
  return matches[0].type === 'allow';
}

async function assertRobotsAllowed(url: URL, options: SecureFetchOptions) {
  if (url.pathname === '/robots.txt') return;
  const robotsUrl = new URL('/robots.txt', url.origin);
  try {
    const robots = await secureFetch(robotsUrl.toString(), {
      ...options,
      maxBytes: 512 * 1024,
      maxRedirects: 2,
      retries: 0,
      cacheTtlMs: 60 * 60 * 1000,
      respectRobots: false,
      acceptedContentTypes: ['text/plain', 'text/'],
    });
    const text = new TextDecoder().decode(robots.body);
    if (!robotsAllows(text, url)) {
      throw new UnsafeUrlError('ROBOTS_DISALLOWED', 'The website robots policy does not permit retrieval of this path.');
    }
  } catch (error) {
    if (error instanceof UnsafeUrlError && error.code === 'ROBOTS_DISALLOWED') throw error;
    // Missing or unreachable robots.txt does not imply a prohibition. The fetch still obeys rate and size limits.
  }
}

async function readLimitedBody(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new UnsafeUrlError('RESPONSE_TOO_LARGE', `The response exceeds the ${maxBytes} byte limit.`);
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new UnsafeUrlError('RESPONSE_TOO_LARGE', `The response exceeds the ${maxBytes} byte limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

function contentTypeAllowed(contentType: string | null, accepted: string[]) {
  if (accepted.length === 0) return true;
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return accepted.some(type => normalized.includes(type.toLowerCase()));
}

function toWebHeaders(headers: IncomingHttpHeaders) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === 'string') result.append(name, value);
    else if (Array.isArray(value)) value.forEach(item => result.append(name, item));
  }
  return result;
}

function requestHeaders(options: SecureFetchOptions, accepted: string[]) {
  const headers: Record<string, string> = {
    accept: accepted.length > 0 ? accepted.join(', ') : '*/*',
    'user-agent': DEFAULT_USER_AGENT,
    // Avoid changing the body semantics or introducing a compressed-body bomb.
    'accept-encoding': 'identity',
  };
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName || normalizedName === 'host' || normalizedName === ':authority' || normalizedName === 'accept-encoding') {
      continue;
    }
    headers[normalizedName] = value;
  }
  return headers;
}

function createPinnedLookup(address: ResolvedAddress): LookupFunction {
  return (_hostname, lookupOptions, callback) => {
    if (lookupOptions.all) {
      callback(null, [{ address: address.address, family: address.family }]);
      return;
    }
    callback(null, address.address, address.family);
  };
}

function requestPinnedUrl(
  url: URL,
  address: ResolvedAddress,
  options: SecureFetchOptions,
  accepted: string[],
  signal: AbortSignal,
) {
  const hostname = normalizeHostname(url.hostname);
  const requestOptions: RequestOptions = {
    protocol: url.protocol,
    hostname,
    port: url.port || undefined,
    path: `${url.pathname}${url.search}`,
    method: 'GET',
    headers: requestHeaders(options, accepted),
    lookup: createPinnedLookup(address),
    family: address.family,
    signal,
  };
  if (url.protocol === 'https:' && !isIP(hostname)) {
    requestOptions.servername = hostname;
  }

  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise<Response>((resolve, reject) => {
    const request = transport(requestOptions, response => {
      const status = response.statusCode ?? 502;
      const body = status === 204 || status === 205 || status === 304
        ? null
        : Readable.toWeb(response) as ReadableStream<Uint8Array>;
      try {
        resolve(new Response(body, {
          status,
          statusText: response.statusMessage,
          headers: toWebHeaders(response.headers),
        }));
      } catch (error) {
        response.destroy();
        reject(error);
      }
    });
    request.once('error', reject);
    request.end();
  });
}

async function discardResponseBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The response is already unusable; cancellation is only for connection cleanup.
  }
}

async function fetchAttempt(initialUrl: URL, options: SecureFetchOptions) {
  const redirects: string[] = [];
  let current = initialUrl;
  const maxRedirects = options.maxRedirects ?? DEFAULT_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const accepted = options.acceptedContentTypes ?? [];

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const resolved = await resolveSafePublicUrl(current);
    current = resolved.url;
    await rateLimitDomain(current.hostname, options.minDomainIntervalMs ?? 350, options.signal);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    const response = await requestPinnedUrl(current, resolved.addresses[0], options, accepted, signal);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await discardResponseBody(response);
      if (!location) throw new UnsafeUrlError('INVALID_REDIRECT', 'The source returned a redirect without a location.');
      if (redirectCount === maxRedirects) throw new UnsafeUrlError('TOO_MANY_REDIRECTS', 'The source exceeded the redirect limit.');
      const next = new URL(location, current);
      redirects.push(next.toString());
      current = next;
      continue;
    }

    if (!response.ok) {
      await discardResponseBody(response);
      const error = new Error(`Source returned HTTP ${response.status}.`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    const contentType = response.headers.get('content-type');
    if (!contentTypeAllowed(contentType, accepted)) {
      await discardResponseBody(response);
      throw new UnsafeUrlError('UNSUPPORTED_CONTENT_TYPE', `Unsupported response content type: ${contentType ?? 'unknown'}.`);
    }
    const body = await readLimitedBody(response, maxBytes);
    return {
      requestedUrl: initialUrl.toString(),
      finalUrl: current.toString(),
      status: response.status,
      contentType,
      contentLength: body.byteLength,
      retrievedAt: new Date().toISOString(),
      body,
      redirects,
      headers: {
        etag: response.headers.get('etag') ?? '',
        'last-modified': response.headers.get('last-modified') ?? '',
      },
      fromCache: false,
    } satisfies SecureFetchResult;
  }
  throw new UnsafeUrlError('TOO_MANY_REDIRECTS', 'The source exceeded the redirect limit.');
}

function isRetryable(error: unknown) {
  if (error instanceof UnsafeUrlError) return false;
  const status = (error as { status?: number } | null)?.status;
  return status === 408 || status === 429 || (typeof status === 'number' && status >= 500);
}

export async function secureFetch(input: string, options: SecureFetchOptions = {}): Promise<SecureFetchResult> {
  const url = await assertSafePublicUrl(input);
  const key = cacheKey(url, options);
  const cached = cacheGet(key);
  if (cached) return cached;
  if (options.respectRobots !== false) await assertRobotsAllowed(url, options);

  const retries = Math.min(Math.max(options.retries ?? 2, 0), 3);
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await fetchAttempt(url, options);
      cacheSet(key, result, options.cacheTtlMs ?? 15 * 60 * 1000);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryable(error)) throw error;
      await sleep((options.retryBaseMs ?? 250) * (2 ** attempt), options.signal);
    }
  }
  throw lastError;
}

export function clearSecureFetchStateForTests() {
  responseCache.clear();
  domainNextRequestAt.clear();
}
