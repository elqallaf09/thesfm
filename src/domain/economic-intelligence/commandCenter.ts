import type { AdvisorGrounding, EconomicAdvisorId } from './advisors';

export type EconomicPrioritySeverity = 'critical' | 'high' | 'medium' | 'low';

export type EconomicCommandPriority = {
  id: string;
  advisor: EconomicAdvisorId;
  severity: EconomicPrioritySeverity;
  score: number;
  code: string;
  evidence: string[];
  confidence: number;
};

export type EconomicCommandCenter = {
  generatedAt: string;
  confidence: number;
  priorities: EconomicCommandPriority[];
  missing: string[];
  warnings: string[];
};

function factNumber(grounding: AdvisorGrounding, key: string) {
  const value = grounding.facts.find((fact) => fact.key === key)?.value;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function severityFromScore(score: number): EconomicPrioritySeverity {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function pushPriority(
  items: EconomicCommandPriority[],
  grounding: AdvisorGrounding,
  code: string,
  score: number,
  evidence: string[],
) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  items.push({
    id: `${grounding.advisor}:${code}`,
    advisor: grounding.advisor,
    severity: severityFromScore(normalizedScore),
    score: normalizedScore,
    code,
    evidence,
    confidence: grounding.confidence,
  });
}

export function buildEconomicCommandCenter(groundings: AdvisorGrounding[]): EconomicCommandCenter {
  const priorities: EconomicCommandPriority[] = [];

  for (const grounding of groundings) {
    const monthlySurplus = factNumber(grounding, 'monthly_surplus');
    const runway = factNumber(grounding, 'runway_months');
    const debtService = factNumber(grounding, 'debt_service_ratio');
    const investmentBalance = factNumber(grounding, 'investment_balance');

    if (monthlySurplus !== null && monthlySurplus < 0) {
      pushPriority(priorities, grounding, 'restore_positive_cash_flow', 98, [`monthly_surplus:${monthlySurplus}`]);
    } else if (monthlySurplus !== null && monthlySurplus === 0) {
      pushPriority(priorities, grounding, 'build_monthly_surplus', 82, ['monthly_surplus:0']);
    }

    if (runway !== null && runway < 1) {
      pushPriority(priorities, grounding, 'rebuild_emergency_liquidity', 96, [`runway_months:${runway.toFixed(2)}`]);
    } else if (runway !== null && runway < 3) {
      pushPriority(priorities, grounding, 'strengthen_liquidity_buffer', 78, [`runway_months:${runway.toFixed(2)}`]);
    }

    if (debtService !== null && debtService > 0.5) {
      pushPriority(priorities, grounding, 'reduce_debt_service_pressure', 94, [`debt_service_ratio:${debtService.toFixed(3)}`]);
    } else if (debtService !== null && debtService > 0.35) {
      pushPriority(priorities, grounding, 'review_debt_capacity', 72, [`debt_service_ratio:${debtService.toFixed(3)}`]);
    }

    if (grounding.advisor === 'investment' && investmentBalance !== null && investmentBalance > 0 && grounding.missing.includes('market_evidence')) {
      pushPriority(priorities, grounding, 'refresh_market_evidence', 58, [`investment_balance:${investmentBalance}`]);
    }

    if (grounding.advisor === 'business' && grounding.missing.includes('business_evidence')) {
      pushPriority(priorities, grounding, 'complete_business_evidence', 52, ['missing:business_evidence']);
    }

    if (grounding.warnings.includes('economic_context_incomplete')) {
      pushPriority(priorities, grounding, 'refresh_economic_context', 42, ['warning:economic_context_incomplete']);
    }
  }

  const deduped = new Map<string, EconomicCommandPriority>();
  for (const item of priorities) {
    const existing = deduped.get(item.code);
    if (!existing || item.score > existing.score || item.confidence > existing.confidence) deduped.set(item.code, item);
  }

  const sorted = [...deduped.values()]
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, 5);

  const confidence = groundings.length
    ? groundings.reduce((sum, grounding) => sum + grounding.confidence, 0) / groundings.length
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    confidence,
    priorities: sorted,
    missing: [...new Set(groundings.flatMap((grounding) => grounding.missing))],
    warnings: [...new Set(groundings.flatMap((grounding) => grounding.warnings))],
  };
}
