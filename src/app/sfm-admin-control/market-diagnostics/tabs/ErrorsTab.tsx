'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { ErrorCenterTable } from '../components/ErrorCenterTable';
import { DiagnosticIssueSections } from '../components/DiagnosticIssueSections';

export function ErrorsTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_errors')}>
      <h3 className="ops-section-title">{t('ops_center_error_center_title')}</h3>
      <div className="ops-errors-summary" aria-label={t('ops_center_current_issues_summary')}>
        <span><bdi dir="ltr">{ops.overview.criticalIssueCount}</bdi> {t('ops_center_critical_issues')}</span>
        <span><bdi dir="ltr">{ops.overview.warningCount}</bdi> {t('ops_center_warnings')}</span>
        {typeof ops.overview.measurementGapCount === 'number' ? <span><bdi dir="ltr">{ops.overview.measurementGapCount}</bdi> {t('ops_center_measurement_gaps')}</span> : null}
      </div>
      <ErrorCenterTable byCategory={ops.errorCenter.byCategory} notInstrumentedCategories={ops.errorCenter.notInstrumented} />

      <DiagnosticIssueSections issues={ops.rootCause} />
      <style jsx global>{`
        .ops-errors-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 18px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface-muted); padding: 12px; color: var(--foreground-secondary); font-size: 13px; }
        .ops-errors-summary bdi { font-weight: 600; color: var(--foreground); }
      `}</style>
    </section>
  );
}
