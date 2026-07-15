import type { InvestmentPlatformStatus, InvestmentPlatformType } from './investmentPlatform';

export type InvestmentType =
  | 'stocks'
  | 'realEstate'
  | 'fund'
  | 'gold'
  | 'silver'
  | 'cash'
  | 'crypto'
  | 'project'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  currentValue: number;
  displayValue: number | null;
  displayValueStatus: 'valid' | 'missing' | 'invalid';
  displayValueRaw?: unknown;
  monthlyContribution: number;
  monthlyContributionStatus?: 'valid' | 'missing' | 'invalid';
  startDate: string;
  riskLevel: RiskLevel;
  expectedAnnualReturn?: number;
  notes?: string;
  symbol?: string;
  providerSymbol?: string;
  market?: string;
  assetType?: string;
  currency?: string;
  quantity?: number;
  amount?: number;
  purchasePrice?: number;
  currentPrice?: number;
  purchaseTotal?: number;
  currentMarketValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  defaultCurrencyValue?: number;
  unit?: string;
  priceCurrency?: string;
  nativeCurrency?: string;
  nativeUnitPrice?: number;
  nativeMarketValue?: number;
  userCurrency?: string;
  fxRateToUserCurrency?: number;
  convertedMarketValue?: number;
  fxSource?: string;
  fxLastUpdatedAt?: string;
  valuationSource?: string;
  valuationLastUpdatedAt?: string;
  lastPrice?: number;
  lastPriceUpdatedAt?: string;
  dataSource?: string;
  projectId?: string;
  projectName?: string;
  location?: string;
  propertyType?: string;
  expectedMonthlyIncome?: number;
  expectedMonthlyExpense?: number;
  maturityDate?: string;
  metalType?: 'gold' | 'silver' | string;
  metalProductType?: string;
  metalKarat?: number;
  metalPurity?: number;
  grams?: number;
  pureMetalGrams?: number;
  priceSource?: string;
  purchasePlatformId?: string;
  purchasePlatformName?: string;
  purchasePlatformType?: InvestmentPlatformType;
  purchasePlatformStatus?: InvestmentPlatformStatus | 'local';
  createdAt: string;
  updatedAt: string;
}

export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'displayValue' | 'displayValueStatus' | 'displayValueRaw' | 'monthlyContributionStatus'>;
