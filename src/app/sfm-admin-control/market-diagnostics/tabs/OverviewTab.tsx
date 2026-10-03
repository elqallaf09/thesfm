'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { FeatureHealthGrid } from '../components/FeatureHealthGrid';
import { ActionCenterList } from '../components/ActionCenterList';
import { DiagnosticIssueSections } from '../components/DiagnosticIssueSections';

export function OverviewTab() {
  const { t } = useLanguage();
  const { ops, runAction, actionState } = useOperationsCenterContext();
  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_overview')}>
      <HealthScoreCard overview={ops.overview} />

      <h3 className="ops-section-title">{t('ops_center_feature_health_title')}</h3>
      <FeatureHealthGrid rows={ops.featureHealth} />

      <h3 className="ops-section-title">{t('ops_center_action_center_title')}</h3>
      <ActionCenterList actions={ops.actions} onAction={runAction} actionState={actionState} />

      <DiagnosticIssueSections issues={ops.rootCause} limit={5} />
    </section>
  );
}
