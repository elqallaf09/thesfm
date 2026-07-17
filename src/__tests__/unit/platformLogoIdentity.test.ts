import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPROVED_PLATFORM_LOGO_HOSTS,
  getVerifiedPlatformDirectory,
  normalizePlatformNameKey,
  platformCategoryFor,
  resolvePlatformIdentity,
  resolvePlatformLogoUrl,
} from '@/lib/platformVisuals';
import { INVESTMENT_PLATFORM_TYPES, type InvestmentPlatformType } from '@/types/investmentPlatform';

const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=64`;

const projectRoot = process.cwd();
const platformAvatarSource = readFileSync(join(projectRoot, 'src/components/invest/PlatformAvatar.tsx'), 'utf8');
const adminClientSource = readFileSync(join(projectRoot, 'src/app/sfm-admin-control/investment-platforms/InvestmentPlatformsAdminClient.tsx'), 'utf8');
const selectorSource = readFileSync(join(projectRoot, 'src/components/invest/InvestmentPlatformSelector.tsx'), 'utf8');

describe('Verified platform directory is an approved, self-consistent source', () => {
  it('only points at approved hosts matching each entry’s expected host', () => {
    for (const entry of getVerifiedPlatformDirectory()) {
      const host = new URL(entry.logoUrl).hostname;
      expect(host, entry.slug).toBe(entry.expectedHost);
      expect(APPROVED_PLATFORM_LOGO_HOSTS.has(entry.expectedHost), entry.expectedHost).toBe(true);
      expect(entry.logoUrl.startsWith('https://')).toBe(true);
    }
  });

  it('keeps slugs unique', () => {
    const slugs = getVerifiedPlatformDirectory().map(entry => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('Known platforms resolve to their verified logo by name', () => {
  const cases: Array<[string, string]> = [
    ['Trading 212', favicon('trading212.com')],
    ['Swissquote', favicon('swissquote.com')],
    ['Charles Schwab', favicon('schwab.com')],
    ['Fidelity', favicon('fidelity.com')],
    ['DEGIRO', favicon('degiro.com')],
    ['Interactive Brokers', favicon('interactivebrokers.com')],
    ['eToro', favicon('etoro.com')],
    ['Saxo Bank', favicon('home.saxo')],
    ['XTB', favicon('xtb.com')],
    ['Kraken', favicon('kraken.com')],
    ['Robinhood', 'https://cdn.simpleicons.org/robinhood'],
    ['Binance', 'https://cdn.simpleicons.org/binance'],
    ['Coinbase', 'https://cdn.simpleicons.org/coinbase'],
    ['ZAD', favicon('joinzad.com')],
  ];

  for (const [name, expected] of cases) {
    it(`${name} → verified logo`, () => {
      expect(resolvePlatformLogoUrl({ name })).toBe(expected);
    });
  }

  it('resolves ZAD across identifier variants (matching the holding-badge contract)', () => {
    for (const variant of ['zad', 'ZAD', ' Zad ', 'زاد', 'Zad Fintech', 'zad investments', 'JoinZad']) {
      expect(resolvePlatformLogoUrl({ name: variant }), variant).toBe(favicon('joinzad.com'));
    }
  });
});

describe('Resolution priority', () => {
  it('uses the internal id/slug ahead of an unrelated display name', () => {
    const identity = resolvePlatformIdentity({ slug: 'binance', name: 'Totally Different Name' });
    expect(identity.matchedBy).toBe('id');
    expect(identity.logoUrl).toBe('https://cdn.simpleicons.org/binance');
  });

  it('lets a verified website domain win over an ambiguous name', () => {
    const identity = resolvePlatformIdentity({ name: 'My Broker', websiteUrl: 'https://www.trading212.com/en' });
    expect(identity.matchedBy).toBe('website');
    expect(identity.logoUrl).toBe(favicon('trading212.com'));
  });

  it('derives a favicon from any official website when the domain is not pre-listed', () => {
    const identity = resolvePlatformIdentity({ name: 'Independent Desk', websiteUrl: 'https://desk.example.co' });
    expect(identity.matchedBy).toBe('website');
    expect(identity.logoUrl).toBe(favicon('desk.example.co'));
  });

  it('resolves a verified alias supplied on the record', () => {
    const identity = resolvePlatformIdentity({ aliases: ['unknown', 'zad'] });
    expect(identity.matchedBy).toBe('alias');
    expect(identity.logoUrl).toBe(favicon('joinzad.com'));
  });

  it('honors an explicit logo only from approved hosts', () => {
    // Unsafe/unapproved explicit logo is ignored; falls through to the slug.
    expect(resolvePlatformIdentity({ logoUrl: 'https://evil.example/logo.png', slug: 'binance' }))
      .toMatchObject({ matchedBy: 'id', logoUrl: 'https://cdn.simpleicons.org/binance' });
    expect(resolvePlatformLogoUrl({ logoUrl: 'javascript:alert(1)', name: 'Swissquote' })).toBe(favicon('swissquote.com'));
    // An approved-host explicit logo is used directly.
    expect(resolvePlatformIdentity({ logoUrl: 'https://cdn.simpleicons.org/fidelity', name: 'Swissquote' }))
      .toMatchObject({ matchedBy: 'explicit', logoUrl: 'https://cdn.simpleicons.org/fidelity' });
  });
});

describe('Unknown platforms fall back to a semantic category icon (never a fabricated logo)', () => {
  it('returns null logo and a category for an unknown platform', () => {
    const identity = resolvePlatformIdentity({ name: 'Totally Unknown Brokerage XYZ', platformType: 'stock_broker' });
    expect(identity.logoUrl).toBeNull();
    expect(identity.matchedBy).toBeNull();
    expect(identity.category).toBe('broker');
  });

  it('never fabricates a logo for generic seeded rows', () => {
    for (const slug of ['other-broker', 'local-bank-brokerage', 'other-cryptocurrency-exchange', 'other-platform-or-provider', 'local-investment-company']) {
      expect(resolvePlatformLogoUrl({ slug, name: slug.replace(/-/g, ' ') }), slug).toBeNull();
    }
  });

  it('maps every platform type to a category', () => {
    const expected: Record<InvestmentPlatformType, string> = {
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
    for (const type of INVESTMENT_PLATFORM_TYPES) {
      expect(platformCategoryFor(type), type).toBe(expected[type]);
    }
    expect(platformCategoryFor(null)).toBe('other');
  });

  it('normalizes names to a stable key', () => {
    expect(normalizePlatformNameKey('  ZAD  ')).toBe('zad');
    expect(normalizePlatformNameKey('Swissquote   Bank')).toBe('swissquote bank');
  });
});

describe('PlatformAvatar renders exactly one visual and is distinct from the asset avatar', () => {
  it('renders a single image with a safe category-icon fallback', () => {
    expect((platformAvatarSource.match(/<img\b/g) ?? []).length).toBe(1);
    expect(platformAvatarSource).toContain('onError={() => setImageFailed(true)}');
    expect(platformAvatarSource).toContain('onLoad={() => setImageLoaded(true)}');
    expect(platformAvatarSource).toContain('const showImage = Boolean(identity.logoUrl && !imageFailed);');
    expect(platformAvatarSource).toContain('{(!showImage || !imageLoaded) && (');
    expect(platformAvatarSource).toContain('resolvePlatformIdentity');
  });

  it('uses the platform resolver, never the asset resolver', () => {
    expect(platformAvatarSource).toContain("from '@/lib/platformVisuals'");
    // Must not import or render the asset identity system (strict separation).
    expect(platformAvatarSource).not.toMatch(/from '@\/lib\/assetVisuals'/);
    expect(platformAvatarSource).not.toMatch(/<AssetAvatar\b/);
  });

  it('is used in place of the generic building icon in the directory and selector rows', () => {
    expect(adminClientSource).toContain('<PlatformAvatar');
    expect(adminClientSource).not.toMatch(/<Building2\b/);
    expect(selectorSource).toContain('<PlatformAvatar');
    // the selector keeps Building2 only for the non-row section heading
    expect((selectorSource.match(/<Building2\b/g) ?? []).length).toBe(1);
  });
});
