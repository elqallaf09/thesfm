import 'server-only';

import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|gif|avif|svg)$/i;
const MAX_URL_LENGTH = 4_096;
const MAX_HTML_BYTES = 350_000;
const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT_MS = 7_000;
const DNS_TIMEOUT_MS = 1_500;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type ResolveImageErrorCode = 'INVALID_URL' | 'BLOCKED_URL' | 'FETCH_FAILED' | 'NO_IMAGE_FOUND';

type ResolveImageResult =
  | { ok: true; imageUrl: string }
  | { ok: false; code: ResolveImageErrorCode };

type ResolvedAddress = { address: string; family: 4 | 6 };

type RemoteResponse = {
  status: number;
  contentType: string | null;
  location: string | null;
  body: string;
};

export type ImageResolverDependencies = {
  lookup?: (hostname: string) => Promise<ResolvedAddress[]>;
  request?: (url: URL, address: ResolvedAddress, signal: AbortSignal) => Promise<RemoteResponse>;
};

class ImageResolverFailure extends Error {
  constructor(readonly code: Exclude<ResolveImageErrorCode, 'NO_IMAGE_FOUND'>) {
    super(code);
    this.name = 'ImageResolverFailure';
  }
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseIpv4(ip: string) {
  const octets = ip.split('.').map(Number);
  return octets.length === 4 && octets.every(octet => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    ? octets
    : null;
}

/** Fail closed for every IPv4 range that is not globally routable. */
function isBlockedIpv4(ip: string) {
  const octets = parseIpv4(ip);
  if (!octets) return true;
  const [a, b, c] = octets;
  return (
    a === 0 // Current network / unspecified.
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127) // Carrier-grade NAT.
    || (a === 169 && b === 254) // Link-local and cloud metadata.
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0) // IETF protocol assignments.
    || (a === 192 && b === 0 && c === 2) // TEST-NET-1.
    || (a === 192 && b === 88 && c === 99) // Deprecated 6to4 relay anycast.
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19)) // Benchmarking.
    || (a === 198 && b === 51 && c === 100) // TEST-NET-2.
    || (a === 203 && b === 0 && c === 113) // TEST-NET-3.
    || a >= 224 // Multicast, reserved, and limited broadcast.
  );
}

function expandIpv6(ip: string) {
  const normalized = ip.toLowerCase().split('%')[0];
  const doubleColon = normalized.indexOf('::');
  if (doubleColon !== normalized.lastIndexOf('::')) return null;

  const convertPart = (part: string) => {
    if (!part.includes('.')) return [part];
    const octets = parseIpv4(part);
    if (!octets) return null;
    return [
      ((octets[0] << 8) | octets[1]).toString(16),
      ((octets[2] << 8) | octets[3]).toString(16),
    ];
  };

  const expandSide = (side: string) => {
    if (!side) return [] as string[];
    const result: string[] = [];
    for (const part of side.split(':')) {
      const converted = convertPart(part);
      if (!converted) return null;
      result.push(...converted);
    }
    return result;
  };

  const left = expandSide(doubleColon >= 0 ? normalized.slice(0, doubleColon) : normalized);
  const right = expandSide(doubleColon >= 0 ? normalized.slice(doubleColon + 2) : '');
  if (!left || !right) return null;
  const missing = 8 - left.length - right.length;
  if ((doubleColon < 0 && missing !== 0) || (doubleColon >= 0 && missing < 1)) return null;

  const groups = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map(group => Number.parseInt(group, 16));
}

/** Allow only globally routable IPv6 unicast, excluding special-use subranges. */
function isBlockedIpv6(ip: string) {
  const groups = expandIpv6(ip);
  if (!groups) return true;
  const [first, second] = groups;

  // The currently allocated global-unicast space is 2000::/3.
  if (first < 0x2000 || first > 0x3fff) return true;

  return (
    (first === 0x2001 && second <= 0x01ff) // IETF protocol/special-use assignments.
    || (first === 0x2001 && second === 0x0db8) // Documentation.
    || first === 0x2002 // 6to4 can encapsulate private IPv4 destinations.
    || (first === 0x3fff && second < 0x1000) // Documentation prefix 3fff::/20.
  );
}

function isBlockedIpAddress(address: string) {
  const normalized = address.replace(/^\[|\]$/g, '').split('%')[0];
  const family = isIP(normalized);
  if (family === 4) return isBlockedIpv4(normalized);
  if (family === 6) return isBlockedIpv6(normalized);
  return true;
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  return host === 'localhost'
    || host === 'metadata'
    || host === 'metadata.google.internal'
    || host === 'instance-data'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host.endsWith('.home.arpa');
}

function parsePublicInput(value: unknown): { ok: true; url: URL } | { ok: false; code: 'INVALID_URL' | 'BLOCKED_URL' } {
  if (typeof value !== 'string') return { ok: false, code: 'INVALID_URL' };
  const raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH || /[^\x00-\x7F]/.test(raw)) {
    return { ok: false, code: 'INVALID_URL' };
  }

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      return { ok: false, code: 'INVALID_URL' };
    }
    if (url.username || url.password || url.port || isBlockedHostname(url.hostname)) {
      return { ok: false, code: 'BLOCKED_URL' };
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const family = isIP(hostname);
    if (family > 0 && isBlockedIpAddress(hostname)) {
      return { ok: false, code: 'BLOCKED_URL' };
    }
    if (family === 0 && !hostname.includes('.')) {
      return { ok: false, code: 'INVALID_URL' };
    }

    url.hash = '';
    return { ok: true, url };
  } catch {
    return { ok: false, code: 'INVALID_URL' };
  }
}

export function normalizePublicImageInput(value: unknown) {
  const parsed = parsePublicInput(value);
  return parsed.ok ? parsed.url.toString() : null;
}

function isDirectImageUrl(url: URL) {
  return IMAGE_EXTENSION_PATTERN.test(url.pathname);
}

function extractMetaImage(html: string, baseUrl: string) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]*>/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const absolute = new URL(decodeHtmlAttribute(match[1]), baseUrl).toString();
      const normalized = normalizePublicImageInput(absolute);
      if (normalized) return normalized;
    } catch {
      // Try the next meta pattern.
    }
  }

  return null;
}

async function defaultLookup(hostname: string): Promise<ResolvedAddress[]> {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses
    .filter((entry): entry is { address: string; family: 4 | 6 } => entry.family === 4 || entry.family === 6)
    .map(entry => ({ address: entry.address, family: entry.family }));
}

function resolveWithDeadline(
  hostname: string,
  resolver: NonNullable<ImageResolverDependencies['lookup']>,
  signal: AbortSignal,
) {
  return new Promise<ResolvedAddress[]>((resolve, reject) => {
    if (signal.aborted) {
      reject(new ImageResolverFailure('FETCH_FAILED'));
      return;
    }
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(new ImageResolverFailure('FETCH_FAILED')));
    const timer = setTimeout(() => finish(() => reject(new ImageResolverFailure('FETCH_FAILED'))), DNS_TIMEOUT_MS);
    (timer as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
    signal.addEventListener('abort', onAbort, { once: true });

    resolver(hostname).then(
      addresses => finish(() => resolve(addresses)),
      () => finish(() => reject(new ImageResolverFailure('FETCH_FAILED'))),
    );
  });
}

async function resolveSafeAddresses(
  url: URL,
  resolver: NonNullable<ImageResolverDependencies['lookup']>,
  signal: AbortSignal,
) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedHostname(hostname)) throw new ImageResolverFailure('BLOCKED_URL');
  const family = isIP(hostname);
  if (family > 0) {
    if (isBlockedIpAddress(hostname)) throw new ImageResolverFailure('BLOCKED_URL');
    return [{ address: hostname, family: family as 4 | 6 }];
  }

  const addresses = await resolveWithDeadline(hostname, resolver, signal);
  if (addresses.length === 0) throw new ImageResolverFailure('FETCH_FAILED');
  if (addresses.some(entry => isBlockedIpAddress(entry.address))) {
    throw new ImageResolverFailure('BLOCKED_URL');
  }
  return addresses;
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function defaultRequest(url: URL, address: ResolvedAddress, signal: AbortSignal): Promise<RemoteResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    };
    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = transport(url, {
      method: 'GET',
      agent: false,
      signal,
      lookup: pinnedLookup,
      headers: {
        accept: 'text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.1',
        'accept-encoding': 'identity',
        'user-agent': 'THE-SFM-image-resolver/2.0',
      },
    }, response => {
      const status = response.statusCode ?? 0;
      const contentType = firstHeader(response.headers['content-type'])?.toLowerCase() ?? null;
      const location = firstHeader(response.headers.location);
      const complete = (body: string) => settle(() => resolve({ status, contentType, location, body }));

      if (REDIRECT_STATUSES.has(status) || contentType?.startsWith('image/')) {
        complete('');
        response.destroy();
        return;
      }

      const declaredLength = Number(firstHeader(response.headers['content-length']));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
        settle(() => reject(new ImageResolverFailure('FETCH_FAILED')));
        response.destroy();
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on('data', (chunk: Buffer | string) => {
        if (settled) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buffer.byteLength;
        if (total > MAX_HTML_BYTES) {
          settle(() => reject(new ImageResolverFailure('FETCH_FAILED')));
          response.destroy();
          return;
        }
        chunks.push(buffer);
      });
      response.on('end', () => {
        if (!settled) complete(Buffer.concat(chunks, total).toString('utf8'));
      });
      response.on('aborted', () => settle(() => reject(new ImageResolverFailure('FETCH_FAILED'))));
      response.on('error', () => settle(() => reject(new ImageResolverFailure('FETCH_FAILED'))));
    });

    request.on('error', () => settle(() => reject(new ImageResolverFailure('FETCH_FAILED'))));
    request.end();
  });
}

export async function resolvePublicImageUrl(
  value: unknown,
  dependencies: ImageResolverDependencies = {},
): Promise<ResolveImageResult> {
  const parsed = parsePublicInput(value);
  if (!parsed.ok) return { ok: false, code: parsed.code };

  // A direct image URL is returned to the browser and is never requested by this server.
  if (isDirectImageUrl(parsed.url)) return { ok: true, imageUrl: parsed.url.toString() };

  const resolver = dependencies.lookup ?? defaultLookup;
  const request = dependencies.request ?? defaultRequest;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);
  (timeout as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();

  try {
    let current = parsed.url;
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const addresses = await resolveSafeAddresses(current, resolver, controller.signal);
      const address = addresses.find(entry => entry.family === 4) ?? addresses[0];
      const response = await request(current, address, controller.signal);

      if (REDIRECT_STATUSES.has(response.status)) {
        if (!response.location || redirectCount === MAX_REDIRECTS) {
          throw new ImageResolverFailure('FETCH_FAILED');
        }
        let target: URL;
        try {
          target = new URL(response.location, current);
        } catch {
          throw new ImageResolverFailure('FETCH_FAILED');
        }
        const validatedTarget = parsePublicInput(target.toString());
        if (!validatedTarget.ok) throw new ImageResolverFailure(validatedTarget.code);
        current = validatedTarget.url;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        throw new ImageResolverFailure('FETCH_FAILED');
      }
      if (response.contentType?.startsWith('image/')) {
        return { ok: true, imageUrl: current.toString() };
      }
      if (response.contentType && !response.contentType.includes('text/html') && !response.contentType.includes('application/xhtml+xml')) {
        return { ok: false, code: 'NO_IMAGE_FOUND' };
      }

      const imageUrl = extractMetaImage(response.body, current.toString());
      if (!imageUrl) return { ok: false, code: 'NO_IMAGE_FOUND' };
      return { ok: true, imageUrl };
    }
    return { ok: false, code: 'FETCH_FAILED' };
  } catch (error) {
    if (error instanceof ImageResolverFailure) return { ok: false, code: error.code };
    return { ok: false, code: 'FETCH_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}
