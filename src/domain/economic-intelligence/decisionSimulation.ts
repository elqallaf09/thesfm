import { forecastFinancialTwin } from './digitalTwin';
import type {
  EconomicScenarioId,
  FinancialDecisionKind,
  FinancialTwinForecast,
  FinancialTwinForecastPoint,
  FinancialTwinSnapshot,
} from './types';

export type DecisionSimulationChange = {
  kind: FinancialDecisionKind;
  upfrontCashOutflow?: number;
  monthlyIncomeChange?: number;
  monthlyExpenseChange?: number;
  monthlyDebtPaymentChange?: number;
  debtBalanceChange?: number;
  savingsBalanceChange?: number;
  investmentBalanceChange?: number;
};

export type DecisionSimulationDelta = {
  month: number;
  monthlySurplus: number;
  liquidBalance: number;
  investmentBalance: number;
  netWorth: number;
};

export type DecisionSimulationScenario = {
  id: EconomicScenarioId;
  baseline: FinancialTwinForecastPoint[];
  afterDecision: FinancialTwinForecastPoint[];
  delta: DecisionSimulationDelta[];
};

export type DecisionSimulationResult = {
  kind: FinancialDecisionKind;
  generatedAt: string;
  currency: string;
  horizons: {
    month3: Record<EconomicScenarioId, DecisionSimulationDelta | null>;
    month6: Record<EconomicScenarioId, DecisionSimulationDelta | null>;
    month12: Record<EconomicScenarioId, DecisionSimulationDelta | null>;
  };
  scenarios: Record<EconomicScenarioId, DecisionSimulationScenario>;
};

function finite(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function nonNegative(value: number) {
  return Math.max(0, value);
}

export function applyDecisionChange(
  snapshot: FinancialTwinSnapshot,
  change: DecisionSimulationChange,
): FinancialTwinSnapshot {
  const upfrontCashOutflow = nonNegative(finite(change.upfrontCashOutflow));
  const monthlyIncomeChange = finite(change.monthlyIncomeChange);
  const monthlyExpenseChange = finite(change.monthlyExpenseChange);
  const monthlyDebtPaymentChange = finite(change.monthlyDebtPaymentChange);
  const debtBalanceChange = finite(change.debtBalanceChange);
  const savingsBalanceChange = finite(change.savingsBalanceChange);
  const investmentBalanceChange = finite(change.investmentBalanceChange);

  const monthlyIncome = nonNegative(snapshot.monthlyIncome + monthlyIncomeChange);
  const monthlyExpenses = nonNegative(snapshot.monthlyExpenses + monthlyExpenseChange);
  const monthlyDebtPayments = nonNegative(snapshot.monthlyDebtPayments + monthlyDebtPaymentChange);
  const savingsBalance = nonNegative(snapshot.savingsBalance + savingsBalanceChange - upfrontCashOutflow);
  const liquidBalance = nonNegative(snapshot.liquidBalance + savingsBalanceChange - upfrontCashOutflow);
  const investmentBalance = nonNegative(snapshot.investmentBalance + investmentBalanceChange);
  const debtBalance = nonNegative(snapshot.debtBalance + debtBalanceChange);
  const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
  const netWorth = savingsBalance + investmentBalance - debtBalance;
  const debtServiceRatio = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : null;
  const savingsRate = monthlyIncome > 0 ? monthlySurplus / monthlyIncome : null;
  const monthlyOutflow = monthlyExpenses + monthlyDebtPayments;
  const runwayMonths = monthlyOutflow > 0 ? liquidBalance / monthlyOutflow : null;

  return {
    ...snapshot,
    asOf: new Date().toISOString(),
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtPayments,
    monthlySurplus,
    debtBalance,
    savingsBalance,
    investmentBalance,
    liquidBalance,
    netWorth,
    debtServiceRatio,
    savingsRate,
    runwayMonths,
  };
}

function buildDelta(
  baseline: FinancialTwinForecastPoint[],
  afterDecision: FinancialTwinForecastPoint[],
): DecisionSimulationDelta[] {
  return baseline.map((point, index) => {
    const changed = afterDecision[index];
    return {
      month: point.month,
      monthlySurplus: changed.surplus - point.surplus,
      liquidBalance: changed.liquidBalance - point.liquidBalance,
      investmentBalance: changed.investmentBalance - point.investmentBalance,
      netWorth: changed.netWorth - point.netWorth,
    };
  });
}

function pointAt(delta: DecisionSimulationDelta[], month: number) {
  return delta.find((point) => point.month === month) ?? null;
}

export function simulateFinancialDecision(
  snapshot: FinancialTwinSnapshot,
  change: DecisionSimulationChange,
  horizonMonths = 12,
): DecisionSimulationResult {
  const baselineForecast: FinancialTwinForecast = forecastFinancialTwin(snapshot, horizonMonths);
  const changedSnapshot = applyDecisionChange(snapshot, change);
  const changedForecast: FinancialTwinForecast = forecastFinancialTwin(changedSnapshot, horizonMonths);
  const scenarioIds: EconomicScenarioId[] = ['stress', 'base', 'optimistic'];

  const scenarios = Object.fromEntries(
    scenarioIds.map((id) => {
      const baseline = baselineForecast.scenarios[id].points;
      const afterDecision = changedForecast.scenarios[id].points;
      return [id, { id, baseline, afterDecision, delta: buildDelta(baseline, afterDecision) }];
    }),
  ) as Record<EconomicScenarioId, DecisionSimulationScenario>;

  return {
    kind: change.kind,
    generatedAt: new Date().toISOString(),
    currency: snapshot.currency,
    horizons: {
      month3: Object.fromEntries(scenarioIds.map((id) => [id, pointAt(scenarios[id].delta, 3)])) as Record<EconomicScenarioId, DecisionSimulationDelta | null>,
      month6: Object.fromEntries(scenarioIds.map((id) => [id, pointAt(scenarios[id].delta, 6)])) as Record<EconomicScenarioId, DecisionSimulationDelta | null>,
      month12: Object.fromEntries(scenarioIds.map((id) => [id, pointAt(scenarios[id].delta, 12)])) as Record<EconomicScenarioId, DecisionSimulationDelta | null>,
    },
    scenarios,
  };
}
