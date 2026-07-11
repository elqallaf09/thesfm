'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { NotInstrumentedNote } from '../components/NotInstrumentedNote';

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PerformanceTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;
  const { performance } = ops;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_performance')}>
      <div className="ops-performance-process">
        <article>
          <strong>{performance.processUptimeSeconds.toLocaleString(undefined, { maximumFractionDigits: 0 })}s</strong>
          <span>{t('ops_center_performance_uptime')}</span>
          <em>{t('ops_center_scope_process')}</em>
        </article>
        <article>
          <strong>{formatBytes(performance.memory.rssBytes)}</strong>
          <span>{t('ops_center_performance_memory_rss')}</span>
          <em>{t('ops_center_scope_process')}</em>
        </article>
        <article>
          <strong>{formatBytes(performance.memory.heapUsedBytes)} / {formatBytes(performance.memory.heapTotalBytes)}</strong>
          <span>{t('ops_center_performance_memory_heap')}</span>
          <em>{t('ops_center_scope_process')}</em>
        </article>
        <article>
          <strong dir="ltr">{performance.loadAvg ? performance.loadAvg.map(value => value.toFixed(2)).join(' / ') : t('market_state_catalog_not_measured')}</strong>
          <span>{t('ops_center_performance_load_avg')}</span>
          <em>{performance.loadAvg ? t('ops_center_scope_process') : t('ops_center_performance_load_avg_unsupported_os')}</em>
        </article>
        <article>
          <strong>{performance.averageProviderLatencyMs === null ? t('market_state_catalog_not_measured') : `${performance.averageProviderLatencyMs} ms`}</strong>
          <span>{t('ops_center_performance_average_latency')}</span>
          <em>{t('ops_center_scope_provider')}</em>
        </article>
      </div>

      {performance.slowestProviders.length > 0 ? (
        <div className="ops-performance-slowest">
          <h3 className="ops-section-title">{t('ops_center_performance_slowest_providers')}</h3>
          <ul>
            {performance.slowestProviders.map(entry => (
              <li key={entry.provider}>
                <span dir="ltr">{traderProviderDisplayName(entry.provider) ?? entry.provider}</span>
                <b dir="ltr">{entry.latencyMs} ms</b>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="ops-performance-not-instrumented">
        <NotInstrumentedNote value={performance.apiRouteTiming} label={t('ops_center_performance_api_route_timing')} />
        <NotInstrumentedNote value={performance.cacheHitRate} label={t('ops_center_performance_cache_hit_rate')} />
        <NotInstrumentedNote value={performance.mostExpensiveFunctions} label={t('ops_center_performance_expensive_functions')} />
        <NotInstrumentedNote value={performance.backgroundQueueDepth} label={t('ops_center_performance_queue_depth')} />
      </div>

      <style jsx global>{`
        .ops-performance-process { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .ops-performance-process article { border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 14px); background: linear-gradient(180deg, var(--sfm-card-elevated), var(--sfm-card)); padding: 12px; display: grid; gap: 4px; }
        .ops-performance-process strong { color: var(--sfm-heading); font-size: 16px; font-weight: 900; }
        .ops-performance-process span { color: var(--sfm-muted); font-size: 11.5px; font-weight: 750; }
        .ops-performance-process em { color: var(--sfm-muted); font-size: 10px; font-style: normal; opacity: .8; }
        .ops-performance-slowest ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .ops-performance-slowest li { display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--sfm-border); border-radius: 10px; padding: 8px 12px; background: var(--sfm-light-card); font-size: 12.5px; }
        .ops-performance-not-instrumented { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
      `}</style>
    </section>
  );
}
