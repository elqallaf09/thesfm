'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import type { OperationsCenterState } from '@/lib/admin/opsCenter/types';
import { OPS_HEALTH_ICON, OPS_HEALTH_TONE } from '@/lib/admin/opsCenter/severityPresentation';

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function HealthScoreCard({ overview }: { overview: OperationsCenterState['overview'] }) {
  const { t, lang } = useLanguage();
  const tone = OPS_HEALTH_TONE[overview.overall];
  const Icon = OPS_HEALTH_ICON[overview.overall];

  return (
    <div className={`ops-health-score-card tone-${tone}`}>
      <div className="ops-health-score-top">
        <span className="ops-health-score-icon" aria-hidden="true"><Icon size={22} /></span>
        <div className="ops-health-score-heading">
          <small>{t('ops_center_overview_status_title')}</small>
          <strong className={`market-status-badge ${tone}`}>{t(`ops_center_health_${overview.overall}`)}</strong>
        </div>
        <div className="ops-health-score-percent" aria-label={t('ops_center_health_score')}>{overview.healthScorePercent}%</div>
      </div>
      <div className="ops-health-score-stats">
        <div><strong>{overview.criticalIssueCount}</strong><span>{t('ops_center_critical_issues')}</span></div>
        <div><strong>{overview.warningCount}</strong><span>{t('ops_center_warnings')}</span></div>
        <div><strong>{overview.healthyServiceCount}</strong><span>{t('ops_center_healthy_services')}</span></div>
      </div>
      <p className="ops-health-score-meta">{t('ops_center_uptime')}: <b dir="ltr">{formatUptime(overview.processUptimeSeconds)}</b></p>
      {overview.lastSyncAt ? <p className="ops-health-score-meta">{t('market_state_last_sync')}: {formatDateTime(overview.lastSyncAt, lang)}</p> : null}
      <style jsx global>{`
        .ops-health-score-card { border: 1px solid var(--border); border-radius: var(--radius-panel); background: var(--surface); padding: 16px; box-shadow: var(--shadow-sm); display: grid; gap: 12px; }
        .ops-health-score-top { display: flex; align-items: center; gap: 10px; }
        .ops-health-score-icon { flex: 0 0 auto; }
        .ops-health-score-card.tone-success .ops-health-score-icon { color: var(--success); }
        .ops-health-score-card.tone-warning .ops-health-score-icon { color: var(--warning); }
        .ops-health-score-card.tone-danger .ops-health-score-icon { color: var(--danger); }
        .ops-health-score-card.tone-info .ops-health-score-icon { color: var(--info); }
        .ops-health-score-heading { flex: 1; min-width: 0; display: grid; gap: 4px; }
        .ops-health-score-heading small { color: var(--foreground-muted); font-size: 12px; font-weight: 500; }
        .ops-health-score-percent { font: 600 26px var(--font-data); color: var(--foreground); font-variant-numeric: tabular-nums; }
        .ops-health-score-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .ops-health-score-stats > div { text-align: center; border: 1px solid var(--border); border-radius: var(--radius-control); padding: 8px; background: var(--surface-muted); }
        .ops-health-score-stats strong { display: block; font: 600 18px var(--font-data); color: var(--foreground); }
        .ops-health-score-stats span { display: block; margin-top: 2px; font-size: 10.5px; color: var(--foreground-muted); font-weight: 750; }
        .ops-health-score-meta { margin: 0; color: var(--foreground-secondary); font-size: 12px; }
      `}</style>
    </div>
  );
}
