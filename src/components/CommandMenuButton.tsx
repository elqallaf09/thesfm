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
          --_command-surface: var(--surface-elevated, var(--card, #fff));
          --_command-hover: var(--sidebar-hover, var(--surface-muted, var(--muted, #f8fafc)));
          --_command-text: var(--sidebar-foreground, var(--foreground, #0f2742));
          --_command-muted: var(--foreground-muted, var(--muted-foreground, #64748b));
          --_command-border: var(--sidebar-border, var(--border, #e2e8f0));
          --_command-primary: var(--primary, #1769d2);
          --_command-focus: var(--focus-ring, var(--ring, #2563eb));
          width: 100%;
          min-height: 40px;
          border: 1px solid var(--_command-border);
          border-radius: var(--radius-control, var(--r-md, 10px));
          background: var(--_command-surface);
          color: var(--_command-text);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          font-family: var(--font-sans, var(--font-ibm-plex-sans-arabic), 'IBM Plex Sans Arabic', sans-serif);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          overflow: hidden;
          transition: background-color .16s ease, border-color .16s ease, color .16s ease;
        }
        .sfm-command-trigger.compact {
          width: 40px;
          height: 40px;
          min-height: 40px;
          justify-content: center;
          padding: 0;
        }
        .sfm-command-trigger:hover {
          background: var(--_command-hover);
          border-color: var(--border-strong, var(--_command-border));
        }
        .sfm-command-trigger:focus-visible {
          outline: 2px solid var(--_command-focus);
          outline-offset: 2px;
        }
        .sfm-command-trigger svg {
          color: var(--_command-primary);
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
          border: 1px solid var(--_command-border);
          border-radius: 6px;
          padding: 2px 5px;
          color: var(--_command-muted);
          background: var(--_command-hover);
          font-size: 10px;
          font-family: inherit;
          font-weight: 500;
          line-height: 1.3;
        }
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger{width:40px;padding:0;justify-content:center}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger span,
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger kbd{display:none}
        @media(max-width:360px){.sfm-command-trigger kbd{display:none}}
        @media(prefers-reduced-motion:reduce){.sfm-command-trigger{transition:none}}
      `}</style>
    </button>
  );
}

