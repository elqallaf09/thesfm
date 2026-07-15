export const INVESTMENT_PLATFORM_TYPES = [
  'stock_broker',
  'bank_brokerage',
  'multi_asset_broker',
  'crypto_exchange',
  'fund_platform',
  'robo_advisor',
  'precious_metals_dealer',
  'real_estate_platform',
  'private_investment_provider',
  'other',
] as const;

export type InvestmentPlatformType = typeof INVESTMENT_PLATFORM_TYPES[number];
export type InvestmentPlatformStatus = 'approved' | 'pending' | 'rejected' | 'disabled';

export type InvestmentPlatformDirectoryItem = {
  id: string;
  canonicalName: string;
  normalizedName: string;
  slug: string;
  platformType: InvestmentPlatformType;
  websiteUrl: string | null;
  logoUrl: string | null;
  countryCode: string | null;
  aliases: string[];
  status: InvestmentPlatformStatus;
  isSeeded: boolean;
};

export type InvestmentPlatformSelection = {
  id?: string;
  name: string;
  type: InvestmentPlatformType;
  status: InvestmentPlatformStatus | 'local';
};
