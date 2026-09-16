export type EconomicScenarioId = 'stress' | 'base' | 'optimistic';

export type EconomicMoney = {
  amount: number;
  currency: string;
};

export type EconomicDataQuality = {
  completeness: number;
  missing: string[];
  warnings: string[];
};

export type FinancialTwinSnapshot = {
  asOf: string;
  currency: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  monthlySurplus: number;
  debtBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  liquidBalance: number;
  netWorth: number;
  debtServiceRatio: number | null;
  savingsRate: number | null;
  runwayMonths: number | null;
  dataQuality: EconomicDataQuality;
};

export type ForecastAssumptions = {
  incomeGrowthMonthly: number;
  expenseGrowthMonthly: number;
  investmentReturnMonthly: number;
  oneOffCashFlow?: number;
};

export type FinancialTwinForecastPoint = {
  month: number;
  income: number;
  expenses: number;
  debtPayments: number;
  surplus: number;
  liquidBalance: number;
  investmentBalance: number;
  netWorth: number;
};

export type FinancialTwinScenario = {
  id: EconomicScenarioId;
  assumptions: ForecastAssumptions;
  points: FinancialTwinForecastPoint[];
};

export type FinancialTwinForecast = {
  generatedAt: string;
  horizonMonths: number;
  currency: string;
  methodology: 'fixed_assumption_sensitivity_simulation';
  scenarios: Record<EconomicScenarioId, FinancialTwinScenario>;
};

export type FinancialDecisionKind =
  | 'buy_car'
  | 'buy_home'
  | 'take_loan'
  | 'pay_debt_vs_invest'
  | 'start_business';

export type FinancialDecisionInput = {
  kind: FinancialDecisionKind;
  upfrontCost?: number;
  monthlyCost?: number;
  monthlyIncomeChange?: number;
  investmentAmount?: number;
  debtPaydownAmount?: number;
};

export type FinancialDecisionAssessment = {
  kind: FinancialDecisionKind;
  affordability: 'strong' | 'borderline' | 'weak';
  riskScore: number;
  riskScoreMethod: 'deterministic_policy_heuristic';
  monthlySurplusAfterDecision: number;
  runwayMonthsAfterDecision: number | null;
  reasons: string[];
  warnings: string[];
};
