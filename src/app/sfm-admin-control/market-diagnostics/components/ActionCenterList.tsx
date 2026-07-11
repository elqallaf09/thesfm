'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { OpsAction } from '@/lib/admin/opsCenter/types';

export function ActionCenterList({ actions, onAction }: { actions: OpsAction[]; onAction: (action: OpsAction) => void }) {
  const { t } = useLanguage();

  return (
    <div className="ops-action-center-list">
      {actions.map(action => (
        <div key={action.id} className="ops-action-item">
          <span>{t(action.labelKey)}</span>
          <button
            type="button"
            disabled={!action.available}
            onClick={() => onAction(action)}
            title={!action.available && action.disabledReasonKey ? t(action.disabledReasonKey) : undefined}
          >
            {t('ops_center_action_run')}
          </button>
        </div>
      ))}
      <style jsx global>{`
        .ops-action-center-list { display: grid; gap: 8px; }
        .ops-action-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--sfm-border); border-radius: 12px; padding: 10px 12px; background: var(--sfm-light-card); }
        .ops-action-item span { min-width: 0; color: var(--sfm-body); font-size: 12.5px; font-weight: 750; }
        .ops-action-item button { flex: 0 0 auto; min-height: 34px; border: 1px solid var(--sfm-border); border-radius: 10px; padding-inline: 12px; background: var(--sfm-card-elevated); color: var(--sfm-foreground); font: 850 12px Tajawal, Arial, sans-serif; cursor: pointer; }
        .ops-action-item button:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
