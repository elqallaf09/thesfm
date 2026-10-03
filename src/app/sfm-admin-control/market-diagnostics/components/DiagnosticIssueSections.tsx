'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import type { RootCauseIssue } from '@/lib/admin/opsCenter/types';
import { RootCauseAccordion } from './RootCauseAccordion';

export function DiagnosticIssueSections({ issues, limit }: { issues: RootCauseIssue[]; limit?: number }) {
  const { t } = useLanguage();
  const incidents = issues.filter(issue => issue.kind !== 'measurement_gap');
  const gaps = issues.filter(issue => issue.kind === 'measurement_gap');
  const truncated = typeof limit === 'number' && (incidents.length > limit || gaps.length > limit);

  return (
    <div className="ops-diagnostic-sections">
      <h3 className="ops-section-title">{t('ops_center_root_cause_title')}</h3>
      <p className="ops-diagnostic-explanation">{t('ops_center_current_issues_scope')}</p>
      <RootCauseAccordion issues={incidents} limit={limit} />
      {gaps.length > 0 ? (
        <>
          <h3 className="ops-section-title">{t('ops_center_measurement_gaps')} <bdi dir="ltr">({gaps.length})</bdi></h3>
          <p className="ops-diagnostic-explanation">{t('ops_center_measurement_gaps_description')}</p>
          <RootCauseAccordion issues={gaps} limit={limit} />
        </>
      ) : null}
      {truncated ? <Link className="ops-diagnostic-all" href="/sfm-admin-control/market-diagnostics?tab=errors">{t('ops_center_view_all_diagnostics')}</Link> : null}
      <style jsx global>{`
        .ops-diagnostic-sections { min-width: 0; display: grid; gap: 10px; }
        .ops-diagnostic-explanation { margin: 0; color: var(--foreground-secondary); font-size: 12px; line-height: 1.7; }
        .ops-diagnostic-all { color: var(--primary); width: fit-content; font-size: 12px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
        .ops-diagnostic-all:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
      `}</style>
    </div>
  );
}
