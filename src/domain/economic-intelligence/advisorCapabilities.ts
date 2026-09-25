import { z } from 'zod';

export const ADVISOR_CAPABILITIES = ['coach', 'planner', 'portfolio', 'spending', 'retirement', 'debt', 'goals', 'investment', 'risk', 'wealth'] as const;
export type AdvisorCapability = typeof ADVISOR_CAPABILITIES[number];
export const advisorRequestSchema = z.object({
  capability: z.enum(ADVISOR_CAPABILITIES),
  currency: z.string().regex(/^[A-Z]{3}$/),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  horizonMonths: z.number().int().min(1).max(600).default(12),
  monthlyContribution: z.number().min(0).max(1e9).default(0),
  annualReturn: z.number().min(-50).max(50).default(0),
  inflation: z.number().min(-10).max(30).default(0),
  annualFees: z.number().min(0).max(10).default(0),
  retirementYears: z.number().int().min(1).max(60).default(25),
  retirementSpending: z.number().min(0).max(1e9).default(0),
  reserveMonths: z.number().min(0).max(24).default(6),
  extraDebtPayment: z.number().min(0).max(1e9).default(0),
  save: z.boolean().default(false),
}).strict();
export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;
export type AdvisorSource = {
  income: number | null; expenses: number | null; savings: number | null;
  debtPaymentsNotInExpenses?: number;
  holdings: Array<{ id: string; name: string; value: number }>;
  debts: Array<{ id: string; balance: number; payment: number; monthlyRate: number | null }>;
  goals: Array<{ id: string; name: string; target: number; saved: number; months: number | null }>;
  spending: Array<{ category: string; amount: number }>;
  missing: string[]; excluded: number;
};
export type AdvisorMetric = { key: string; value: number | null; unit: 'money' | 'percent' | 'months' | 'count' };
export type AdvisorReport = {
  capability: AdvisorCapability; currency: string; month: string; generatedAt: string;
  methodology: 'sfm-advisor-v1'; source: 'account_records_and_explicit_assumptions';
  metrics: AdvisorMetric[]; missing: string[]; warnings: string[];
  actions: Array<{ code: string; href: string }>;
  schedule: Array<{ month: number; value: number }>;
  allocation: Array<{ name: string; amount: number; percent: number | null }>;
  assumptions: Omit<AdvisorRequest, 'save'>;
};
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const money = (n: number) => Math.round(n * 1e6) / 1e6;

/** Fixed budget pays minimums first, then reallocates released payments. No debt is modified. */
export function simulateDebtPayoff(source: AdvisorSource['debts'], extra: number, method: 'avalanche' | 'snowball') {
  if (source.some(d => d.monthlyRate === null || d.payment <= 0)) return null;
  const debts = source.map(d => ({ ...d, monthlyRate: d.monthlyRate!, balance: d.balance }));
  const budget = sum(debts.map(d => d.payment)) + extra;
  let interest = 0;
  for (let month = 0; month <= 600; month += 1) {
    if (debts.every(d => d.balance <= 0.000001)) return { months: month, interest: money(interest) };
    if (month === 600 || budget <= 0) return null;
    let remaining = budget;
    for (const d of debts) {
      const charge = d.balance * d.monthlyRate;
      interest += charge; d.balance += charge;
      const payment = Math.min(d.payment, d.balance, remaining);
      d.balance -= payment; remaining -= payment;
    }
    const order = [...debts].sort((a, b) => method === 'avalanche'
      ? b.monthlyRate - a.monthlyRate || a.balance - b.balance
      : a.balance - b.balance || b.monthlyRate - a.monthlyRate);
    for (const d of order) { const payment = Math.min(d.balance, remaining); d.balance -= payment; remaining -= payment; }
  }
  return null;
}

export function buildCapabilityReport(input: AdvisorRequest, source: AdvisorSource, now = new Date()): AdvisorReport {
  const report: AdvisorReport = {
    capability: input.capability, currency: input.currency, month: input.month, generatedAt: now.toISOString(),
    methodology: 'sfm-advisor-v1', source: 'account_records_and_explicit_assumptions', metrics: [],
    missing: [...source.missing], warnings: ['recorded_values_not_live_quotes', 'simulation_not_prediction'],
    actions: [], schedule: [], allocation: [], assumptions: (({ save, ...rest }) => { void save; return rest; })(input),
  };
  const metric = (key: string, value: number | null, unit: AdvisorMetric['unit'] = 'money') => report.metrics.push({ key, value: value === null || !Number.isFinite(value) ? null : money(value), unit });
  const action = (code: string, href: string) => report.actions.push({ code, href });
  const portfolio = sum(source.holdings.map(h => h.value));
  const incompleteDebt = source.missing.includes('debt_balance_or_payment');
  const debt = incompleteDebt ? null : sum(source.debts.map(d => d.balance));
  const debtPayments = incompleteDebt ? null : sum(source.debts.map(d => d.payment));
  const outflow = source.expenses === null || debtPayments === null ? null : source.expenses + (source.debtPaymentsNotInExpenses ?? debtPayments);
  const surplus = source.income === null || outflow === null ? null : source.income - outflow;
  const assets = source.savings === null ? null : source.savings + portfolio;
  const reserve = outflow === null ? null : outflow * input.reserveMonths;
  if (source.excluded) report.warnings.push('other_currency_or_incomplete_rows_excluded');
  if (source.debts.length) report.warnings.push('due_debt_payments_included');
  metric('excluded_records', source.excluded, 'count');
  if (surplus !== null && surplus < 0) action('review_deficit', '/expenses');
  if (reserve !== null && source.savings !== null && source.savings < reserve) action('build_reserve', '/savings');
  switch (input.capability) {
    case 'coach':
      metric('monthly_surplus', surplus); metric('reserve_target', reserve);
      metric('reserve_gap', reserve === null || source.savings === null ? null : Math.max(0, reserve - source.savings));
      metric('reserve_completion_months', reserve === null || source.savings === null || surplus === null || surplus <= 0 ? null : Math.ceil(Math.max(0, reserve - source.savings) / surplus), 'months');
      action('review_monthly_progress', '/income/month-close'); break;
    case 'planner': {
      metric('monthly_surplus', surplus); metric('planned_contribution', input.monthlyContribution);
      if (surplus !== null && input.monthlyContribution > Math.max(0, surplus)) report.warnings.push('contribution_exceeds_surplus');
      if (assets === null) { report.missing.push('savings'); break; }
      let value = assets;
      const rate = Math.pow(1 + (input.annualReturn - input.annualFees) / 100, 1 / 12) - 1;
      for (let month = 1; month <= input.horizonMonths; month += 1) {
        value = value * (1 + rate) + input.monthlyContribution;
        report.schedule.push({ month, value: money(value) });
      }
      metric('projected_assets', value); action('compare_saved_plans', '/economic-intelligence/advisors'); break;
    }
    case 'portfolio': {
      metric('recorded_portfolio', portfolio); metric('holding_count', source.holdings.length, 'count');
      report.allocation = source.holdings.map(h => ({ name: h.name, amount: h.value, percent: portfolio > 0 ? h.value / portfolio * 100 : null }));
      metric('largest_holding_percent', portfolio > 0 ? Math.max(...source.holdings.map(h => h.value / portfolio * 100)) : null, 'percent');
      if (!source.holdings.length) report.missing.push('holdings');
      action('review_holdings', '/investments'); break;
    }
    case 'spending': {
      metric('recorded_expenses', source.expenses); metric('monthly_surplus', surplus);
      report.allocation = source.spending.map(s => ({ name: s.category, amount: s.amount, percent: source.expenses && source.expenses > 0 ? s.amount / source.expenses * 100 : null }));
      action('correct_categories', '/expenses'); break;
    }
    case 'retirement': {
      const realAnnual = (1 + (input.annualReturn - input.annualFees) / 100) / (1 + input.inflation / 100) - 1;
      const rate = Math.pow(1 + realAnnual, 1 / 12) - 1;
      const growth = Math.pow(1 + rate, input.horizonMonths);
      const projected = assets === null ? null : assets * growth + input.monthlyContribution * (Math.abs(rate) < 1e-10 ? input.horizonMonths : (growth - 1) / rate);
      const n = input.retirementYears * 12;
      const required = input.retirementSpending * (Math.abs(rate) < 1e-10 ? n : (1 - Math.pow(1 + rate, -n)) / rate);
      metric('real_annual_return', realAnnual * 100, 'percent'); metric('projected_real_assets', projected);
      metric('retirement_required', input.retirementSpending > 0 ? required : null);
      metric('retirement_gap', projected === null || input.retirementSpending <= 0 ? null : Math.max(0, required - projected));
      if (!input.retirementSpending) report.missing.push('retirement_spending');
      report.warnings.push('constant_real_contribution_no_tax_or_pension', 'sequence_risk_not_modelled');
      action('review_retirement_assumptions', '/economic-intelligence/advisors'); break;
    }
    case 'debt': {
      metric('debt_balance', debt); metric('monthly_debt_payments', debtPayments);
      for (const method of ['avalanche', 'snowball'] as const) {
        const simulation = incompleteDebt ? null : simulateDebtPayoff(source.debts, input.extraDebtPayment, method);
        metric(`${method}_months`, simulation?.months ?? null, 'months'); metric(`${method}_interest`, simulation?.interest ?? null);
      }
      if (source.debts.some(d => d.monthlyRate === null || d.payment <= 0)) report.missing.push('debt_rate_or_payment');
      if (surplus !== null && input.extraDebtPayment > Math.max(0, surplus)) report.warnings.push('contribution_exceeds_surplus');
      report.warnings.push('fixed_rates_no_early_repayment_fees'); action('review_debt_terms', '/debts'); break;
    }
    case 'goals': {
      let required = 0; let incomplete = false;
      for (const goal of source.goals) {
        const gap = Math.max(0, goal.target - goal.saved);
        const monthly = goal.months === null ? null : gap / Math.max(1, goal.months);
        if (monthly === null) incomplete = true; else required += monthly;
        report.allocation.push({ name: goal.name, amount: gap, percent: goal.target > 0 ? Math.min(100, goal.saved / goal.target * 100) : null });
      }
      metric('goal_monthly_required', incomplete ? null : required);
      metric('goal_monthly_gap', incomplete || surplus === null ? null : Math.max(0, required - Math.max(0, surplus)));
      if (!source.goals.length) report.missing.push('goals');
      if (incomplete) report.missing.push('goal_deadlines');
      action('prioritize_goals', '/goals'); break;
    }
    case 'investment':
      metric('monthly_surplus', surplus); metric('reserve_target', reserve);
      metric('capital_above_reserve', reserve === null || source.savings === null ? null : Math.max(0, source.savings - reserve));
      report.warnings.push('capacity_not_buy_recommendation'); action('research_with_sources', '/ai-analyst/analyze'); break;
    case 'risk':
      metric('debt_service_percent', source.income && source.income > 0 && debtPayments !== null ? debtPayments / source.income * 100 : null, 'percent');
      metric('runway_months', outflow && outflow > 0 && source.savings !== null ? source.savings / outflow : null, 'months');
      metric('monthly_surplus', surplus);
      report.warnings.push('ratios_not_probability'); action('compare_stress_scenarios', '/decisions/simulator'); break;
    case 'wealth':
      metric('recorded_assets', assets); metric('debt_balance', debt); metric('recorded_net_worth', assets === null || debt === null ? null : assets - debt);
      report.allocation = [{ name: 'savings', amount: source.savings ?? 0, percent: null }, { name: 'investments', amount: portfolio, percent: null }].filter(r => r.name !== 'savings' || source.savings !== null);
      report.warnings.push('selected_currency_financial_assets_only'); action('review_wealth_records', '/reports'); break;
  }
  report.missing = [...new Set(report.missing)];
  report.warnings = [...new Set(report.warnings)];
  return report;
}
