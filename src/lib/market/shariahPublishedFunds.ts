export type PublishedShariahFundProfile = {
  symbol: string;
  name: string;
  provider: string;
  officialUrl: string;
  designation: string;
  methodology: string;
  authority: string;
  verifiedOn: string;
  identityPattern: RegExp;
  evidencePatterns: RegExp[];
};

const PROFILES: Record<string, PublishedShariahFundProfile> = {
  SPUS: {
    symbol: 'SPUS',
    name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF',
    provider: 'SP Funds',
    officialUrl: 'https://www.sp-funds.com/spus/',
    designation: 'Sharia-compliant ETF',
    methodology: 'S&P 500 Sharia Industry Exclusions Index / AAOIFI-screened approach',
    authority: 'SP Funds / ShariaPortfolio published methodology',
    verifiedOn: '2026-09-16',
    identityPattern: /SP Funds S&P 500 Sharia Industry Exclusions ETF/i,
    evidencePatterns: [/Sharia[- ]compliant/i, /AAOIFI/i],
  },
  HLAL: {
    symbol: 'HLAL',
    name: 'Wahed FTSE USA Shariah ETF',
    provider: 'Wahed',
    officialUrl: 'https://www.wahed.com/hlal',
    designation: 'Shariah ETF',
    methodology: 'FTSE Shariah USA Index',
    authority: 'Wahed Shariah governance / Shariyah Review Bureau',
    verifiedOn: '2026-09-16',
    identityPattern: /Wahed FTSE USA Shariah ETF/i,
    evidencePatterns: [/Shariah[- ]compliant/i, /FTSE (?:USA )?Shariah|FTSE Shariah USA/i],
  },
  UMMA: {
    symbol: 'UMMA',
    name: 'Wahed Dow Jones Islamic World ETF',
    provider: 'Wahed',
    officialUrl: 'https://www.wahed.com/umma',
    designation: 'Islamic / Shariah-compliant ETF',
    methodology: 'Dow Jones Islamic Market International Titans 100 reference index',
    authority: 'Wahed Shariah Supervisory Board / Shariyah Review Bureau',
    verifiedOn: '2026-09-16',
    identityPattern: /Wahed Dow Jones Islamic World ETF/i,
    evidencePatterns: [/Shariah[- ]compliant/i, /Shariah Certificate|Shariah Audit Reports|Shariah Supervisory Board/i],
  },
  SPRE: {
    symbol: 'SPRE',
    name: 'SP Funds S&P Global REIT Sharia ETF',
    provider: 'SP Funds',
    officialUrl: 'https://www.sp-funds.com/spre/',
    designation: 'Sharia-compliant REIT ETF',
    methodology: 'S&P Global All Equity REIT Shariah methodology',
    authority: 'SP Funds published Sharia methodology',
    verifiedOn: '2026-09-16',
    identityPattern: /SP Funds S&P Global REIT Sharia ETF/i,
    evidencePatterns: [/Shariah?[- ]compliant/i, /Sharia/i],
  },
  SPSK: {
    symbol: 'SPSK',
    name: 'SP Funds Dow Jones Global Sukuk ETF',
    provider: 'SP Funds',
    officialUrl: 'https://www.sp-funds.com/spsk/',
    designation: 'Sharia-compliant Sukuk ETF',
    methodology: 'Dow Jones Sukuk Total Return Index / AAOIFI-aligned approach',
    authority: 'SP Funds published Sharia methodology',
    verifiedOn: '2026-09-16',
    identityPattern: /SP Funds Dow Jones Global Sukuk ETF/i,
    evidencePatterns: [/Sharia[- ]compliant/i, /AAOIFI|Sukuk/i],
  },
};

export function getPublishedShariahFundProfile(symbol: string, name?: string | null) {
  const profile = PROFILES[String(symbol ?? '').trim().toUpperCase()] ?? null;
  if (!profile) return null;
  if (name && !profile.identityPattern.test(name)) return null;
  return profile;
}

export function isPublishedShariahFund(symbol: string, name?: string | null) {
  return Boolean(getPublishedShariahFundProfile(symbol, name));
}

export const PUBLISHED_SHARIAH_FUND_SYMBOLS = Object.freeze(Object.keys(PROFILES));
