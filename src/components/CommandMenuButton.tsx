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
          min-height: 42px;
          border: 1px solid rgba(167, 243, 240, 0.20);
          border-radius: var(--r-md);
          background: rgba(255, 255, 255, 0.07);
          color: #EAF6FF;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          font-family: Tajawal, Arial, sans-serif;
          font-weight: 900;
          cursor: pointer;
          transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
        }
        .sfm-command-trigger:not(.dark) {
          background: linear-gradient(180deg, #FFFFFF, #F8FBFF);
          border-color: rgba(29, 140, 255, .18);
          color: var(--sfm-primary-dark);
          box-shadow: 0 8px 20px rgba(3, 18, 37, .10);
        }
        .sfm-command-trigger.compact {
          width: 44px;
          height: 44px;
          min-height: 44px;
          justify-content: center;
          padding: 0;
        }
        .sfm-command-trigger:hover,
        .sfm-command-trigger:focus-visible {
          outline: none;
          transform: translateY(-1px);
          border-color: rgba(24, 212, 212, .42);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .16), 0 12px 26px rgba(3, 18, 37, .14);
        }
        .sfm-command-trigger svg {
          color: var(--sfm-soft-cyan);
          flex: 0 0 auto;
        }
        .sfm-command-trigger:not(.dark) svg {
          color: var(--sfm-primary);
        }
        .sfm-command-trigger span {
          flex: 1;
          text-align: start;
        }
        .sfm-command-trigger kbd {
          border: 1px solid rgba(167, 243, 240, .20);
          border-radius: var(--r-sm);
          padding: 3px 7px;
          color: #A7C7E7;
          background: rgba(255, 255, 255, .06);
          font-size: 11px;
          font-family: Tajawal, Arial, sans-serif;
          font-weight: 950;
        }
        .sfm-command-trigger:not(.dark) kbd {
          color: var(--sfm-muted);
          background: rgba(29, 140, 255, .08);
          border-color: rgba(29, 140, 255, .14);
        }
      `}</style>
    </button>
  );
}

