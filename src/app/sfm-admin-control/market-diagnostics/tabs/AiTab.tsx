'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useOperationsCenterContext } from '../OperationsCenterStateProvider';
import { NotInstrumentedNote } from '../components/NotInstrumentedNote';

export function AiTab() {
  const { t } = useLanguage();
  const { ops } = useOperationsCenterContext();
  if (!ops) return null;
  const { aiUsage } = ops;

  return (
    <section className="ops-tab-section" aria-label={t('ops_center_tab_ai')}>
      <div className="ops-ai-usage-summary">
        <article>
          <strong>{aiUsage.distinctUsersToday.toLocaleString()}</strong>
          <span>{t('ops_center_ai_distinct_users_today')}</span>
        </article>
        <article>
          <strong>{aiUsage.blockedUsersCount.toLocaleString()}</strong>
          <span>{t('ops_center_ai_blocked_users')}</span>
        </article>
      </div>

      {aiUsage.last24h.length > 0 ? (
        <div className="ops-ai-usage-table">
          <div className="ops-ai-usage-row ops-ai-usage-head">
            <span>{t('ops_center_ai_feature_column')}</span>
            <span>{t('ops_center_ai_events_24h_column')}</span>
          </div>
          {aiUsage.last24h.map(row => (
            <div className="ops-ai-usage-row" key={row.feature}>
              <span dir="ltr">{row.feature}</span>
              <span>{row.eventCount24h.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ops-empty-note">{t('ops_center_ai_no_usage_today')}</p>
      )}

      <NotInstrumentedNote value={aiUsage.healthScore} label={t('ops_center_ai_health_score')} />

      <style jsx global>{`
        .ops-ai-usage-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .ops-ai-usage-summary article { border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); padding: 12px; }
        .ops-ai-usage-summary strong { display: block; color: var(--foreground); font: 600 20px var(--font-data); }
        .ops-ai-usage-summary span { display: block; margin-top: 4px; color: var(--foreground-muted); font-size: 12px; font-weight: 700; }
        .ops-ai-usage-table { border: 1px solid var(--border); border-radius: var(--radius-card); overflow: auto; max-width: 100%; }
        .ops-ai-usage-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border); font-size: 12.5px; }
        .ops-ai-usage-row:first-child { border-top: none; }
        .ops-ai-usage-head { background: var(--surface-muted); font-weight: 600; color: var(--foreground); }
      `}</style>
    </section>
  );
}
