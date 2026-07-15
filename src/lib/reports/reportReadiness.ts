export type ReportReadinessStatus = 'ready' | 'needs_data' | 'unavailable' | 'error' | 'unknown';

export type ReportReadinessKey =
  | 'income'
  | 'expenses'
  | 'projectIncome'
  | 'projectExpenses'
  | 'savings'
  | 'goals'
  | 'investments'
  | 'projects'
  | 'feasibility'
  | 'financialModels'
  | 'tasks'
  | 'milestones'
  | 'documents'
  | 'pitchDecks'
  | 'marketWatchlist'
  | 'zakatCalculations'
  | 'zakatAssets'
  | 'charityProjects'
  | 'charityDonations'
  | 'charityBeneficiaries'
  | 'charityImpact';

export const REPORT_READINESS_IDS = [
  'monthly-financial',
  'income',
  'expenses',
  'savings',
  'goals',
  'investments',
  'watchlist',
  'market-analysis',
  'project-business',
  'project-feasibility',
  'project-financial',
  'project-kpis',
  'pitch-deck',
  'zakat',
  'charity-projects',
  'charity-donations',
  'beneficiaries',
  'charity-impact',
] as const;

export type ReportReadinessId = typeof REPORT_READINESS_IDS[number];
export type ReportReadinessRecords = Partial<Record<ReportReadinessKey, unknown[]>>;
export type ReportReadinessErrors = Partial<Record<ReportReadinessKey, string>>;

const REQUIRED_KEYS: Record<ReportReadinessId, ReportReadinessKey[]> = {
  'monthly-financial': ['income', 'expenses', 'savings', 'investments'],
  income: ['income'],
  expenses: ['expenses'],
  savings: ['savings'],
  goals: ['goals'],
  investments: ['investments'],
  watchlist: ['marketWatchlist'],
  'market-analysis': [],
  'project-business': ['projects'],
  'project-feasibility': ['feasibility'],
  'project-financial': ['projects', 'financialModels', 'projectIncome', 'projectExpenses'],
  'project-kpis': ['projects', 'tasks', 'financialModels', 'documents', 'milestones'],
  'pitch-deck': ['projects'],
  zakat: ['zakatCalculations', 'zakatAssets'],
  'charity-projects': ['charityProjects'],
  'charity-donations': ['charityDonations'],
  beneficiaries: ['charityBeneficiaries'],
  'charity-impact': ['charityImpact', 'charityDonations', 'charityBeneficiaries'],
};

function hasError(keys: ReportReadinessKey[], errors: ReportReadinessErrors) {
  return keys.some(key => Boolean(errors[key]));
}

function isKnown(records: ReportReadinessRecords, key: ReportReadinessKey) {
  return Array.isArray(records[key]);
}

function hasRows(records: ReportReadinessRecords, key: ReportReadinessKey) {
  return (records[key]?.length ?? 0) > 0;
}

function anyOf(keys: ReportReadinessKey[], records: ReportReadinessRecords): ReportReadinessStatus {
  if (keys.some(key => hasRows(records, key))) return 'ready';
  if (keys.some(key => !isKnown(records, key))) return 'unknown';
  return 'needs_data';
}

function allOf(keys: ReportReadinessKey[], records: ReportReadinessRecords): ReportReadinessStatus {
  if (keys.some(key => isKnown(records, key) && !hasRows(records, key))) return 'needs_data';
  if (keys.some(key => !isKnown(records, key))) return 'unknown';
  return 'ready';
}

export function evaluateReportReadiness(
  reportId: ReportReadinessId,
  records: ReportReadinessRecords,
  errors: ReportReadinessErrors = {},
): ReportReadinessStatus {
  if (reportId === 'market-analysis') return 'unavailable';

  const keys = REQUIRED_KEYS[reportId];
  if (hasError(keys, errors)) return 'error';

  if (reportId === 'monthly-financial' || reportId === 'zakat' || reportId === 'charity-impact') {
    return anyOf(keys, records);
  }

  if (reportId === 'project-financial') {
    if (!isKnown(records, 'projects')) return 'unknown';
    if (!hasRows(records, 'projects')) return 'needs_data';
    return anyOf(['financialModels', 'projectIncome', 'projectExpenses'], records);
  }

  if (reportId === 'project-kpis') {
    if (!isKnown(records, 'projects')) return 'unknown';
    if (!hasRows(records, 'projects')) return 'needs_data';
    return anyOf(['tasks', 'financialModels', 'documents', 'milestones'], records);
  }

  return allOf(keys, records);
}

export function summarizeReportReadiness(
  records: ReportReadinessRecords,
  errors: ReportReadinessErrors = {},
) {
  const statuses = REPORT_READINESS_IDS.map(id => ({ id, status: evaluateReportReadiness(id, records, errors) }));
  return {
    statuses,
    ready: statuses.filter(item => item.status === 'ready').length,
    needsData: statuses.filter(item => item.status === 'needs_data').length,
    unavailable: statuses.filter(item => item.status === 'unavailable').length,
    failed: statuses.filter(item => item.status === 'error').length,
    unknown: statuses.filter(item => item.status === 'unknown').length,
  };
}

export function summarizeWorkflowReportReadiness(
  records: ReportReadinessRecords,
  errors: ReportReadinessErrors = {},
) {
  const charityStatuses = [
    evaluateReportReadiness('charity-projects', records, errors),
    evaluateReportReadiness('charity-donations', records, errors),
    evaluateReportReadiness('beneficiaries', records, errors),
    evaluateReportReadiness('charity-impact', records, errors),
  ];
  const charity = charityStatuses.includes('ready')
    ? 'ready'
    : charityStatuses.includes('error')
      ? 'error'
      : charityStatuses.includes('unknown')
        ? 'unknown'
        : 'needs_data';

  return {
    financial: evaluateReportReadiness('monthly-financial', records, errors),
    projects: evaluateReportReadiness('project-business', records, errors),
    zakat: evaluateReportReadiness('zakat', records, errors),
    charity,
  } satisfies Record<'financial' | 'projects' | 'zakat' | 'charity', ReportReadinessStatus>;
}
