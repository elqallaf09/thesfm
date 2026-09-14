import type { FinancialTwinSnapshot } from './types';

export type WorkspaceEvidence = {
  finance: {
    snapshot: FinancialTwinSnapshot;
  };
  trader: {
    watchlistCount: number;
    activeAlertCount: number;
    triggeredAlertCount: number;
  };
  business: {
    activeProjectCount: number;
    fundingNeeds: Array<{ projectId: string; amount: number; currency: string; readinessScore: number | null }>;
  };
  freshness?: {
    finance: string | null;
    trader: string | null;
    business: string | null;
  };
};

export type CrossWorkspaceBriefItem = {
  code: string;
  severity: 'info' | 'warning' | 'danger';
  sources: Array<'finance' | 'trader' | 'business'>;
  evidence: Record<string, number | string | null>;
};

export type CrossWorkspaceBrief = {
  state: 'clear' | 'attention' | 'critical';
  items: CrossWorkspaceBriefItem[];
  compatibleFundingNeed: number | null;
  fundingCurrency: string | null;
  generatedFrom: Array<'finance' | 'trader' | 'business'>;
};

function normalizeCurrency(value: unknown) {
  const currency = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function sameCurrencyFunding(evidence: WorkspaceEvidence) {
  const currency = normalizeCurrency(evidence.finance.snapshot.currency);
  if (!currency) return { total: null, currency: null };
  const compatible = evidence.business.fundingNeeds.filter(item => normalizeCurrency(item.currency) === currency);
  const incompatibleExists = evidence.business.fundingNeeds.some(item => normalizeCurrency(item.currency) !== currency);
  if (incompatibleExists) return { total: null, currency };
  return {
    total: compatible.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0),
    currency,
  };
}

function push(items: CrossWorkspaceBriefItem[], item: CrossWorkspaceBriefItem) {
  if (!items.some(existing => existing.code === item.code)) items.push(item);
}

export function buildCrossWorkspaceBrief(evidence: WorkspaceEvidence): CrossWorkspaceBrief {
  const { snapshot } = evidence.finance;
  const marketAttention = evidence.trader.watchlistCount > 0 || evidence.trader.activeAlertCount > 0 || evidence.trader.triggeredAlertCount > 0;
  const funding = sameCurrencyFunding(evidence);
  const hasFundingNeed = evidence.business.fundingNeeds.some(item => Number(item.amount) > 0);
  const items: CrossWorkspaceBriefItem[] = [];

  if (marketAttention && (snapshot.monthlySurplus <= 0 || (snapshot.runwayMonths !== null && snapshot.runwayMonths < 3))) {
    push(items, {
      code: 'market_attention_vs_low_liquidity',
      severity: snapshot.monthlySurplus < 0 || (snapshot.runwayMonths !== null && snapshot.runwayMonths < 1) ? 'danger' : 'warning',
      sources: ['finance', 'trader'],
      evidence: {
        monthlySurplus: snapshot.monthlySurplus,
        runwayMonths: snapshot.runwayMonths,
        watchlistCount: evidence.trader.watchlistCount,
        activeAlertCount: evidence.trader.activeAlertCount,
      },
    });
  }

  if (marketAttention && snapshot.debtServiceRatio !== null && snapshot.debtServiceRatio > 0.35) {
    push(items, {
      code: 'market_attention_vs_debt_pressure',
      severity: snapshot.debtServiceRatio >= 0.5 ? 'danger' : 'warning',
      sources: ['finance', 'trader'],
      evidence: {
        debtServiceRatio: snapshot.debtServiceRatio,
        watchlistCount: evidence.trader.watchlistCount,
        triggeredAlertCount: evidence.trader.triggeredAlertCount,
      },
    });
  }

  if (hasFundingNeed && (snapshot.monthlySurplus <= 0 || (snapshot.runwayMonths !== null && snapshot.runwayMonths < 6))) {
    push(items, {
      code: 'business_funding_vs_personal_liquidity',
      severity: snapshot.monthlySurplus < 0 || (snapshot.runwayMonths !== null && snapshot.runwayMonths < 3) ? 'danger' : 'warning',
      sources: ['finance', 'business'],
      evidence: {
        monthlySurplus: snapshot.monthlySurplus,
        runwayMonths: snapshot.runwayMonths,
        activeProjectCount: evidence.business.activeProjectCount,
        fundingNeed: funding.total,
      },
    });
  }

  if (hasFundingNeed && marketAttention && snapshot.monthlySurplus > 0) {
    const annualSurplus = snapshot.monthlySurplus * 12;
    const fundingPressure = funding.total === null ? null : funding.total / Math.max(1, annualSurplus);
    if (fundingPressure === null || fundingPressure > 0.5) {
      push(items, {
        code: 'business_and_market_compete_for_surplus',
        severity: fundingPressure !== null && fundingPressure > 1 ? 'warning' : 'info',
        sources: ['finance', 'trader', 'business'],
        evidence: {
          annualSurplus,
          fundingNeed: funding.total,
          fundingPressure,
          watchlistCount: evidence.trader.watchlistCount,
          activeProjectCount: evidence.business.activeProjectCount,
        },
      });
    }
  }

  if (items.length === 0) {
    push(items, {
      code: 'no_cross_workspace_conflict_detected',
      severity: 'info',
      sources: ['finance', 'trader', 'business'],
      evidence: {
        monthlySurplus: snapshot.monthlySurplus,
        runwayMonths: snapshot.runwayMonths,
        watchlistCount: evidence.trader.watchlistCount,
        activeProjectCount: evidence.business.activeProjectCount,
      },
    });
  }

  const rank = { danger: 0, warning: 1, info: 2 } as const;
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.code.localeCompare(b.code));
  const state = items.some(item => item.severity === 'danger') ? 'critical' : items.some(item => item.severity === 'warning') ? 'attention' : 'clear';

  return {
    state,
    items,
    compatibleFundingNeed: funding.total,
    fundingCurrency: funding.currency,
    generatedFrom: ['finance', 'trader', 'business'],
  };
}
