import type { InvestmentPlatformType } from '@/types/investmentPlatform';

/**
 * Shared identity/logo resolution for investment PLATFORMS (brokers, banks,
 * exchanges, fund managers, …). This is deliberately separate from the ASSET
 * logo resolver (src/lib/assetVisuals.ts): a platform's identity is never the
 * asset's, and vice-versa. Verified logos come only from approved hosts; when
 * none is available the caller renders a semantic category icon (never a
 * broken image or empty circle).
 */

export type PlatformLogoCategory =
  | 'broker'
  | 'bank'
  | 'trading'
  | 'crypto'
  | 'fund'
  | 'metals'
  | 'real-estate'
  | 'insurance'
  | 'other';

export type PlatformVisualInput = {
  /** Stable internal id (UUID) — optional; slug is the stable human key. */
  id?: string | null;
  /** Stable canonical slug (e.g. "trading-212"). */
  slug?: string | null;
  name?: string | null;
  aliases?: (string | null | undefined)[] | null;
  /** Verified official website, when the directory has one. */
  websiteUrl?: string | null;
  /** Explicit logo URL from moderation — honored only from approved hosts. */
  logoUrl?: string | null;
  platformType?: InvestmentPlatformType | null;
};

export type PlatformLogoMatch = 'explicit' | 'id' | 'website' | 'name' | 'alias' | null;

export type PlatformIdentity = {
  logoUrl: string | null;
  matchedBy: PlatformLogoMatch;
  category: PlatformLogoCategory;
};

/** Hosts permitted to serve a verified platform logo. */
export const APPROVED_PLATFORM_LOGO_HOSTS: ReadonlySet<string> = new Set([
  'cdn.simpleicons.org',
  'www.google.com', // Google favicon service (domain_url points at the verified site)
]);

/** Verified logo built from an approved corporate domain via the favicon service. */
function faviconLogo(domain: string): string {
  return `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=64`;
}

export type VerifiedPlatform = {
  /** Stable canonical slug key. */
  slug: string;
  /** Verified corporate domain (also matched against a provided websiteUrl). */
  domain: string;
  logoUrl: string;
  expectedHost: string;
  /** Normalized alternate names that identify this platform. */
  nameAliases: string[];
};

// Only real, identifiable companies get a verified logo. Generic seeded rows
// ("Local bank brokerage", "Other broker", …) intentionally have NO entry and
// fall through to a semantic category icon — never a fabricated logo.
const VERIFIED_PLATFORM_DIRECTORY: readonly VerifiedPlatform[] = [
  { slug: 'xtb', domain: 'xtb.com', logoUrl: faviconLogo('xtb.com'), expectedHost: 'www.google.com', nameAliases: ['xtb', 'x trade brokers'] },
  { slug: 'interactive-brokers', domain: 'interactivebrokers.com', logoUrl: faviconLogo('interactivebrokers.com'), expectedHost: 'www.google.com', nameAliases: ['interactive brokers', 'ibkr', 'interactive brokers llc'] },
  { slug: 'etoro', domain: 'etoro.com', logoUrl: faviconLogo('etoro.com'), expectedHost: 'www.google.com', nameAliases: ['etoro'] },
  { slug: 'trading-212', domain: 'trading212.com', logoUrl: faviconLogo('trading212.com'), expectedHost: 'www.google.com', nameAliases: ['trading 212', 'trading212'] },
  { slug: 'saxo', domain: 'home.saxo', logoUrl: faviconLogo('home.saxo'), expectedHost: 'www.google.com', nameAliases: ['saxo', 'saxo bank'] },
  { slug: 'swissquote', domain: 'swissquote.com', logoUrl: faviconLogo('swissquote.com'), expectedHost: 'www.google.com', nameAliases: ['swissquote', 'swissquote bank'] },
  { slug: 'charles-schwab', domain: 'schwab.com', logoUrl: faviconLogo('schwab.com'), expectedHost: 'www.google.com', nameAliases: ['charles schwab', 'schwab'] },
  { slug: 'fidelity', domain: 'fidelity.com', logoUrl: faviconLogo('fidelity.com'), expectedHost: 'www.google.com', nameAliases: ['fidelity', 'fidelity investments'] },
  { slug: 'degiro', domain: 'degiro.com', logoUrl: faviconLogo('degiro.com'), expectedHost: 'www.google.com', nameAliases: ['degiro'] },
  { slug: 'robinhood', domain: 'robinhood.com', logoUrl: 'https://cdn.simpleicons.org/robinhood', expectedHost: 'cdn.simpleicons.org', nameAliases: ['robinhood'] },
  { slug: 'binance', domain: 'binance.com', logoUrl: 'https://cdn.simpleicons.org/binance', expectedHost: 'cdn.simpleicons.org', nameAliases: ['binance'] },
  { slug: 'coinbase', domain: 'coinbase.com', logoUrl: 'https://cdn.simpleicons.org/coinbase', expectedHost: 'cdn.simpleicons.org', nameAliases: ['coinbase'] },
  { slug: 'kraken', domain: 'kraken.com', logoUrl: faviconLogo('kraken.com'), expectedHost: 'www.google.com', nameAliases: ['kraken'] },
  // Real institutions used as purchase/custody platforms in this app.
  { slug: 'zad', domain: 'joinzad.com', logoUrl: faviconLogo('joinzad.com'), expectedHost: 'www.google.com', nameAliases: ['zad', 'زاد', 'zad fintech', 'zad investment', 'zad investments', 'join zad', 'joinzad'] },
  { slug: 'kfh', domain: 'kfh.com', logoUrl: faviconLogo('kfh.com'), expectedHost: 'www.google.com', nameAliases: ['kfh', 'kuwait finance house', 'بيت التمويل الكويتي'] },
];

const PLATFORM_TYPE_CATEGORY: Record<InvestmentPlatformType, PlatformLogoCategory> = {
  stock_broker: 'broker',
  bank_brokerage: 'bank',
  multi_asset_broker: 'trading',
  crypto_exchange: 'crypto',
  fund_platform: 'fund',
  robo_advisor: 'fund',
  precious_metals_dealer: 'metals',
  real_estate_platform: 'real-estate',
  private_investment_provider: 'fund',
  other: 'other',
};

export function platformCategoryFor(platformType: InvestmentPlatformType | null | undefined): PlatformLogoCategory {
  return platformType ? PLATFORM_TYPE_CATEGORY[platformType] ?? 'other' : 'other';
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

/** Normalizes a platform name/alias to a stable lookup key. */
export function normalizePlatformNameKey(value: unknown): string {
  return cleanText(value).replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

// Lookup indexes built once.
const bySlug = new Map<string, VerifiedPlatform>();
const byName = new Map<string, VerifiedPlatform>();
for (const entry of VERIFIED_PLATFORM_DIRECTORY) {
  bySlug.set(entry.slug, entry);
  for (const alias of entry.nameAliases) byName.set(normalizePlatformNameKey(alias), entry);
}

function safeHttpsUrl(value: unknown): URL | null {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Registrable-ish host from a website URL (drops a leading "www."). */
function hostFromWebsite(websiteUrl: unknown): string | null {
  const url = safeHttpsUrl(websiteUrl);
  if (!url) return null;
  return url.hostname.replace(/^www\./i, '').toLowerCase();
}

/**
 * Resolves a platform's verified logo following a strict priority:
 * explicit approved logo → internal id/slug → verified website domain →
 * canonical name → verified alias → none. Returns null when no verified logo
 * exists (the caller then shows a semantic category icon).
 */
export function resolvePlatformIdentity(input: PlatformVisualInput): PlatformIdentity {
  const category = platformCategoryFor(input.platformType);
  const identity = (logoUrl: string | null, matchedBy: PlatformLogoMatch): PlatformIdentity =>
    ({ logoUrl, matchedBy, category });

  // 1. Explicit moderation-provided logo — only from approved hosts.
  const explicit = safeHttpsUrl(input.logoUrl);
  if (explicit && APPROVED_PLATFORM_LOGO_HOSTS.has(explicit.hostname)) {
    return identity(explicit.toString(), 'explicit');
  }

  // 2. Stable internal id / slug.
  const slug = cleanText(input.slug).toLowerCase();
  const bySlugEntry = slug ? bySlug.get(slug) : undefined;
  if (bySlugEntry) return identity(bySlugEntry.logoUrl, 'id');

  // 3. Verified website domain (wins over an ambiguous display name).
  const host = hostFromWebsite(input.websiteUrl);
  if (host) {
    const byDomain = VERIFIED_PLATFORM_DIRECTORY.find(entry => entry.domain === host || host.endsWith(`.${entry.domain}`) || entry.domain.endsWith(`.${host}`));
    if (byDomain) return identity(byDomain.logoUrl, 'website');
    // A provided official website is itself a verified-domain source.
    return identity(faviconLogo(host), 'website');
  }

  // 4. Canonical platform name.
  const nameKey = normalizePlatformNameKey(input.name);
  const byNameEntry = nameKey ? byName.get(nameKey) : undefined;
  if (byNameEntry) return identity(byNameEntry.logoUrl, 'name');

  // 5. Verified alias supplied on the record.
  for (const alias of input.aliases ?? []) {
    const aliasEntry = byName.get(normalizePlatformNameKey(alias));
    if (aliasEntry) return identity(aliasEntry.logoUrl, 'alias');
  }

  // 6. No verified logo — the component renders the category icon.
  return identity(null, null);
}

export function resolvePlatformLogoUrl(input: PlatformVisualInput): string | null {
  return resolvePlatformIdentity(input).logoUrl;
}

/** Read-only view of the verified platform directory (for auditing/tests). */
export function getVerifiedPlatformDirectory(): readonly VerifiedPlatform[] {
  return VERIFIED_PLATFORM_DIRECTORY;
}
