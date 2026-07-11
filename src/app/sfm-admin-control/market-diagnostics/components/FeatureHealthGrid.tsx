'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { FeatureHealthRow } from '@/lib/admin/opsCenter/types';
import { FEATURE_HEALTH_ICON, FEATURE_HEALTH_TONE } from '@/lib/admin/opsCenter/severityPresentation';

export function FeatureHealthGrid({ rows }: { rows: FeatureHealthRow[] }) {
  const { t } = useLanguage();

  return (
    <div className="ops-feature-health-grid">
      {rows.map(row => {
        const tone = FEATURE_HEALTH_TONE[row.status];
        const Icon = FEATURE_HEALTH_ICON[row.status];
        const detail = row.detailKey ? t(row.detailKey) : t(`ops_center_feature_health_${row.status}`);
        return (
          <div key={row.feature} className={`ops-feature-health-cell tone-${tone}`} title={detail}>
            <span className="ops-feature-health-icon" aria-hidden="true"><Icon size={14} /></span>
            <strong>{t(`ops_center_feature_${row.feature}`)}</strong>
            <span className={`market-status-badge ${tone}`}>{t(`ops_center_feature_health_${row.status}`)}</span>
          </div>
        );
      })}
      <style jsx global>{`
        .ops-feature-health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .ops-feature-health-cell { display: grid; gap: 6px; border: 1px solid var(--sfm-border); border-radius: var(--sfm-light-radius-card, 14px); background: var(--sfm-card); padding: 12px; }
        .ops-feature-health-icon { display: inline-flex; }
        .ops-feature-health-cell.tone-success .ops-feature-health-icon { color: var(--green); }
        .ops-feature-health-cell.tone-warning .ops-feature-health-icon { color: var(--amber); }
        .ops-feature-health-cell.tone-danger .ops-feature-health-icon { color: var(--red); }
        .ops-feature-health-cell.tone-info .ops-feature-health-icon { color: var(--blue); }
        .ops-feature-health-cell.tone-muted .ops-feature-health-icon { color: var(--sfm-muted); }
        .ops-feature-health-cell strong { color: var(--sfm-heading); font-size: 12.5px; font-weight: 850; }
      `}</style>
    </div>
  );
}
