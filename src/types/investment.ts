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
  monthlyContribution: number;
  startDate: string;
  riskLevel: RiskLevel;
  expectedAnnualReturn?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>;

