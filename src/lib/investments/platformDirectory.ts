import {
  INVESTMENT_PLATFORM_TYPES,
  type InvestmentPlatformDirectoryItem,
  type InvestmentPlatformStatus,
  type InvestmentPlatformType,
} from '@/types/investmentPlatform';

const PLATFORM_TYPE_SET = new Set<string>(INVESTMENT_PLATFORM_TYPES);
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid']);

export type PlatformValidationCode =
  | 'PLATFORM_NAME_REQUIRED'
  | 'PLATFORM_NAME_TOO_LONG'
  | 'PLATFORM_NAME_INVALID'
  | 'PLATFORM_TYPE_INVALID'
  | 'PLATFORM_WEBSITE_INVALID';

export class PlatformValidationError extends Error {
  constructor(public readonly code: PlatformValidationCode) {
    super(code);
  }
}

export function normalizePlatformName(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/[.,!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function cleanPlatformName(value: unknown) {
  if (typeof value !== 'string') throw new PlatformValidationError('PLATFORM_NAME_REQUIRED');
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (name.length < 2) throw new PlatformValidationError('PLATFORM_NAME_REQUIRED');
  if (name.length > 80) throw new PlatformValidationError('PLATFORM_NAME_TOO_LONG');
  if (
    /[<>]|&(?:lt|gt|#\d+);|\b(?:script|javascript|data:text\/html)\b/i.test(name)
    || /[\u0000-\u001f\u007f]/.test(name)
    || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)
    || /^\+?[\d\s().-]{7,}$/.test(name)
    || /\b(?:iban|account|acct|wallet)\s*[:#-]?\s*[a-z0-9-]{5,}\b/i.test(name)
    || ((name.match(/\d/g) ?? []).length > Math.max(6, Math.floor(name.length / 2)))
  ) {
    throw new PlatformValidationError('PLATFORM_NAME_INVALID');
  }
  return name;
}

export function cleanPlatformType(value: unknown): InvestmentPlatformType {
  if (typeof value !== 'string' || !PLATFORM_TYPE_SET.has(value)) {
    throw new PlatformValidationError('PLATFORM_TYPE_INVALID');
  }
  return value as InvestmentPlatformType;
}

export function cleanPlatformWebsite(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 300) {
    throw new PlatformValidationError('PLATFORM_WEBSITE_INVALID');
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new PlatformValidationError('PLATFORM_WEBSITE_INVALID');
    }
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString().slice(0, 300);
  } catch (error) {
    if (error instanceof PlatformValidationError) throw error;
    throw new PlatformValidationError('PLATFORM_WEBSITE_INVALID');
  }
}

export function platformSlug(name: string) {
  const ascii = normalizePlatformName(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (ascii.length >= 2) return ascii;
  let hash = 2166136261;
  for (const character of name) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `platform-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizePlatformAliases(value: unknown) {
  if (!Array.isArray(value)) return [];
  const aliases = value
    .slice(0, 30)
    .map(alias => cleanPlatformName(alias))
    .filter((alias, index, all) => all.findIndex(candidate => normalizePlatformName(candidate) === normalizePlatformName(alias)) === index);
  return aliases;
}

export function platformRowToDirectoryItem(row: Record<string, unknown>): InvestmentPlatformDirectoryItem {
  return {
    id: String(row.id),
    canonicalName: String(row.canonical_name),
    normalizedName: String(row.normalized_name),
    slug: String(row.slug),
    platformType: cleanPlatformType(row.platform_type),
    websiteUrl: typeof row.website_url === 'string' ? row.website_url : null,
    logoUrl: typeof row.logo_url === 'string' ? row.logo_url : null,
    countryCode: typeof row.country_code === 'string' ? row.country_code : null,
    aliases: Array.isArray(row.aliases) ? row.aliases.filter((value): value is string => typeof value === 'string') : [],
    status: (['approved', 'pending', 'rejected', 'disabled'].includes(String(row.status)) ? row.status : 'pending') as InvestmentPlatformStatus,
    isSeeded: row.is_seeded === true,
  };
}

export function isPotentialPlatformDuplicate(left: string, right: string) {
  const a = normalizePlatformName(left);
  const b = normalizePlatformName(right);
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  return a.startsWith(b) || b.startsWith(a);
}
