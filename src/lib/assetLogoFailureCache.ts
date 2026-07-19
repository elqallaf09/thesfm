const STORAGE_KEY = 'sfm_asset_logo_failures_v1';
const MAX_CACHED_FAILURES = 128;

export const ASSET_LOGO_FAILURE_TTL_MS = 15 * 60 * 1000;

const failedLogoExpirations = new Map<string, number>();
let storageHydrated = false;

function normalizedUrl(url: string | null | undefined) {
  return typeof url === 'string' ? url.trim() : '';
}

function hydrateFromSessionStorage() {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const entry of parsed) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [url, expiresAt] = entry;
      if (typeof url === 'string' && Number.isFinite(expiresAt)) {
        failedLogoExpirations.set(url, Number(expiresAt));
      }
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browsers. The in-memory
    // cache still prevents retries for the lifetime of the current page.
  }
}

function persistToSessionStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...failedLogoExpirations]));
  } catch {
    // Keep logo rendering usable when sessionStorage is blocked or full.
  }
}

function removeExpiredFailures(now: number) {
  let changed = false;
  for (const [url, expiresAt] of failedLogoExpirations) {
    if (expiresAt > now) continue;
    failedLogoExpirations.delete(url);
    changed = true;
  }
  return changed;
}

export function isAssetLogoFailureCached(url: string | null | undefined, now = Date.now()) {
  const key = normalizedUrl(url);
  if (!key) return false;
  hydrateFromSessionStorage();
  const changed = removeExpiredFailures(now);
  if (changed) persistToSessionStorage();
  return (failedLogoExpirations.get(key) ?? 0) > now;
}

export function cacheAssetLogoFailure(url: string | null | undefined, now = Date.now()) {
  const key = normalizedUrl(url);
  if (!key) return;
  hydrateFromSessionStorage();
  removeExpiredFailures(now);
  failedLogoExpirations.delete(key);
  failedLogoExpirations.set(key, now + ASSET_LOGO_FAILURE_TTL_MS);
  while (failedLogoExpirations.size > MAX_CACHED_FAILURES) {
    const oldest = failedLogoExpirations.keys().next().value as string | undefined;
    if (!oldest) break;
    failedLogoExpirations.delete(oldest);
  }
  persistToSessionStorage();
}

export function resetAssetLogoFailureCache() {
  failedLogoExpirations.clear();
  storageHydrated = false;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Test and recovery helper; an unavailable store is already effectively empty.
  }
}
