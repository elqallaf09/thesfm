import type { ShariahUniverseItem } from './shariahUniverse';

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

export function publishedShariahFundCatalogItem(item: ShariahUniverseItem) {
  const profile = item.assetType === 'etf' ? publishedShariahFundProfile(item.symbol) : null;
  if (!profile) return null;
  const reason = {
    ar: `تعلن ${profile.provider} هذا الصندوق كمنتج متوافق شرعياً وفق منهجية ورقابة منشورة. هذه حالة معلنة من الجهة الراعية وليست فتوى أو اعتماداً مستقلاً صادراً من THE SFM.`,
    en: `${profile.provider} publishes this fund as Shariah-compliant under a disclosed methodology and oversight process. This is the sponsor's published designation, not an independent THE SFM fatwa or certification.`,
    fr: `${profile.provider} publie ce fonds comme conforme à la charia selon une méthodologie et une supervision documentées. Il s'agit de la désignation publiée par le promoteur, et non d'une fatwa ou certification indépendante de THE SFM.`,
  };
  return {
    symbol: item.symbol,
    name: item.name,
    sector: item.sector,
    industry: item.industry,
    exchange: null,
    assetType: 'etf' as const,
    shariahStatus: 'compliant' as const,
    statusLabelAr: 'معلن متوافق شرعياً',
    reason,
    screeningSource: profile.sourceName,
    methodology: {
      ar: `المنهجية الشرعية المنشورة للصندوق من ${profile.provider}`,
      en: profile.methodology,
      fr: `Méthodologie charia publiée du fonds par ${profile.provider}`,
    },
    lastScreenedAt: profile.verifiedAt,
    fieldCoverage: [],
    fundReview: {
      coverage: 'published_designation',
      reason: 'provider_published_shariah',
      provider: profile.provider,
      officialUrl: profile.officialUrl,
      verifiedAt: profile.verifiedAt,
      independentSfmCertification: false,
    },
    financialRatios: null,
    missingFinancialFields: [],
    notes: reason,
  };
}
