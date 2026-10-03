'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { FeatureHealthRow } from '@/lib/admin/opsCenter/types';
import { FEATURE_HEALTH_ICON, FEATURE_HEALTH_TONE } from '@/lib/admin/opsCenter/severityPresentation';
import { FeatureEvidenceList } from './FeatureEvidenceList';

export function FeatureHealthGrid({ rows, evidenceLimit }: { rows: FeatureHealthRow[]; evidenceLimit?: number }) {
  const { t } = useLanguage();

  return (
    <div className="ops-feature-health-grid">
      {rows.map(row => {
        const tone = FEATURE_HEALTH_TONE[row.status];
        const Icon = FEATURE_HEALTH_ICON[row.status];
        return (
          <article key={row.feature} className={`ops-feature-health-cell tone-${tone}`}>
            <div className="ops-feature-health-heading">
              <span className="ops-feature-health-icon" aria-hidden="true"><Icon size={14} /></span>
              <strong>{t(`ops_center_feature_${row.feature}`)}</strong>
              <span className={`market-status-badge ${tone}`}>{t(`ops_center_feature_health_${row.status}`)}</span>
            </div>
            {row.detailKey ? <p className="ops-feature-health-detail">{t(row.detailKey)}</p> : null}
            {row.evidence?.length ? <FeatureEvidenceList evidence={row.evidence} limit={evidenceLimit ?? (row.status === 'healthy' ? 1 : 3)} /> : null}
          </article>
        );
      })}
      <style jsx global>{`
        .ops-feature-health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); align-items: start; gap: 10px; }
        .ops-feature-health-cell { min-width: 0; display: grid; align-content: start; gap: 10px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); padding: 12px; }
        .ops-feature-health-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .ops-feature-health-heading > strong { flex: 1; }
        .ops-feature-health-detail { margin: 0; color: var(--foreground-secondary); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
        .ops-feature-health-icon { display: inline-flex; }
        .ops-feature-health-cell.tone-success .ops-feature-health-icon { color: var(--success); }
        .ops-feature-health-cell.tone-warning .ops-feature-health-icon { color: var(--warning); }
        .ops-feature-health-cell.tone-danger .ops-feature-health-icon { color: var(--danger); }
        .ops-feature-health-cell.tone-info .ops-feature-health-icon { color: var(--info); }
        .ops-feature-health-cell.tone-muted .ops-feature-health-icon { color: var(--foreground-muted); }
        .ops-feature-health-cell strong { color: var(--foreground); font-size: 12.5px; font-weight: 600; }
      `}</style>
    </div>
  );
}
