import {
  assessFinancialDecision,
  buildFinancialTwinSnapshot,
  forecastFinancialTwin,
  simulateFinancialDecision,
  type DecisionSimulationChange,
  type DecisionSimulationResult,
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

export type DebtDecisionDirection = 'new_loan' | 'repay_debt';

export type EconomicBridgeInput = {
  decisionType: EconomicBridgeDecisionType;
  amount: number;
  recurringCost?: number;
  expectedMonthlyCost?: number;
  expectedMonthlyIncomeChange?: number;
  monthlyPayment?: number;
  monthlyDebtPaymentReduction?: number;
  debtAmount?: number;
  expectedReturn?: number;
  upfrontCashOutflow?: number;
  financingPrincipal?: number;
  loanTermMonths?: number;
  debtDirection?: DebtDecisionDirection;
  debtPaydownAmount?: number;
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
  simulation: DecisionSimulationResult | null;
  simulationMissing: string[];
};

function positive(value: number | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function signed(value: number | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function kindFor(input: EconomicBridgeInput): FinancialDecisionKind | null {
  if (input.decisionType === 'purchase') return 'buy_car';
  if (input.decisionType === 'project') return 'start_business';
  if (input.decisionType === 'debt_saving') return 'pay_debt_vs_invest';
  if (input.decisionType === 'investment') return 'pay_debt_vs_invest';
  return null;
}

function simulationChangeFor(
  input: EconomicBridgeInput,
  kind: FinancialDecisionKind,
): { change: DecisionSimulationChange | null; missing: string[] } {
  const amount = positive(input.amount);
  const recurring = positive(input.recurringCost) + positive(input.expectedMonthlyCost);
  const monthlyPayment = positive(input.monthlyPayment);

  if (input.decisionType === 'purchase') {
    const financingPrincipal = positive(input.financingPrincipal);
    const explicitCashOutflow = positive(input.upfrontCashOutflow);

    if (financingPrincipal > 0 || monthlyPayment > 0) {
      const missing: string[] = [];
      if (financingPrincipal <= 0) missing.push('financing_principal');
      if (monthlyPayment <= 0) missing.push('monthly_payment');
      if (input.upfrontCashOutflow == null) missing.push('upfront_cash_outflow');

      return {
        change: {
          kind,
          upfrontCashOutflow: explicitCashOutflow,
          monthlyDebtPaymentChange: monthlyPayment,
          debtBalanceChange: financingPrincipal,
          monthlyExpenseChange: recurring,
        },
        missing,
      };
    }

    return {
      change: {
        kind,
        upfrontCashOutflow: input.upfrontCashOutflow == null ? amount : explicitCashOutflow,
        monthlyExpenseChange: recurring,
      },
      missing: [],
    };
  }

  if (input.decisionType === 'investment') {
    return {
      change: {
        kind,
        upfrontCashOutflow: amount,
        investmentBalanceChange: amount,
      },
      missing: [],
    };
  }

  if (input.decisionType === 'project') {
    return {
      change: {
        kind,
        upfrontCashOutflow: input.upfrontCashOutflow == null ? amount : positive(input.upfrontCashOutflow),
        monthlyExpenseChange: recurring,
        monthlyIncomeChange: signed(input.expectedMonthlyIncomeChange),
      },
      missing: [],
    };
  }

  if (input.decisionType === 'debt_saving') {
    if (!input.debtDirection) return { change: null, missing: ['debt_action_direction'] };

    if (input.debtDirection === 'new_loan') {
      const principal = positive(input.financingPrincipal || input.debtAmount || amount);
      const missing: string[] = [];
      if (principal <= 0) missing.push('financing_principal');
      if (monthlyPayment <= 0) missing.push('monthly_payment');
      return {
        change: {
          kind,
          debtBalanceChange: principal,
          monthlyDebtPaymentChange: monthlyPayment,
        },
        missing,
      };
    }

    const paydown = positive(input.debtPaydownAmount || input.debtAmount || amount);
    const monthlyReduction = positive(input.monthlyDebtPaymentReduction);
    return {
      change: {
        kind,
        upfrontCashOutflow: paydown,
        debtBalanceChange: -paydown,
        monthlyDebtPaymentChange: -monthlyReduction,
      },
      missing: paydown > 0 ? [] : ['debt_paydown_amount'],
    };
  }

  return { change: null, missing: ['unsupported_decision_simulation'] };
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
    positive(input.recurringCost) + positive(input.expectedMonthlyCost) + positive(input.monthlyPayment),
  );

  const amount = positive(input.amount);
  const assessment = assessFinancialDecision(snapshot, {
    kind,
    upfrontCost: input.decisionType === 'purchase'
      ? (input.upfrontCashOutflow == null && positive(input.financingPrincipal) <= 0 && positive(input.monthlyPayment) <= 0
        ? amount
        : positive(input.upfrontCashOutflow))
      : input.decisionType === 'project'
        ? (input.upfrontCashOutflow == null ? amount : positive(input.upfrontCashOutflow))
        : input.decisionType === 'debt_saving' && input.debtDirection === 'repay_debt'
          ? positive(input.debtPaydownAmount || input.debtAmount || amount)
          : 0,
    monthlyCost,
    investmentAmount: input.decisionType === 'investment' ? amount : 0,
    debtPaydownAmount: input.decisionType === 'debt_saving' && input.debtDirection === 'repay_debt'
      ? positive(input.debtPaydownAmount || input.debtAmount || amount)
      : 0,
  });

  const simulationInput = simulationChangeFor(input, kind);

  return {
    snapshot,
    forecast: forecastFinancialTwin(snapshot, 12),
    assessment,
    simulation: simulationInput.change ? simulateFinancialDecision(snapshot, simulationInput.change, 12) : null,
    simulationMissing: simulationInput.missing,
  };
}
