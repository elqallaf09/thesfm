import type { FinancialTwinSnapshot } from '@/domain/economic-intelligence';

export type EconomicHomeDecision = {
  id?: string;
  title: string;
  status?: string | null;
  riskScore?: number | null;
  updatedAt?: string | null;
};

export type EconomicHomeGoal = {
  title?: string;
  status?: string;
};

export type EconomicHomeSummary = {
  health: 'strong' | 'stable' | 'watch' | 'critical';
  riskCode: 'monthly_deficit' | 'low_liquidity' | 'high_debt' | 'goal_off_track' | 'incomplete_data' | 'none';
  opportunityCode: 'build_liquidity' | 'accelerate_goal' | 'reduce_debt' | 'invest_surplus' | 'improve_data' | 'none';
  attentionDecision: EconomicHomeDecision | null;
};

function decisionRisk(decision: EconomicHomeDecision) {
  const score = Number(decision.riskScore ?? 0);
  if (Number.isFinite(score) && score > 0) return score;
  if (decision.status === 'high_risk') return 90;
  if (decision.status === 'needs_review') return 60;
  if (decision.status === 'insufficient_data') return 45;
  return 0;
}

export function buildEconomicHomeSummary(
  snapshot: FinancialTwinSnapshot,
  goals: EconomicHomeGoal[] = [],
  decisions: EconomicHomeDecision[] = [],
): EconomicHomeSummary {
  const hasBehindGoal = goals.some(goal => goal.status === 'behind');
  const completeness = snapshot.dataQuality.completeness;

  if (snapshot.dataQuality.missing.length > 0) {
    return { health: 'watch', riskCode: 'incomplete_data', opportunityCode: 'improve_data', attentionDecision: null };
  }

  let riskCode: EconomicHomeSummary['riskCode'] = 'none';
  if (snapshot.monthlySurplus < 0) riskCode = 'monthly_deficit';
  else if (snapshot.runwayMonths !== null && snapshot.runwayMonths < 3) riskCode = 'low_liquidity';
  else if (snapshot.debtServiceRatio !== null && snapshot.debtServiceRatio > 0.35) riskCode = 'high_debt';
  else if (hasBehindGoal) riskCode = 'goal_off_track';
  else if (completeness < 0.8) riskCode = 'incomplete_data';

  let opportunityCode: EconomicHomeSummary['opportunityCode'] = 'none';
  if (snapshot.runwayMonths !== null && snapshot.runwayMonths < 6 && snapshot.monthlySurplus > 0) opportunityCode = 'build_liquidity';
  else if (snapshot.debtServiceRatio !== null && snapshot.debtServiceRatio > 0.2 && snapshot.monthlySurplus > 0) opportunityCode = 'reduce_debt';
  else if (hasBehindGoal && snapshot.monthlySurplus > 0) opportunityCode = 'accelerate_goal';
  else if (snapshot.monthlySurplus > 0 && (snapshot.runwayMonths === null || snapshot.runwayMonths >= 6)) opportunityCode = 'invest_surplus';
  else if (completeness < 1) opportunityCode = 'improve_data';

  let health: EconomicHomeSummary['health'] = 'stable';
  if (snapshot.monthlySurplus < 0 || (snapshot.runwayMonths !== null && snapshot.runwayMonths < 1)) health = 'critical';
  else if (riskCode !== 'none') health = 'watch';
  else if (snapshot.monthlySurplus > 0 && completeness >= 0.9 && (snapshot.runwayMonths === null || snapshot.runwayMonths >= 6)) health = 'strong';

  const attentionDecision = [...decisions]
    .filter(decision => decision.status !== 'initially_suitable')
    .sort((a, b) => decisionRisk(b) - decisionRisk(a))[0] ?? null;

  return { health, riskCode, opportunityCode, attentionDecision };
}
