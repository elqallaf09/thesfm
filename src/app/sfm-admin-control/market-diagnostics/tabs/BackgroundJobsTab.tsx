'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { JobSourceCard } from '../components/JobSourceCard';
import { NotInstrumentedNote } from '../components/NotInstrumentedNote';

export function BackgroundJobsTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_background_jobs')}>
      <div className="ops-job-source-grid">
        <JobSourceCard title={t('ops_center_job_source_shariah_research')} stats={ops.backgroundJobs.shariahResearch} />
        <JobSourceCard title={t('ops_center_job_source_market_news_fetch')} stats={ops.backgroundJobs.marketNewsFetch} />
        <JobSourceCard title={t('ops_center_job_source_subscription_reminders')} stats={ops.backgroundJobs.subscriptionReminders} />
      </div>
      <NotInstrumentedNote value={ops.backgroundJobs.genericQueue} label={t('ops_center_job_source_generic_queue')} />
      <style jsx global>{`
        .ops-job-source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
      `}</style>
    </section>
  );
}
