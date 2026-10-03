import type {
  ErrorCenterCategory,
  ErrorCenterEntry,
  FeatureHealthRow,
  NotInstrumentedErrorCategory,
  OperationsCenterState,
  OpsFeatureKey,
  RootCauseIssue,
} from './types';

const FEATURE_CATEGORY: Partial<Record<OpsFeatureKey, ErrorCenterCategory>> = {
  ai_services: 'ai',
  notifications: 'notifications',
  storage: 'storage',
  database: 'database',
  authentication: 'api',
  shariah_research: 'shariah',
  email: 'email',
};

/** One issue appears in one category; calendar and service failures cannot vanish by ID prefix. */
export function buildErrorCenterFromIssues(issues: RootCauseIssue[], rows: FeatureHealthRow[]): OperationsCenterState['errorCenter'] {
  const byCategory: Record<ErrorCenterCategory, ErrorCenterEntry[]> = {
    provider: [], api: [], shariah: [], email: [], ai: [], database: [], notifications: [], storage: [],
  };
  for (const issue of issues) {
    const category = issue.affectedFeature ? FEATURE_CATEGORY[issue.affectedFeature] ?? 'provider' : issue.affectedProvider ? 'provider' : 'api';
    byCategory[category].push({
      id: issue.id,
      category,
      severity: issue.severity,
      occurredAt: issue.lastOccurrence,
      retryAvailable: issue.retryAvailable,
      logKey: issue.problemKey,
      recommendationKey: issue.suggestedFixKey,
      affectedFeature: issue.affectedFeature,
      affectedProvider: issue.affectedProvider,
      kind: issue.kind,
      reasonKey: issue.rootCauseKey,
      reason: typeof issue.rootCauseParams.reason === 'string' ? issue.rootCauseParams.reason : null,
    });
  }
  const notInstrumented: NotInstrumentedErrorCategory[] = ['frontend'];
  const monitored: Array<[OpsFeatureKey, NotInstrumentedErrorCategory]> = [
    ['database', 'database'], ['notifications', 'notifications'], ['storage', 'storage'], ['ai_services', 'ai'],
  ];
  for (const [feature, category] of monitored) {
    const row = rows.find(item => item.feature === feature);
    if (!row || row.status === 'uninstrumented') notInstrumented.push(category);
  }
  return { byCategory, notInstrumented };
}
