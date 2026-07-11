'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { JobSourceStats } from '@/lib/admin/opsCenter/types';
import { JOB_STATUS_ICON, JOB_STATUS_TONE, type JobStatusBucket } from '@/lib/admin/opsCenter/severityPresentation';

const BUCKET_LABEL_KEY: Record<JobStatusBucket, string> = {
  queued: 'ops_center_job_status_queued',
  running: 'ops_center_job_status_running',
  succeeded: 'ops_center_job_status_succeeded',
  failed: 'ops_center_job_status_failed',
  cancelled: 'ops_center_job_status_cancelled',
};

const BUCKETS: JobStatusBucket[] = ['queued', 'running', 'succeeded', 'failed', 'cancelled'];

export function JobSourceCard({ title, stats }: { title: string; stats: JobSourceStats }) {
  const { t } = useLanguage();

  return (
    <article className="ops-job-source-card">
      <header><strong>{title}</strong></header>
      <div className="ops-job-source-counts">
        {BUCKETS.map(bucket => {
          const tone = JOB_STATUS_TONE[bucket];
          const Icon = JOB_STATUS_ICON[bucket];
          return (
            <div key={bucket} className={`ops-job-source-count tone-${tone}`}>
              <span className="ops-job-source-count-icon" aria-hidden="true"><Icon size={13} /></span>
              <strong>{stats[bucket]}</strong>
              <span>{t(BUCKET_LABEL_KEY[bucket])}</span>
            </div>
          );
        })}
      </div>
      <p className="ops-job-source-avg">
        {t('ops_center_job_avg_duration')}: {stats.averageDurationMs === null ? t('market_state_catalog_not_measured') : `${(stats.averageDurationMs / 1000).toFixed(1)}s`}
      </p>
      <style jsx global>{`
        .ops-job-source-card { border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 16px); background: var(--sfm-card); padding: 14px; box-shadow: var(--shadow-sm); display: grid; gap: 10px; }
        .ops-job-source-card header strong { color: var(--sfm-heading); font-size: 13.5px; font-weight: 900; }
        .ops-job-source-counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; }
        .ops-job-source-count { display: grid; justify-items: center; gap: 3px; border: 1px solid var(--sfm-border); border-radius: var(--r-md); padding: 8px 6px; background: var(--sfm-light-card); }
        .ops-job-source-count strong { font-size: 16px; font-weight: 900; color: var(--sfm-heading); }
        .ops-job-source-count span:last-child { font-size: 10.5px; color: var(--sfm-muted); font-weight: 750; text-align: center; }
        .ops-job-source-count.tone-success .ops-job-source-count-icon { color: var(--green); }
        .ops-job-source-count.tone-warning .ops-job-source-count-icon { color: var(--amber); }
        .ops-job-source-count.tone-danger .ops-job-source-count-icon { color: var(--red); }
        .ops-job-source-count.tone-info .ops-job-source-count-icon { color: var(--blue); }
        .ops-job-source-count.tone-muted .ops-job-source-count-icon { color: var(--sfm-muted); }
        .ops-job-source-avg { margin: 0; color: var(--sfm-muted-readable); font-size: 12px; font-weight: 750; }
      `}</style>
    </article>
  );
}
