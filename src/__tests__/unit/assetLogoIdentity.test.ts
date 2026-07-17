import { describe, expect, it } from 'vitest';
import {
  APPROVED_LOGO_HOSTS,
  canonicalAssetTicker,
  getVerifiedLogoDirectory,
  normalizeIsin,
  normalizeTickerSymbol,
  resolveAssetIdentity,
  resolveAssetLogoUrl,
  type AssetVisualInput,
} from '@/lib/assetVisuals';

const TSMC_LOGO_URL = 'https://www.google.com/s2/favicons?domain_url=https://www.tsmc.com&sz=128';
const NVDA_LOGO_URL = 'https://cdn.simpleicons.org/nvidia';
const KFH_LOGO_URL = 'https://www.google.com/s2/favicons?domain_url=https://www.kfh.com&sz=128';

describe('Verified logo directory is an approved, self-consistent source', () => {
  it('only points at approved hosts and matches each entry’s declared expected host', () => {
    for (const entry of getVerifiedLogoDirectory()) {
      const host = new URL(entry.logoUrl).hostname;
      expect(host, entry.canonicalTicker).toBe(entry.expectedHost);
      expect(APPROVED_LOGO_HOSTS.has(entry.expectedHost), entry.expectedHost).toBe(true);
      expect(entry.logoUrl.startsWith('https://')).toBe(true);
    }
  });

  it('keeps canonical tickers unique so a bare ticker never resolves ambiguously', () => {
    const canonicals = getVerifiedLogoDirectory().map(entry => entry.canonicalTicker);
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });
});

describe('Identity resolution follows the required priority chain', () => {
  it('prefers ISIN over a conflicting ticker (ISIN outranks ticker)', () => {
    // Deliberately mismatched record: an NVDA ticker but the TSMC ISIN. Per the
    // required priority (ISIN > ticker), the verified ISIN identity wins.
    const identity = resolveAssetIdentity({ isin: 'US8740391003', symbol: 'NVDA' });
    expect(identity.matchedBy).toBe('isin');
    expect(identity.canonicalTicker).toBe('TSM');
    expect(resolveAssetLogoUrl({ isin: 'US8740391003' })).toBe(TSMC_LOGO_URL);
  });

  it('uses an exchange-qualified ticker match ahead of a bare ticker match', () => {
    const qualified = resolveAssetIdentity({ symbol: 'KFH.KW' });
    expect(qualified.matchedBy).toBe('exchange-ticker');
    expect(qualified.verified?.logoUrl).toBe(KFH_LOGO_URL);

    const bare = resolveAssetIdentity({ symbol: 'KFH' });
    expect(bare.matchedBy).toBe('ticker');
    expect(bare.verified?.logoUrl).toBe(KFH_LOGO_URL);
  });

  it('lets a plain ticker win over the display name', () => {
    const identity = resolveAssetIdentity({ symbol: 'NVDA', name: 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR' });
    expect(identity.canonicalTicker).toBe('NVDA');
    expect(identity.verified?.logoUrl).toBe(NVDA_LOGO_URL);
  });

  it('consults a verified name alias only when no usable ticker exists', () => {
    expect(resolveAssetIdentity({ name: 'Taiwan Semiconductor Manufacturing' }).matchedBy).toBe('name');
    expect(resolveAssetIdentity({ companyName: 'TSMC' }).canonicalTicker).toBe('TSM');
    // With a real ticker present, the name is never used for identity.
    expect(resolveAssetIdentity({ symbol: 'AMD', name: 'Taiwan Semiconductor Manufacturing' }).matchedBy).toBe('ticker');
  });

  it('safely ignores an unknown internal asset id and falls through to the ticker', () => {
    const identity = resolveAssetIdentity({ assetId: 'not-in-catalog', symbol: 'NVDA' });
    expect(identity.canonicalTicker).toBe('NVDA');
    expect(identity.verified?.logoUrl).toBe(NVDA_LOGO_URL);
  });
});

describe('Market / exchange context disambiguates duplicate tickers', () => {
  it('resolves a market-scoped identity when the market agrees', () => {
    expect(resolveAssetLogoUrl({ symbol: 'KFH', market: 'Boursa Kuwait' })).toBe(KFH_LOGO_URL);
    expect(resolveAssetLogoUrl({ symbol: 'KFH.KW' })).toBe(KFH_LOGO_URL);
  });

  it('does NOT lend a market-scoped logo to a same-ticker asset on another exchange', () => {
    // A hypothetical US-listed "KFH" must not inherit Kuwait Finance House's
    // verified logo. The scoped entry is skipped and a safe fallback is used —
    // a generic by-ticker guess for a stock, never the KFH logo.
    const identity = resolveAssetIdentity({ symbol: 'KFH', market: 'NASDAQ', assetType: 'stock' });
    expect(identity.verified).toBeNull();
    const logo = resolveAssetLogoUrl({ symbol: 'KFH', market: 'NASDAQ', assetType: 'stock' });
    expect(logo).not.toBe(KFH_LOGO_URL);
    expect(logo).toBe('https://financialmodelingprep.com/image-stock/KFH.png');
  });
});

describe('ADR / ADS normalization is generic, not per-company', () => {
  const tsmAdrForms = ['TSM', 'TSM ADR', 'TSM.ADR', 'TSM-ADS', 'TSM ADRS', 'tsm adr', 'NASDAQ:TSM'];

  it('resolves every ADR/ADS spelling of TSM to the verified TSMC logo', () => {
    for (const symbol of tsmAdrForms) {
      expect(resolveAssetLogoUrl({ symbol }), symbol).toBe(TSMC_LOGO_URL);
      expect(canonicalAssetTicker({ symbol }), symbol).toBe('TSM');
    }
  });

  it('strips ADR/ADS suffixes for any ticker without hardcoding the company', () => {
    for (const suffix of [' ADR', '.ADR', '-ADS', ' ADS']) {
      expect(resolveAssetLogoUrl({ symbol: `NVDA${suffix}` }), suffix).toBe(NVDA_LOGO_URL);
      expect(normalizeTickerSymbol(`AMD${suffix}`), suffix).toBe('AMD');
    }
  });
});

describe('Meaningful ticker punctuation is preserved', () => {
  it('keeps class-share suffixes distinct and never strips them', () => {
    for (const symbol of ['BRK.A', 'BRK.B', 'RDS.A', 'RDS.B']) {
      expect(normalizeTickerSymbol(symbol), symbol).toBe(symbol);
      expect(canonicalAssetTicker({ symbol }), symbol).toBe(symbol);
    }
    expect(canonicalAssetTicker({ symbol: 'BRK.A' })).not.toBe(canonicalAssetTicker({ symbol: 'BRK.B' }));
    expect(resolveAssetLogoUrl({ symbol: 'BRK.A' }))
      .toBe('https://financialmodelingprep.com/image-stock/BRK.A.png');
  });

  it('normalizes case and common separators without corrupting the base ticker', () => {
    expect(normalizeTickerSymbol('  nvda  ')).toBe('NVDA');
    expect(normalizeTickerSymbol('nasdaq:aapl')).toBe('AAPL');
  });
});

describe('normalizeIsin validates the ISO 6166 shape', () => {
  it('accepts well-formed ISINs and rejects malformed input', () => {
    expect(normalizeIsin('us8740391003')).toBe('US8740391003');
    expect(normalizeIsin('US 8740391003')).toBe('US8740391003');
    expect(normalizeIsin('NOT-AN-ISIN')).toBe('');
    expect(normalizeIsin('US874039100')).toBe(''); // too short
    expect(normalizeIsin('')).toBe('');
  });
});

describe('Global-market coverage: no wrong logos, safe fallbacks everywhere', () => {
  // Representative assets across the markets the platform serves. The resolver
  // must (a) never return another company's verified logo, (b) return a stable
  // canonical ticker, and (c) fall back safely (FMP by-ticker guess or null →
  // category icon) when no verified logo exists.
  const cases: Array<{ market: string; input: AssetVisualInput; canonical: string; verified?: string }> = [
    { market: 'US ADR (Taiwan)', input: { symbol: 'TSM', market: 'NYSE', assetType: 'stock' }, canonical: 'TSM', verified: TSMC_LOGO_URL },
    { market: 'US', input: { symbol: 'NVDA', market: 'NASDAQ', assetType: 'stock' }, canonical: 'NVDA', verified: NVDA_LOGO_URL },
    { market: 'Kuwait', input: { symbol: 'KFH.KW', market: 'Boursa Kuwait', assetType: 'stock' }, canonical: 'KFH', verified: KFH_LOGO_URL },
    { market: 'Saudi', input: { symbol: '2222.SR', market: 'Tadawul', assetType: 'stock' }, canonical: '2222.SR' },
    { market: 'UAE', input: { symbol: 'EMAAR.AE', market: 'DFM', assetType: 'stock' }, canonical: 'EMAAR.AE' },
    { market: 'Qatar', input: { symbol: 'QNBK.QA', market: 'QSE', assetType: 'stock' }, canonical: 'QNBK.QA' },
    { market: 'Bahrain', input: { symbol: 'AUB.BH', market: 'Bahrain Bourse', assetType: 'stock' }, canonical: 'AUB.BH' },
    { market: 'Oman', input: { symbol: 'BKMB.OM', market: 'MSX', assetType: 'stock' }, canonical: 'BKMB.OM' },
    { market: 'UK', input: { symbol: 'HSBA.L', market: 'London', assetType: 'stock' }, canonical: 'HSBA.L' },
    { market: 'Europe', input: { symbol: 'SAP.DE', market: 'XETRA', assetType: 'stock' }, canonical: 'SAP.DE' },
    { market: 'Japan', input: { symbol: '7203.T', market: 'Tokyo', assetType: 'stock' }, canonical: '7203.T' },
    { market: 'Hong Kong', input: { symbol: '0700.HK', market: 'HKEX', assetType: 'stock' }, canonical: '0700.HK' },
    { market: 'crypto', input: { symbol: 'BTC', assetType: 'crypto' }, canonical: 'BTC', verified: 'https://cdn.simpleicons.org/bitcoin/F7931A' },
    { market: 'ETF', input: { symbol: 'SPY', assetType: 'etf' }, canonical: 'SPY', verified: 'https://financialmodelingprep.com/image-stock/SPY.png' },
    { market: 'fund (Arabic name)', input: { name: 'صندوق الاستثمار', assetType: 'fund' }, canonical: '' },
    { market: 'cash', input: { symbol: 'CASH', assetType: 'cash' }, canonical: 'CASH' },
  ];

  const verifiedLogoUrls = new Set(getVerifiedLogoDirectory().map(entry => entry.logoUrl));

  for (const testCase of cases) {
    it(`${testCase.market}: resolves a safe, correct identity`, () => {
      const identity = resolveAssetIdentity(testCase.input);
      expect(identity.canonicalTicker, testCase.market).toBe(testCase.canonical);

      const logo = resolveAssetLogoUrl(testCase.input);
      if (testCase.verified) {
        expect(logo, testCase.market).toBe(testCase.verified);
      } else {
        // Never a *wrong* verified logo; either null (category icon) or an
        // https by-ticker guess that fails safely if the image 404s.
        if (logo !== null) {
          expect(logo!.startsWith('https://'), testCase.market).toBe(true);
          expect(verifiedLogoUrls.has(logo!), `${testCase.market} must not borrow a verified logo`).toBe(false);
        }
      }
    });
  }
});

describe('Safe fallback and hardening are preserved', () => {
  it('returns a by-ticker guess for an unmapped stock and null for non-ticker input', () => {
    expect(resolveAssetLogoUrl({ symbol: 'ZZZZ' })).toBe('https://financialmodelingprep.com/image-stock/ZZZZ.png');
    expect(resolveAssetLogoUrl({ symbol: '', name: '' })).toBeNull();
    expect(resolveAssetLogoUrl({ symbol: 'CASH', assetType: 'cash' })).toBeNull();
  });

  it('rejects unsafe explicit image URLs', () => {
    expect(resolveAssetLogoUrl({ symbol: 'TSM', logoUrl: 'javascript:alert(1)' })).toBe(TSMC_LOGO_URL);
    expect(resolveAssetLogoUrl({ symbol: 'ZZZZ', imageUrl: 'data:text/html,evil' }))
      .toBe('https://financialmodelingprep.com/image-stock/ZZZZ.png');
    // A safe explicit https URL is honored ahead of resolution.
    expect(resolveAssetLogoUrl({ symbol: 'TSM', logoUrl: 'https://example.com/x.png' }))
      .toBe('https://example.com/x.png');
  });

  it('never mutates the user-facing display name during identity resolution', () => {
    const identity = resolveAssetIdentity({ symbol: 'TSM', companyName: 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR' });
    expect(identity.canonicalTicker).toBe('TSM');
    // resolveAssetIdentity does not return a mutated name; the display name is
    // owned by getAssetVisualMeta.label, which is asserted in the TSM suite.
  });
});
