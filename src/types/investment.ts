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
  currentMarketValue?: number;
  priceCurrency?: string;
  lastPrice?: number;
  lastPriceUpdatedAt?: string;
  dataSource?: string;
  projectId?: string;
  projectName?: string;
  metalType?: 'gold' | 'silver' | string;
  metalProductType?: string;
  metalKarat?: number;
  metalPurity?: number;
  grams?: number;
  pureMetalGrams?: number;
  priceSource?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'displayValue' | 'displayValueStatus' | 'displayValueRaw' | 'monthlyContributionStatus'>;
