const INTERNAL_ORIGIN = 'https://the-sfm.invalid';

export const DEFAULT_AUTH_DESTINATION = '/dashboard';

function internalUrl(value: string | null | undefined): URL | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;

  const pathEnd = [value.indexOf('?'), value.indexOf('#')]
    .filter(index => index >= 0)
    .reduce((end, index) => Math.min(end, index), value.length);
  let pathname = value.slice(0, pathEnd);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.startsWith('/\\') || pathname.includes('\\')) {
      return null;
    }
    if (!pathname.includes('%')) break;
    try {
      const decoded = decodeURIComponent(pathname);
      if (decoded === pathname) break;
      pathname = decoded;
    } catch {
      return null;
    }
    if (attempt === 3) return null;
  }

  try {
    const target = new URL(value, INTERNAL_ORIGIN);
    return target.origin === INTERNAL_ORIGIN && target.pathname.startsWith('/') ? target : null;
  } catch {
    return null;
  }
}

/**
 * Resolves only same-origin relative destinations. Callers should use this
 * before placing a user-controlled value in a Location header or client-side
 * navigation API.
 */
export function resolveInternalDestination(value: string | null | undefined): string | null {
  const target = internalUrl(value);
  return target ? `${target.pathname}${target.search}${target.hash}` : null;
}

export function safeInternalDestination(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION,
): string {
  return resolveInternalDestination(value) ?? fallback;
}

export function internalDestinationPathname(value: string | null | undefined): string | null {
  return internalUrl(value)?.pathname ?? null;
}

export function applyInternalDestination(url: URL, value: string | null | undefined): boolean {
  const target = internalUrl(value);
  if (!target) return false;
  url.pathname = target.pathname;
  url.search = target.search;
  url.hash = target.hash;
  return true;
}

export function requestDestination(pathname: string, search = ''): string {
  return safeInternalDestination(`${pathname}${search}`);
}

function safeInheritedHash(hash: string | null | undefined): string {
  if (!hash || hash === '#') return '';
  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  const fragment = normalized.slice(1);
  let decoded = fragment;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    return '';
  }

  // OAuth and recovery callbacks can place credentials in the fragment. They
  // must stay on the auth page and never become part of an application route.
  if (/(^|[&?])(access_token|refresh_token|id_token|token_type|expires_in|provider_token|provider_refresh_token|code|error|error_code|error_description|type|state)=/i.test(fragment)
    || /(^|[&?])(access_token|refresh_token|id_token|token_type|expires_in|provider_token|provider_refresh_token|code|error|error_code|error_description|type|state)=/i.test(decoded)) {
    return '';
  }

  return normalized;
}

/**
 * Browsers retain a fragment across a redirect whose Location does not set
 * one. Merge that benign inherited fragment with a validated destination
 * without overwriting an explicit destination fragment.
 */
export function mergeClientHash(
  destination: string | null | undefined,
  hash: string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION,
): string {
  const resolved = resolveInternalDestination(destination);
  if (!resolved) return fallback;
  const target = internalUrl(resolved);
  if (!target || target.hash) return resolved;
  const inheritedHash = safeInheritedHash(hash);
  if (!inheritedHash) return resolved;
  return safeInternalDestination(`${resolved}${inheritedHash}`, fallback);
}

export function currentInternalDestination(fallback = DEFAULT_AUTH_DESTINATION): string {
  if (typeof window === 'undefined') return fallback;
  return mergeClientHash(`${window.location.pathname}${window.location.search}`, window.location.hash, fallback);
}

export function loginHrefForDestination(
  destination: string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION,
): string {
  return `/login?next=${encodeURIComponent(safeInternalDestination(destination, fallback))}`;
}

export function loginHrefForCurrentLocation(fallback = DEFAULT_AUTH_DESTINATION): string {
  return loginHrefForDestination(currentInternalDestination(fallback), fallback);
}
