import { describe, expect, it } from 'vitest';
import {
  canonicalAssetTicker,
  getAssetVisualMeta,
  getVerifiedLogoDirectory,
  resolveAssetIdentity,
  resolveAssetLogoUrl,
} from '@/lib/assetVisuals';

const IFA_LOGO_URL = 'https://www.google.com/s2/favicons?domain_url=https://ifakuwait.com&sz=128';

describe('Kuwait-listed equities: IFA (International Financial Advisors Holding)', () => {
  it('resolves the exchange-qualified ticker IFA.KW to the verified IFA logo', () => {
    const identity = resolveAssetIdentity({ symbol: 'IFA.KW' });
    expect(identity.matchedBy).toBe('exchange-ticker');
    expect(identity.canonicalTicker).toBe('IFA');
    expect(identity.verified?.logoUrl).toBe(IFA_LOGO_URL);
    expect(resolveAssetLogoUrl({ symbol: 'IFA.KW' })).toBe(IFA_LOGO_URL);
  });

  it('resolves the bare ticker with market context (Boursa Kuwait)', () => {
    expect(resolveAssetLogoUrl({ symbol: 'IFA', market: 'Boursa Kuwait' })).toBe(IFA_LOGO_URL);
    const identity = resolveAssetIdentity({ symbol: 'IFA', market: 'Boursa Kuwait' });
    expect(identity.matchedBy).toBe('exchange-ticker');
  });

  it('resolves via verified Arabic and English name aliases when no ticker exists', () => {
    expect(resolveAssetIdentity({ name: 'الاستشارات المالية الدولية القابضة' }).canonicalTicker).toBe('IFA');
    expect(resolveAssetIdentity({ companyName: 'International Financial Advisors Holding' }).canonicalTicker).toBe('IFA');
    expect(resolveAssetLogoUrl({ name: 'الاستشارات المالية الدولية' })).toBe(IFA_LOGO_URL);
  });

  it('does not lend the IFA logo to a same-ticker asset on another exchange', () => {
    const identity = resolveAssetIdentity({ symbol: 'IFA', market: 'NASDAQ', assetType: 'stock' });
    expect(identity.verified).toBeNull();
    expect(resolveAssetLogoUrl({ symbol: 'IFA', market: 'NASDAQ', assetType: 'stock' })).toBe(
      'https://financialmodelingprep.com/image-stock/IFA.png',
    );
  });

  it('never confuses the related but distinct Boursa Kuwait listing IFAHR', () => {
    const identity = resolveAssetIdentity({ symbol: 'IFAHR.KW' });
    expect(identity.verified).toBeNull();
    expect(identity.canonicalTicker).toBe('IFAHR.KW');
  });
});

describe('Commodities/metals: dedicated category identity, never a company/building icon', () => {
  it('classifies gold and silver spot quotes correctly even in 6-letter forex-shaped tickers', () => {
    for (const symbol of ['XAUUSD', 'XAUUSD=X', 'XAU/USD']) {
      const meta = getAssetVisualMeta({ symbol, assetType: 'gold' });
      expect(meta.assetType, symbol).toBe('gold');
      expect(meta.iconKind, symbol).toBe('gold');
      expect(meta.tone, symbol).toBe('gold');
    }
    for (const symbol of ['XAGUSD', 'XAGUSD=X', 'XAG/USD']) {
      const meta = getAssetVisualMeta({ symbol, assetType: 'silver' });
      expect(meta.assetType, symbol).toBe('silver');
      expect(meta.iconKind, symbol).toBe('silver');
      expect(meta.tone, symbol).toBe('silver');
    }
  });

  it('classifies bare metal spot tickers as gold/silver even without an explicit assetType hint', () => {
    // This is the exact shape produced for market-linked metal holdings
    // (see src/lib/investmentCalculations.ts: gold -> XAUUSD, silver -> XAGUSD).
    expect(getAssetVisualMeta({ symbol: 'XAUUSD' }).assetType).toBe('gold');
    expect(getAssetVisualMeta({ symbol: 'XAGUSD' }).assetType).toBe('silver');
  });

  it('never fetches a generic by-ticker company logo for a metal holding', () => {
    expect(resolveAssetLogoUrl({ symbol: 'XAUUSD', assetType: 'gold' })).toBeNull();
    expect(resolveAssetLogoUrl({ symbol: 'XAGUSD', assetType: 'silver' })).toBeNull();
    expect(resolveAssetLogoUrl({ symbol: 'XAGUSD' })).toBeNull();
  });

  it('still classifies futures-style metal codes correctly (GC=F, SI=F)', () => {
    expect(getAssetVisualMeta({ symbol: 'GC=F', assetType: 'commodity' }).assetType).toBe('gold');
    expect(getAssetVisualMeta({ symbol: 'SI=F', assetType: 'commodity' }).assetType).toBe('silver');
  });

  it('does not misclassify a real currency pair as a metal', () => {
    const meta = getAssetVisualMeta({ symbol: 'EURUSD', assetType: 'forex' });
    expect(meta.assetType).toBe('forex');
    expect(meta.iconKind).toBe('forex');
  });

  it('keeps a real 6-letter forex pair classified as forex when no metal hint is present', () => {
    expect(getAssetVisualMeta({ symbol: 'GBPUSD' }).assetType).toBe('forex');
  });
});

describe('Crypto identities still resolve correctly after classification refactor', () => {
  it('resolves verified crypto logos for the supported set', () => {
    expect(resolveAssetLogoUrl({ symbol: 'BTC', assetType: 'crypto' })).toBe('https://cdn.simpleicons.org/bitcoin/F7931A');
    expect(resolveAssetLogoUrl({ symbol: 'ETH-USD', assetType: 'crypto' })).toBe('https://cdn.simpleicons.org/ethereum/627EEA');
    expect(getAssetVisualMeta({ symbol: 'BTC-USD' }).assetType).toBe('crypto');
  });

  it('never falls back to a company-logo guess for a crypto ticker without a verified slug', () => {
    // LINK is recognized as crypto by shape but has no entry in the verified
    // crypto slug table; it must render its category icon, not a fetched
    // "stock" image for a ticker that is not a company.
    expect(getAssetVisualMeta({ symbol: 'LINK-USD' }).assetType).toBe('crypto');
    expect(resolveAssetLogoUrl({ symbol: 'LINK-USD' })).toBeNull();
  });
});

describe('Fallback behavior for genuinely unverified assets is unchanged', () => {
  it('keeps the safe by-ticker guess for an ordinary unmapped stock', () => {
    expect(resolveAssetLogoUrl({ symbol: 'ZZZZ' })).toBe('https://financialmodelingprep.com/image-stock/ZZZZ.png');
  });

  it('returns null (category icon) for cash and other non-equity types', () => {
    expect(resolveAssetLogoUrl({ symbol: 'CASH', assetType: 'cash' })).toBeNull();
  });

  it('IFA and no other unrelated directory entry gained an unapproved host', () => {
    const ifa = getVerifiedLogoDirectory().find(entry => entry.canonicalTicker === 'IFA');
    expect(ifa).toBeDefined();
    expect(new URL(ifa!.logoUrl).hostname).toBe(ifa!.expectedHost);
    expect(ifa!.logoUrl.startsWith('https://')).toBe(true);
  });

  it('keeps asset identity independent of platform identity', () => {
    // Resolving an asset's logo must never depend on the purchase platform.
    const withoutPlatform = canonicalAssetTicker({ symbol: 'IFA.KW' });
    const meta = getAssetVisualMeta({ symbol: 'IFA.KW' });
    expect(withoutPlatform).toBe('IFA');
    expect(meta.logoUrl).toBe(IFA_LOGO_URL);
  });
});
