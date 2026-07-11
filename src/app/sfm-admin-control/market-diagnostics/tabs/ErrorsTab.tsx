'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { ErrorCenterTable } from '../components/ErrorCenterTable';
import { RootCauseAccordion } from '../components/RootCauseAccordion';

export function ErrorsTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_errors')}>
      <h3 className="ops-section-title">{t('ops_center_error_center_title')}</h3>
      <ErrorCenterTable byCategory={ops.errorCenter.byCategory} notInstrumentedCategories={ops.errorCenter.notInstrumented} />

      <h3 className="ops-section-title">{t('ops_center_root_cause_title')}</h3>
      <RootCauseAccordion issues={ops.rootCause} />
    </section>
  );
}
