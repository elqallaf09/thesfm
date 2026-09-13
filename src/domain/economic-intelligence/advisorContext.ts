import type { EconomicContextSnapshot } from './economicContext';
import type { PersonalEconomicImpact } from './personalEconomicImpact';
import type { FinancialTwinSnapshot } from './types';

export type EconomicAdvisorId = 'finance' | 'investment' | 'business';

export type EconomicAdvisorContext = {
  advisor: EconomicAdvisorId;
  generatedAt: string;
  currency: string;
  financial: {
    monthlyIncome?: number;
    monthlyExpenses?: number;
    monthlyDebtPayments?: number;
    monthlySurplus: number;
    debtBalance?: number;
    savingsBalance?: number;
    investmentBalance?: number;
    liquidBalance: number;
    netWorth?: number;
    debtServiceRatio?: number | null;
    runwayMonths: number | null;
    dataCompleteness: number;
  };
  macro: {
    country: string;
    status: EconomicContextSnapshot['status'];
    freshestDataAt: string | null;
    signals: EconomicContextSnapshot['signals'];
    missing: string[];
  };
  impacts: PersonalEconomicImpact[];
  guardrails: string[];
};

const COMMON_GUARDRAILS = [
  'Never invent missing financial or macroeconomic values.',
  'Treat forecasts and macro impacts as scenarios, not guarantees.',
  'Explain assumptions and evidence for high-impact recommendations.',
  'Do not claim licensed financial, legal, tax, or accounting advice.',
];

export function buildAdvisorContext(
  advisor: EconomicAdvisorId,
  twin: FinancialTwinSnapshot,
  macro: EconomicContextSnapshot,
  impacts: PersonalEconomicImpact[],
): EconomicAdvisorContext {
  const baseFinancial: EconomicAdvisorContext['financial'] = {
    monthlySurplus: twin.monthlySurplus,
    liquidBalance: twin.liquidBalance,
    runwayMonths: twin.runwayMonths,
    dataCompleteness: twin.dataQuality.completeness,
  };

  if (advisor === 'finance') {
    Object.assign(baseFinancial, {
      monthlyIncome: twin.monthlyIncome,
      monthlyExpenses: twin.monthlyExpenses,
      monthlyDebtPayments: twin.monthlyDebtPayments,
      debtBalance: twin.debtBalance,
      savingsBalance: twin.savingsBalance,
      investmentBalance: twin.investmentBalance,
      netWorth: twin.netWorth,
      debtServiceRatio: twin.debtServiceRatio,
    });
  } else if (advisor === 'investment') {
    Object.assign(baseFinancial, {
      savingsBalance: twin.savingsBalance,
      investmentBalance: twin.investmentBalance,
      netWorth: twin.netWorth,
      debtServiceRatio: twin.debtServiceRatio,
    });
  } else {
    Object.assign(baseFinancial, {
      debtServiceRatio: twin.debtServiceRatio,
    });
  }

  const relevantImpacts = impacts.filter((impact) => {
    if (advisor === 'finance') return true;
    if (advisor === 'investment') return impact.code !== 'weakening_labor_income_resilience';
    return ['inflation_budget_attention', 'tightening_debt_attention', 'weakening_growth_investment_attention', 'macro_context_incomplete'].includes(impact.code);
  });

  return {
    advisor,
    generatedAt: new Date().toISOString(),
    currency: twin.currency,
    financial: baseFinancial,
    macro: {
      country: macro.country,
      status: macro.status,
      freshestDataAt: macro.freshestDataAt,
      signals: macro.signals,
      missing: [...macro.missing],
    },
    impacts: relevantImpacts,
    guardrails: [
      ...COMMON_GUARDRAILS,
      advisor === 'investment'
        ? 'Do not issue guaranteed-return language or hide liquidity constraints.'
        : advisor === 'business'
          ? 'Do not infer company revenue, employees, customers, or accounting records that were not supplied.'
          : 'Prioritize cash-flow resilience, debt capacity, emergency liquidity, and stated goals.',
    ],
  };
}

export function buildAdvisorSystemContext(context: EconomicAdvisorContext) {
  return [
    `Advisor: ${context.advisor}`,
    `Context generated: ${context.generatedAt}`,
    `Currency: ${context.currency}`,
    `Financial context: ${JSON.stringify(context.financial)}`,
    `Macroeconomic context: ${JSON.stringify(context.macro)}`,
    `Relevant impact signals: ${JSON.stringify(context.impacts)}`,
    `Mandatory guardrails: ${context.guardrails.join(' | ')}`,
  ].join('\n');
}
