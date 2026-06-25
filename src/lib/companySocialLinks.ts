export type CompanySocialPlatform = 'instagram' | 'linkedin' | 'twitter';

const IMAGE_FILE_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const STORAGE_PATH_PATTERN = /(?:^|[\/\\])(?:storage|object|objects|bucket|uploads?|company-logos?|logos?|covers?|images?)(?:[\/\\]|$)/i;

const PLATFORM_HOSTS: Record<CompanySocialPlatform, string[]> = {
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  twitter: ['x.com', 'twitter.com'],
};

function cleanInput(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stripAt(value: string) {
  return value.replace(/^@+/, '').trim();
}

function hostMatches(hostname: string, platform: CompanySocialPlatform) {
  const host = hostname.toLowerCase().replace(/^www\./, '').replace(/^mobile\./, '');
  return PLATFORM_HOSTS[platform].some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

function parseUrlLike(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`);
  } catch {
    return null;
  }
}

export function isLikelyUploadedAssetReference(value: unknown) {
  const raw = cleanInput(value);
  if (!raw) return false;

  const withoutHandlePrefix = stripAt(raw);
  if (IMAGE_FILE_PATTERN.test(withoutHandlePrefix)) return true;
  if (STORAGE_PATH_PATTERN.test(withoutHandlePrefix)) return true;
  if (/^(?:logo|cover|image|avatar)-[\w.-]+$/i.test(withoutHandlePrefix)) return true;

  const url = parseUrlLike(raw);
  if (!url) return false;
  const candidate = `${url.pathname}${url.search}`;
  return IMAGE_FILE_PATTERN.test(candidate) || STORAGE_PATH_PATTERN.test(url.pathname);
}

function socialHandlePattern(platform: CompanySocialPlatform) {
  if (platform === 'twitter') return /^[A-Za-z0-9_]{1,15}$/;
  if (platform === 'instagram') return /^[A-Za-z0-9._]{1,30}$/;
  return /^[A-Za-z0-9._-]{2,100}$/;
}

function normalizeHandle(value: string, platform: CompanySocialPlatform) {
  const handle = stripAt(value).replace(/^\/+/, '').replace(/\/+$/, '').trim();
  if (!handle || handle.includes('/') || handle.includes('\\') || /\s/.test(handle)) return null;
  if (isLikelyUploadedAssetReference(handle)) return null;
  return socialHandlePattern(platform).test(handle) ? handle : null;
}

function handleFromSocialUrl(url: URL, platform: CompanySocialPlatform) {
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (!hostMatches(url.hostname, platform)) return null;

  const parts = url.pathname.split('/').map(part => part.trim()).filter(Boolean);
  if (platform === 'linkedin') {
    const companyIndex = parts.findIndex(part => part.toLowerCase() === 'company');
    const candidate = companyIndex >= 0 ? parts[companyIndex + 1] : parts[parts.length - 1];
    return candidate ? normalizeHandle(candidate, platform) : null;
  }

  const candidate = parts[0];
  return candidate ? normalizeHandle(candidate, platform) : null;
}

export function normalizeCompanySocialUrl(value: unknown, platform: CompanySocialPlatform) {
  const raw = cleanInput(value);
  if (!raw || isLikelyUploadedAssetReference(raw)) return null;

  const url = parseUrlLike(raw);
  const looksLikeUrl = /^https?:\/\//i.test(raw) || /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:[/:?#]|$)/.test(stripAt(raw));

  if (url && looksLikeUrl) {
    const handle = handleFromSocialUrl(url, platform);
    if (!handle) return null;
    if (platform === 'linkedin') return `https://www.linkedin.com/company/${handle}`;
    if (platform === 'instagram') return `https://www.instagram.com/${handle}`;
    return `https://x.com/${handle}`;
  }

  const handle = normalizeHandle(raw, platform);
  if (!handle) return null;
  if (platform === 'linkedin') return `https://www.linkedin.com/company/${handle}`;
  if (platform === 'instagram') return `https://www.instagram.com/${handle}`;
  return `https://x.com/${handle}`;
}

export function isValidCompanySocialInput(value: unknown, platform: CompanySocialPlatform) {
  const raw = cleanInput(value);
  return !raw || normalizeCompanySocialUrl(raw, platform) !== null;
}

export function formatCompanySocialHandle(value: unknown, platform: CompanySocialPlatform) {
  const url = normalizeCompanySocialUrl(value, platform);
  if (!url) return '';

  const parsed = parseUrlLike(url);
  if (!parsed) return '';
  const handle = handleFromSocialUrl(parsed, platform);
  return handle ? `@${handle}` : '';
}
