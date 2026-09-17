export type OfficialFundEvidenceProfile = {
  symbol: 'QQQ' | 'VOO' | 'VTI' | 'GLD' | 'SLV';
  provider: string;
  officialUrl: string;
  host: string;
  identityPatterns: RegExp[];
  evidenceType: 'equity_index_fund' | 'physical_metal_trust';
  structuralPatterns?: RegExp[];
};

const OFFICIAL_FUND_PROFILES: Record<string, OfficialFundEvidenceProfile> = {
  QQQ: {
    symbol: 'QQQ',
    provider: 'Invesco',
    officialUrl: 'https://www.invesco.com/qqq-etf/en/about.html',
    host: 'www.invesco.com',
    identityPatterns: [/Invesco\s+QQQ/i, /Nasdaq-100/i],
    evidenceType: 'equity_index_fund',
  },
  VOO: {
    symbol: 'VOO',
    provider: 'Vanguard',
    officialUrl: 'https://investor.vanguard.com/investment-products/etfs/profile/voo',
    host: 'investor.vanguard.com',
    identityPatterns: [/Vanguard\s+S&P\s+500\s+ETF/i, /\bVOO\b/i],
    evidenceType: 'equity_index_fund',
  },
  VTI: {
    symbol: 'VTI',
    provider: 'Vanguard',
    officialUrl: 'https://investor.vanguard.com/investment-products/etfs/profile/vti',
    host: 'investor.vanguard.com',
    identityPatterns: [/Vanguard\s+Total\s+Stock\s+Market\s+ETF/i, /\bVTI\b/i],
    evidenceType: 'equity_index_fund',
  },
  GLD: {
    symbol: 'GLD',
    provider: 'State Street / World Gold Trust Services',
    officialUrl: 'https://www.ssga.com/us/en/individual/etfs/spdr-gold-shares-gld',
    host: 'www.ssga.com',
    identityPatterns: [/SPDR(?:®|\s)*Gold\s+Shares/i, /\bGLD\b/i],
    evidenceType: 'physical_metal_trust',
    structuralPatterns: [/backed\s+by\s+a\s+physical\s+asset/i, /gold\s+custodians?/i],
  },
  SLV: {
    symbol: 'SLV',
    provider: 'iShares / BlackRock',
    officialUrl: 'https://www.ishares.com/us/products/239855/ishares-silver-trust-fund',
    host: 'www.ishares.com',
    identityPatterns: [/iShares(?:®|\s)*Silver\s+Trust/i, /\bSLV\b/i],
    evidenceType: 'physical_metal_trust',
    structuralPatterns: [/silver\s+held\s+by\s+a\s+custodian/i, /ounces\s+in\s+trust/i],
  },
};

export function officialFundEvidenceProfile(symbol: string | null | undefined) {
  if (!symbol) return null;
  return OFFICIAL_FUND_PROFILES[symbol.trim().toUpperCase()] ?? null;
}

export function validateOfficialFundPage(profile: OfficialFundEvidenceProfile, finalUrl: string, text: string) {
  const parsed = new URL(finalUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== profile.host) throw new Error('fund_official_profile_redirected');
  if (text.length < 500 || !profile.identityPatterns.every(pattern => pattern.test(text))) throw new Error('fund_official_profile_identity_mismatch');
  const structuralVerified = profile.structuralPatterns?.every(pattern => pattern.test(text)) ?? false;
  return {
    structuralVerified,
    evidenceType: profile.evidenceType,
    provider: profile.provider,
    officialUrl: finalUrl,
  };
}

export function officialFundEvidenceSymbols() {
  return Object.keys(OFFICIAL_FUND_PROFILES);
}
