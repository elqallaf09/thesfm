import { currentMonthRange, moneyAmount, sumAmounts } from '@/lib/data/financeData';

export type DecisionType =
  | 'purchase'
  | 'investment'
  | 'project'
  | 'debt_saving'
  | 'charity_zakat'
  | 'budget';

export type DecisionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DecisionInputs = {
  title: string;
  decisionType: DecisionType;
  amount: number;
  currency: string;
  targetDate?: string;
  priority: DecisionPriority;
  notes?: string;
  recurringCost?: number;
  maintenanceCost?: number;
  alternativeAmount?: number;
  urgency?: 'low' | 'medium' | 'high';
  riskLevel?: 'low' | 'medium' | 'high';
  timeHorizonMonths?: number;
  linkedSymbol?: string;
  linkedProjectId?: string;
  requiredCapital?: number;
  expectedMonthlyCost?: number;
  expectedReturn?: number;
  debtAmount?: number;
  rate?: number;
  monthlyPayment?: number;
  emergencyFundAmount?: number;
  donationRequired?: boolean;
  usesSavings?: boolean;
};

export type DecisionSourceData = {
  income: any[];
  expenses: any[];
  savings: any[];
  investments: any[];
  goals: any[];
  projects: any[];
  financialModels: any[];
  zakatCalculations: any[];
  zakatAssets: any[];
  charityCommitments: any[];
};

export type DecisionScenario = {
  key: string;
  amount?: number;
  monthlyImpact?: number;
  missing?: string[];
};

export type DecisionAnalysis = {
  source: 'rules';
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number | null;
  savingsTotal: number;
  investmentsTotal: number;
  decisionRatio: number | null;
  netAfterDecision: number | null;
  savingsAfterDecision: number | null;
  score: number | null;
  status: 'initially_suitable' | 'needs_review' | 'high_risk' | 'insufficient_data';
  missingData: string[];
  riskFlags: string[];
  scenarios: DecisionScenario[];
  linkedProjectName?: string;
};

function inCurrentMonth(row: Record<string, unknown>, dateKeys: string[]) {
  const { startDate, endDate } = currentMonthRange();
  const value = dateKeys.map(key => row?.[key]).find(item => item);
  if (!value) return true;
  const date = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
  return date >= startDate && date <= endDate;
}

function monthlyExpenseRows(rows: any[]) {
  return rows.filter(row => inCurrentMonth(row, ['expense_date', 'date', 'created_at']));
}

function projectName(row: any) {
  return String(row?.name ?? row?.title ?? '').trim();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function amountValue(value: unknown) {
  return Math.max(0, moneyAmount(value));
}

function hasGoalsSupport(rows: any[]) {
  return rows.some(row => amountValue(row?.target_amount ?? row?.target) > 0);
}

export function analyzeDecision(inputs: DecisionInputs, data: DecisionSourceData): DecisionAnalysis {
  const amount = amountValue(inputs.amount);
  const monthlyIncome = sumAmounts(data.income, ['amount']);
  const monthlyExpenses = sumAmounts(monthlyExpenseRows(data.expenses), ['amount']);
  const savingsTotal = sumAmounts(data.savings, ['amount', 'current_value', 'balance']);
  const investmentsTotal = sumAmounts(data.investments, ['current_value', 'amount']);
  const monthlyNet = monthlyIncome > 0 && monthlyExpenses >= 0 ? monthlyIncome - monthlyExpenses : null;
  const decisionRatio = monthlyIncome > 0 && amount > 0 ? (amount / monthlyIncome) * 100 : null;
  const monthlyDecisionCost = amount + amountValue(inputs.recurringCost) + amountValue(inputs.maintenanceCost) + amountValue(inputs.expectedMonthlyCost);
  const netAfterDecision = monthlyNet === null ? null : monthlyNet - monthlyDecisionCost;
  const savingsAfterDecision = inputs.usesSavings || inputs.decisionType === 'project'
    ? savingsTotal - amount
    : savingsTotal;

  const missingData: string[] = [];
  if (amount <= 0) missingData.push('decision_amount');
  if (monthlyIncome <= 0) missingData.push('monthly_income');
  if (data.expenses.length === 0) missingData.push('monthly_expenses');
  if (data.savings.length === 0) missingData.push('savings');
  if (!hasGoalsSupport(data.goals)) missingData.push('goals');
  if (inputs.decisionType === 'project' && !inputs.linkedProjectId && data.projects.length === 0) missingData.push('project');
  if (inputs.decisionType === 'investment' && !inputs.riskLevel) missingData.push('risk_level');
  if (inputs.decisionType === 'debt_saving' && amountValue(inputs.debtAmount) <= 0) missingData.push('debt_amount');
  if (inputs.decisionType === 'charity_zakat' && data.zakatCalculations.length === 0 && !inputs.donationRequired) missingData.push('zakat_or_charity_context');

  const riskFlags: string[] = [];
  if (decisionRatio !== null && decisionRatio > 30) riskFlags.push('amount_high_vs_income');
  if (netAfterDecision !== null && netAfterDecision < 0) riskFlags.push('negative_net_after_decision');
  if (inputs.usesSavings && monthlyExpenses > 0 && savingsAfterDecision < monthlyExpenses) riskFlags.push('emergency_savings_low');
  if (inputs.decisionType === 'project' && savingsTotal > 0 && amount > savingsTotal * 0.7) riskFlags.push('project_consumes_savings');
  if (inputs.decisionType === 'investment' && inputs.riskLevel === 'high' && decisionRatio !== null && decisionRatio > 20) riskFlags.push('investment_high_risk_high_amount');
  if (inputs.decisionType === 'charity_zakat' && netAfterDecision !== null && netAfterDecision < monthlyExpenses * 0.1) riskFlags.push('charity_affects_essential_budget');

  const sufficientForScore = amount > 0 && monthlyIncome > 0 && data.expenses.length > 0;
  let score: number | null = null;
  if (sufficientForScore) {
    let nextScore = 100;
    if (decisionRatio !== null && decisionRatio > 30) nextScore -= 25;
    if (decisionRatio !== null && decisionRatio > 50) nextScore -= 20;
    if (netAfterDecision !== null && netAfterDecision < 0) nextScore -= 35;
    if (inputs.usesSavings && monthlyExpenses > 0 && savingsAfterDecision < monthlyExpenses * 3) nextScore -= 20;
    if (inputs.riskLevel === 'high') nextScore -= 10;
    if (!hasGoalsSupport(data.goals)) nextScore -= 8;
    nextScore -= Math.min(20, Math.max(0, missingData.length - 1) * 4);
    score = clampScore(nextScore);
  }

  const linkedProjectName = inputs.linkedProjectId
    ? projectName(data.projects.find(project => project?.id === inputs.linkedProjectId))
    : undefined;

  const scenarios: DecisionScenario[] = [];
  if (inputs.decisionType === 'purchase') {
    scenarios.push({ key: 'buy_now', amount, monthlyImpact: monthlyDecisionCost });
    scenarios.push({ key: 'delay_three_months', amount: amount > 0 ? amount / 3 : undefined, monthlyImpact: amount > 0 ? amount / 3 : undefined });
    scenarios.push({
      key: 'cheaper_alternative',
      amount: inputs.alternativeAmount ? amountValue(inputs.alternativeAmount) : undefined,
      monthlyImpact: inputs.alternativeAmount ? amountValue(inputs.alternativeAmount) : undefined,
      missing: inputs.alternativeAmount ? [] : ['alternative_amount'],
    });
  } else if (inputs.decisionType === 'investment') {
    scenarios.push({ key: 'invest_full_amount', amount, monthlyImpact: amount });
    scenarios.push({ key: 'invest_smaller_amount', amount: monthlyIncome > 0 ? monthlyIncome * 0.1 : undefined, monthlyImpact: monthlyIncome > 0 ? monthlyIncome * 0.1 : undefined, missing: monthlyIncome > 0 ? [] : ['monthly_income'] });
    scenarios.push({ key: 'downside_cash_only', amount, monthlyImpact: amount });
  } else if (inputs.decisionType === 'project') {
    scenarios.push({ key: 'use_savings_now', amount, monthlyImpact: amount + amountValue(inputs.expectedMonthlyCost) });
    scenarios.push({ key: 'wait_until_savings_target', amount: amount > savingsTotal ? amount - savingsTotal : 0, missing: savingsTotal > 0 ? [] : ['savings'] });
    scenarios.push({ key: 'reduce_project_capital', amount: amount > 0 ? amount * 0.8 : undefined, monthlyImpact: amountValue(inputs.expectedMonthlyCost) });
  } else if (inputs.decisionType === 'debt_saving') {
    scenarios.push({ key: 'repay_debt', amount: amountValue(inputs.debtAmount) || amount, monthlyImpact: amountValue(inputs.monthlyPayment) || amount });
    scenarios.push({ key: 'save_first', amount: amount, monthlyImpact: amount });
    scenarios.push({ key: 'split_between_debt_and_savings', amount: amount > 0 ? amount / 2 : undefined, monthlyImpact: amount > 0 ? amount / 2 : undefined });
  } else if (inputs.decisionType === 'charity_zakat') {
    scenarios.push({ key: 'pay_now', amount, monthlyImpact: amount });
    scenarios.push({ key: 'schedule_payment', amount, monthlyImpact: amount });
    scenarios.push({ key: 'confirm_zakat_before_payment', amount, missing: data.zakatCalculations.length > 0 ? [] : ['zakat_calculation'] });
  } else {
    scenarios.push({ key: 'approve_budget', amount, monthlyImpact: monthlyDecisionCost });
    scenarios.push({ key: 'reduce_budget', amount: amount > 0 ? amount * 0.8 : undefined, monthlyImpact: monthlyDecisionCost > 0 ? monthlyDecisionCost * 0.8 : undefined });
    scenarios.push({ key: 'delay_budget', amount, monthlyImpact: amount > 0 ? amount / 3 : undefined });
  }

  const status: DecisionAnalysis['status'] = score === null
    ? 'insufficient_data'
    : riskFlags.includes('negative_net_after_decision') || riskFlags.includes('emergency_savings_low')
      ? 'high_risk'
      : score >= 75
        ? 'initially_suitable'
        : 'needs_review';

  return {
    source: 'rules',
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    savingsTotal,
    investmentsTotal,
    decisionRatio,
    netAfterDecision,
    savingsAfterDecision,
    score,
    status,
    missingData,
    riskFlags,
    scenarios,
    linkedProjectName: linkedProjectName || undefined,
  };
}
