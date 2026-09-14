import type { CrossWorkspaceBrief, CrossWorkspaceBriefItem } from './crossWorkspaceBrain';

export type DailyPriorityAction = {
  code: string;
  severity: 'info' | 'warning' | 'danger';
  actionUrl: string;
  explainUrl: string;
  sources: CrossWorkspaceBriefItem['sources'];
  fingerprint: string;
};

const ACTION_URLS: Record<string, string> = {
  market_attention_vs_low_liquidity: '/dashboard',
  market_attention_vs_debt_pressure: '/debts',
  business_funding_vs_personal_liquidity: '/business-hub',
  business_and_market_compete_for_surplus: '/decisions/simulator',
  no_cross_workspace_conflict_detected: '/dashboard',
};

function bucket(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'na';
  const magnitude = Math.abs(number);
  if (magnitude >= 100000) return '100k+';
  if (magnitude >= 10000) return '10k+';
  if (magnitude >= 1000) return '1k+';
  if (magnitude >= 100) return '100+';
  if (magnitude >= 10) return '10+';
  if (magnitude >= 1) return '1+';
  return '<1';
}

function fingerprintFor(item: CrossWorkspaceBriefItem) {
  const importantEvidence = Object.entries(item.evidence)
    .filter(([key]) => ['monthlySurplus', 'runwayMonths', 'debtServiceRatio', 'fundingNeed', 'fundingPressure'].includes(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${bucket(value)}`)
    .join('|');
  return `${item.code}:${item.severity}:${importantEvidence || 'stable'}`;
}

function explainUrlFor(sources: CrossWorkspaceBriefItem['sources']) {
  const query = sources.slice().sort().join(',');
  return `/economic-intelligence?explain=${encodeURIComponent(query)}#evidence-provenance`;
}

export function buildDailyPriorityActions(brief: CrossWorkspaceBrief): DailyPriorityAction[] {
  return brief.items.map(item => ({
    code: item.code,
    severity: item.severity,
    actionUrl: ACTION_URLS[item.code] ?? '/dashboard',
    explainUrl: explainUrlFor(item.sources),
    sources: item.sources,
    fingerprint: fingerprintFor(item),
  }));
}

export function highestDailyPriority(brief: CrossWorkspaceBrief): DailyPriorityAction | null {
  return buildDailyPriorityActions(brief)[0] ?? null;
}
