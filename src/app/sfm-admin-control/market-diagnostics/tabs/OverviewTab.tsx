'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { OpsAction } from '@/lib/admin/opsCenter/types';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { FeatureHealthGrid } from '../components/FeatureHealthGrid';
import { ActionCenterList } from '../components/ActionCenterList';
import { RootCauseAccordion } from '../components/RootCauseAccordion';

export function OverviewTab() {
  const { t } = useLanguage();
  const { ops, retry } = useOperationsCenterContext();
  if (!ops) return null;

  function handleAction(action: OpsAction) {
    if (!action.available) return;
    if (action.kind === 'retry_market_providers' || action.kind === 'refresh_symbol_catalog') retry();
  }

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_overview')}>
      <HealthScoreCard overview={ops.overview} />

      <h3 className="ops-section-title">{t('ops_center_feature_health_title')}</h3>
      <FeatureHealthGrid rows={ops.featureHealth} />

      <h3 className="ops-section-title">{t('ops_center_action_center_title')}</h3>
      <ActionCenterList actions={ops.actions} onAction={handleAction} />

      <h3 className="ops-section-title">{t('ops_center_root_cause_title')}</h3>
      <RootCauseAccordion issues={ops.rootCause} limit={5} />
    </section>
  );
}
