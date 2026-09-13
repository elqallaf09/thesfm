import {
  activeDebtRows,
  debtBalance,
  firstNumber,
  investmentValue,
  rowCurrency,
  sumRows,
} from '@/lib/dashboard/executiveOverview';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import type {
  FinancialTwinForecast,
  FinancialTwinSnapshot,
  ForecastAssumptions,
  EconomicScenarioId,
} from './types';

type FinancialRow = Record<string, unknown>;

export type FinancialTwinSource = {
  income?: FinancialRow[];
  expenses?: FinancialRow[];
  debts?: FinancialRow[];
  savings?: FinancialRow[];
  investments?: FinancialRow[];
};

function sameCurrency(rows: FinancialRow[], currency: string) {
  return rows.filter((row) => rowCurrency(row as any) === currency);
}

function sumSavings(rows: FinancialRow[], currency: string) {
  return sameCurrency(rows, currency).reduce(
    (total, row) => total + (firstNumber(row as any, ['current_amount', 'amount', 'balance', 'saved_amount']) ?? 0),
    0,
  );
}

function sumInvestments(rows: FinancialRow[], currency: string) {
  return rows.reduce((total, row) => {
    const value = investmentValue(row as any, currency);
    return value?.currency === currency ? total + value.amount : total;
  }, 0);
}

function monthlyDebtPayments(rows: FinancialRow[], currency: string) {
  return activeDebtRows(rows as any[]).reduce((total, row) => {
    if (rowCurrency(row as any) !== currency) return total;
    return total + (firstNumber(row as any, ['monthly_payment', 'payment_amount', 'installment_amount']) ?? 0);
  }, 0);
}

function totalDebt(rows: FinancialRow[], currency: string) {
  return activeDebtRows(rows as any[]).reduce((total, row) => {
    if (rowCurrency(row as any) !== currency) return total;
    return total + (debtBalance(row as any) ?? 0);
  }, 0);
}

function monthlyRows(rows: FinancialRow[], currency: string, keys = ['amount']) {
  return sumRows(sameCurrency(rows, currency) as any[], keys);
}

function quality(source: FinancialTwinSource) {
  const required: Array<keyof FinancialTwinSource> = ['income', 'expenses', 'debts', 'savings', 'investments'];
  const missing = required.filter((key) => !source[key]).map(String);
  const empty = required.filter((key) => Array.isArray(source[key]) && source[key]?.length === 0).map(String);
  const available = required.length - missing.length;
  return {
    completeness: available / required.length,
    missing,
    warnings: empty.map((key) => `${key}:empty`),
  };
}

export function buildFinancialTwinSnapshot(
  source: FinancialTwinSource,
  currency: string,
  asOf = new Date(),
): FinancialTwinSnapshot {
  const normalizedCurrency = currency.trim().toUpperCase();
  const incomeRows = personalIncomeRows(source.income ?? []);
  const expenseRows = personalExpenseRows(source.expenses ?? []);
  const monthlyIncome = monthlyRows(incomeRows, normalizedCurrency, ['amount', 'monthly_amount', 'net_amount']);
  const monthlyExpenses = monthlyRows(expenseRows, normalizedCurrency, ['amount', 'monthly_amount', 'cost']);
  const debtPayments = monthlyDebtPayments(source.debts ?? [], normalizedCurrency);
  const debt = totalDebt(source.debts ?? [], normalizedCurrency);
  const savings = sumSavings(source.savings ?? [], normalizedCurrency);
  const investments = sumInvestments(source.investments ?? [], normalizedCurrency);
  const monthlySurplus = monthlyIncome - monthlyExpenses - debtPayments;
  const liquidBalance = savings;
  const netWorth = savings + investments - debt;
  const debtServiceRatio = monthlyIncome > 0 ? debtPayments / monthlyIncome : null;
  const savingsRate = monthlyIncome > 0 ? monthlySurplus / monthlyIncome : null;
  const monthlyOutflow = monthlyExpenses + debtPayments;
  const runwayMonths = monthlyOutflow > 0 ? liquidBalance / monthlyOutflow : null;

  return {
    asOf: asOf.toISOString(),
    currency: normalizedCurrency,
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtPayments: debtPayments,
    monthlySurplus,
    debtBalance: debt,
    savingsBalance: savings,
    investmentBalance: investments,
    liquidBalance,
    netWorth,
    debtServiceRatio,
    savingsRate,
    runwayMonths,
    dataQuality: quality(source),
  };
}

export const DEFAULT_FORECAST_ASSUMPTIONS: Record<EconomicScenarioId, ForecastAssumptions> = {
  stress: {
    incomeGrowthMonthly: -0.01,
    expenseGrowthMonthly: 0.01,
    investmentReturnMonthly: -0.005,
  },
  base: {
    incomeGrowthMonthly: 0,
    expenseGrowthMonthly: 0,
    investmentReturnMonthly: 0,
  },
  optimistic: {
    incomeGrowthMonthly: 0.005,
    expenseGrowthMonthly: 0,
    investmentReturnMonthly: 0.004,
  },
};

function projectScenario(
  snapshot: FinancialTwinSnapshot,
  id: EconomicScenarioId,
  assumptions: ForecastAssumptions,
  horizonMonths: number,
) {
  let income = snapshot.monthlyIncome;
  let expenses = snapshot.monthlyExpenses;
  let liquidBalance = snapshot.liquidBalance + (assumptions.oneOffCashFlow ?? 0);
  let investmentBalance = snapshot.investmentBalance;

  const points = Array.from({ length: horizonMonths }, (_, index) => {
    const month = index + 1;
    income *= 1 + assumptions.incomeGrowthMonthly;
    expenses *= 1 + assumptions.expenseGrowthMonthly;
    investmentBalance *= 1 + assumptions.investmentReturnMonthly;
    const surplus = income - expenses - snapshot.monthlyDebtPayments;
    liquidBalance += surplus;
    return {
      month,
      income,
      expenses,
      debtPayments: snapshot.monthlyDebtPayments,
      surplus,
      liquidBalance,
      investmentBalance,
      netWorth: liquidBalance + investmentBalance - snapshot.debtBalance,
    };
  });

  return { id, assumptions, points };
}

export function forecastFinancialTwin(
  snapshot: FinancialTwinSnapshot,
  horizonMonths = 12,
  assumptions: Record<EconomicScenarioId, ForecastAssumptions> = DEFAULT_FORECAST_ASSUMPTIONS,
  generatedAt = new Date(),
): FinancialTwinForecast {
  const safeHorizon = Math.min(60, Math.max(1, Math.floor(horizonMonths)));
  return {
    generatedAt: generatedAt.toISOString(),
    horizonMonths: safeHorizon,
    currency: snapshot.currency,
    scenarios: {
      stress: projectScenario(snapshot, 'stress', assumptions.stress, safeHorizon),
      base: projectScenario(snapshot, 'base', assumptions.base, safeHorizon),
      optimistic: projectScenario(snapshot, 'optimistic', assumptions.optimistic, safeHorizon),
    },
  };
}
