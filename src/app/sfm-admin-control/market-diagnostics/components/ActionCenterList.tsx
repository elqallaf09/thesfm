'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import type { OpsAction } from '@/lib/admin/opsCenter/types';

type ActionState = {
  pendingActionId: string | null;
  result: { actionId: string; ok: boolean; messageKey: string; completedAt: string } | null;
};

export function ActionCenterList({ actions, onAction, actionState }: {
  actions: OpsAction[];
  onAction: (action: OpsAction) => void | Promise<void>;
  actionState: ActionState;
}) {
  const { t, lang } = useLanguage();

  return (
    <div className="ops-action-center-list">
      {actions.map(action => {
        const pending = actionState.pendingActionId === action.id;
        const result = actionState.result?.actionId === action.id ? actionState.result : null;
        const reasonId = `ops-action-reason-${action.id}`;
        return (
          <div key={action.id} className="ops-action-item" aria-busy={pending}>
            <div className="ops-action-description">
              <span>{t(action.labelKey)}</span>
              {!action.available ? (
                <p id={reasonId}>{t(action.disabledReasonKey ?? 'ops_center_action_unavailable')}</p>
              ) : null}
              {pending ? <p role="status">{t('ops_center_action_running')}</p> : null}
              {!pending && result ? (
                <p className={`ops-action-result ${result.ok ? 'is-success' : 'is-error'}`} role={result.ok ? 'status' : 'alert'}>
                  <strong>{t(result.ok ? 'ops_center_action_succeeded' : 'ops_center_action_failed')}</strong>
                  <span>{t(result.messageKey)}</span>
                  <time dateTime={result.completedAt}>{formatDateTime(result.completedAt, lang)}</time>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!action.available || actionState.pendingActionId !== null}
              onClick={() => { void onAction(action); }}
              aria-label={`${t('ops_center_action_run')}: ${t(action.labelKey)}`}
              aria-describedby={!action.available ? reasonId : undefined}
            >
              {t(pending ? 'ops_center_action_running' : 'ops_center_action_run')}
            </button>
          </div>
        );
      })}
      <style jsx global>{`
        .ops-action-center-list { display: grid; gap: 8px; }
        .ops-action-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--border); border-radius: var(--radius-control); padding: 12px; background: var(--surface-muted); }
        .ops-action-description { min-width: 0; display: grid; gap: 6px; }
        .ops-action-description > span { color: var(--foreground); font-size: 13px; font-weight: 600; }
        .ops-action-description p { margin: 0; color: var(--foreground-secondary); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
        .ops-action-result { display: grid; gap: 3px; }
        .ops-action-result.is-success strong { color: var(--success); }
        .ops-action-result.is-error strong { color: var(--danger); }
        .ops-action-result time { color: var(--foreground-muted); font-size: 11px; }
        .ops-action-item button { flex: 0 0 auto; min-height: 40px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--surface-elevated); color: var(--foreground); font: 600 12px var(--font-ui); cursor: pointer; }
        .ops-action-item button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
        .ops-action-item button:disabled { opacity: .55; cursor: not-allowed; }
        @media (max-width: 440px) { .ops-action-item { align-items: flex-start; flex-wrap: wrap; } }
      `}</style>
    </div>
  );
}
