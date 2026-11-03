export type CostType = 'fixed' | 'variable' | 'one-time';
export type ScenarioId = 'conservative' | 'base' | 'optimistic';

export type Assumptions = {
  currency: string;
  forecastPeriod: string;
  initialCapital: string;
  openingCash: string;
  revenueGrowth: string;
  expenseGrowth: string;
  discountRate: string;
};

export type RevenueStream = {
  id: string;
  name: string;
  startingRevenue: string;
  growthRate: string;
  grossMargin: string;
  notes: string;
};

export type CostItem = {
  id: string;
  name: string;
  monthlyCost: string;
  type: CostType;
  growthRate: string;
  notes: string;
};

export type ForecastRow = {
  month: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  totalCosts: number;
  netProfit: number;
  cashBalance: number;
  cumulativeCashFlow: number;
};

export type Kpis = {
  roi: number | null;
  paybackPeriod: number | null;
  breakEvenMonth: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  burnRate: number | null;
  runway: number | null;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
};

export type FinancialModelRow = {
  id: string;
  assumptions: Partial<Assumptions> | null;
  revenue_streams: RevenueStream[] | null;
  cost_items: CostItem[] | null;
};

export type ScenarioResult = {
  id: ScenarioId;
  totalRevenue: number;
  totalProfit: number;
  breakEvenMonth: number | null;
  roi: number | null;
  risk: 'low' | 'medium' | 'high';
};

export const scenarioConfig: Record<ScenarioId, { revenueMultiplier: number; costMultiplier: number }> = {
  conservative: { revenueMultiplier: 0.8, costMultiplier: 1.15 },
  base: { revenueMultiplier: 1, costMultiplier: 1 },
  optimistic: { revenueMultiplier: 1.2, costMultiplier: 0.95 },
};

export function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toNum(value: unknown) {
  const number = Number(String(value ?? '').replace(/[٠-٩]/g, c => String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0)-1776)).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

export function defaultRevenueStream(): RevenueStream {
  return { id: makeId('revenue'), name: '', startingRevenue: '', growthRate: '', grossMargin: '60', notes: '' };
}

export function defaultCostItem(): CostItem {
  return { id: makeId('cost'), name: '', monthlyCost: '', type: 'fixed', growthRate: '', notes: '' };
}

export function calculateModel(
  assumptions: Assumptions,
  revenueStreams: RevenueStream[],
  costItems: CostItem[],
  scenario: { revenueMultiplier: number; costMultiplier: number } = scenarioConfig.base,
) {
  const months = Math.max(1, Math.min(60, toNum(assumptions.forecastPeriod) || 36));
  const initialCapital = toNum(assumptions.initialCapital);
  const openingCash = toNum(assumptions.openingCash);
  const baseRevenueGrowth = toNum(assumptions.revenueGrowth) / 100;
  const baseExpenseGrowth = toNum(assumptions.expenseGrowth) / 100;
  let cashBalance = openingCash;
  let cumulativeProfit = 0;
  const forecast: ForecastRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    const revenueData = revenueStreams.reduce((totals, stream) => {
      const startingRevenue = toNum(stream.startingRevenue) * scenario.revenueMultiplier;
      const growth = baseRevenueGrowth + toNum(stream.growthRate) / 100;
      const revenue = startingRevenue * Math.pow(Math.max(0, 1 + growth), month - 1);
      const grossMargin = Math.max(0, Math.min(100, toNum(stream.grossMargin) || 0)) / 100;
      return {
        revenue: totals.revenue + revenue,
        cogs: totals.cogs + revenue * (1 - grossMargin),
      };
    }, { revenue: 0, cogs: 0 });

    const costData = costItems.reduce((totals, item) => {
      const startingCost = toNum(item.monthlyCost) * scenario.costMultiplier;
      const growth = baseExpenseGrowth + toNum(item.growthRate) / 100;
      const cost = item.type === 'one-time'
        ? month === 1 ? startingCost : 0
        : startingCost * Math.pow(Math.max(0, 1 + growth), month - 1);
      if (item.type === 'variable') return { variable: totals.variable + cost, operating: totals.operating };
      return { variable: totals.variable, operating: totals.operating + cost };
    }, { variable: 0, operating: 0 });

    const variableCosts = revenueData.cogs + costData.variable;
    const grossProfit = revenueData.revenue - variableCosts;
    const totalCosts = variableCosts + costData.operating;
    const netProfit = revenueData.revenue - totalCosts;
    cashBalance += netProfit;
    cumulativeProfit += netProfit;

    forecast.push({
      month,
      revenue: revenueData.revenue,
      cogs: variableCosts,
      grossProfit,
      operatingExpenses: costData.operating,
      totalCosts,
      netProfit,
      cashBalance,
      cumulativeCashFlow: cumulativeProfit - initialCapital,
    });
  }

  const totalRevenue = forecast.reduce((sum, row) => sum + row.revenue, 0);
  const totalCosts = forecast.reduce((sum, row) => sum + row.totalCosts, 0);
  const totalProfit = forecast.reduce((sum, row) => sum + row.netProfit, 0);
  const totalGrossProfit = forecast.reduce((sum, row) => sum + row.grossProfit, 0);
  const negativeMonths = forecast.filter(row => row.netProfit < 0);
  const burnRate = negativeMonths.length
    ? Math.abs(negativeMonths.reduce((sum, row) => sum + row.netProfit, 0) / negativeMonths.length)
    : null;
  const kpis: Kpis = {
    roi: initialCapital > 0 ? (totalProfit / initialCapital) * 100 : null,
    paybackPeriod: forecast.find(row => row.cumulativeCashFlow >= 0)?.month ?? null,
    breakEvenMonth: forecast.find(row => row.netProfit >= 0)?.month ?? null,
    grossMargin: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : null,
    netMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null,
    burnRate,
    runway: burnRate && burnRate > 0 ? openingCash / burnRate : null,
    totalRevenue,
    totalCosts,
    totalProfit,
  };
  return { forecast, kpis };
}

export function scenarioRisk(kpis: Kpis, period: number): 'low' | 'medium' | 'high' {
  if ((kpis.roi ?? -1) < 0) return 'high';
  if (!kpis.paybackPeriod || kpis.paybackPeriod > period) return 'medium';
  if (kpis.paybackPeriod > Math.ceil(period * 0.75)) return 'medium';
  return 'low';
}

