'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import type { JobRecord } from '@/lib/admin/opsCenter/types';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';

type LogSource = 'shariah_research' | 'market_news_fetch' | 'subscription_reminders';

const SOURCE_LABEL_KEY: Record<LogSource, string> = {
  shariah_research: 'ops_center_job_source_shariah_research',
  market_news_fetch: 'ops_center_job_source_market_news_fetch',
  subscription_reminders: 'ops_center_job_source_subscription_reminders',
};

/**
 * Three real, independently-tracked run logs shown side by side — deliberately NOT presented as
 * one unified "application log," since no such cross-app structured log store exists.
 */
export function LogsTab() {
  const { t, lang } = useLanguage();
  const { ops } = useOperationsCenterContext();
  const [source, setSource] = useState<LogSource | 'all'>('all');

  const rows: Array<{ source: LogSource; record: JobRecord }> = useMemo(() => {
    if (!ops) return [];
    const all: Array<{ source: LogSource; record: JobRecord }> = [
      ...ops.backgroundJobs.shariahResearch.recent.map(record => ({ source: 'shariah_research' as const, record })),
      ...ops.backgroundJobs.marketNewsFetch.recent.map(record => ({ source: 'market_news_fetch' as const, record })),
      ...ops.backgroundJobs.subscriptionReminders.recent.map(record => ({ source: 'subscription_reminders' as const, record })),
    ];
    return all
      .filter(row => source === 'all' || row.source === source)
      .sort((a, b) => (b.record.startedAt ?? '').localeCompare(a.record.startedAt ?? ''));
  }, [ops, source]);

  if (!ops) return null;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_logs')}>
      <div className="ops-logs-filter" role="group" aria-label={t('ops_center_logs_filter_label')}>
        {(['all', 'shariah_research', 'market_news_fetch', 'subscription_reminders'] as const).map(option => (
          <button
            key={option}
            type="button"
            className={source === option ? 'active' : ''}
            onClick={() => setSource(option)}
          >
            {option === 'all' ? t('ops_center_logs_filter_all') : t(SOURCE_LABEL_KEY[option])}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="ops-empty-note">{t('ops_center_logs_empty')}</p>
      ) : (
        <div className="ops-logs-table">
          <div className="ops-logs-row ops-logs-head">
            <span>{t('ops_center_logs_col_source')}</span>
            <span>{t('ops_center_logs_col_status')}</span>
            <span>{t('ops_center_logs_col_started_at')}</span>
            <span>{t('ops_center_logs_col_duration')}</span>
            <span>{t('ops_center_logs_col_detail')}</span>
          </div>
          {rows.slice(0, 100).map(row => (
            <div className="ops-logs-row" key={`${row.source}:${row.record.id}`}>
              <span data-label={t('ops_center_logs_col_source')}>{t(SOURCE_LABEL_KEY[row.source])}</span>
              <span data-label={t('ops_center_logs_col_status')} dir="ltr">{row.record.status}</span>
              <span data-label={t('ops_center_logs_col_started_at')}>{row.record.startedAt ? formatDateTime(row.record.startedAt, lang) : t('market_state_catalog_not_measured')}</span>
              <span data-label={t('ops_center_logs_col_duration')}>{row.record.durationMs === null ? t('market_state_catalog_not_measured') : `${(row.record.durationMs / 1000).toFixed(1)}s`}</span>
              <span data-label={t('ops_center_logs_col_detail')} dir="ltr">{row.record.errorSummary ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .ops-logs-filter { display: flex; flex-wrap: wrap; gap: 8px; }
        .ops-logs-filter button { min-height: 36px; border: 1px solid var(--sfm-border); border-radius: 999px; padding-inline: 14px; background: var(--sfm-card); color: var(--sfm-muted-readable); font: 850 12px Tajawal, Arial, sans-serif; cursor: pointer; }
        .ops-logs-filter button.active { background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent)); color: #fff; border-color: transparent; }
        .ops-logs-table { border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 16px); overflow: auto; max-width: 100%; background: var(--sfm-card); }
        .ops-logs-row { min-width: 640px; display: grid; grid-template-columns: minmax(120px,1fr) minmax(90px,0.7fr) minmax(140px,1fr) minmax(80px,0.7fr) minmax(160px,1.4fr); gap: 8px; padding: 10px 14px; border-top: 1px solid var(--sfm-border); font-size: 12px; align-items: center; }
        .ops-logs-row:first-child { border-top: none; }
        .ops-logs-head { background: var(--sfm-light-card); font-weight: 900; color: var(--sfm-heading); }
        @media (max-width: 640px) {
          .ops-logs-row:not(.ops-logs-head) { min-width: 0; grid-template-columns: minmax(0,1fr); gap: 3px; }
          .ops-logs-row:not(.ops-logs-head) > span::before { content: attr(data-label); display: block; color: var(--sfm-muted); font-size: 10.5px; font-weight: 850; }
          .ops-logs-head { display: none; }
          .ops-logs-table { overflow: visible; }
        }
      `}</style>
    </section>
  );
}
