export type InvestmentType =
  | 'stocks'
  | 'realEstate'
  | 'fund'
  | 'gold'
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
  createdAt: string;
  updatedAt: string;
}

export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'displayValue' | 'displayValueStatus' | 'displayValueRaw' | 'monthlyContributionStatus'>;
