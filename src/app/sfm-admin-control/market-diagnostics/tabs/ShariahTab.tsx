'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { ShariahStatus } from '@/lib/market/shariah-screening';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { JobSourceCard } from '../components/JobSourceCard';

const SHARIAH_STATUS_LABEL_KEY: Record<ShariahStatus, string> = {
  compliant: 'ops_center_shariah_compliant',
  non_compliant: 'ops_center_shariah_non_compliant',
  needs_review: 'ops_center_shariah_needs_review',
  unclassified: 'ops_center_shariah_unclassified',
};

const SHARIAH_STATUS_ORDER: ShariahStatus[] = ['compliant', 'non_compliant', 'needs_review', 'unclassified'];

export function ShariahTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_shariah')}>
      <h3 className="ops-section-title">{t('ops_center_shariah_counts_title')}</h3>
      <div className="ops-shariah-counts">
        {SHARIAH_STATUS_ORDER.map(status => (
          <article key={status}>
            <strong>{ops.shariah.counts[status].toLocaleString()}</strong>
            <span>{t(SHARIAH_STATUS_LABEL_KEY[status])}</span>
          </article>
        ))}
      </div>

      <JobSourceCard title={t('ops_center_shariah_jobs_title')} stats={ops.backgroundJobs.shariahResearch} />

      <style jsx global>{`
        .ops-section-title { margin: 0; color: var(--sfm-heading); font-size: 14px; font-weight: 900; }
        .ops-shariah-counts { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .ops-shariah-counts article { min-width: 0; border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 16px); background: linear-gradient(180deg, var(--sfm-card-elevated), var(--sfm-card)); padding: 14px; box-shadow: var(--shadow-sm); }
        .ops-shariah-counts strong { display: block; color: var(--sfm-heading); font-size: 20px; line-height: 1; font-weight: 900; font-variant-numeric: tabular-nums; }
        .ops-shariah-counts span { display: block; margin-top: 6px; color: var(--sfm-muted); font-size: 12px; font-weight: 750; }
      `}</style>
    </section>
  );
}
