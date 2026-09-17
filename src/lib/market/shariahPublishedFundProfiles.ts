export type PublishedShariahFundProfile = {
  symbol: string;
  provider: string;
  officialUrl: string;
  verifiedAt: string;
  methodology: string;
  sourceName: string;
};

/**
 * Reviewed public fund-level Shariah designations.
 *
 * These entries do NOT mean THE SFM issued a fatwa or independently certified
 * every current holding. They record that the fund sponsor currently publishes
 * the product as Shariah-compliant / Shariah-screened and identifies the
 * relevant methodology or Shariah oversight. Independent SFM evidence review
 * remains a separate layer.
 *
 * Keep this list intentionally narrow: only official sponsor pages that were
 * reviewed and matched to the exact ticker belong here.
 */
const PUBLISHED_SHARIAH_FUNDS: Record<string, PublishedShariahFundProfile> = {
  SPUS: {
    symbol: 'SPUS',
    provider: 'SP Funds',
    officialUrl: 'https://www.sp-funds.com/spus/',
    verifiedAt: '2026-09-17',
    methodology: 'SP Funds published Shariah-compliant ETF; AAOIFI-guideline screening and S&P 500 Sharia Industry Exclusions Index methodology.',
    sourceName: 'SP Funds official Shariah fund disclosure',
  },
  HLAL: {
    symbol: 'HLAL',
    provider: 'Wahed',
    officialUrl: 'https://www.wahed.com/hlal',
    verifiedAt: '2026-09-17',
    methodology: 'Wahed published Shariah-compliant ETF tracking the FTSE Shariah USA Index; Shariah compliance is governed by Wahed Shariah oversight and the index screening methodology.',
    sourceName: 'Wahed official HLAL Shariah disclosure',
  },
  UMMA: {
    symbol: 'UMMA',
    provider: 'Wahed',
    officialUrl: 'https://www.wahed.com/umma',
    verifiedAt: '2026-09-17',
    methodology: 'Wahed published Islamic ETF with a Shariah certificate, Shariah audit reports and purification disclosures; benchmark exposure follows a Dow Jones Islamic market index.',
    sourceName: 'Wahed official UMMA Shariah disclosure',
  },
  SPRE: {
    symbol: 'SPRE',
    provider: 'SP Funds',
    officialUrl: 'https://www.sp-funds.com/spre/',
    verifiedAt: '2026-09-17',
    methodology: 'SP Funds published Sharia REIT ETF using a Shariah-screened S&P global REIT index and fund-level Shariah oversight.',
    sourceName: 'SP Funds official SPRE Shariah disclosure',
  },
  SPSK: {
    symbol: 'SPSK',
    provider: 'SP Funds',
    officialUrl: 'https://www.sp-funds.com/spsk/',
    verifiedAt: '2026-09-17',
    methodology: 'SP Funds published Shariah-compliant sukuk ETF with sponsor-provided Shariah certification and audit documentation.',
    sourceName: 'SP Funds official SPSK Shariah disclosure',
  },
};

export function publishedShariahFundProfile(symbol: string | null | undefined) {
  if (!symbol) return null;
  return PUBLISHED_SHARIAH_FUNDS[symbol.trim().toUpperCase()] ?? null;
}

export function publishedShariahFundSymbols() {
  return Object.keys(PUBLISHED_SHARIAH_FUNDS);
}
