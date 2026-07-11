'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { formatDateTime } from '@/lib/locale';
import type { JobRecord } from '@/lib/admin/opsCenter/types';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';

type LogSource = 'shariah_research' | 'market_news_fetch' | 'subscription_reminders';
type LogSourceFilter = LogSource | 'all';

const LOG_SOURCE_FILTERS = ['all', 'shariah_research', 'market_news_fetch', 'subscription_reminders'] as const;

const SOURCE_LABEL_KEY: Record<LogSource, string> = {
  shariah_research: 'ops_center_job_source_shariah_research',
  market_news_fetch: 'ops_center_job_source_market_news_fetch',
  subscription_reminders: 'ops_center_job_source_subscription_reminders',
};

export function safeLogDetail(value: string | null): string {
  if (!value) return '\u2014';

  return value
    .replace(/([?&](?:api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|token|client[-_]?secret|secret|password|authorization|credential|cookie)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]')
    .replace(/(["']?(?:api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|token|client[-_]?secret|secret|password|authorization|credential|cookie)["']?\s*:\s*)(["'])[^"'\r\n]*\2/gi, '$1$2[redacted]$2')
    .replace(/\b(api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|token|client[-_]?secret|secret|password|authorization|credential|cookie)\b\s*[:=]\s*[^\s,;}]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/gi, 'https://[redacted]@')
    .slice(0, 2_000);
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  const normalized = status.trim().toLowerCase();
  if (['completed', 'succeeded', 'success'].includes(normalized)) return 'success';
  if (['failed', 'error'].includes(normalized)) return 'danger';
  if (['partial', 'rate_limited'].includes(normalized)) return 'warning';
  if (['running', 'started', 'queued'].includes(normalized)) return 'info';
  return 'muted';
}

/**
 * Three real, independently tracked run logs. Each row is progressively disclosed so the logs
 * remain scannable without implying that these sources form one application-wide log stream.
 */
export function LogsTab() {
  const { t, lang } = useLanguage();
  const { ops } = useOperationsCenterContext();
  const [source, setSource] = useUrlTabState<LogSourceFilter>({
    param: 'log-source',
    values: LOG_SOURCE_FILTERS,
    defaultValue: 'all',
    omitDefault: true,
  });

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
        {LOG_SOURCE_FILTERS.map(option => (
          <button
            key={option}
            type="button"
            className={source === option ? 'active' : ''}
            aria-pressed={source === option}
            onClick={() => setSource(option, { history: 'replace' })}
          >
            {option === 'all' ? t('ops_center_logs_filter_all') : t(SOURCE_LABEL_KEY[option])}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="ops-empty-note">{t('ops_center_logs_empty')}</p>
      ) : (
        <div className="ops-logs-list">
          {rows.slice(0, 100).map(row => {
            const startedAt = row.record.startedAt
              ? formatDateTime(row.record.startedAt, lang)
              : t('market_state_catalog_not_measured');
            const duration = row.record.durationMs === null
              ? t('market_state_catalog_not_measured')
              : `${(row.record.durationMs / 1000).toFixed(1)}s`;
            const detail = safeLogDetail(row.record.errorSummary);

            return (
              <details className="ops-log-card" key={`${row.source}:${row.record.id}`}>
                <summary>
                  <span className="ops-log-source">{t(SOURCE_LABEL_KEY[row.source])}</span>
                  <span className={`ops-log-status tone-${statusTone(row.record.status)}`} dir="ltr">{row.record.status}</span>
                  <span className="ops-log-time">{startedAt}</span>
                  <span className="ops-log-duration" dir="ltr">{duration}</span>
                  <span className="ops-log-chevron" aria-hidden="true">⌄</span>
                </summary>
                <dl>
                  <div>
                    <dt>{t('ops_center_logs_col_source')}</dt>
                    <dd>{t(SOURCE_LABEL_KEY[row.source])}</dd>
                  </div>
                  <div>
                    <dt>{t('ops_center_logs_col_status')}</dt>
                    <dd dir="ltr">{row.record.status}</dd>
                  </div>
                  <div>
                    <dt>{t('ops_center_logs_col_started_at')}</dt>
                    <dd>{startedAt}</dd>
                  </div>
                  <div>
                    <dt>{t('ops_center_logs_col_duration')}</dt>
                    <dd dir="ltr">{duration}</dd>
                  </div>
                  <div className="ops-log-detail">
                    <dt>{t('ops_center_logs_col_detail')}</dt>
                    <dd dir="auto">{detail}</dd>
                  </div>
                </dl>
              </details>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .ops-logs-filter { display: flex; flex-wrap: wrap; gap: 8px; }
        .ops-logs-filter button { min-height: 36px; border: 1px solid var(--sfm-border); border-radius: 999px; padding-inline: 14px; background: var(--sfm-card); color: var(--sfm-muted-readable); font: 850 12px Tajawal, Arial, sans-serif; cursor: pointer; }
        .ops-logs-filter button.active { background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent)); color: #fff; border-color: transparent; }
        .ops-logs-filter button:focus-visible,
        .ops-log-card summary:focus-visible { outline: 3px solid color-mix(in srgb, var(--sfm-primary) 28%, transparent); outline-offset: 2px; }
        .ops-logs-list { display: grid; gap: 8px; min-width: 0; }
        .ops-log-card { min-width: 0; border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 14px); background: var(--sfm-card); overflow: hidden; }
        .ops-log-card summary { list-style: none; min-width: 0; display: grid; grid-template-columns: minmax(150px, 1.25fr) auto minmax(150px, 1fr) auto 18px; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; color: var(--sfm-body); font-size: 12px; }
        .ops-log-card summary::-webkit-details-marker { display: none; }
        .ops-log-source { min-width: 0; color: var(--sfm-heading); font-weight: 900; overflow-wrap: anywhere; }
        .ops-log-status { border-radius: 999px; padding: 4px 8px; background: var(--sfm-light-card); color: var(--sfm-muted-readable); font-size: 10.5px; font-weight: 900; }
        .ops-log-status.tone-success { background: color-mix(in srgb, var(--green) 13%, transparent); color: var(--green); }
        .ops-log-status.tone-warning { background: color-mix(in srgb, var(--amber) 13%, transparent); color: var(--amber); }
        .ops-log-status.tone-danger { background: color-mix(in srgb, var(--red) 12%, transparent); color: var(--red); }
        .ops-log-status.tone-info { background: color-mix(in srgb, var(--blue) 12%, transparent); color: var(--blue); }
        .ops-log-time { min-width: 0; color: var(--sfm-muted-readable); overflow-wrap: anywhere; }
        .ops-log-duration { color: var(--sfm-muted); font-variant-numeric: tabular-nums; }
        .ops-log-chevron { color: var(--sfm-muted); font-size: 18px; line-height: 1; transition: transform .18s ease; }
        .ops-log-card[open] .ops-log-chevron { transform: rotate(180deg); }
        .ops-log-card dl { margin: 0; padding: 0 14px 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .ops-log-card dl > div { min-width: 0; border-radius: 10px; background: var(--sfm-light-card); padding: 9px 10px; }
        .ops-log-card dt { color: var(--sfm-muted); font-size: 10.5px; font-weight: 850; }
        .ops-log-card dd { margin: 3px 0 0; color: var(--sfm-body); font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
        .ops-log-card .ops-log-detail { grid-column: 1 / -1; }
        .ops-log-detail dd { white-space: pre-wrap; }
        @media (max-width: 640px) {
          .ops-logs-filter { flex-wrap: nowrap; max-width: 100%; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
          .ops-logs-filter::-webkit-scrollbar { display: none; }
          .ops-logs-filter button { flex: 0 0 auto; }
          .ops-log-card summary { grid-template-columns: minmax(0, 1fr) auto 18px; gap: 6px 8px; }
          .ops-log-time { grid-column: 1 / 2; }
          .ops-log-duration { grid-column: 2 / 3; }
          .ops-log-chevron { grid-column: 3 / 4; grid-row: 1 / 3; }
          .ops-log-card dl { grid-template-columns: minmax(0, 1fr); }
          .ops-log-card .ops-log-detail { grid-column: auto; }
        }
      `}</style>
    </section>
  );
}
