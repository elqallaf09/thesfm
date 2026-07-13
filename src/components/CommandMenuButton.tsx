'use client';

import { Search } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function openCommandMenu() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('sfm:open-command-menu'));
}

export function CommandMenuButton({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const { t, dir } = useLanguage();

  return (
    <button
      type="button"
      className={`sfm-command-trigger${compact ? ' compact' : ''}${dark ? ' dark' : ''}`}
      onClick={openCommandMenu}
      aria-label={t('command_open')}
      dir={dir}
    >
      <Search size={compact ? 18 : 16} aria-hidden="true" />
      {!compact && <span>{t('command_open')}</span>}
      {!compact && <kbd>{t('command_shortcut')}</kbd>}
      <style jsx>{`
        .sfm-command-trigger {
          width: 100%;
          min-height: 44px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface-elevated);
          color: var(--foreground);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          font-family: var(--font-ui);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          overflow: hidden;
          transition: background-color .16s ease, border-color .16s ease, color .16s ease;
        }
        .sfm-command-trigger.compact {
          width: 44px;
          height: 44px;
          min-height: 44px;
          justify-content: center;
          padding: 0;
        }
        .sfm-command-trigger:hover {
          background: var(--sidebar-hover);
          border-color: var(--border-strong);
        }
        .sfm-command-trigger:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          box-shadow: var(--focus-shadow);
        }
        .sfm-command-trigger svg {
          color: var(--primary);
          flex: 0 0 auto;
        }
        .sfm-command-trigger span {
          flex: 1;
          min-width: 0;
          text-align: start;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sfm-command-trigger kbd {
          flex: 0 0 auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 2px 5px;
          color: var(--foreground-muted);
          background: var(--surface-muted);
          font-size: 10px;
          font-family: var(--font-ui);
          font-weight: 500;
          line-height: 1.3;
        }
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger{width:44px;padding:0;justify-content:center}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger span,
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger kbd{display:none}
        @media(max-width:360px){.sfm-command-trigger kbd{display:none}}
        @media(prefers-reduced-motion:reduce){.sfm-command-trigger{transition:none}}
      `}</style>
    </button>
  );
}

