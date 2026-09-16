import type { FinancialTwinForecast, FinancialTwinSnapshot } from '@/domain/economic-intelligence';

export type EconomicGoalStatus = 'completed' | 'on_track' | 'behind' | 'insufficient';

export type EconomicDashboardWarningCode =
  | 'monthly_deficit'
  | 'liquidity_runway_below_three_months'
  | 'debt_service_above_35_percent'
  | 'goal_behind'
  | 'incomplete_data';

export type EconomicDashboardScenarioEnd = {
  id: 'stress' | 'base' | 'optimistic';
  monthlySurplus: number;
  liquidBalance: number;
  investmentBalance: number;
  netWorth: number;
};

export function economicDashboardWarningCodes(
  snapshot: FinancialTwinSnapshot,
  goalStatuses: EconomicGoalStatus[] = [],
  hasSourceErrors = false,
): EconomicDashboardWarningCode[] {
  const warnings: EconomicDashboardWarningCode[] = [];
  if (snapshot.monthlySurplus < 0) warnings.push('monthly_deficit');
  if (snapshot.runwayMonths !== null && snapshot.runwayMonths < 3) warnings.push('liquidity_runway_below_three_months');
  if (snapshot.debtServiceRatio !== null && snapshot.debtServiceRatio > 0.35) warnings.push('debt_service_above_35_percent');
  if (goalStatuses.includes('behind')) warnings.push('goal_behind');
  if (hasSourceErrors || snapshot.dataQuality.completeness < 1) warnings.push('incomplete_data');
  return warnings;
}

export function economicGoalCounts(statuses: EconomicGoalStatus[] = []) {
  return {
    onTrack: statuses.filter((status) => status === 'on_track').length,
    behind: statuses.filter((status) => status === 'behind').length,
    completed: statuses.filter((status) => status === 'completed').length,
    insufficient: statuses.filter((status) => status === 'insufficient').length,
  };
}

export function economicForecastEnd(forecast: FinancialTwinForecast): EconomicDashboardScenarioEnd[] {
  return (['stress', 'base', 'optimistic'] as const).flatMap((id) => {
    const last = forecast.scenarios[id].points.at(-1);
    if (!last) return [];
    return [{
      id,
      monthlySurplus: last.surplus,
      liquidBalance: last.liquidBalance,
      investmentBalance: last.investmentBalance,
      netWorth: last.netWorth,
    }];
  });
}
