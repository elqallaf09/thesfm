import {
  assessFinancialDecision,
  buildFinancialTwinSnapshot,
  forecastFinancialTwin,
  type FinancialDecisionAssessment,
  type FinancialDecisionKind,
  type FinancialTwinForecast,
  type FinancialTwinSnapshot,
} from '@/domain/economic-intelligence';

export type EconomicBridgeDecisionType =
  | 'purchase'
  | 'investment'
  | 'project'
  | 'debt_saving'
  | 'charity_zakat'
  | 'budget';

export type EconomicBridgeInput = {
  decisionType: EconomicBridgeDecisionType;
  amount: number;
  recurringCost?: number;
  expectedMonthlyCost?: number;
  monthlyPayment?: number;
  debtAmount?: number;
  expectedReturn?: number;
};

export type EconomicBridgeSource = {
  income?: Record<string, unknown>[];
  expenses?: Record<string, unknown>[];
  debts?: Record<string, unknown>[];
  savings?: Record<string, unknown>[];
  investments?: Record<string, unknown>[];
};

export type EconomicDecisionContext = {
  snapshot: FinancialTwinSnapshot;
  forecast: FinancialTwinForecast;
  assessment: FinancialDecisionAssessment;
};

function kindFor(input: EconomicBridgeInput): FinancialDecisionKind | null {
  if (input.decisionType === 'purchase') return 'buy_car';
  if (input.decisionType === 'project') return 'start_business';
  if (input.decisionType === 'debt_saving') return 'pay_debt_vs_invest';
  if (input.decisionType === 'investment') return 'pay_debt_vs_invest';
  return null;
}

export function buildEconomicDecisionContext(
  input: EconomicBridgeInput,
  source: EconomicBridgeSource,
  currency: string,
): EconomicDecisionContext | null {
  const kind = kindFor(input);
  if (!kind) return null;

  const snapshot = buildFinancialTwinSnapshot(
    {
      income: source.income,
      expenses: source.expenses,
      debts: source.debts,
      savings: source.savings,
      investments: source.investments,
    },
    currency,
  );

  const monthlyCost = Math.max(
    0,
    Number(input.recurringCost ?? 0) + Number(input.expectedMonthlyCost ?? 0) + Number(input.monthlyPayment ?? 0),
  );

  const amount = Math.max(0, Number(input.amount ?? 0));
  const assessment = assessFinancialDecision(snapshot, {
    kind,
    upfrontCost: input.decisionType === 'purchase' || input.decisionType === 'project' ? amount : 0,
    monthlyCost,
    investmentAmount: input.decisionType === 'investment' ? amount : 0,
    debtPaydownAmount: input.decisionType === 'debt_saving'
      ? Math.max(0, Number(input.debtAmount ?? amount))
      : 0,
  });

  return {
    snapshot,
    forecast: forecastFinancialTwin(snapshot, 12),
    assessment,
  };
}
